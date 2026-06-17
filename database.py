import sqlite3

DATABASE_FILE = "banco.db"

def obter_conexao():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def inicializar_banco():
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    # Cadastro de Unidades
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS unidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        codigo_cnes TEXT UNIQUE NOT NULL,
        senha_login TEXT NOT NULL
    )
    """)
    
    # Cadastro dos Profissionais e Permissões
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profissionais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unidade_id INTEGER,
        nome TEXT NOT NULL,
        cargo TEXT NOT NULL,
        permissao TEXT NOT NULL,
        FOREIGN KEY (unidade_id) REFERENCES unidades (id)
    )
    """)
    
    # Cadastro de Pacientes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unidade_id INTEGER,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        data_nascimento TEXT NOT NULL,
        telefone TEXT,
        tipo TEXT NOT NULL,
        endereco TEXT,
        historico_medico TEXT,
        FOREIGN KEY (unidade_id) REFERENCES unidades (id)
    )
    """)
    
    # Fila de Agendamentos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER,
        unidade_id INTEGER,
        profissional_id INTEGER,
        data_hora TEXT NOT NULL,
        status TEXT NOT NULL,
        prioridade INTEGER NOT NULL,
        FOREIGN KEY (paciente_id) REFERENCES usuarios (id),
        FOREIGN KEY (unidade_id) REFERENCES unidades (id),
        FOREIGN KEY (profissional_id) REFERENCES profissionais (id)
    )
    """)
    conn.commit()
    conn.close()