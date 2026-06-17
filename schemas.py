from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional
import re

class UnidadeCadastro(BaseModel):
    nome: str = Field(..., min_length=3, max_length=100)
    codigo_cnes: str
    senha_login: str

    @field_validator('codigo_cnes')
    @classmethod
    def validar_cnes_posto(cls, v: str) -> str:
        """Trava do MS: Limpa e garante que o CNES tenha exatamente 7 dígitos."""
        cnes_limpo = re.sub(r'\D', '', v)
        if len(cnes_limpo) != 7:
            raise ValueError('O código CNES do posto precisa ter exatamente 7 dígitos numéricos.')
        return cnes_limpo

class UnidadeLogin(BaseModel):
    codigo_cnes: str
    senha_login: str

class ProfissionalCadastro(BaseModel):
    unidade_id: int
    nome: str
    cargo: str  # Validado abaixo
    permissao: str

    @field_validator('cargo')
    @classmethod
    def validar_cargo_saude(cls, v: str) -> str:
        """Garante que o cargo inserido esteja no escopo clínico do SUS."""
        cargo_limpo = v.strip().lower()
        if cargo_limpo not in ['medico', 'médico', 'enfermeiro', 'enfermeira', 'gestor']:
            raise ValueError("O cargo deve ser 'medico', 'enfermeiro' ou 'gestor'.")
        return cargo_limpo

class PacienteCadastro(BaseModel):
    unidade_id: int
    nome: str = Field(..., min_length=3, max_length=100)
    cpf: str
    data_nascimento: date
    telefone: str
    endereco: str

    @field_validator('cpf')
    @classmethod
    def validar_cpf_receita(cls, v: str) -> str:
        """Validação Matemática Real de CPF (Algoritmo da Receita Federal)."""
        cpf_limpo = re.sub(r'\D', '', v)
        
        if len(cpf_limpo) != 11:
            raise ValueError('O CPF precisa conter exatamente 11 dígitos numéricos.')
            
        if cpf_limpo == cpf_limpo[0] * 11:
            raise ValueError('CPF inválido (Todos os dígitos são repetidos).')
            
        # Cálculo dos dois dígitos verificadores
        for i in range(9, 11):
            soma = sum(int(cpf_limpo[num]) * ((i + 1) - num) for num in range(i))
            digito = ((soma * 10) % 11) % 10
            if digito != int(cpf_limpo[i]):
                raise ValueError('CPF inválido. Verifique os dígitos digitados.')
                
        return cpf_limpo

class PacienteUpdate(BaseModel):
    telefone: Optional[str] = None
    endereco: Optional[str] = None

class NovoAgendamento(BaseModel):
    paciente_id: int
    unidade_id: int
    profissional_id: int
    data_hora: str       
    status: str             
    prioridade: int         
    procedimento: str       
    indicacao_clinica: str

class RespostaAgendamento(BaseModel):
    mensagem: str
    agendamento_id: int
    prioridade_score: int  