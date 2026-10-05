from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from datetime import datetime
from pydantic import BaseModel
from database import obter_conexao

router = APIRouter(prefix="/api/agendamentos", tags=["Agendamentos Clínicos"])

class NovoAgendamento(BaseModel):
    paciente_id: int
    unidade_id: int
    profissional_id: int
    data_hora: str
    especialidade: str
    indicacao_clinica: str

class RespostaAgendamento(BaseModel):
    mensagem: str
    agendamento_id: int
    prioridade_score: int

class AtualizarStatus(BaseModel):
    status: str

def calcular_idade(data_nascimento_str: str) -> int:
    try:
        data_nasci = datetime.strptime(data_nascimento_str, "%Y-%m-%d")
        hoje = datetime.now()
        return hoje.year - data_nasci.year - ((hoje.month, hoje.day) < (data_nasci.month, data_nasci.day))
    except ValueError:
        return 0

def calcular_prioridade_sus(indicacao: str, idade: int) -> int:
    texto = indicacao.lower()
    score = 0
    
    if 50 <= idade <= 69:
        score += 30
    elif idade > 69:
        score += 15
    else:
        score += 10
        
    if "nódulo" in texto or "nodulo" in texto:
        score += 40
    if "câncer" in texto or "cancer" in texto or "carcinoma" in texto:
        score += 60
    if "suspeita" in texto:
        score += 20
    if "urgente" in texto or "urgência" in texto:
        score += 15
        
    return score

@router.post("/agendar", response_model=RespostaAgendamento, status_code=201)
def criar_agendamento(dados: NovoAgendamento, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    
    cursor.execute("SELECT id, data_nascimento FROM usuarios WHERE id = %s AND LOWER(tipo) = 'paciente'", (dados.paciente_id,))
    paciente = cursor.fetchone()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado ou não é do tipo correto.")
    
    paciente_id_banco, data_nascimento_banco = paciente
    idade_paciente = calcular_idade(data_nascimento_banco)
    score_calculado = calcular_prioridade_sus(dados.indicacao_clinica, idade_paciente)
    
    try:
        cursor.execute("UPDATE usuarios SET historico_medico = %s WHERE id = %s", (dados.indicacao_clinica, dados.paciente_id))
        
        cursor.execute("""
            INSERT INTO agendamentos (
                paciente_id, unidade_id, profissional_id, data_hora, 
                especialidade, status, prioridade
            ) VALUES (%s, %s, %s, %s, %s, 'fila_espera', %s)
        """, (
            dados.paciente_id, dados.unidade_id, dados.profissional_id, 
            dados.data_hora, dados.especialidade, score_calculado
        ))
        db.commit()
        
        return {
            "mensagem": "Procedimento médico alocado com sucesso seguindo os critérios de prioridade do SUS!",
            "agendamento_id": cursor.lastrowid,
            "prioridade_score": score_calculado
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no banco de dados: {str(e)}")

@router.get("/{agendamento_id}")
def obter_agendamento(agendamento_id: int, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT a.id, a.data_hora, a.especialidade, a.status, a.prioridade, u.nome AS nome_paciente
        FROM agendamentos a
        JOIN usuarios u ON a.paciente_id = u.id
        WHERE a.id = %s
    """, (agendamento_id,))
    agendamento = cursor.fetchone()
    
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    return dict(agendamento)

@router.patch("/{agendamento_id}/status")
def atualizar_status_agendamento(agendamento_id: int, dados: AtualizarStatus, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM agendamentos WHERE id = %s", (agendamento_id,))
    
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        
    cursor.execute("UPDATE agendamentos SET status = %s WHERE id = %s", (dados.status, agendamento_id))
    db.commit()
    return {"mensagem": f"Status do agendamento atualizado para '{dados.status}'."}