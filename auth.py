import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import database
from config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

router = APIRouter(tags=["Autenticação"])
security_bearer = HTTPBearer()

def gerar_hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verificar_senha(senha_limpa: str, senha_criptografada: str) -> bool:
    return bcrypt.checkpw(senha_limpa.encode('utf-8'), senha_criptografada.encode('utf-8'))

def criar_token_acesso(dados: dict, tempo_expiracao_minutos: int = 120) -> str:
    dados_copia = dados.copy()
    expiracao = datetime.utcnow() + timedelta(minutes=tempo_expiracao_minutos)
    dados_copia.update({"exp": expiracao})
    return jwt.encode(dados_copia, SECRET_KEY, algorithm=ALGORITHM)

def obter_usuario_logado(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

def validar_acesso_unidade(usuario: dict, unidade_id: int) -> None:
    if usuario.get("role") != "admin" and usuario.get("unidade_id") != unidade_id:
        raise HTTPException(status_code=403, detail="Unidade fora do seu acesso.")

class PermissaoRequerida:
    def __init__(self, roles_permitidos: list):
        self.roles_permitidos = roles_permitidos

    def __call__(self, usuario: dict = Depends(obter_usuario_logado)):
        if usuario.get("role") not in self.roles_permitidos:
            raise HTTPException(status_code=403, detail="Acesso negado: Perfil sem permissão.")
        return usuario

class RecuperarSenhaRequest(BaseModel):
    identificador: str

@router.post("/api/recuperar-senha")
def recuperar_senha(dados: RecuperarSenhaRequest, db=Depends(database.obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM unidades WHERE codigo_cnes = %s", (dados.identificador,))
    unidade = cursor.fetchone()
    if unidade:
        return {"mensagem": "Para redefinir a senha da unidade, entre em contato com o administrador."}
    cursor.execute("SELECT id FROM profissionais WHERE matricula = %s", (dados.identificador,))
    prof = cursor.fetchone()
    if prof:
        return {"mensagem": "Para redefinir a senha, entre em contato com o administrador."}
    return {"mensagem": "Se o identificador existir, entre em contato com o administrador para redefinir a senha."}
