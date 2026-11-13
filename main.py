from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import inicializar_banco
from config import settings
from auth import router as auth_router

# Importar diretamente cada router da pasta routersapython -m uvicorn main:app --reload
from routers import (
    requisicoes, 
    unidades, 
    profissionais, 
    pacientes, 
    agendamentos, 
    fila, 
    assistente, 
    gestor
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    inicializar_banco()
    yield

app = FastAPI(
    title="PET-Saúde Fortaleza - Fila de Mamografia",
    description="Uma baguncinha está sendo realizada na base de café e falta de sossego",
    version="1.7.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origem.strip() for origem in settings.CORS_ORIGINS.split(",") if origem.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir as rotas usando diretamente o objeto importado
app.include_router(auth_router)
app.include_router(requisicoes.router)
app.include_router(unidades.router)
app.include_router(profissionais.router)
app.include_router(pacientes.router)
app.include_router(agendamentos.router)
app.include_router(fila.router)
app.include_router(assistente.router)
app.include_router(gestor.router)
