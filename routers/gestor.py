import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, Depends, HTTPException
from database import obter_conexao
from auth import PermissaoRequerida
import schemas

router = APIRouter(prefix="/api/gestor", tags=["Gestão Administrativa"])

@router.get("/relatorio", dependencies=[Depends(PermissaoRequerida(["admin", "gestor"]))])
def relatorio_gestor(db = Depends(obter_conexao)):
    cursor = db.cursor()
    
    # Exemplo adaptado para o PostgreSQL usando tuplas (cursor padrão)
    cursor.execute("SELECT COUNT(*) FROM pacientes")
    row_pacientes = cursor.fetchone()
    total_pacientes = row_pacientes[0] if row_pacientes else 0
    
    cursor.execute("SELECT COUNT(*) FROM agendamentos")
    row_agendamentos = cursor.fetchone()
    total_agendamentos = row_agendamentos[0] if row_agendamentos else 0
    
    return {
        "total_pacientes": total_pacientes,
        "total_agendamentos": total_agendamentos
    }