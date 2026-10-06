from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import inicializar_banco

# Importar diretamente cada router da pasta routersapython -m uvicorn main:app --reload
from routers import (
    admin, 
    requisicoes, 
    unidades, 
    profissionais, 
    pacientes, 
    agendamentos, 
    fila, 
    assistente, 
    gestor
)

app = FastAPI(
    title="PET-Saúde Fortaleza - Fila de Mamografia",
    description="Uma baguncinha está sendo realizada na base de café e falta de sossego",
    version="1.7.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

inicializar_banco()

# Incluir as rotas usando diretamente o objeto importado
app.include_router(admin.router)
app.include_router(requisicoes.router)
app.include_router(unidades.router)
app.include_router(profissionais.router)
app.include_router(pacientes.router)
app.include_router(agendamentos.router)
app.include_router(fila.router)
app.include_router(assistente.router)
app.include_router(gestor.router)