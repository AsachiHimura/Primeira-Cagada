from fastapi import APIRouter, HTTPException, Depends
from database import obter_conexao
from auth import PermissaoRequerida, validar_acesso_unidade
import schemas

router = APIRouter(prefix="/api/pacientes", tags=["Pacientes"])

@router.post("/cadastro", status_code=201)
def cadastrar_paciente(paciente: schemas.PacienteCadastro, db = Depends(obter_conexao), usuario = Depends(PermissaoRequerida(["admin", "gestor", "clinico", "recepcao"]))):
    validar_acesso_unidade(usuario, paciente.unidade_id)
    cursor = db.cursor()
    
    cursor.execute("SELECT id FROM unidades WHERE id = %s", (paciente.unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"A unidade com ID {paciente.unidade_id} não existe no banco de dados.")

    try:
        cursor.execute(
            """INSERT INTO pacientes
               (unidade_id, nome, idade, cpf, data_nascimento, telefone, endereco, cep, historico_medico)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (paciente.unidade_id, paciente.nome, paciente.idade, paciente.cpf,
             str(paciente.data_nascimento), paciente.telefone, paciente.endereco,
             paciente.cep, paciente.historico_medico)
        )
        db.commit()
        return {"mensagem": "Paciente cadastrado na unidade com sucesso!", "cpf": paciente.cpf}
    except Exception as e:
        db.rollback()
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="Este CPF já está cadastrado no sistema do posto.")
        raise HTTPException(status_code=500, detail="Erro interno ao salvar os dados do paciente.")

@router.put("/atualizar/{cpf}")
def atualizar_paciente(cpf: str, dados: schemas.PacienteUpdate, db = Depends(obter_conexao), usuario = Depends(PermissaoRequerida(["admin", "gestor", "clinico", "recepcao"]))):
    cpf = schemas.re.limpar(cpf)
    if not schemas.re.validar(cpf):
        raise HTTPException(status_code=422, detail="CPF inválido.")
    cursor = db.cursor()
    cursor.execute("SELECT id, unidade_id FROM pacientes WHERE cpf = %s", (cpf,))
    paciente = cursor.fetchone()
    if not paciente:
         raise HTTPException(status_code=404, detail="Paciente não encontrado no sistema.")
    validar_acesso_unidade(usuario, paciente["unidade_id"])

    campos = [campo for campo in ("telefone", "endereco", "cep", "historico_medico")
              if getattr(dados, campo) is not None]
    if campos:
        valores = [getattr(dados, campo) for campo in campos]
        cursor.execute(
            f"UPDATE pacientes SET {', '.join(f'{campo} = %s' for campo in campos)} WHERE id = %s",
            (*valores, paciente["id"])
        )
        db.commit()
    return {"mensagem": "Dados do paciente atualizados com sucesso!"}
