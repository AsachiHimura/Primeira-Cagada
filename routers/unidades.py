from fastapi import APIRouter, HTTPException, Depends
import sqlite3
import random
import string
from database import obter_conexao
from auth import PermissaoRequerida, gerar_hash_senha, verificar_senha
import database
import schemas

router = APIRouter(prefix="/api/unidades", tags=["Unidades"])

def gerar_senha_aleatoria(tamanho=10):
    return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(tamanho))

def gerar_cnes(cursor) -> str:
    while True:
        cnes = f"{random.randint(1000000, 9999999)}"
        cursor.execute("SELECT id FROM unidades WHERE codigo_cnes = %s", (cnes,))
        if not cursor.fetchone():
            return cnes

@router.get("/listar", dependencies=[Depends(PermissaoRequerida(["admin"]))])
def listar_unidades(db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.row_factory = sqlite3.Row
    cursor.execute("SELECT * FROM unidades")
    return [dict(u) for u in cursor.fetchall()]

@router.post("/cadastro", response_model=schemas.UnidadeCriada, status_code=201, dependencies=[Depends(PermissaoRequerida(["admin"]))])
def cadastrar_unidade(unidade: schemas.UnidadeCadastro, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    cnes_gerado = gerar_cnes(cursor)
    senha_crua = gerar_senha_aleatoria()
    senha_hash = gerar_hash_senha(senha_crua)
    try:
        cursor.execute("INSERT INTO unidades (nome, codigo_cnes, senha_login) VALUES (%s, %s, %s)",
                       (unidade.nome, cnes_gerado, senha_hash))
        db.commit()
        return {
            "id": cursor.lastrowid, "nome": unidade.nome, "codigo_cnes": cnes_gerado,
            "senha_gerada": senha_crua, "mensagem": "Unidade criada com sucesso."
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.post("/login")
def login_unidade(login: schemas.UnidadeLogin, db: sqlite3.Connection = Depends(database.obter_conexao)):
    cursor = db.cursor()
    cursor.row_factory = sqlite3.Row
    cursor.execute("SELECT id, nome, codigo_cnes, senha_login FROM unidades WHERE codigo_cnes = %s",
                   (login.codigo_cnes,))
    unidade = cursor.fetchone()
    if not unidade or not verificar_senha(login.senha_login, unidade['senha_login']):
        raise HTTPException(status_code=401, detail="Código CNES ou senha incorretos.")
    return {"mensagem": "Login efetuado com sucesso!", "unidade": dict(unidade)}