import React, { useState } from 'react';
import api from './services/api';
import './PainelGestor.css';

function PainelGestor({ unidadeLogada }) {
  const [modalAberto, setModalAberto] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erroModal, setErroModal] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Estados dos formulários
  const [formProfissional, setFormProfissional] = useState({ unidade_id: '', nome: '', cargo: '', permissao: 'funcionario' });
  const [formPaciente, setFormPaciente] = useState({ unidade_id: '', nome: '', cpf: '', data_nascimento: '', telefone: '', endereco: '' });
  const [formAtualizarPaciente, setFormAtualizarPaciente] = useState({ paciente_id: '', telefone: '', endereco: '' });
  const [formAgendamento, setFormAgendamento] = useState({ paciente_id: '', unidade_id: '', profissional_id: '', data_hora: '', especialidade: '', indicacao_clinica: '' });
  const [formObterAgendamento, setFormObterAgendamento] = useState({ agendamento_id: '' });
  const [formStatusAgendamento, setFormStatusAgendamento] = useState({ agendamento_id: '', status: 'Agendado' });
  const [formPopularFila, setFormPopularFila] = useState({ unidade_id: '' });
  const [formObservarFila, setFormObservarFila] = useState({ unidade_id: '' });
  const [formAssistente, setFormAssistente] = useState({ cpf: '', texto: '' });

  const abrirModal = (nome) => {
    setModalAberto(nome);
    setResultado(null);
    setErroModal('');
  };

  const fecharModal = () => {
    setModalAberto(null);
    setResultado(null);
    setErroModal('');
  };

  const executar = async (acaoFn) => {
    setCarregando(true);
    setErroModal('');
    setResultado(null);
    try {
      const res = await acaoFn();
      setResultado(res.data);
    } catch (err) {
      setErroModal(err.response?.data?.detail || 'Ocorreu um erro ao executar a ação.');
    } finally {
      setCarregando(false);
    }
  };

  // Botões do painel
  const botoes = [
    { id: 'cadastrarProfissional', label: 'Cadastrar Profissional' },
    { id: 'cadastrarPaciente', label: 'Cadastrar Paciente' },
    { id: 'atualizarPaciente', label: 'Atualizar Paciente' },
    { id: 'criarAgendamento', label: 'Criar Agendamento' },
    { id: 'obterAgendamento', label: 'Obter Agendamento' },
    { id: 'atualizarStatusAgendamento', label: 'Atualizar Status Agendamento' },
    { id: 'popularFila', label: 'Popular Fila Falsa' },
    { id: 'observarFila', label: 'Observar Fila Atual' },
    { id: 'assistente', label: 'Conversar com Assistente' },
  ];

  return (
    <div className="painel-gestor-wrapper">
      <h2 className="painel-gestor-titulo">Painel do Gestor</h2>
      <div className="grid-botoes-gestor">
        {botoes.map((b) => (
          <button key={b.id} className="botao-gestor" onClick={() => abrirModal(b.id)}>
            {b.label}
          </button>
        ))}
      </div>

      {/* MODAL: Cadastrar Profissional */}
      {modalAberto === 'cadastrarProfissional' && (
        <Modal titulo="Cadastrar Profissional" onClose={fecharModal}>
          <input className="input-gestor" type="number" placeholder="ID da Unidade" value={formProfissional.unidade_id}
            onChange={(e) => setFormProfissional({ ...formProfissional, unidade_id: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="Nome" value={formProfissional.nome}
            onChange={(e) => setFormProfissional({ ...formProfissional, nome: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="Cargo" value={formProfissional.cargo}
            onChange={(e) => setFormProfissional({ ...formProfissional, cargo: e.target.value })} />
          <select className="input-gestor" value={formProfissional.permissao}
            onChange={(e) => setFormProfissional({ ...formProfissional, permissao: e.target.value })}>
            <option value="funcionario">Funcionário</option>
            <option value="gestor">Gestor</option>
          </select>
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.post('/api/profissionais/cadastro', {
              unidade_id: parseInt(formProfissional.unidade_id),
              nome: formProfissional.nome,
              cargo: formProfissional.cargo,
              permissao: formProfissional.permissao
            })
          )}>{carregando ? 'Enviando...' : 'Confirmar'}</button>
          <ResultadoModal resultado={resultado} erro={erroModal} />
        </Modal>
      )}

      {/* MODAL: Cadastrar Paciente */}
      {modalAberto === 'cadastrarPaciente' && (
        <Modal titulo="Cadastrar Paciente" onClose={fecharModal}>
          <input className="input-gestor" type="number" placeholder="ID da Unidade" value={formPaciente.unidade_id}
            onChange={(e) => setFormPaciente({ ...formPaciente, unidade_id: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="Nome" value={formPaciente.nome}
            onChange={(e) => setFormPaciente({ ...formPaciente, nome: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="CPF" value={formPaciente.cpf}
            onChange={(e) => setFormPaciente({ ...formPaciente, cpf: e.target.value })} />
          <input className="input-gestor" type="date" placeholder="Data de Nascimento" value={formPaciente.data_nascimento}
            onChange={(e) => setFormPaciente({ ...formPaciente, data_nascimento: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="Telefone" value={formPaciente.telefone}
            onChange={(e) => setFormPaciente({ ...formPaciente, telefone: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="Endereço" value={formPaciente.endereco}
            onChange={(e) => setFormPaciente({ ...formPaciente, endereco: e.target.value })} />
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.post('/api/pacientes/cadastro', {
              unidade_id: parseInt(formPaciente.unidade_id),
              nome: formPaciente.nome,
              cpf: formPaciente.cpf,
              data_nascimento: formPaciente.data_nascimento,
              telefone: formPaciente.telefone,
              endereco: formPaciente.endereco
            })
          )}>{carregando ? 'Enviando...' : 'Confirmar'}</button>
          <ResultadoModal resultado={resultado} erro={erroModal} />
        </Modal>
      )}

      {/* MODAL: Atualizar Paciente */}
      {modalAberto === 'atualizarPaciente' && (
        <Modal titulo="Atualizar Paciente" onClose={fecharModal}>
          <input className="input-gestor" type="number" placeholder="ID do Paciente" value={formAtualizarPaciente.paciente_id}
            onChange={(e) => setFormAtualizarPaciente({ ...formAtualizarPaciente, paciente_id: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="Novo Telefone" value={formAtualizarPaciente.telefone}
            onChange={(e) => setFormAtualizarPaciente({ ...formAtualizarPaciente, telefone: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="Novo Endereço" value={formAtualizarPaciente.endereco}
            onChange={(e) => setFormAtualizarPaciente({ ...formAtualizarPaciente, endereco: e.target.value })} />
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.put(`/api/pacientes/atualizar/${formAtualizarPaciente.paciente_id}`, {
              telefone: formAtualizarPaciente.telefone,
              endereco: formAtualizarPaciente.endereco
            })
          )}>{carregando ? 'Enviando...' : 'Confirmar'}</button>
          <ResultadoModal resultado={resultado} erro={erroModal} />
        </Modal>
      )}

      {/* MODAL: Criar Agendamento */}
      {modalAberto === 'criarAgendamento' && (
        <Modal titulo="Criar Agendamento" onClose={fecharModal}>
          <input className="input-gestor" type="number" placeholder="ID do Paciente" value={formAgendamento.paciente_id}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, paciente_id: e.target.value })} />
          <input className="input-gestor" type="number" placeholder="ID da Unidade" value={formAgendamento.unidade_id}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, unidade_id: e.target.value })} />
          <input className="input-gestor" type="number" placeholder="ID do Profissional" value={formAgendamento.profissional_id}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, profissional_id: e.target.value })} />
          <input className="input-gestor" type="datetime-local" placeholder="Data e Hora" value={formAgendamento.data_hora}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, data_hora: e.target.value })} />
          <input className="input-gestor" type="text" placeholder="Especialidade" value={formAgendamento.especialidade}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, especialidade: e.target.value })} />
          <textarea className="input-gestor textarea-gestor" placeholder="Indicação Clínica" value={formAgendamento.indicacao_clinica}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, indicacao_clinica: e.target.value })} />
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.post('/api/agendamentos/agendar', {
              paciente_id: parseInt(formAgendamento.paciente_id),
              unidade_id: parseInt(formAgendamento.unidade_id),
              profissional_id: parseInt(formAgendamento.profissional_id),
              data_hora: formAgendamento.data_hora.replace('T', ' '),
              especialidade: formAgendamento.especialidade,
              indicacao_clinica: formAgendamento.indicacao_clinica
            })
          )}>{carregando ? 'Enviando...' : 'Confirmar'}</button>
          <ResultadoModal resultado={resultado} erro={erroModal} />
        </Modal>
      )}

      {/* MODAL: Obter Agendamento */}
      {modalAberto === 'obterAgendamento' && (
        <Modal titulo="Obter Agendamento" onClose={fecharModal}>
          <input className="input-gestor" type="number" placeholder="ID do Agendamento" value={formObterAgendamento.agendamento_id}
            onChange={(e) => setFormObterAgendamento({ ...formObterAgendamento, agendamento_id: e.target.value })} />
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.get(`/api/agendamentos/${formObterAgendamento.agendamento_id}`)
          )}>{carregando ? 'Buscando...' : 'Buscar'}</button>
          <ResultadoModal resultado={resultado} erro={erroModal} />
        </Modal>
      )}

      {/* MODAL: Atualizar Status Agendamento */}
      {modalAberto === 'atualizarStatusAgendamento' && (
        <Modal titulo="Atualizar Status do Agendamento" onClose={fecharModal}>
          <input className="input-gestor" type="number" placeholder="ID do Agendamento" value={formStatusAgendamento.agendamento_id}
            onChange={(e) => setFormStatusAgendamento({ ...formStatusAgendamento, agendamento_id: e.target.value })} />
          <select className="input-gestor" value={formStatusAgendamento.status}
            onChange={(e) => setFormStatusAgendamento({ ...formStatusAgendamento, status: e.target.value })}>
            <option value="Agendado">Agendado</option>
            <option value="fila_espera">Fila de Espera</option>
            <option value="Concluido">Concluído</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.patch(`/api/agendamentos/${formStatusAgendamento.agendamento_id}/status`, {
              status: formStatusAgendamento.status
            })
          )}>{carregando ? 'Enviando...' : 'Confirmar'}</button>
          <ResultadoModal resultado={resultado} erro={erroModal} />
        </Modal>
      )}

      {/* MODAL: Popular Fila Falsa */}
      {modalAberto === 'popularFila' && (
        <Modal titulo="Popular Fila Falsa" onClose={fecharModal}>
          <input className="input-gestor" type="number" placeholder="ID da Unidade" value={formPopularFila.unidade_id}
            onChange={(e) => setFormPopularFila({ ...formPopularFila, unidade_id: e.target.value })} />
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.post(`/api/unidades/${formPopularFila.unidade_id}/popular`)
          )}>{carregando ? 'Populando...' : 'Popular Fila'}</button>
          <ResultadoModal resultado={resultado} erro={erroModal} />
        </Modal>
      )}

      {/* MODAL: Observar Fila Atual */}
      {modalAberto === 'observarFila' && (
        <Modal titulo="Observar Fila Atual" onClose={fecharModal} largo>
          <input className="input-gestor" type="number" placeholder="ID da Unidade" value={formObservarFila.unidade_id}
            onChange={(e) => setFormObservarFila({ ...formObservarFila, unidade_id: e.target.value })} />
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.get(`/api/unidades/${formObservarFila.unidade_id}/fila-atual`)
          )}>{carregando ? 'Buscando...' : 'Observar Fila'}</button>
          <ResultadoModal resultado={resultado} erro={erroModal} />
        </Modal>
      )}

      {/* MODAL: Assistente */}
      {modalAberto === 'assistente' && (
        <Modal titulo="Conversar com Assistente" onClose={fecharModal}>
          <input className="input-gestor" type="text" placeholder="CPF do Paciente" value={formAssistente.cpf}
            onChange={(e) => setFormAssistente({ ...formAssistente, cpf: e.target.value })} />
          <textarea className="input-gestor textarea-gestor" placeholder="Mensagem (ex: status atual)" value={formAssistente.texto}
            onChange={(e) => setFormAssistente({ ...formAssistente, texto: e.target.value })} />
          <button className="botao-gestor-confirmar" disabled={carregando} onClick={() => executar(() =>
            api.post('/assistente', { cpf: formAssistente.cpf, texto: formAssistente.texto })
          )}>{carregando ? 'Enviando...' : 'Enviar'}</button>
          {resultado?.resposta_bot && (
            <div className="resposta-bot-caixa">{resultado.resposta_bot}</div>
          )}
          {erroModal && <p className="erro-gestor">{erroModal}</p>}
        </Modal>
      )}
    </div>
  );
}

function Modal({ titulo, onClose, children, largo }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-conteudo ${largo ? 'modal-largo' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{titulo}</h3>
          <button className="modal-fechar" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function ResultadoModal({ resultado, erro }) {
  if (erro) return <p className="erro-gestor">{erro}</p>;
  if (!resultado) return null;
  return (
    <pre className="resultado-json">{JSON.stringify(resultado, null, 2)}</pre>
  );
}

export default PainelGestor;
