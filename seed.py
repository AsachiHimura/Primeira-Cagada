import bcrypt
import psycopg2
from config import settings

if not settings.ADMIN_SENHA:
    raise SystemExit("Defina ADMIN_SENHA no .env antes de criar o administrador.")

senha = settings.ADMIN_SENHA
matricula = settings.ADMIN_MATRICULA
nome = settings.ADMIN_NOME

hash_senha = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()

with psycopg2.connect(settings.DATABASE_URL) as conn:
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO profissionais (unidade_id, nome, cargo, permissao, matricula, senha)
               VALUES (NULL, %s, %s, %s, %s, %s)
               ON CONFLICT (matricula) DO NOTHING RETURNING id""",
            (nome, "ceo", "admin", matricula, hash_senha)
        )
        criado = cursor.fetchone() is not None
print(f"Admin {'criado' if criado else 'já existia'}. Matrícula: {matricula}")
