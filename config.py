# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ADMIN_SENHA: str = "admin123"
    ADMIN_MATRICULA: str = "000001"
    ADMIN_NOME: str = "Administrador"

    class Config:
        env_file = ".env"

settings = Settings()