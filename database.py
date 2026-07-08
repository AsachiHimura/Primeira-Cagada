import sqlite3

DATABASE_FILE = "cofrinho.db"

def obter_conexao():
    conn = sqlite3.connect('cofrinho.db', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def inicializar_banco():
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS unidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        codigo_cnes TEXT UNIQUE NOT NULL,
        senha_login TEXT NOT NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profissionais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unidade_id INTEGER,
        nome TEXT NOT NULL,
        cargo TEXT NOT NULL,
        permissao TEXT NOT NULL,
        matricula TEXT UNIQUE,
        senha TEXT,
        FOREIGN KEY (unidade_id) REFERENCES unidades (id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unidade_id INTEGER,
        nome TEXT NOT NULL,
        idade INTEGER,
        cpf TEXT UNIQUE NOT NULL,
        data_nascimento TEXT NOT NULL,
        telefone TEXT,
        endereco TEXT,
        cep TEXT,
        historico_medico TEXT,
        FOREIGN KEY (unidade_id) REFERENCES unidades (id)
    )
    """)
    
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER,
        unidade_id INTEGER,
        profissional_id INTEGER,
        data_hora TEXT NOT NULL,
        especialidade TEXT NOT NULL,
        procedimento TEXT,
        indicacao_clinica TEXT,
        prioridade_score INTEGER NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id),
        FOREIGN KEY (unidade_id) REFERENCES unidades (id),
        FOREIGN KEY (profissional_id) REFERENCES profissionais (id)
    )
    """)
    conn.commit()
    conn.close()