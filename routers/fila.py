from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import obter_conexao

router = APIRouter(prefix="/api/unidades", tags=["Fila e Monitoramento"])

@router.get("/{unidade_id}/fila-atual")
def observacao_fila_atual(unidade_id: int, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    
    # Valida se a unidade existe
    cursor.execute("SELECT id FROM unidades WHERE id = ?", (unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Unidade de saúde não cadastrada.")

    try:
        # Busca a fila trazendo os detalhes específicos da mamografia
        cursor.execute("""
            SELECT a.id, a.data_hora, a.prioridade, a.procedimento, a.indicacao_clinica, u.nome AS nome_paciente
            FROM agendamentos a
            JOIN usuarios u ON a.paciente_id = u.id
            WHERE a.unidade_id = ? AND a.status = 'fila_espera'
            ORDER BY a.prioridade DESC, a.data_hora ASC
        """, (unidade_id,))
        
        fila = [dict(row) for row in cursor.fetchall()]
        return {"unidade_id": unidade_id, "total_na_fila": len(fila), "fila": fila}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar fila no banco: {str(e)}")