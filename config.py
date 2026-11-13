# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SECRET_KEY: str
    DATABASE_URL: str
    ALGORITHM: str = "HS256"
    ADMIN_SENHA: str | None = None
    ADMIN_MATRICULA: str = "000001"
    ADMIN_NOME: str = "Administrador"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Esta linha diz ao Pydantic para ignorar qualquer variável extra (como o vite_api_url)
    model_config = SettingsConfigDict(extra="ignore", env_file=".env")

settings = Settings()
