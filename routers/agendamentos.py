from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
import re
from auth import PermissaoRequerida, validar_acesso_unidade
from database import obter_conexao
import schemas

# Importações do seu projeto (ajuste os caminhos conforme sua estrutura de models/database)
# from database import get_db
# from models import AgendamentoModel, RequisicaoMamografiaModel
# from auth import obter_usuario_atual

router = APIRouter(prefix="/api/agendamentos", tags=["Agendamentos e Requisições"])

# --- SCHEMAS PYDANTIC ---

class AnamneseRequisicaoSchema(BaseModel):
    paciente_id: int
    unidade_id: int
    # Perguntas da anamnese para o cálculo do Score de Prognóstico SUS
    possui_sintomas: bool = Field(..., description="Presença de nódulo palpável ou outros sintomas")
    idade: int = Field(..., description="Idade da paciente")
    historico_familiar_cancer: bool = Field(..., description="Histórico familiar de câncer de mama")
    ultima_mamografia_anos: Optional[int] = Field(None, description="Anos desde a última mamografia")
    bi_rads_anterior: Optional[str] = Field(
        None,
        description="Classificação BI-RADS anterior, se houver",
        alias="bi-rads-anterior",
    )

    model_config = ConfigDict(validate_by_name=True)

class AgendamentoResponseSchema(BaseModel):
    id: int
    paciente_id: int
    unidade_id: int
    score_prioridade: int
    status: str
    data_criacao: datetime

    class Config:
        from_attributes = True

class StatusAgendamento(BaseModel):
    status: str

# --- FUNÇÃO DE CÁLCULO DE SCORE DE PRIORIDADE (SUS) ---
def calcular_score_prioridade(dados: AnamneseRequisicaoSchema) -> int:
    """
    Calcula o score de prioridade clínica baseado em diretrizes do SUS para mamografia.
    Quanto maior o score, maior a prioridade na fila.
    """
    score = 0
    
    # Sintomas clínicos têm maior peso (ex: nódulo palpável)
    if dados.possui_sintomas:
        score += 50
    # Faixa etária prioritária (ex: 50 a 69 anos, ou histórico jovem)
    if 50 <= dados.idade <= 69:
        score += 20
    elif dados.idade > 69 or dados.idade < 40:
        score += 10
        
    # Histórico familiar aumenta o risco
    if dados.historico_familiar_cancer:
        score += 15
        
    # Tempo desde o último exame
    if dados.ultima_mamografia_anos and dados.ultima_mamografia_anos > 2:
        score += 10
    elif dados.ultima_mamografia_anos is None:
        score += 15 # Nunca fez

    return score

# --- ENDPOINTS ---

@router.post("/agendar", status_code=status.HTTP_201_CREATED)
def criar_agendamento(
    dados: schemas.NovoAgendamento,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor", "clinico", "recepcao"])),
):
    cursor = db.cursor()
    cursor.execute("SELECT id, unidade_id FROM pacientes WHERE cpf = %s", (dados.paciente_cpf,))
    paciente = cursor.fetchone()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente com este CPF não encontrado.")
    cursor.execute("SELECT id FROM unidades WHERE id = %s", (dados.unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    cursor.execute("SELECT id, unidade_id FROM profissionais WHERE matricula = %s", (dados.profissional_matricula,))
    profissional = cursor.fetchone()
    if not profissional:
        raise HTTPException(status_code=404, detail="Profissional com esta matrícula não encontrado.")
    validar_acesso_unidade(usuario, dados.unidade_id)
    if paciente.get("unidade_id") != dados.unidade_id or profissional.get("unidade_id") != dados.unidade_id:
        raise HTTPException(status_code=400, detail="Paciente e profissional devem pertencer à unidade do agendamento.")
    if usuario.get("role") == "clinico" and usuario.get("profissional_id") != profissional["id"]:
        raise HTTPException(status_code=403, detail="Você só pode agendar em seu próprio nome.")

    cursor.execute(
        """INSERT INTO agendamentos
           (paciente_id, unidade_id, profissional_id, data_hora, especialidade,
            procedimento, indicacao_clinica, prioridade_score, status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (paciente["id"], dados.unidade_id, profissional["id"],
         dados.data_hora, dados.especialidade, "Mamografia",
         dados.indicacao_clinica, 0, "Agendado"),
    )
    agendamento_id = cursor.fetchone()["id"]
    db.commit()
    return {
        "mensagem": "Agendamento criado. Registre a anamnese para completar a requisição.",
        "agendamento_id": agendamento_id,
        "prioridade_score": 0,
    }

@router.get("/unidade/{unidade_id}")
def listar_agendamentos_unidade(
    unidade_id: int,
    cpf: Optional[str] = None,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor", "clinico", "recepcao"])),
):
    validar_acesso_unidade(usuario, unidade_id)
    cursor = db.cursor()
    query = """SELECT a.id, p.nome AS paciente_nome, p.cpf AS paciente_cpf, a.unidade_id,
                      prof.nome AS profissional_nome, prof.matricula AS profissional_matricula, a.data_hora,
                      a.especialidade, a.procedimento, a.indicacao_clinica,
                      a.prioridade_score, a.status
               FROM agendamentos a
               JOIN pacientes p ON p.id = a.paciente_id
               JOIN profissionais prof ON prof.id = a.profissional_id
               WHERE a.unidade_id = %s"""
    parametros = [unidade_id]
    if cpf and re.sub(r"\D", "", cpf):
        query += " AND p.cpf = %s"
        parametros.append(re.sub(r"\D", "", cpf))
    query += " ORDER BY a.data_hora DESC, a.id DESC"
    cursor.execute(query, parametros)
    return {"agendamentos": [dict(row) for row in cursor.fetchall()]}

@router.get("/{agendamento_id}")
def obter_agendamento(
    agendamento_id: int,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor", "clinico", "recepcao"])),
):
    cursor = db.cursor()
    cursor.execute(
        """SELECT a.id, p.cpf AS paciente_cpf, a.unidade_id,
                  prof.matricula AS profissional_matricula, a.data_hora,
                  a.especialidade, a.procedimento, a.indicacao_clinica,
                  a.prioridade_score, a.status
           FROM agendamentos a
           JOIN pacientes p ON p.id = a.paciente_id
           JOIN profissionais prof ON prof.id = a.profissional_id
           WHERE a.id = %s""",
        (agendamento_id,),
    )
    agendamento = cursor.fetchone()
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    validar_acesso_unidade(usuario, agendamento["unidade_id"])
    return dict(agendamento)

@router.patch("/{agendamento_id}/status")
def atualizar_status_agendamento(
    agendamento_id: int,
    dados: StatusAgendamento,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor", "clinico", "recepcao"])),
):
    if dados.status not in {"fila_espera", "busca_ativa", "Agendado", "Concluído", "Cancelado"}:
        raise HTTPException(status_code=422, detail="Status inválido.")
    cursor = db.cursor()
    cursor.execute("SELECT unidade_id FROM agendamentos WHERE id = %s", (agendamento_id,))
    agendamento = cursor.fetchone()
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    validar_acesso_unidade(usuario, agendamento["unidade_id"])
    cursor.execute("UPDATE agendamentos SET status = %s WHERE id = %s", (dados.status, agendamento_id))
    db.commit()
    return {"mensagem": "Status atualizado.", "agendamento_id": agendamento_id, "status": dados.status}
