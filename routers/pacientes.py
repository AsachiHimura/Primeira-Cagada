from fastapi import APIRouter, HTTPException, Depends
import sqlite3
from database import obter_conexao
import schemas

router = APIRouter(prefix="/api/pacientes", tags=["Pacientes"])

@router.post("/cadastro", status_code=201)
def cadastrar_paciente(paciente: schemas.PacienteCadastro, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    
    #  Validação de segurança: Verifica se a unidade realmente existe antes de tentar inserir
    cursor.execute("SELECT id FROM unidades WHERE id = ?", (paciente.unidade_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"A unidade com ID {paciente.unidade_id} não existe no banco de dados.")

    try:
        cursor.execute(
            "INSERT INTO usuarios (unidade_id, nome, cpf, data_nascimento, telefone, tipo, endereco, historico_medico) VALUES (?, ?, ?, ?, ?, 'paciente', ?, ?)",
            (paciente.unidade_id, paciente.nome, paciente.cpf, str(paciente.data_nascimento), paciente.telefone, paciente.endereco, "")
        )
        db.commit()
        return {"mensagem": "Paciente cadastrado na unidade com sucesso!", "paciente_id": cursor.lastrowid}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Este CPF já está cadastrado no sistema do posto.")
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no SQLite: {str(e)}")

@router.put("/atualizar/{paciente_id}")
def atualizar_paciente(paciente_id: int, dados: schemas.PacienteUpdate, db: sqlite3.Connection = Depends(obter_conexao)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE id = ?", (paciente_id,))
    if not cursor.fetchone():
         raise HTTPException(status_code=404, detail="Paciente não encontrado no sistema.")
         
    if dados.telefone:
        cursor.execute("UPDATE usuarios SET telefone = ? WHERE id = ?", (dados.telefone, paciente_id))
    if dados.endereco:
        cursor.execute("UPDATE usuarios SET endereco = ? WHERE id = ?", (dados.endereco, paciente_id))
    db.commit()
    return {"mensagem": "Dados do paciente atualizados com sucesso!"}