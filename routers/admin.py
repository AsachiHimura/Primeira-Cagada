import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, Depends
from auth import PermissaoRequerida
# Importe as funções de lógica que você já tem prontas nos outros arquivos
# Ex: from routers.profissionais import listar_profissionais
# Ex: from routers.pacientes import cadastrar_paciente, atualizar_paciente

router = APIRouter(prefix="/api/gestor", tags=["Gestão Administrativa"])

# --- Visualização de Profissionais (Somente visualização) ---
@router.get("/profissionais", dependencies=[Depends(PermissaoRequerida(["gestor", "admin"]))])
def listar_profissionais_gestor():
    # Chama a função original que lista profissionais
    return {"mensagem": "Listagem de profissionais para visualização"}

# --- Pacientes (Acesso total para gestão) ---
@router.post("/pacientes/cadastro", dependencies=[Depends(PermissaoRequerida(["gestor", "admin"]))])
def cadastrar_paciente_gestor():
    # Chama a função original de cadastro de paciente
    return {"mensagem": "Paciente cadastrado"}

# --- Agendamentos (Acesso total para gestão) ---
@router.get("/agendamentos", dependencies=[Depends(PermissaoRequerida(["gestor", "admin"]))])
def listar_agendamentos_gestor():
    return {"mensagem": "Listagem de agendamentos"}

# --- Assistente (Acesso total) ---
@router.post("/assistente", dependencies=[Depends(PermissaoRequerida(["gestor", "admin"]))])
def falar_com_assistente():
    return {"mensagem": "Resposta do assistente"}