from fastapi import APIRouter, Depends, HTTPException
import random
from datetime import datetime, timedelta
from database import obter_conexao

router = APIRouter(prefix="/api/unidades", tags=["Fila e Monitoramento"])

def gerar_cpf_valido():
    cpf = [random.randint(0, 9) for _ in range(9)]
    for _ in range(2):
        val = sum([(len(cpf) + 1 - i) * v for i, v in enumerate(cpf)]) % 11
        cpf.append(11 - val if val > 1 else 0)
    return "".join(map(str, cpf))

@router.post("/{unidade_id}/popular")
def popular_fila_falsa(unidade_id: int, db = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM unidades WHERE id = %s", (unidade_id,))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO unidades (id, nome, codigo_cnes, senha_login) VALUES (%s, 'Posto Central', %s, '1234')", 
            (unidade_id, f"CNES{unidade_id}")
        )

    nomes_femininos = ["Maria Silva", "Joana Costa", "Francisca Ferreira", "Antonia Souza", "Raimunda Oliveira", "Ana Gomes", "Rita Santos", "Catarina Rodrigues", "Teresa Martins"]
    historicos = ["Dor na mama direita.", "Nódulo palpável relatado.", "Histórico familiar de câncer.", "Acompanhamento semestral."]
    
    for i in range(15):
        nome = f"{random.choice(nomes_femininos)} {i+1}"
        idade = random.randint(35, 70)
        data_nasc = f"{datetime.now().year - idade}-05-15"
        cpf = gerar_cpf_valido()
        historico = random.choice(historicos)
        
        telefone = f"8599999{i:04d}" if random.choice([True, False]) else ""
        endereco = f"Rua Falsa, {random.randint(10, 200)} - Centro" if random.choice([True, False]) else ""
        cep = "60000-000" if endereco else ""
        
        cursor.execute("""
            INSERT INTO pacientes (unidade_id, nome, idade, cpf, data_nascimento, telefone, endereco, cep, historico_medico) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (unidade_id, nome, idade, cpf, data_nasc, telefone, endereco, cep, historico))
        row_p = cursor.fetchone()
        paciente_id = row_p[0] if row_p else cursor.lastrowid
            
        dias_frente = random.randint(1, 10)
        hora_fake = random.choice(["08:00", "09:30", "10:00", "13:30", "14:00"])
        data_fake = (datetime.now() + timedelta(days=dias_frente)).strftime(f"%Y-%m-%d {hora_fake}")
        
        score = idade // 10
        if "Nódulo" in historico or "câncer" in historico:
            score += 5
            
        cursor.execute("""
            INSERT INTO agendamentos (paciente_id, unidade_id, profissional_id, data_hora, especialidade, procedimento, indicacao_clinica, prioridade_score, status) 
            VALUES (%s, %s, 1, %s, 'Mastologia', 'Mamografia', %s, %s, 'Agendado')
        """, (paciente_id, unidade_id, data_fake, historico, score))
        
    db.commit()
    return {"mensagem": "Fila populada com sucesso!"}

@router.get("/{unidade_id}/fila-atual")
def observacao_fila_atual(unidade_id: int, db = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM unidades WHERE id = %s", (unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")

    cursor.execute("""
        SELECT a.id as agendamento_id, a.data_hora, a.prioridade_score, a.status, 
               p.id as paciente_id, p.nome AS paciente_nome, p.cpf, p.idade, p.telefone, p.endereco, p.cep
        FROM agendamentos a
        JOIN pacientes p ON a.paciente_id = p.id
        WHERE a.unidade_id = %s AND a.status != 'Cancelado'
        ORDER BY a.prioridade_score DESC, a.data_hora ASC
    """, (unidade_id,))
    
    fila = []
    for row in cursor.fetchall():
        # Mapeamento manual da tupla para dicionário compatível com cursor padrão do PostgreSQL
        paciente = {
            "agendamento_id": row[0],
            "data_hora": row[1],
            "prioridade_score": row[2],
            "status": row[3],
            "paciente_id": row[4],
            "paciente_nome": row[5],
            "cpf": row[6],
            "idade": row[7],
            "telefone": row[8],
            "endereco": row[9],
            "cep": row[10]
        }
        
        dados_faltantes = []
        if not paciente["telefone"] or str(paciente["telefone"]).lower() in ["string", "none", ""]: dados_faltantes.append("Telefone")
        if not paciente["endereco"] or str(paciente["endereco"]).lower() in ["string", "none", ""]: dados_faltantes.append("Endereço")
        if not paciente["cep"] or str(paciente["cep"]).lower() in ["string", "none", ""]: dados_faltantes.append("CEP")
        if not paciente["idade"] or int(paciente["idade"]) == 0: dados_faltantes.append("Idade")
        
        paciente["cadastro_incompleto"] = len(dados_faltantes) > 0
        paciente["dados_pendentes"] = dados_faltantes
        
        fila.append(paciente)
        
    return {"unidade_id": unidade_id, "total_na_fila": len(fila), "pacientes": fila}