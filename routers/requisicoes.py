import csv
import io
from datetime import datetime
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from auth import PermissaoRequerida, validar_acesso_unidade
from database import obter_conexao
from routers.agendamentos import AnamneseRequisicaoSchema, calcular_score_prioridade
import schemas

router = APIRouter(prefix="/api/requisicoes", tags=["Requisições - Relatórios"])

COLUNAS = [
    "id", "agendamento_id", "paciente_nome", "cpf", "unidade_id",
    "unidade_nome", "profissional_nome", "profissional_matricula", "data_hora",
    "especialidade", "status", "nodulo_mama_direita",
    "nodulo_mama_esquerda", "risco_elevado", "subcategoria_rastreamento",
    "mamas_examinadas", "fez_mamografia", "ano_ultima_mamografia",
    "fez_radioterapia", "ano_radioterapia_direita", "ano_radioterapia_esquerda",
    "fez_cirurgia", "cirurgias_mama_direita", "cirurgias_mama_esquerda",
    "indicacao_clinica", "criado_em",
]


def _buscar_requisicoes(db, unidade_id=None):
    cursor = db.cursor()
    consulta = """SELECT r.id, r.agendamento_id, p.nome AS paciente_nome,
                  p.cpf, p.idade, p.data_nascimento, p.telefone, p.endereco, p.cep,
                  p.historico_medico, a.unidade_id, u.nome AS unidade_nome,
                  prof.nome AS profissional_nome, prof.matricula AS profissional_matricula,
                  a.data_hora, a.especialidade, a.prioridade_score,
                  a.status, r.nodulo_mama_direita,
                  r.nodulo_mama_esquerda, r.risco_elevado, r.subcategoria_rastreamento,
                  r.mamas_examinadas, r.fez_mamografia, r.ano_ultima_mamografia,
                  r.fez_radioterapia, r.ano_radioterapia_direita,
                  r.ano_radioterapia_esquerda, r.fez_cirurgia,
                  r.cirurgias_mama_direita, r.cirurgias_mama_esquerda,
                  r.indicacao_clinica, r.criado_em
           FROM requisicoes_mamografia r
           LEFT JOIN pacientes p ON p.id = r.paciente_id
           LEFT JOIN profissionais prof ON prof.id = r.profissional_id
           LEFT JOIN agendamentos a ON a.id = r.agendamento_id
           LEFT JOIN unidades u ON u.id = a.unidade_id
           """
    parametros = ()
    if unidade_id is not None:
        consulta += " WHERE a.unidade_id = %s"
        parametros = (unidade_id,)
    consulta += " ORDER BY r.criado_em DESC, r.id DESC"
    cursor.execute(consulta, parametros)
    return cursor.fetchall()


def _unidade_autorizada(unidade_id, usuario):
    if usuario.get("role") == "gestor":
        unidade_usuario = usuario.get("unidade_id")
        if not unidade_usuario:
            raise HTTPException(status_code=403, detail="Gestor sem unidade vinculada.")
        return unidade_usuario
    if unidade_id is None:
        raise HTTPException(status_code=422, detail="Selecione uma unidade para exportar as requisições.")
    return unidade_id


def _nome_unidade(db, unidade_id):
    cursor = db.cursor()
    cursor.execute("SELECT nome FROM unidades WHERE id = %s", (unidade_id,))
    unidade = cursor.fetchone()
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    return unidade["nome"]


def _valor_csv(valor):
    if isinstance(valor, bool):
        return "Sim" if valor else "Não"
    return "" if valor is None else valor


def _salvar_requisicao(dados, agendamento_id, agendamento, db):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM requisicoes_mamografia WHERE agendamento_id = %s", (agendamento_id,))
    if cursor.fetchone():
        raise HTTPException(status_code=409, detail="Já existe uma requisição para este agendamento.")

    try:
        anos_desde_mamografia = datetime.now().year - int(dados.ano_ultima_mamografia)
    except (TypeError, ValueError):
        anos_desde_mamografia = None
    score = calcular_score_prioridade(AnamneseRequisicaoSchema(
        paciente_id=agendamento["paciente_id"],
        unidade_id=agendamento["unidade_id"],
        possui_sintomas=dados.nodulo_mama_direita or dados.nodulo_mama_esquerda,
        idade=agendamento["idade"] or 0,
        historico_familiar_cancer=dados.risco_elevado == "sim",
        ultima_mamografia_anos=anos_desde_mamografia,
    ))
    cursor.execute(
        """INSERT INTO requisicoes_mamografia (
               agendamento_id, paciente_id, profissional_id, nodulo_mama_direita,
               nodulo_mama_esquerda, risco_elevado, subcategoria_rastreamento,
               mamas_examinadas, fez_mamografia, ano_ultima_mamografia,
               fez_radioterapia, ano_radioterapia_direita, ano_radioterapia_esquerda,
               fez_cirurgia, cirurgias_mama_direita, cirurgias_mama_esquerda,
               indicacao_clinica
           ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING id""",
        (
            agendamento_id, agendamento["paciente_id"], agendamento["profissional_id"],
            dados.nodulo_mama_direita, dados.nodulo_mama_esquerda,
            dados.risco_elevado, dados.subcategoria_rastreamento,
            dados.mamas_examinadas, dados.fez_mamografia,
            dados.ano_ultima_mamografia, dados.fez_radioterapia,
            dados.ano_radioterapia_direita, dados.ano_radioterapia_esquerda,
            dados.fez_cirurgia, dados.cirurgias_mama_direita,
            dados.cirurgias_mama_esquerda, dados.indicacao_clinica,
        ),
    )
    requisicao_id = cursor.fetchone()["id"]
    cursor.execute("UPDATE agendamentos SET prioridade_score = %s WHERE id = %s", (score, agendamento_id))
    db.commit()
    return {"mensagem": "Requisição de mamografia salva.", "requisicao_id": requisicao_id, "agendamento_id": agendamento_id, "prioridade_score": score}


