from fastapi import APIRouter, Depends, HTTPException
import sqlite3
import random
import string
import hashlib
from database import obter_conexao
import schemas

router = APIRouter(prefix="/api/profissionais", tags=["Profissionais"])

def gerar_senha_aleatoria(tamanho=8):
    caracteres = string.ascii_letters + string.digits
    return ''.join(random.choice(caracteres) for _ in range(tamanho))

def gerar_hash_senha(senha: str) -> str:
    return hashlib.sha256(senha.encode()).hexdigest()

def gerar_matricula(cursor) -> str:
    while True:
        matricula = str(random.randint(100000, 999999))
        cursor.execute("SELECT id FROM profissionais WHERE matricula = ?", (matricula,))
        if not cursor.fetchone():
            return matricula

@router.post("/cadastro", response_model=schemas.ProfissionalCriado, status_code=201)
def cadastrar_profissional(prof: schemas.ProfissionalCadastro, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    
    cursor.execute("SELECT id FROM unidades WHERE id = ?", (prof.unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Unidade de saúde não encontrada no sistema.")
        
    senha_crua = gerar_senha_aleatoria()
    senha_hash = gerar_hash_senha(senha_crua)
    matricula_gerada = gerar_matricula(cursor)
    
    try:
        cursor.execute(
            "INSERT INTO profissionais (unidade_id, nome, cargo, permissao, matricula, senha) VALUES (?, ?, ?, ?, ?, ?)",
            (prof.unidade_id, prof.nome, prof.cargo, prof.permissao, matricula_gerada, senha_hash)
        )
        db.commit()
        profissional_id = cursor.lastrowid
        
        return {
            "id": profissional_id,
            "nome": prof.nome,
            "matricula_gerada": matricula_gerada,
            "senha_gerada": senha_crua,
            "mensagem": "Guarde a sua matrícula e palavra-passe para iniciar sessão no sistema."
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no banco de dados: {str(e)}")

@router.post("/login")
def login_profissional(dados: schemas.ProfissionalLogin, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    # Garante que o cursor retorna linhas que aceitam acesso por nome de coluna
    cursor.row_factory = sqlite3.Row 
    
    senha_hash = gerar_hash_senha(dados.senha)
    
    cursor.execute("""
        SELECT id, nome, cargo, unidade_id, permissao 
        FROM profissionais 
        WHERE matricula = ? AND senha = ?
    """, (dados.matricula, senha_hash))
    
    prof = cursor.fetchone()
    
    if not prof:
        raise HTTPException(status_code=401, detail="Matrícula ou senha incorretos.")
        
    # Extrai o dado de forma limpa
    permissao = prof['permissao'] 
    
    return {
        "mensagem": "Login aprovado com sucesso", 
        "profissional": dict(prof),
        "permissao": permissao  # <--- ISSO É O QUE O REACT VAI USAR PARA MOSTRAR A ABA DO GESTOR
    }