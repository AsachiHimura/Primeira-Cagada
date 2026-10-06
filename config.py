# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ADMIN_SENHA: str = "admin123"
    ADMIN_MATRICULA: str = "000001"
    ADMIN_NOME: str = "Administrador"

    # Esta linha diz ao Pydantic para ignorar qualquer variável extra (como o vite_api_url)
    model_config = SettingsConfigDict(extra="ignore", env_file=".env")

settings = Settings()