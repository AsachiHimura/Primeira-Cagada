from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from database import obter_conexao
from auth import PermissaoRequerida
import schemas
import csv
import io

router = APIRouter(prefix="/api/requisicoes", tags=["Requisições de Mamografia"])

def calcular_prognostico(req: schemas.RequisicaoMamografiaCadastro) -> int:
    score = 0
    
    # 1. Presença de nódulo em qualquer uma das mamas (peso alto por ser sintomático)
    if req.nodulo_mama_direita or req.nodulo_mama_esquerda:
        score += 40
        
    # 2. Risco elevado (histórico familiar ou genético)
    if req.risco_elevado and req.risco_elevado.lower() == "sim":
        score += 30
        
    # 3. Indicação clínica contendo termos críticos (urgente, suspeita, câncer)
    if req.indicacao_clinica:
        texto = req.indicacao_clinica.lower()
        if "suspeita" in texto:
            score += 20
        if "urgente" in texto or "urgência" in texto:
            score += 15
        if "câncer" in texto or "cancer" in texto or "carcinoma" in texto:
            score += 50
            
    return score

@router.post("/mamografia", dependencies=[Depends(PermissaoRequerida(["admin", "gestor", "clinico"]))])
def salvar_requisicao(req: schemas.RequisicaoMamografiaCadastro, db=Depends(obter_conexao)):
    cursor = db.cursor()
    
    # Calcula o score de prognóstico com base na anamnese preenchida
    score_calculado = calcular_prognostico(req)
    
    # Salva a requisição de mamografia
    cursor.execute("""
        INSERT INTO requisicoes_mamografia (
            agendamento_id, paciente_id, profissional_id,
            nodulo_mama_direita, nodulo_mama_esquerda, risco_elevado,
            mamas_examinadas, fez_mamografia, ano_ultima_mamografia,
            fez_radioterapia, ano_radioterapia_direita, ano_radioterapia_esquerda,
            fez_cirurgia, cirurgias_mama_direita, cirurgias_mama_esquerda,
            indicacao_clinica
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        req.agendamento_id, req.paciente_id, req.profissional_id,
        req.nodulo_mama_direita, req.nodulo_mama_esquerda, req.risco_elevado,
        req.mamas_examinadas, req.fez_mamografia, req.ano_ultima_mamografia,
        req.fez_radioterapia, req.ano_radioterapia_direita, req.ano_radioterapia_esquerda,
        req.fez_cirurgia, req.cirurgias_mama_direita, req.cirurgias_mama_esquerda,
        req.indicacao_clinica
    ))
    resultado = cursor.fetchone()
    requisicao_id = resultado["id"] if isinstance(resultado, dict) else resultado[0]

    # Atualiza automaticamente a prioridade do agendamento correspondente na fila do SUS
    cursor.execute("""
        UPDATE agendamentos 
        SET prioridade = %s 
        WHERE id = %s
    """, (score_calculado, req.agendamento_id))
    
    db.commit()
    
    return {
        "mensagem": "Requisição salva e prognóstico calculado com sucesso!",
        "requisicao_id": requisicao_id,
        "prioridade_score": score_calculado
    }

@router.get("/mamografia/{agendamento_id}", dependencies=[Depends(PermissaoRequerida(["admin", "gestor", "clinico"]))])
def buscar_requisicao(agendamento_id: int, db=Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM requisicoes_mamografia WHERE agendamento_id = %s", (agendamento_id,))
    req = cursor.fetchone()
    if not req:
        raise HTTPException(status_code=404, detail="Requisição não encontrada.")
    return dict(req)

@router.get("/mamografia/{agendamento_id}/csv", dependencies=[Depends(PermissaoRequerida(["admin", "gestor"]))])
def exportar_csv(agendamento_id: int, db=Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT r.*, p.nome as paciente_nome, p.cpf, p.data_nascimento,
               prof.nome as profissional_nome, a.data_hora, a.especialidade
        FROM requisicoes_mamografia r
        JOIN pacientes p ON p.id = r.paciente_id
        JOIN profissionais prof ON prof.id = r.profissional_id
        JOIN agendamentos a ON a.id = r.agendamento_id
        WHERE r.agendamento_id = %s
    """, (agendamento_id,))
    req = cursor.fetchone()
    if not req:
        raise HTTPException(status_code=404, detail="Requisição não encontrada.")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=req.keys())
    writer.writeheader()
    writer.writerow(dict(req))
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=requisicao_{agendamento_id}.csv"}
    )

