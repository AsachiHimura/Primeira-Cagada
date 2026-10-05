import sqlite3
import psycopg2
from psycopg2.extras import execute_values

SQLITE_FILE = "cofrinho.db"
# Substitua pela sua senha real do Supabase
DATABASE_URL = "postgresql://postgres.nyjmbuaoycghspnypaeh:r3ereqMZ4HzPh8yE@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

def migrar():
    conn_sqlite = sqlite3.connect(SQLITE_FILE)
    conn_sqlite.row_factory = sqlite3.Row
    cur_sqlite = conn_sqlite.cursor()

    conn_pg = psycopg2.connect(DATABASE_URL)
    cur_pg = conn_pg.cursor()

    tabelas = ["unidades", "profissionais", "pacientes", "agendamentos"]

    # Coleta todos os IDs reais de unidades para validação
    cur_sqlite.execute("SELECT id FROM unidades")
    unidades_existentes = {linha["id"] for linha in cur_sqlite.fetchall()}

    for tabela in tabelas:
        cur_sqlite.execute(f"SELECT * FROM {tabela}")
        linhas = cur_sqlite.fetchall()

        if not linhas:
            print(f"[-] Tabela {tabela} está vazia no SQLite.")
            continue

        colunas = list(linhas[0].keys())
        nomes_colunas = ", ".join(colunas)
        
        valores = []
        for linha in linhas:
            d = dict(linha)
            # Se tiver unidade_id e for 0 ou apontar para unidade inexistente, converte para None (NULL)
            if "unidade_id" in d and (d["unidade_id"] == 0 or d["unidade_id"] not in unidades_existentes):
                d["unidade_id"] = None
            
            valores.append(tuple(d[col] for col in colunas))

        query = f"INSERT INTO {tabela} ({nomes_colunas}) VALUES %s ON CONFLICT DO NOTHING"
        execute_values(cur_pg, query, valores)
        
        # Sincroniza a sequência sequencial de ID no PostgreSQL
        cur_pg.execute(f"SELECT setval(pg_get_serial_sequence('{tabela}', 'id'), coalesce(max(id), 1)) FROM {tabela};")
        
        print(f"[+] {len(valores)} registros migrados para '{tabela}'.")

    conn_pg.commit()
    cur_sqlite.close()
    conn_sqlite.close()
    cur_pg.close()
    conn_pg.close()
    print("\nMigração finalizada com sucesso!")

if __name__ == "__main__":
    migrar()