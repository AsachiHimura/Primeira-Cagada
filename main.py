from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import inicializar_banco

from routers import unidades, profissionais, pacientes, agendamentos, fila, assistente

app = FastAPI(
    title="PET-Saúde Fortaleza - Fila de Mamografia",
    description="Uma baguncinha está sendo realizada na base de café, misoginia e falta de sossego",
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

app.include_router(unidades.router)
app.include_router(profissionais.router)
app.include_router(pacientes.router)
app.include_router(agendamentos.router)
app.include_router(fila.router)
app.include_router(assistente.router)