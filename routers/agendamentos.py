from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from datetime import datetime
from database import obter_conexao
import schemas

router = APIRouter(prefix="/api/agendamentos", tags=["Agendamentos Clínicos"])

def calcular_idade(data_nascimento_str: str) -> int:
    """Calcula a idade da paciente com base na data de nascimento (AAAA-MM-DD)."""
    try:
        data_nasci = datetime.strptime(data_nascimento_str, "%Y-%m-%d")
        hoje = datetime.now()
        return hoje.year - data_nasci.year - ((hoje.month, hoje.day) < (data_nasci.month, data_nasci.day))
    except ValueError:
        return 0

def calcular_prioridade_sus(indicacao: str, idade: int) -> int:
    """
    Regra de Negócio Avançada:
    Cruza o diagnóstico do profissional com a idade da paciente.
    """
    texto = indicacao.lower()
    score = 0
    
    #  Pontuação por faixa etária de risco para Mamografia (Rastreamento do SUS)
    if 50 <= idade <= 69:
        score += 30  # População-alvo prioritária para rastreamento
    elif idade > 69:
        score += 15
    else:
        score += 10  # Pacientes jovens têm score base menor, a menos que haja sintoma
        
    #  Gravidade baseada no diagnóstico/resposta do profissional
    if "nódulo" in texto or "nodulo" in texto:
        score += 40
    if "câncer" in texto or "cancer" in texto or "carcinoma" in texto:
        score += 60  # Gravidade máxima imediata
    if "suspeita" in texto:
        score += 20
    if "urgente" in texto or "urgência" in texto:
        score += 15
        
    return score

@router.post("/agendar", response_model=schemas.RespostaAgendamento, status_code=201)
def criar_agendamento(dados: schemas.NovoAgendamento, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    
    cursor.execute("SELECT id, data_nascimento FROM usuarios WHERE id = ? AND tipo = 'paciente'", (dados.paciente_id,))
    paciente = cursor.fetchone()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente não encontrado ou não é do tipo correto.")
    
    paciente_id_banco, data_nascimento_banco = paciente
    
    idade_paciente = calcular_idade(data_nascimento_banco)
    
    score_calculado = calcular_prioridade_sus(dados.indicacao_clinica, idade_paciente)
    
    try:
        cursor.execute("""
            INSERT INTO agendamentos (
                paciente_id, unidade_id, profissional_id, data_hora, 
                status, prioridade, procedimento, indicacao_clinica
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dados.paciente_id, dados.unidade_id, dados.profissional_id, 
            dados.data_hora.strftime("%Y-%m-%d %H:%M:%S") if hasattr(dados.data_hora, 'strftime') else dados.data_hora, 
            dados.status, score_calculado, dados.procedimento, dados.indicacao_clinica
        ))
        db.commit()
        
        return {
            "mensagem": "Procedimento médico alocado com sucesso seguindo os critérios de prioridade do SUS!",
            "agendamento_id": cursor.lastrowid,
            "prioridade_score": score_calculado
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no banco de dados: {str(e)}")