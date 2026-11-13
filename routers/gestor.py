from fastapi import APIRouter, Depends, HTTPException
from database import obter_conexao
from auth import PermissaoRequerida

router = APIRouter(prefix="/api/gestor", tags=["Gestão Administrativa"])

@router.get("/relatorio")
def relatorio_gestor(db=Depends(obter_conexao), usuario=Depends(PermissaoRequerida(["admin", "gestor"]))):
    cursor = db.cursor()
    unidade_id = usuario.get("unidade_id")
    if usuario.get("role") == "gestor" and not unidade_id:
        raise HTTPException(status_code=403, detail="Gestor sem unidade vinculada.")
    filtro_pacientes = " WHERE unidade_id = %s" if unidade_id and usuario.get("role") != "admin" else ""
    filtro_agendamentos = " WHERE unidade_id = %s" if unidade_id and usuario.get("role") != "admin" else ""
    parametros = (unidade_id,) if filtro_pacientes else ()
    cursor.execute(f"SELECT COUNT(*) AS total FROM pacientes{filtro_pacientes}", parametros)
    row_pacientes = cursor.fetchone()
    total_pacientes = row_pacientes["total"] if row_pacientes else 0
    cursor.execute(f"SELECT COUNT(*) AS total FROM agendamentos{filtro_agendamentos}", parametros)
    row_agendamentos = cursor.fetchone()
    total_agendamentos = row_agendamentos["total"] if row_agendamentos else 0
    
    return {
        "total_pacientes": total_pacientes,
        "total_agendamentos": total_agendamentos
    }
