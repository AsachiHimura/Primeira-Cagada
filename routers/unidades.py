from fastapi import APIRouter, HTTPException, Depends
import sqlite3
import random
import string
import hashlib
from database import obter_conexao
import schemas

router = APIRouter(prefix="/api/unidades", tags=["Unidades"])

def gerar_senha_aleatoria(tamanho=10):
    caracteres = string.ascii_letters + string.digits
    return ''.join(random.choice(caracteres) for _ in range(tamanho))

def gerar_hash_senha(senha: str) -> str:
    return hashlib.sha256(senha.encode()).hexdigest()

def gerar_cnes(cursor) -> str:
    while True:
        cnes = f"{random.randint(1000000, 9999999)}"
        cursor.execute("SELECT id FROM unidades WHERE codigo_cnes = ?", (cnes,))
        if not cursor.fetchone():
            return cnes

@router.post("/cadastro", response_model=schemas.UnidadeCriada, status_code=201)
def cadastrar_unidade(unidade: schemas.UnidadeCadastro, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    
    cnes_gerado = gerar_cnes(cursor)
    senha_crua = gerar_senha_aleatoria()
    senha_hash = gerar_hash_senha(senha_crua)
    
    try:
        cursor.execute(
            "INSERT INTO unidades (nome, codigo_cnes, senha_login) VALUES (?, ?, ?)",
            (unidade.nome, cnes_gerado, senha_hash)
        )
        db.commit()
        unidade_id = cursor.lastrowid
        
        return {
            "id": unidade_id,
            "nome": unidade.nome,
            "codigo_cnes": cnes_gerado,
            "senha_gerada": senha_crua,
            "mensagem": "Guarde a sua palavra-passe! Ela está encriptada na base de dados e não poderá ser recuperada."
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no banco de dados: {str(e)}")

@router.post("/login")
def login_unidade(login: schemas.UnidadeLogin, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    senha_hash = gerar_hash_senha(login.senha_login)
    
    cursor.execute("SELECT id, nome, codigo_cnes FROM unidades WHERE codigo_cnes = ? AND senha_login = ?", (login.codigo_cnes, senha_hash))
    unidade = cursor.fetchone()
    
    if not unidade:
        raise HTTPException(status_code=401, detail="Código CNES ou senha incorretos.")
        
    return {"mensagem": "Login efetuado com sucesso!", "unidade": dict(unidade)}