import React, { useState } from 'react';
import api from './services/api';
import './PainelGestor.css';

// 1. Pegamos o userRole do localStorage se não vier por prop
function PainelGestor({ unidadeLogada, userRole = localStorage.getItem('userRole') }) {
  const [modalAberto, setModalAberto] = useState(null);
  // ... (seus estados permanecem iguais)

  const abrirModal = (nome) => {
    setModalAberto(nome);
    // ...
  };

  // 2. Definimos as ações e quem pode vê-las
  const botoes = [
    { id: 'cadastrarProfissional', label: 'Cadastrar Profissional', adminOnly: true },
    { id: 'cadastrarPaciente', label: 'Cadastrar Paciente', adminOnly: false },
    { id: 'atualizarPaciente', label: 'Atualizar Paciente', adminOnly: false },
    { id: 'criarAgendamento', label: 'Criar Agendamento', adminOnly: false },
    { id: 'obterAgendamento', label: 'Obter Agendamento', adminOnly: false },
    { id: 'atualizarStatusAgendamento', label: 'Atualizar Status Agendamento', adminOnly: false },
    { id: 'popularFila', label: 'Popular Fila Falsa', adminOnly: true },
    { id: 'observarFila', label: 'Observar Fila Atual', adminOnly: false },
    { id: 'assistente', label: 'Conversar com Assistente', adminOnly: false },
  ];

  // 3. Filtramos os botões com base no role
  const botoesVisiveis = botoes.filter(b => userRole === 'admin' || !b.adminOnly);

  return (
    <div className="painel-gestor-wrapper">
      <h2 className="painel-gestor-titulo">Painel {userRole === 'admin' ? 'Administrador' : 'do Gestor'}</h2>
      <div className="grid-botoes-gestor">
        {botoesVisiveis.map((b) => (
          <button key={b.id} className="botao-gestor" onClick={() => abrirModal(b.id)}>
            {b.label}
          </button>
        ))}
      </div>

      {/* 4. Exemplo de como travar o input de unidade_id */}
      {modalAberto === 'cadastrarPaciente' && (
        <Modal titulo="Cadastrar Paciente" onClose={fecharModal}>
          <label>ID Unidade:</label>
          <input 
            className="input-gestor" 
            type="number" 
            value={userRole === 'gestor' ? unidadeLogada?.id : formPaciente.unidade_id}
            readOnly={userRole === 'gestor'} // Trava para o Gestor
            onChange={(e) => setFormPaciente({ ...formPaciente, unidade_id: e.target.value })} 
          />
          {/* Resto do formulário... */}
        </Modal>
      )}
      
      {/* ... repita a lógica do readOnly={userRole === 'gestor'} em todos os inputs de unidade_id */}
    </div>
  );
}
export default PainelGestor;