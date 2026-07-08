import React, { useState, useEffect } from 'react';
import api from './services/api';

function humanizar(nome) {
  const semUnderline = nome.replace(/_/g, ' ');
  return semUnderline.charAt(0).toUpperCase() + semUnderline.slice(1);
}

function extrairParametrosRota(rota) {
  const matches = rota.match(/\{(\w+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1));
}

function montarUrl(rota, valores) {
  let url = rota;
  extrairParametrosRota(rota).forEach((p) => {
    url = url.replace(`{${p}}`, encodeURIComponent(valores[p] ?? ''));
  });
  return url;
}

const ACOES = [
  { grupo: 'Unidades', id: 'cadastrar-unidade', metodo: 'POST', rota: '/api/admin/unidades/cadastro', titulo: 'Cadastrar Unidade', icone: '🏥', campos: [{ nome: 'nome', label: 'Nome da unidade', tipo: 'text' }], resultado: 'unidade' },
  { grupo: 'Unidades', id: 'login-unidade', metodo: 'POST', rota: '/api/unidades/login', titulo: 'Login de Unidade', icone: '🔑', campos: [{ nome: 'codigo_cnes', label: 'Código CNES', tipo: 'text' }, { nome: 'senha_login', label: 'Senha', tipo: 'password' }] },
  { grupo: 'Profissionais', id: 'cadastrar-profissional', metodo: 'POST', rota: '/api/profissionais/cadastro', titulo: 'Cadastrar Profissional', icone: '🩺', campos: [{ nome: 'unidade_id', label: 'ID da unidade', tipo: 'number' }, { nome: 'nome', label: 'Nome completo', tipo: 'text' }, { nome: 'cargo', label: 'Cargo', tipo: 'text' }, { nome: 'permissao', label: 'Permissão', tipo: 'select', opcoes: ['profissional', 'gestor', 'admin'] }], resultado: 'profissional' },
  { grupo: 'Pacientes', id: 'cadastrar-paciente', metodo: 'POST', rota: '/api/pacientes/cadastro', titulo: 'Cadastrar Paciente', icone: '🧾', campos: [{ nome: 'unidade_id', label: 'ID da unidade', tipo: 'number' }, { nome: 'nome', label: 'Nome completo', tipo: 'text' }, { nome: 'cpf', label: 'CPF', tipo: 'text' }, { nome: 'data_nascimento', label: 'Data de nascimento', tipo: 'date' }, { nome: 'telefone', label: 'Telefone', tipo: 'text' }, { nome: 'endereco', label: 'Endereço', tipo: 'text' }] },
  { grupo: 'Pacientes', id: 'atualizar-paciente', metodo: 'PUT', rota: '/api/pacientes/atualizar/{paciente_id}', titulo: 'Atualizar Paciente', icone: '✏️', campos: [{ nome: 'telefone', label: 'Telefone', tipo: 'text' }, { nome: 'endereco', label: 'Endereço', tipo: 'text' }] },
  { grupo: 'Agendamentos Clínicos', id: 'criar-agendamento', metodo: 'POST', rota: '/api/agendamentos/agendar', titulo: 'Criar Agendamento', icone: '📋', campos: [{ nome: 'paciente_id', label: 'ID do paciente', tipo: 'number' }, { nome: 'unidade_id', label: 'ID da unidade', tipo: 'number' }, { nome: 'profissional_id', label: 'ID do profissional', tipo: 'number' }, { nome: 'data_hora', label: 'Data e hora', tipo: 'datetime-local' }, { nome: 'especialidade', label: 'Especialidade', tipo: 'text' }, { nome: 'indicacao_clinica', label: 'Indicação clínica', tipo: 'textarea' }], resultado: 'agendamento' },
  { grupo: 'Agendamentos Clínicos', id: 'obter-agendamento', metodo: 'GET', rota: '/api/agendamentos/{agendamento_id}', titulo: 'Obter Agendamento', icone: '🔍', campos: [] },
  { grupo: 'Agendamentos Clínicos', id: 'atualizar-status', metodo: 'PATCH', rota: '/api/agendamentos/{agendamento_id}/status', titulo: 'Atualizar Status do Agendamento', icone: '🔄', campos: [{ nome: 'status', label: 'Novo status', tipo: 'select', opcoes: ['fila_espera', 'Agendado', 'Concluído', 'Cancelado'] }] },
  { grupo: 'Fila e Monitoramento', id: 'popular-fila', metodo: 'POST', rota: '/api/unidades/{unidade_id}/popular', titulo: 'Popular Fila Falsa', icone: '🗂️', campos: [] },
  { grupo: 'Fila e Monitoramento', id: 'fila-atual', metodo: 'GET', rota: '/api/unidades/{unidade_id}/fila-atual', titulo: 'Ver Fila Atual', icone: '📊', campos: [], resultado: 'fila' },
];

function ListaUnidades({ recarregarChave }) {
  const [unidades, setUnidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setCarregando(true);
    setErro('');
    api.get('/api/unidades/listar')
      .then((res) => setUnidades(res.data || []))
      .catch((err) => setErro(err.response?.data?.detail || 'Erro ao carregar unidades.'))
      .finally(() => setCarregando(false));
  }, [recarregarChave]);

  return (
    <div className="lista-unidades-painel">
      <h3>Todas as Unidades</h3>
      {carregando && <p className="texto-pendencias-admin">Carregando...</p>}
      {erro && <p className="erro">{erro}</p>}
      {!carregando && !erro && unidades.length === 0 && <p className="texto-pendencias-admin">Nenhuma unidade cadastrada ainda.</p>}
      {!carregando && unidades.length > 0 && (
        <table className="tabela-admin">
          <thead><tr><th>ID</th><th>Nome</th><th>CNES</th></tr></thead>
          <tbody>{unidades.map((u) => (<tr key={u.id}><td>{u.id}</td><td>{u.nome}</td><td>{u.codigo_cnes}</td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}

function ResultadoAcao({ acao, resultado }) {
  if (!resultado) return null;
  if (acao.resultado === 'unidade') return <div className="sucessoCaixa">Unidade criada com sucesso!<br />CNES: <strong>{resultado.codigo_cnes}</strong><br />Senha gerada: <strong>{resultado.senha_gerada}</strong></div>;
  if (acao.resultado === 'profissional') return <div className="sucessoCaixa">Profissional cadastrado com sucesso!<br />Matrícula: <strong>{resultado.matricula_gerada || resultado.matricula}</strong><br />Senha gerada: <strong>{resultado.senha_gerada || resultado.senha}</strong></div>;
  if (acao.resultado === 'agendamento') return <div className="sucessoCaixa">Agendamento #{resultado.agendamento_id} criado.<br />Prioridade: <strong>{resultado.prioridade_score} pts</strong></div>;
  if (acao.resultado === 'fila') {
    const pacientes = resultado.pacientes || [];
    if (pacientes.length === 0) return <p className="texto-pendencias-admin">Fila vazia para esta unidade.</p>;
    return (
      <div className="fila-container-admin">
        {pacientes.map((p) => (
          <div key={p.paciente_id} className={`paciente-card-admin ${p.cadastro_incompleto ? 'incompleto' : ''}`}>
            <strong>{p.paciente_nome}</strong>
            <p className="texto-pendencias-admin">Idade: {p.idade} — Prioridade: {p.prioridade_score} — Status: {p.status}</p>
            {p.cadastro_incompleto && <p className="texto-alerta-admin">Pendente: {(p.dados_pendentes || []).join(', ')}</p>}
          </div>
        ))}
      </div>
    );
  }
  return <div className="sucessoCaixa">{resultado.mensagem || 'Ação concluída com sucesso.'}</div>;
}

function ModalAcao({ acao, unidadeLogada, onClose, onSucessoUnidade }) {
  const parametrosRota = extrairParametrosRota(acao.rota);
  const camposCompletos = [
    ...parametrosRota.map((p) => ({ nome: p, label: humanizar(p), tipo: /id$/i.test(p) ? 'number' : 'text', isPath: true })),
    ...acao.campos,
  ];
  const [valores, setValores] = useState(() => {
    const inicial = {};
    camposCompletos.forEach((c) => { inicial[c.nome] = c.nome === 'unidade_id' && unidadeLogada?.id ? unidadeLogada.id : c.tipo === 'select' ? c.opcoes[0] : ''; });
    return inicial;
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const setCampo = (nome, valor) => setValores((v) => ({ ...v, [nome]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(''); setResultado(null); setCarregando(true);
    try {
      const url = montarUrl(acao.rota, valores);
      const corpo = {};
      acao.campos.forEach((c) => {
        let valor = valores[c.nome];
        if (c.tipo === 'number' && valor !== '') valor = Number(valor);
        if (c.tipo === 'datetime-local' && valor) valor = valor.replace('T', ' ');
        corpo[c.nome] = valor;
      });
      const resposta = await api.request({ method: acao.metodo.toLowerCase(), url, data: acao.metodo === 'GET' ? undefined : corpo });
      setResultado(resposta.data);
      if (acao.resultado === 'unidade' && onSucessoUnidade) onSucessoUnidade();
    } catch (err) {
      setErro(err.response?.data?.detail || err.response?.data?.mensagem || 'Erro ao executar a ação.');
    } finally { setCarregando(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>{acao.titulo}</h3><button className="modal-fechar" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {camposCompletos.map((c) => (
              <div key={c.nome} className="campo-admin">
                <label>{c.label}</label>
                {c.tipo === 'select' ? (
                  <select className="input-hap" value={valores[c.nome]} onChange={(e) => setCampo(c.nome, e.target.value)}>{c.opcoes.map((op) => <option key={op} value={op}>{op}</option>)}</select>
                ) : c.tipo === 'textarea' ? (
                  <textarea className="input-hap" style={{ minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} value={valores[c.nome]} onChange={(e) => setCampo(c.nome, e.target.value)} required />
                ) : (
                  <input className="input-hap" type={c.tipo} value={valores[c.nome]} onChange={(e) => setCampo(c.nome, e.target.value)} required />
                )}
              </div>
            ))}
            {erro && <p className="erro">{erro}</p>}
            <button type="submit" className="btn-primary-hap" disabled={carregando}>{carregando ? 'Enviando...' : 'Executar'}</button>
          </form>
          <ResultadoAcao acao={acao} resultado={resultado} />
          {resultado && <pre className="resultado-json">{JSON.stringify(resultado, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}

function ModalAssistente({ onClose }) {
  const [cpf, setCpf] = useState('');
  const [texto, setTexto] = useState('');
  const [log, setLog] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const enviar = async () => {
    if (!texto.trim()) return;
    const mensagemUsuario = texto;
    setLog((l) => [...l, { autor: 'user', texto: mensagemUsuario }]);
    setTexto(''); setCarregando(true);
    try {
      const res = await api.post('/assistente', { cpf, texto: mensagemUsuario });
      setLog((l) => [...l, { autor: 'bot', texto: res.data.resposta_bot }]);
    } catch { setLog((l) => [...l, { autor: 'bot', texto: 'Erro ao falar com o assistente.' }]); }
    finally { setCarregando(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Assistente Virtual (Sigma)</h3><button className="modal-fechar" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <input className="input-hap" placeholder="CPF do paciente" value={cpf} onChange={(e) => setCpf(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
            {log.map((m, i) => m.autor === 'bot' ? <div key={i} className="resposta-bot-caixa">{m.texto}</div> : <div key={i} className="bolha-usuario-admin">{m.texto}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="input-hap" style={{ flex: 1, marginBottom: 0 }} placeholder="Digite a mensagem, ex: status atual" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviar()} />
            <button className="btn-primary-hap" style={{ width: 'auto', padding: '0 20px' }} onClick={enviar} disabled={carregando}>Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PainelAdmin({ unidadeLogada, acaoInicial, onAcaoConsumida }) {
  const [acaoAtiva, setAcaoAtiva] = useState(null);
  const [chatAberto, setChatAberto] = useState(false);
  const [recarregarChave, setRecarregarChave] = useState(0);
  const [busca, setBusca] = useState(''); // Estado da barra de pesquisa

  useEffect(() => {
    if (acaoInicial) {
      const acao = ACOES.find((a) => a.id === acaoInicial);
      if (acao) setAcaoAtiva(acao);
      if (onAcaoConsumida) onAcaoConsumida();
    }
  }, [acaoInicial]);

  // Filtra as ações com base no que foi digitado na barra de pesquisa
  const acoesFiltradas = ACOES.filter((acao) =>
    acao.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  // Também verifica se o assistente se encaixa na busca
  const mostrarAssistente = 'Conversar com Assistente'.toLowerCase().includes(busca.toLowerCase());

  return (
    <div className="painel-admin-wrapper">
      {/* A lista de unidades continua intacta no topo */}
      <ListaUnidades recarregarChave={recarregarChave} />

      {/* A Barra de Pesquisa adicionada */}
      <div className="barra-busca-wrap">
        <span className="barra-busca-icone">🔍</span>
        <input
          className="barra-busca"
          placeholder="Buscar serviço"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="servicos-grid">
        {acoesFiltradas.map((acao) => (
          <button key={acao.id} className="card-servico" onClick={() => setAcaoAtiva(acao)}>
            <span className="card-servico-icone">{acao.icone}</span>
            <span className="card-servico-label">{acao.titulo}</span>
          </button>
        ))}
        
        {mostrarAssistente && (
          <button className="card-servico" onClick={() => setChatAberto(true)}>
            <span className="card-servico-icone">🤖</span>
            <span className="card-servico-label">Conversar com Assistente</span>
          </button>
        )}
      </div>

      {acaoAtiva && <ModalAcao acao={acaoAtiva} unidadeLogada={unidadeLogada} onClose={() => setAcaoAtiva(null)} onSucessoUnidade={() => setRecarregarChave((c) => c + 1)} />}
      {chatAberto && <ModalAssistente onClose={() => setChatAberto(false)} />}
    </div>
  );
}
export default PainelAdmin;