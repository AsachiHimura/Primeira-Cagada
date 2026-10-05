from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
import sqlite3
from database import obter_conexao

router = APIRouter(prefix="/assistente", tags=["Assistente Virtual (Sigma)"])

class MensagemUsuario(BaseModel):
    cpf: Optional[str] = ""
    texto: str

def buscar_paciente_por_cpf(cpf: str, db: sqlite3.Connection):
    cursor = db.cursor()
    cursor.execute("SELECT id, nome, idade, telefone, endereco, cep FROM pacientes WHERE cpf = %s", (cpf,))
    return cursor.fetchone()

def verificar_cadastro_incompleto(paciente):
    valores_invalidos = ["", "string", "none", "null"]
    campos_texto = ["nome", "telefone", "endereco", "cep"]
    dados_faltantes = []
    
    for campo in campos_texto:
        try:
            valor = paciente[campo]
            if valor is None or str(valor).strip().lower() in valores_invalidos:
                dados_faltantes.append(campo.capitalize())
        except:
            dados_faltantes.append(campo.capitalize())
            
    try:
        idade = paciente["idade"]
        if idade is None or int(idade) == 0:
            dados_faltantes.append("Idade")
    except:
        dados_faltantes.append("Idade")
        
    return dados_faltantes

def listar_consultas_paciente(paciente_id: int, db: sqlite3.Connection):
    cursor = db.cursor()
    cursor.execute("SELECT id, data_hora, especialidade, status FROM agendamentos WHERE paciente_id = %s", (paciente_id,))
    return cursor.fetchall()

def cancelar_agendamento(agendamento_id: int, db: sqlite3.Connection):
    cursor = db.cursor()
    cursor.execute("UPDATE agendamentos SET status = 'Cancelado' WHERE id = %s", (agendamento_id,))
    db.commit()
    return cursor.rowcount > 0

@router.post("")
def conversar_com_assistente(dados: MensagemUsuario, db: sqlite3.Connection = Depends(obter_conexao)):
    texto = dados.texto.lower().strip()
    cpf_limpo = dados.cpf.strip() if dados.cpf else ""

    if not cpf_limpo or cpf_limpo.lower() == "string":
        return {
            "resposta_bot": "🤖 Olá! Sou o Sigma, o assistente virtual do seu Posto de Saúde.\n\nPara eu conseguir ajudá-lo, por favor, digite o seu CPF (apenas números)."
        }

    paciente = buscar_paciente_por_cpf(cpf_limpo, db)
    
    if not paciente:
        return {"resposta_bot": "⚠️ CPF não localizado no sistema. Por favor, verifique se digitou corretamente ou procure a receção do posto."}

    dados_faltantes = verificar_cadastro_incompleto(paciente)
    if dados_faltantes:
        campos_str = ", ".join(dados_faltantes)
        return {
            "resposta_bot": f"⚠️ AÇÃO BLOQUEADA: O cadastro de {paciente['nome']} está incompleto.\n"
                            f"Dados pendentes: {campos_str}.\n\n"
                            "Por favor, atualize o cadastro do paciente no sistema antes de prosseguir com qualquer atendimento ou agendamento."
        }

    consultas = listar_consultas_paciente(paciente["id"], db)

    if texto in ["status atual", "status", "ver minhas consultas"]:
        consultas_ativas = [c for c in consultas if c["status"] != "Cancelado"]
        
        if not consultas_ativas:
            return {"resposta_bot": f"O paciente {paciente['nome']} encontra-se na Fila de Espera aguardando triagem. Não há consultas confirmadas no momento."}
        
        lista = "\n".join([f"- {c['especialidade']} em {c['data_hora']} ({c['status']})" for c in consultas_ativas])
        return {"resposta_bot": f"Consultas ativas de {paciente['nome']}:\n{lista}"}

    elif texto in ["cancelar consulta", "cancelar"]:
        consultas_ativas = [c for c in consultas if c["status"] != "Cancelado"]
        if not consultas_ativas:
            return {"resposta_bot": f"O paciente {paciente['nome']} não possui consultas ativas para cancelar no sistema."}
        
        id_cancelar = consultas_ativas[0]["id"]
        sucesso = cancelar_agendamento(id_cancelar, db)
        
        if sucesso:
            return {"resposta_bot": f"✅ Sucesso! A consulta de {paciente['nome']} foi CANCELADA e a vaga libertada."}
        return {"resposta_bot": "Ocorreu um erro ao cancelar. Tente novamente."}

    elif texto in ["falar com o funcionario", "atendente", "humano"]:
        return {"resposta_bot": "Paciente encaminhado para atendimento presencial na receção."}

    else:
        menu = (
            f"📋 Painel de Ações - Paciente: {paciente['nome']}\n\n"
            "Comandos disponíveis:\n"
            "👉 'Status atual'\n"
            "👉 'Cancelar consulta'\n"
            "👉 'Falar com o funcionario'"
        )
        return {"resposta_bot": menu}

