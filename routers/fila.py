from fastapi import APIRouter, Depends, HTTPException
from database import obter_conexao
from auth import PermissaoRequerida, validar_acesso_unidade

router = APIRouter(prefix="/api/unidades", tags=["Fila e Monitoramento"])


@router.get("/{unidade_id}/fila-atual")
def observacao_fila_atual(
    unidade_id: int,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor", "clinico", "recepcao"])),
):
    validar_acesso_unidade(usuario, unidade_id)
    cursor = db.cursor()
    cursor.execute("SELECT id FROM unidades WHERE id = %s", (unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")

    cursor.execute(
        """SELECT a.id AS agendamento_id, a.data_hora, a.prioridade_score, a.status,
                  p.nome AS paciente_nome, p.cpf AS paciente_cpf, p.idade,
                  p.telefone, p.endereco, p.cep
           FROM agendamentos a
           JOIN pacientes p ON a.paciente_id = p.id
           WHERE a.unidade_id = %s AND a.status != 'Cancelado'
           ORDER BY a.prioridade_score DESC, a.data_hora ASC""",
        (unidade_id,),
    )

    fila = []
    for row in cursor.fetchall():
        pendentes = [
            nome for nome, valor in (
                ("Telefone", row["telefone"]),
                ("Endereço", row["endereco"]),
                ("CEP", row["cep"]),
                ("Idade", row["idade"]),
            ) if not valor or str(valor).strip().lower() in ("string", "none", "null")
        ]
        fila.append({
            "agendamento_id": row["agendamento_id"],
            "data_hora": row["data_hora"],
            "prioridade_score": row["prioridade_score"],
            "status": row["status"],
            "paciente_nome": row["paciente_nome"],
            "paciente_cpf": row["paciente_cpf"],
            "idade": row["idade"],
            "cadastro_incompleto": bool(pendentes),
            "dados_pendentes": pendentes,
        })

    return {"unidade_id": unidade_id, "total_na_fila": len(fila), "pacientes": fila}