@router.get("/mamografia/{agendamento_id}/pdf", dependencies=[Depends(PermissaoRequerida(["admin", "gestor"]))])
def exportar_pdf(agendamento_id: int, db=Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT r.*, p.nome as paciente_nome, p.cpf, p.data_nascimento,
               prof.nome as profissional_nome, a.data_hora, a.especialidade
        FROM requisicoes_mamografia r
        JOIN pacientes p ON p.id = r.paciente_id
        JOIN profissionais prof ON prof.id = r.profissional_id
        JOIN agendamentos a ON a.id = r.agendamento_id
        WHERE r.agendamento_id = %s
    """, (agendamento_id,))
    req = cursor.fetchone()
    if not req:
        raise HTTPException(status_code=404, detail="Requisição não encontrada.")

    r = dict(req)
    html = f"""
    <html><head><meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; padding: 32px; color: #1c2b36; }}
        h1 {{ background: #194596; color: white; padding: 16px; border-radius: 6px; }}
        .secao {{ margin-top: 24px; }}
        .secao h2 {{ color: #194596; border-bottom: 2px solid #194596; padding-bottom: 4px; }}
        .linha {{ display: flex; gap: 16px; margin: 8px 0; }}
        .campo {{ flex: 1; }}
        .label {{ font-size: 11px; text-transform: uppercase; color: #5b6b76; font-weight: bold; }}
        .valor {{ font-size: 14px; margin-top: 2px; }}
    </style></head><body>
    <h1>Requisição de Mamografia</h1>
    <div class='secao'><h2>Dados da Paciente</h2>
        <div class='linha'>
            <div class='campo'><div class='label'>Nome</div><div class='valor'>{r.get('paciente_nome','—')}</div></div>
            <div class='campo'><div class='label'>CPF</div><div class='valor'>{r.get('cpf','—')}</div></div>
            <div class='campo'><div class='label'>Data de Nascimento</div><div class='valor'>{r.get('data_nascimento','—')}</div></div>
        </div>
    </div>
    <div class='secao'><h2>Dados do Agendamento</h2>
        <div class='linha'>
            <div class='campo'><div class='label'>Profissional</div><div class='valor'>{r.get('profissional_nome','—')}</div></div>
            <div class='campo'><div class='label'>Data/Hora</div><div class='valor'>{r.get('data_hora','—')}</div></div>
            <div class='campo'><div class='label'>Especialidade</div><div class='valor'>{r.get('especialidade','—')}</div></div>
        </div>
    </div>
    <div class='secao'><h2>Anamnese</h2>
        <div class='linha'>
            <div class='campo'><div class='label'>Nódulo Mama Direita</div><div class='valor'>{'Sim' if r.get('nodulo_mama_direita') else 'Não'}</div></div>
            <div class='campo'><div class='label'>Nódulo Mama Esquerda</div><div class='valor'>{'Sim' if r.get('nodulo_mama_esquerda') else 'Não'}</div></div>
            <div class='campo'><div class='label'>Risco Elevado</div><div class='valor'>{r.get('risco_elevado','—')}</div></div>
        </div>
        <div class='linha'>
            <div class='campo'><div class='label'>Fez Mamografia</div><div class='valor'>{r.get('fez_mamografia','—')}</div></div>
            <div class='campo'><div class='label'>Ano Última Mamografia</div><div class='valor'>{r.get('ano_ultima_mamografia','—')}</div></div>
            <div class='campo'><div class='label'>Fez Radioterapia</div><div class='valor'>{r.get('fez_radioterapia','—')}</div></div>
        </div>
        <div class='linha'>
            <div class='campo'><div class='label'>Fez Cirurgia</div><div class='valor'>{r.get('fez_cirurgia','—')}</div></div>
            <div class='campo'><div class='label'>Cirurgias Mama Direita</div><div class='valor'>{r.get('cirurgias_mama_direita','—')}</div></div>
            <div class='campo'><div class='label'>Cirurgias Mama Esquerda</div><div class='valor'>{r.get('cirurgias_mama_esquerda','—')}</div></div>
        </div>
    </div>
    <div class='secao'><h2>Indicação Clínica</h2>
        <div class='valor'>{r.get('indicacao_clinica','—')}</div>
    </div>
    <div style='margin-top:40px;font-size:11px;color:#5b6b76;text-align:center;'>
        SIG-MAMO — Gerado em sistema
    </div>
    </body></html>
    """

    try:
        import importlib
        pdfkit = importlib.import_module("pdfkit")
        pdf = pdfkit.from_string(html, False)
        return StreamingResponse(
            io.BytesIO(pdf),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=requisicao_{agendamento_id}.pdf"}
        )
    except Exception:
        return StreamingResponse(
            io.BytesIO(html.encode()),
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=requisicao_{agendamento_id}.html"}
        )