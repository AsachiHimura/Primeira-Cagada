import os
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import sqlite3
from database import obter_conexao


load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_bearer = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

def gerar_hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)

def verificar_senha(senha_limpa: str, senha_criptografada: str) -> bool:
    return pwd_context.verify(senha_limpa, senha_criptografada)

def criar_token_acesso(dados: dict, tempo_expiracao_minutos: int = 120) -> str:
    dados_copia = dados.copy()
    expiracao = datetime.utcnow() + timedelta(minutes=tempo_expiracao_minutos)
    dados_copia.update({"exp": expiracao})
    return jwt.encode(dados_copia, SECRET_KEY, algorithm=ALGORITHM)

def obter_usuario_logado(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: sqlite3.Connection = Depends(obter_conexao)
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("sub")
        role = payload.get("role")
        unidade_id = payload.get("unidade_id")
        
        if not usuario_id or not role:
            raise HTTPException(status_code=401, detail="Token inválido: informações ausentes.")
            
    
        return {"usuario_id": usuario_id, "role": role, "unidade_id": unidade_id}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="O seu token expirou. Faça login novamente.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token de segurança corrompido.")

class PermissaoRequerida:
    def __init__(self, roles_permitidos: list):
        self.roles_permitidos = roles_permitidos

    def __call__(self, usuario: dict = Depends(obter_usuario_logado)):
        if usuario["role"] not in self.roles_permitidos:
            raise HTTPException(
                status_code=403, 
                detail="Acesso negado: Seu perfil não tem permissão para esta ação."
            )
        return usuario