import sqlite3
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

senha = os.getenv("ADMIN_SENHA", "admin123")
matricula = os.getenv("ADMIN_MATRICULA", "185838")
nome = os.getenv("ADMIN_NOME", "Administrador")

hash_senha = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()

conn = sqlite3.connect("cofrinho.db")
conn.execute("""
CREATE TABLE IF NOT EXISTS profissionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unidade_id INTEGER,
    nome TEXT,
    cargo TEXT,
    permissao TEXT,
    matricula TEXT UNIQUE,
    senha TEXT,
    senha_gerada TEXT
)
""")
conn.execute(
    "INSERT OR IGNORE INTO profissionais (unidade_id, nome, cargo, permissao, matricula, senha, senha_gerada) VALUES (?, ?, ?, ?, ?, ?, ?)",
    (0, nome, "ceo", "admin", matricula, hash_senha, senha)
)
conn.commit()
conn.close()
print(f"Admin criado. Matrícula: {matricula}")