from fastapi import APIRouter, HTTPException, Depends
from database import obter_conexao
import schemas

router = APIRouter(prefix="/api/pacientes", tags=["Pacientes"])

@router.post("/cadastro", status_code=201)
def cadastrar_paciente(paciente: schemas.PacienteCadastro, db = Depends(obter_conexao)):
    cursor = db.cursor()
    
    cursor.execute("SELECT id FROM unidades WHERE id = %s", (paciente.unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"A unidade com ID {paciente.unidade_id} não existe no banco de dados.")

    try:
        cursor.execute(
            """INSERT INTO usuarios (unidade_id, nome, cpf, data_nascimento, telefone, tipo, endereco, historico_medico) 
               VALUES (%s, %s, %s, %s, %s, 'paciente', %s, %s) RETURNING id""",
            (paciente.unidade_id, paciente.nome, paciente.cpf, str(paciente.data_nascimento), paciente.telefone, paciente.endereco, "")
        )
        row = cursor.fetchone()
        db.commit()
        paciente_id = row[0] if row else cursor.lastrowid
        return {"mensagem": "Paciente cadastrado na unidade com sucesso!", "paciente_id": paciente_id}
    except Exception as e:
        db.rollback()
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="Este CPF já está cadastrado no sistema do posto.")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.put("/atualizar/{paciente_id}")
def atualizar_paciente(paciente_id: int, dados: schemas.PacienteUpdate, db = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM usuarios WHERE id = %s", (paciente_id,))
    if not cursor.fetchone():
         raise HTTPException(status_code=404, detail="Paciente não encontrado no sistema.")
         
    if dados.telefone:
        cursor.execute("UPDATE usuarios SET telefone = %s WHERE id = %s", (dados.telefone, paciente_id))
    if dados.endereco:
        cursor.execute("UPDATE usuarios SET endereco = %s WHERE id = %s", (dados.endereco, paciente_id))
    db.commit()
    return {"mensagem": "Dados do paciente atualizados com sucesso!"}