@router.post("/mamografia", status_code=201)
def criar_requisicao_mamografia(
    dados: schemas.RequisicaoMamografiaCadastro,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor", "clinico"])),
):
    cursor = db.cursor()
    cursor.execute(
        """SELECT a.paciente_id, a.profissional_id, a.unidade_id, p.idade
           FROM agendamentos a JOIN pacientes p ON p.id = a.paciente_id
           WHERE a.id = %s""",
        (dados.agendamento_id,),
    )
    agendamento = cursor.fetchone()
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    validar_acesso_unidade(usuario, agendamento["unidade_id"])
    if usuario.get("role") == "clinico" and usuario.get("profissional_id") != agendamento["profissional_id"]:
        raise HTTPException(status_code=403, detail="Você só pode registrar requisições em seu próprio nome.")
    return _salvar_requisicao(dados, dados.agendamento_id, agendamento, db)


@router.post("/mamografia/com-agendamento", status_code=201)
def criar_agendamento_e_requisicao(
    dados: schemas.RequisicaoMamografiaComAgendamento,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor", "clinico"])),
):
    cursor = db.cursor()
    cursor.execute("SELECT id, unidade_id, idade FROM pacientes WHERE cpf = %s", (dados.paciente_cpf,))
    paciente = cursor.fetchone()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente com este CPF não encontrado.")
    cursor.execute("SELECT id FROM unidades WHERE id = %s", (dados.unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    cursor.execute("SELECT id, unidade_id FROM profissionais WHERE matricula = %s", (dados.profissional_matricula,))
    profissional = cursor.fetchone()
    if not profissional:
        raise HTTPException(status_code=404, detail="Profissional com esta matrícula não encontrado.")
    validar_acesso_unidade(usuario, dados.unidade_id)
    if paciente["unidade_id"] != dados.unidade_id or profissional["unidade_id"] != dados.unidade_id:
        raise HTTPException(status_code=400, detail="Paciente e profissional devem pertencer à unidade do agendamento.")
    if usuario.get("role") == "clinico" and usuario.get("profissional_id") != profissional["id"]:
        raise HTTPException(status_code=403, detail="Você só pode agendar em seu próprio nome.")

    cursor.execute(
        """INSERT INTO agendamentos
           (paciente_id, unidade_id, profissional_id, data_hora, especialidade,
            procedimento, indicacao_clinica, prioridade_score, status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (paciente["id"], dados.unidade_id, profissional["id"], dados.data_hora,
         dados.especialidade, "Mamografia", dados.indicacao_clinica, 0, "Agendado"),
    )
    agendamento_id = cursor.fetchone()["id"]
    agendamento = {"paciente_id": paciente["id"], "profissional_id": profissional["id"], "unidade_id": dados.unidade_id, "idade": paciente.get("idade")}
    return _salvar_requisicao(dados, agendamento_id, agendamento, db)


@router.get("/exportar/csv", summary="Exportar requisições em CSV")
def exportar_requisicoes_csv(
    unidade_id: int | None = None,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor"])),
):
    unidade_id = _unidade_autorizada(unidade_id, usuario)
    _nome_unidade(db, unidade_id)
    linhas = _buscar_requisicoes(db, unidade_id)
    output = io.StringIO(newline="")
    writer = csv.writer(output, delimiter=";")
    writer.writerow(COLUNAS)
    for linha in linhas:
        writer.writerow([_valor_csv(linha.get(coluna)) for coluna in COLUNAS])
    conteudo = "\ufeff" + output.getvalue()
    return StreamingResponse(
        iter([conteudo]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=requisicoes_mamografia_unidade_{unidade_id}.csv"},
    )


@router.get("/exportar/pdf", summary="Emitir relatório de requisições em PDF")
def exportar_requisicoes_pdf(
    unidade_id: int | None = None,
    db=Depends(obter_conexao),
    usuario=Depends(PermissaoRequerida(["admin", "gestor"])),
):
    unidade_id = _unidade_autorizada(unidade_id, usuario)
    unidade_nome = _nome_unidade(db, unidade_id)
    linhas = _buscar_requisicoes(db, unidade_id)
    buffer = io.BytesIO()
    documento = SimpleDocTemplate(
        buffer, pagesize=landscape(letter), rightMargin=0.45 * inch,
        leftMargin=0.45 * inch, topMargin=0.5 * inch, bottomMargin=0.5 * inch,
        title="Relatório de Requisições de Mamografia",
    )
    estilos = getSampleStyleSheet()
    conteudo = [
        Paragraph("PET-Saúde Fortaleza — Requisições de Mamografia", estilos["Title"]),
        Paragraph(f"Unidade: {escape(unidade_nome)} (ID {unidade_id})", estilos["Heading2"]),
        Paragraph(f"Emitido em {datetime.now().strftime('%d/%m/%Y %H:%M')}", estilos["Normal"]),
        Spacer(1, 14),
    ]

    if not linhas:
        conteudo.append(Paragraph("Nenhuma requisição cadastrada.", estilos["Normal"]))
    else:
        for linha in linhas:
            dados_tabela = []
            secoes = []

            def adicionar_secao(titulo):
                secoes.append(len(dados_tabela))
                dados_tabela.append([Paragraph(escape(titulo), estilos["Heading3"]), ""])

            def adicionar_campo(rotulo, chave):
                valor = _valor_csv(linha.get(chave))
                valor = "—" if valor == "" else str(valor)
                dados_tabela.append([
                    Paragraph(f"<b>{escape(rotulo)}</b>", estilos["BodyText"]),
                    Paragraph(escape(valor).replace("\n", "<br/>"), estilos["BodyText"]),
                ])

            conteudo.append(Paragraph(f"Requisição #{linha['id']}", estilos["Heading2"]))
            adicionar_secao("Dados do paciente")
            for rotulo, chave in (("Nome", "paciente_nome"), ("CPF", "cpf"), ("Idade", "idade"),
                                  ("Data de nascimento", "data_nascimento"), ("Telefone", "telefone"),
                                  ("Endereço", "endereco"), ("CEP", "cep"), ("Histórico médico", "historico_medico")):
                adicionar_campo(rotulo, chave)

            adicionar_secao("Agendamento")
            for rotulo, chave in (("Unidade", "unidade_nome"), ("Data e hora", "data_hora"),
                                  ("Especialidade", "especialidade"), ("Profissional", "profissional_nome"),
                                  ("Matrícula", "profissional_matricula"), ("Status", "status"),
                                  ("Prioridade", "prioridade_score")):
                adicionar_campo(rotulo, chave)

            adicionar_secao("Requisição e dados clínicos")
            for rotulo, chave in (("Nódulo na mama direita", "nodulo_mama_direita"),
                                  ("Nódulo na mama esquerda", "nodulo_mama_esquerda"),
                                  ("Risco elevado", "risco_elevado"),
                                  ("Subcategoria de rastreamento", "subcategoria_rastreamento"),
                                  ("Mamas examinadas", "mamas_examinadas"),
                                  ("Já fez mamografia", "fez_mamografia"),
                                  ("Ano da última mamografia", "ano_ultima_mamografia"),
                                  ("Já fez radioterapia", "fez_radioterapia"),
                                  ("Ano da radioterapia direita", "ano_radioterapia_direita"),
                                  ("Ano da radioterapia esquerda", "ano_radioterapia_esquerda"),
                                  ("Já fez cirurgia", "fez_cirurgia"),
                                  ("Cirurgias na mama direita", "cirurgias_mama_direita"),
                                  ("Cirurgias na mama esquerda", "cirurgias_mama_esquerda"),
                                  ("Indicação clínica", "indicacao_clinica")):
                adicionar_campo(rotulo, chave)

            tabela = Table(dados_tabela, colWidths=[1.65 * inch, 8.35 * inch], splitByRow=1)
            estilo_tabela = [
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#ccd5df")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f6fa")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
            for linha_secao in secoes:
                estilo_tabela.extend([
                    ("SPAN", (0, linha_secao), (-1, linha_secao)),
                    ("BACKGROUND", (0, linha_secao), (-1, linha_secao), colors.HexColor("#dce7f6")),
                    ("FONTNAME", (0, linha_secao), (-1, linha_secao), "Helvetica-Bold"),
                ])
            tabela.setStyle(TableStyle(estilo_tabela))
            conteudo.extend([tabela, Spacer(1, 14)])

    documento.build(conteudo)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=requisicoes_mamografia_unidade_{unidade_id}.pdf"},
    )
