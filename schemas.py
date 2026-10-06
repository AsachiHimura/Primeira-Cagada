from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional, List
import re

# --- UNIDADES (POSTOS DE SAÚDE) ---
class UnidadeCadastro(BaseModel):
    # O utilizador só envia o nome. O CNES e a palavra-passe serão gerados pelo Back-end!
    nome: str = Field(..., min_length=3, max_length=100)

class UnidadeCriada(BaseModel):
    id: int
    nome: str
    codigo_cnes: str
    senha_gerada: str
    mensagem: str = "Guarde a sua palavra-passe! Ela está encriptada na base de dados e não poderá ser recuperada."

class UnidadeLogin(BaseModel):
    codigo_cnes: str
    senha_login: str


# --- PROFISSIONAIS (FUNCIONÁRIOS) ---
class ProfissionalCadastro(BaseModel):
    unidade_id: Optional[int] = None 
    nome: str
    cargo: str
    permissao: str

    @field_validator('cargo')
    @classmethod
    def validar_cargo_saude(cls, v: str) -> str:
        cargo_limpo = v.strip().lower()
        # Adicionei 'ceo' e 'adm' nesta lista para garantir:
        if cargo_limpo not in ['medico', 'médico', 'enfermeiro', 'enfermeira', 'gestor', 'recepcionista', 'rececionista', 'admin', 'ceo']:
            raise ValueError("O cargo deve ser 'medico', 'enfermeiro', 'gestor', 'recepcionista', 'admin' ou 'ceo'.")
        return cargo_limpo
    
    @field_validator('permissao')
    @classmethod
    def validar_permissao_sistema(cls, v: str) -> str:
        permissao_limpa = v.strip().lower()
        # Aqui estão os três níveis oficiais do sistema
        if permissao_limpa not in ['recepcao', 'clinico', 'gestor', 'admin']:
            raise ValueError("Permissão inválida.")
        return permissao_limpa
    
class ProfissionalCriado(BaseModel):
    id: int
    nome: str
    matricula_gerada: str
    senha_gerada: str
    mensagem: str = "Guarde a sua matrícula e palavra-passe para iniciar sessão no sistema."

class ProfissionalLogin(BaseModel):
    matricula: str
    senha: str


# --- PACIENTES E AGENDAMENTOS (MANTIDOS INTACTOS) ---
class PacienteCadastro(BaseModel):
    unidade_id: int
    nome: str = Field(..., min_length=3, max_length=100)
    idade: int
    cpf: str
    data_nascimento: date
    telefone: str
    endereco: str
    cep: str
    historico_medico: Optional[str] = ""

    @field_validator('cpf')
    @classmethod
    def validar_cpf_receita(cls, v: str) -> str:
        cpf_limpo = re.sub(r'\D', '', v)
        if len(cpf_limpo) != 11:
            raise ValueError('O CPF precisa de conter exatamente 11 dígitos numéricos.')
        if cpf_limpo == cpf_limpo[0] * 11:
            raise ValueError('CPF inválido (Todos os dígitos são repetidos).')
        for i in range(9, 11):
            soma = sum(int(cpf_limpo[num]) * ((i + 1) - num) for num in range(i))
            digito = ((soma * 10) % 11) % 10
            if digito != int(cpf_limpo[i]):
                raise ValueError('CPF inválido. Verifique os dígitos inseridos.')
        return cpf_limpo

class PacienteUpdate(BaseModel):
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cep: Optional[str] = None
    historico_medico: Optional[str] = None

class NovoAgendamento(BaseModel):
    paciente_id: int
    unidade_id: int
    profissional_id: int
    data_hora: str       
    especialidade: str       
    indicacao_clinica: str

class RespostaAgendamento(BaseModel):
    mensagem: str
    agendamento_id: int
    prioridade_score: int



class RequisicaoMamografiaCadastro(BaseModel):
    agendamento_id: int
    paciente_id: int
    profissional_id: int
    nodulo_mama_direita: bool = False
    nodulo_mama_esquerda: bool = False
    risco_elevado: Optional[str] = None
    mamas_examinadas: Optional[str] = None
    fez_mamografia: Optional[str] = None
    ano_ultima_mamografia: Optional[str] = None
    fez_radioterapia: Optional[str] = None
    ano_radioterapia_direita: Optional[str] = None
    ano_radioterapia_esquerda: Optional[str] = None
    fez_cirurgia: Optional[str] = None
    cirurgias_mama_direita: Optional[str] = None
    cirurgias_mama_esquerda: Optional[str] = None
    indicacao_clinica: Optional[str] = None