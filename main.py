from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import inicializar_banco

# Importar todos os routers de uma só vez de forma limpa
import routers

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

# Incluir todas as rotas
app.include_router(routers.admin.router)
app.include_router(routers.requisicoes.router)
app.include_router(routers.unidades.router)
app.include_router(routers.profissionais.router)
app.include_router(routers.pacientes.router)
app.include_router(routers.agendamentos.router)
app.include_router(routers.fila.router)
app.include_router(routers.assistente.router)
app.include_router(routers.gestor.router)