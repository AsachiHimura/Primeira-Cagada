from fastapi import APIRouter, HTTPException, Depends
import sqlite3
from database import obter_conexao
import schemas

router = APIRouter(prefix="/api/unidades", tags=["Unidades"])

@router.post("/cadastro", status_code=201)
def cadastrar_unidade(unidade: schemas.UnidadeCadastro, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO unidades (nome, codigo_cnes, senha_login) VALUES (?, ?, ?)",
            (unidade.nome, unidade.codigo_cnes, unidade.senha_login)
        )
        db.commit()
        return {"mensagem": "Unidade de saúde cadastrada!", "unidade_id": cursor.lastrowid}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Este código CNES já está cadastrado.")

@router.post("/login")
def login_unidade(login: schemas.UnidadeLogin, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM unidades WHERE codigo_cnes = ? AND senha_login = ?", (login.codigo_cnes, login.senha_login))
    unidade = cursor.fetchone()
    if not unidade:
        raise HTTPException(status_code=401, detail="Código CNES ou senha incorretos.")
    return {"mensagem": "Login efetuado com sucesso!", "unidade": dict(unidade)}