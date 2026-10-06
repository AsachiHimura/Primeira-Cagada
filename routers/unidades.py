from fastapi import APIRouter, HTTPException, Depends
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
def listar_unidades(db = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT id, nome, codigo_cnes FROM unidades")
    rows = cursor.fetchall()
    
    return [
        {
            "id": row["id"],
            "nome": row["nome"],
            "codigo_cnes": row["codigo_cnes"]
        }
        for row in rows
    ]

@router.post("/cadastro", response_model=schemas.UnidadeCriada, status_code=201, dependencies=[Depends(PermissaoRequerida(["admin"]))])
def cadastrar_unidade(unidade: schemas.UnidadeCadastro, db = Depends(obter_conexao)):
    cursor = db.cursor()
    cnes_gerado = gerar_cnes(cursor)
    senha_crua = gerar_senha_aleatoria()
    senha_hash = gerar_hash_senha(senha_crua)
    try:
        cursor.execute(
            "INSERT INTO unidades (nome, codigo_cnes, senha_login) VALUES (%s, %s, %s) RETURNING id",
            (unidade.nome, cnes_gerado, senha_hash)
        )
        row = cursor.fetchone()
        db.commit()
        
        # Compatibilidade para obter o ID recém-inserido no PostgreSQL
        unidade_id = row[0] if row else cursor.lastrowid
        
        return {
            "id": unidade_id, 
            "nome": unidade.nome, 
            "codigo_cnes": cnes_gerado,
            "senha_gerada": senha_crua, 
            "mensagem": "Unidade criada com sucesso."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.post("/login")
def login_unidade(login: schemas.UnidadeLogin, db = Depends(database.obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT id, nome, codigo_cnes, senha_login FROM unidades WHERE codigo_cnes = %s", (login.codigo_cnes,))
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=401, detail="Código CNES ou senha incorretos.")
        
    unidade = {
        "id": row[0],
        "nome": row[1],
        "codigo_cnes": row[2],
        "senha_login": row[3]
    }
    
    if not verificar_senha(login.senha_login, unidade['senha_login']):
        raise HTTPException(status_code=401, detail="Código CNES ou senha incorretos.")
        
    return {"mensagem": "Login efetuado com sucesso!", "unidade": unidade}