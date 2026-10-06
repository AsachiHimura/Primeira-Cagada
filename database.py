import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Substitua pela sua senha real do Supabase
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.nyjmbuaoycghspnypaeh:r3ereqMZ4HzPh8yE@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
)

def obter_conexao():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

def inicializar_banco():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS unidades (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        codigo_cnes TEXT UNIQUE NOT NULL,
        senha_login TEXT NOT NULL
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profissionais (
        id SERIAL PRIMARY KEY,
        unidade_id INTEGER REFERENCES unidades (id),
        nome TEXT NOT NULL,
        cargo TEXT NOT NULL,
        permissao TEXT NOT NULL,
        matricula TEXT UNIQUE,
        senha TEXT
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pacientes (
        id SERIAL PRIMARY KEY,
        unidade_id INTEGER REFERENCES unidades (id),
        nome TEXT NOT NULL,
        idade INTEGER,
        cpf TEXT UNIQUE NOT NULL,
        data_nascimento TEXT NOT NULL,
        telefone TEXT,
        endereco TEXT,
        cep TEXT,
        historico_medico TEXT
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        paciente_id INTEGER REFERENCES pacientes (id),
        unidade_id INTEGER REFERENCES unidades (id),
        profissional_id INTEGER REFERENCES profissionais (id),
        data_hora TEXT NOT NULL,
        especialidade TEXT NOT NULL,
        procedimento TEXT,
        indicacao_clinica TEXT,
        prioridade_score INTEGER NOT NULL,
        status TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS requisicoes_mamografia (
    id SERIAL PRIMARY KEY,
    agendamento_id INTEGER REFERENCES agendamentos (id),
    paciente_id INTEGER NOT NULL,
    profissional_id INTEGER NOT NULL,
    nodulo_mama_direita BOOLEAN DEFAULT FALSE,
    nodulo_mama_esquerda BOOLEAN DEFAULT FALSE,
    risco_elevado TEXT,
    mamas_examinadas TEXT,
    fez_mamografia TEXT,
    ano_ultima_mamografia TEXT,
    fez_radioterapia TEXT,
    ano_radioterapia_direita TEXT,
    ano_radioterapia_esquerda TEXT,
    fez_cirurgia TEXT,
    cirurgias_mama_direita TEXT,
    cirurgias_mama_esquerda TEXT,
    indicacao_clinica TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    conn.commit()
    cursor.close()
    conn.close()