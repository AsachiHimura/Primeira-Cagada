from fastapi import APIRouter, Depends
import sqlite3
from database import obter_conexao
import schemas

router = APIRouter(prefix="/api/profissionais", tags=["Profissionais"])

@router.post("/cadastro", status_code=201)
def cadastrar_profissional(prof: schemas.ProfissionalCadastro, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO profissionais (unidade_id, nome, cargo, permissao) VALUES (?, ?, ?, ?)",
        (prof.unidade_id, prof.nome, prof.cargo, prof.permissao)
    )
    db.commit()
    return {"mensagem": f"Profissional {prof.nome} cadastrado com permissão de {prof.permissao}!"}