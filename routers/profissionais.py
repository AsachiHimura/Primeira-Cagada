from fastapi import APIRouter, Depends, HTTPException
import random
import string
from auth import gerar_hash_senha, verificar_senha
from database import obter_conexao
import schemas

router = APIRouter(prefix="/api/profissionais", tags=["Profissionais"])

def gerar_senha_aleatoria(tamanho=8):
    caracteres = string.ascii_letters + string.digits
    return ''.join(random.choice(caracteres) for _ in range(tamanho))

def gerar_matricula(cursor) -> str:
    while True:
        matricula = str(random.randint(100000, 999999))
        cursor.execute("SELECT id FROM profissionais WHERE matricula = %s", (matricula,))
        if not cursor.fetchone():
            return matricula

@router.post("/cadastro", response_model=schemas.ProfissionalCriado, status_code=201)
def cadastrar_profissional(prof: schemas.ProfissionalCadastro, db = Depends(obter_conexao)):
    cursor = db.cursor()
    
    if prof.permissao == "gestor" and not prof.unidade_id:
        raise HTTPException(status_code=400, detail="Erro: É obrigatório vincular o gestor a uma unidade de saúde!")

    cursor.execute("SELECT id FROM profissionais WHERE nome = %s", (prof.nome,))
    if cursor.fetchone():
        raise HTTPException(status_code=409, detail="Erro: Já existe um profissional cadastrado com este exato nome.")

    if prof.permissao == "gestor" and prof.unidade_id:
        cursor.execute("SELECT id FROM profissionais WHERE unidade_id = %s AND permissao = 'gestor'", (prof.unidade_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Erro: Esta unidade já possui um gestor cadastrado.")

    if prof.unidade_id:
        cursor.execute("SELECT id FROM unidades WHERE id = %s", (prof.unidade_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    
    senha_crua = gerar_senha_aleatoria()
    senha_hash = gerar_hash_senha(senha_crua) 
    matricula_gerada = gerar_matricula(cursor)
    
    try:
        cursor.execute(
            "INSERT INTO profissionais (unidade_id, nome, cargo, permissao, matricula, senha) VALUES (%s, %s, %s, %s, %s, %s)",
            (prof.unidade_id, prof.nome, prof.cargo, prof.permissao, matricula_gerada, senha_hash)
        )
        db.commit()
        return {
            "id": getattr(cursor, "lastrowid", None),
            "nome": prof.nome,
            "matricula_gerada": matricula_gerada,
            "senha_gerada": senha_crua,
            "mensagem": "Profissional Criado Com Sucesso."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro interno ao salvar no banco de dados.")

@router.post("/login")
def login_profissional(dados: schemas.ProfissionalLogin, db = Depends(obter_conexao)):
    cursor = db.cursor()
    
    cursor.execute(
        "SELECT id, unidade_id, nome, cargo, permissao, matricula, senha FROM profissionais WHERE matricula = %s", 
        (dados.matricula,)
    )
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=401, detail="Matrícula ou senha incorretos.")
        
    # Acedemos aos dados pelas chaves do dicionário
    prof = {
        "id": row["id"],
        "unidade_id": row["unidade_id"],
        "nome": row["nome"],
        "cargo": row["cargo"],
        "permissao": row["permissao"],
        "matricula": row["matricula"],
        "senha": row["senha"]
    }
    
    if not verificar_senha(dados.senha, prof['senha']):
        raise HTTPException(status_code=401, detail="Matrícula ou senha incorretos.")
         
    unidade = None
    if prof['unidade_id']:
        cursor.execute("SELECT id, nome FROM unidades WHERE id = %s", (prof['unidade_id'],))
        u_row = cursor.fetchone()
        if u_row:
            unidade = {
                "id": u_row["id"],
                "nome": u_row["nome"]
            }
    
    from auth import criar_token_acesso
    token = criar_token_acesso({
        "sub": prof['matricula'],
        "role": prof['permissao'],
        "profissional_id": prof['id'],
        "unidade_id": prof['unidade_id'],
    })
    
    return {
        "mensagem": "Login aprovado",
        "access_token": token,
        "profissional": prof,
        "unidade": unidade
    }