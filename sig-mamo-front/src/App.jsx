import React, { useState } from 'react';
import api from './services/api';
import './App.css';
import PainelGestor from './PainelGestor';
import PainelAdmin from './PainelAdmin';

const ICONES = {
  inicio: '🏠',
  servicos: '⚙️',
  agendar: '📅',
  perfil: '👤',
  grafico: '📊',
};

const ITENS_INICIO_ADMIN = [
  { id: 'cadastrar-unidade', label: 'Cadastrar Unidade', icone: '🏥' },
  { id: 'login-unidade', label: 'Login de Unidade', icone: '🔑' },
  { id: 'cadastrar-profissional', label: 'Cadastrar Profissional', icone: '🩺' },
  { id: 'cadastrar-paciente', label: 'Cadastrar Paciente', icone: '🧾' },
  { id: 'atualizar-paciente', label: 'Atualizar Paciente', icone: '✏️' },
];

function Sidebar({ abaAtiva, setAbaAtiva, recolhida, setRecolhida }) {
  const itens = [
    { key: 'inicio', label: 'Início', icone: ICONES.inicio },
    { key: 'servicos', label: 'Serviços', icone: ICONES.servicos },
    { key: 'agendar', label: 'Agendar', icone: ICONES.agendar },
    { key: 'perfil', label: 'Perfil', icone: ICONES.perfil },
    { key: 'grafico', label: 'Gráfico de Absenteísmo', icone: ICONES.grafico, emBreve: true },
  ];

  return (
    <aside className={`sidebar ${recolhida ? 'recolhida' : ''}`}>
      <div className="sidebar-logo">
        <span className="logo-icon">❀</span>
        {!recolhida && <span className="sidebar-logo-texto">SIG-MAMO</span>}
      </div>
      <nav className="sidebar-nav">
        {itens.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${abaAtiva === item.key ? 'ativo' : ''} ${item.emBreve ? 'em-breve' : ''}`}
            onClick={() => !item.emBreve && setAbaAtiva(item.key)}
            title={recolhida ? item.label : ''}
          >
            <span className="sidebar-icone">{item.icone}</span>
            {!recolhida && (
              <span className="sidebar-label">
                {item.label}
                {item.emBreve && <span className="tag-em-breve">EM BREVE</span>}
              </span>
            )}
          </button>
        ))}
      </nav>
      <button className="sidebar-toggle" onClick={() => setRecolhida(!recolhida)}>
        {recolhida ? '›' : '‹'}
      </button>
    </aside>
  );
}

function Topbar({ titulo, profissional, onLogout }) {
  const iniciais = profissional?.nome
    ? profissional.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <header className="topbar">
      <h1 className="topbar-titulo">{titulo}</h1>
      <div className="topbar-direita">
        <div className="avatar-wrap">
          <div className="avatar">{iniciais}</div>
          <span className="avatar-nome">{profissional?.nome?.split(' ')[0] || 'Usuário'}</span>
          <button className="botaoSair-top" onClick={onLogout}>Sair</button>
        </div>
      </div>
    </header>
  );
}

function PopupAgendar({ onClose, onEscolha }) {
  const opcoes = [
    { id: 'criar-agendamento', label: 'Criar Agendamento', icone: '📋' },
    { id: 'obter-agendamento', label: 'Obter Agendamento', icone: '🔍' },
    { id: 'atualizar-status', label: 'Atualizar Status', icone: '🔄' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="popup-agendar" onClick={(e) => e.stopPropagation()}>
        <div className="popup-agendar-header">
          <h3>Tipo de agendamento</h3>
          <button className="modal-fechar" onClick={onClose}>×</button>
        </div>
        <div className="popup-agendar-grid">
          {opcoes.map((op) => (
            <button key={op.id} className="popup-agendar-opcao" onClick={() => onEscolha(op.id)}>
              <span className="popup-agendar-icone">{op.icone}</span>
              <span>{op.label}</span>
            </button>
          ))}
        </div>
        <button className="btn-primary-hap" style={{ marginTop: 8 }} onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

function PaginaInicio({ userRole, onAcao }) {
  const itens = ITENS_INICIO_ADMIN;
  return (
    <div className="pagina-inicio">
      <p className="pagina-subtitulo">Principais ações</p>
      <div className="grid-inicio">
        {itens.map((item) => (
          <button key={item.id} className="card-inicio" onClick={() => onAcao(item.id)}>
            <span className="card-inicio-icone">{item.icone}</span>
            <span className="card-inicio-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PaginaServicos({ onAcao }) {
  const [busca, setBusca] = useState('');

  const todos = [
    { id: 'cadastrar-unidade', label: 'Cadastrar Unidade', icone: '🏥' },
    { id: 'login-unidade', label: 'Login de Unidade', icone: '🔑' },
    { id: 'cadastrar-profissional', label: 'Cadastrar Profissional', icone: '🩺' },
    { id: 'cadastrar-paciente', label: 'Cadastrar Paciente', icone: '🧾' },
    { id: 'atualizar-paciente', label: 'Atualizar Paciente', icone: '✏️' },
    { id: 'criar-agendamento', label: 'Criar Agendamento', icone: '📋' },
    { id: 'obter-agendamento', label: 'Obter Agendamento', icone: '🔍' },
    { id: 'atualizar-status', label: 'Atualizar Status do Agendamento', icone: '🔄' },
    { id: 'popular-fila', label: 'Popular Fila Falsa', icone: '🗂️' },
    { id: 'fila-atual', label: 'Ver Fila Atual', icone: '📊' },
    { id: 'assistente', label: 'Conversar com Assistente', icone: '🤖' },
  ];

  const filtrados = todos.filter((i) =>
    i.label.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="pagina-servicos">
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
        {filtrados.map((item) => (
          <button key={item.id} className="card-servico" onClick={() => onAcao(item.id)}>
            <span className="card-servico-icone">{item.icone}</span>
            <span className="card-servico-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PaginaPerfil({ profissional, unidade }) {
  const iniciais = profissional?.nome
    ? profissional.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <div className="pagina-perfil">
      <div className="perfil-card">
        <div className="perfil-avatar-grande">{iniciais}</div>
        <h2 className="perfil-nome">{profissional?.nome || '—'}</h2>
        <p className="perfil-cargo">{profissional?.cargo || '—'}</p>
        <div className="perfil-dados">
          <div className="perfil-linha">
            <span className="perfil-chave">Matrícula</span>
            <span className="perfil-valor">{profissional?.matricula || '—'}</span>
          </div>
          <div className="perfil-linha">
            <span className="perfil-chave">Permissão</span>
            <span className="perfil-valor">{profissional?.permissao || '—'}</span>
          </div>
          <div className="perfil-linha">
            <span className="perfil-chave">Unidade</span>
            <span className="perfil-valor">{unidade?.nome || 'Não vinculado'}</span>
          </div>
          {unidade?.codigo_cnes && (
            <div className="perfil-linha">
              <span className="perfil-chave">CNES</span>
              <span className="perfil-valor">{unidade.codigo_cnes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TITULOS = {
  inicio: 'Início',
  servicos: 'Serviços',
  agendar: 'Agendar',
  perfil: 'Perfil',
  grafico: 'Gráfico de Absenteísmo',
};

function App() {
  const [tela, setTela] = useState('login_profissional');
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [erro, setErro] = useState('');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || null);
  const [profissionalLogado, setProfissionalLogado] = useState(() => {
    try { return JSON.parse(localStorage.getItem('profissional')) || null; } catch { return null; }
  });
  const [unidadeLogada, setUnidadeLogada] = useState(() => {
    try { return JSON.parse(localStorage.getItem('unidade')) || null; } catch { return null; }
  });
  const [matricula, setMatricula] = useState('');
  const [senhaProfissional, setSenhaProfissional] = useState('');
  const [recolhida, setRecolhida] = useState(false);
  const [popupAgendar, setPopupAgendar] = useState(false);
  const [acaoSolicitada, setAcaoSolicitada] = useState(null);

  const handleLoginProfissional = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/profissionais/login', { matricula, senha: senhaProfissional });
      if (res.data.access_token) localStorage.setItem('token', res.data.access_token);
      if (res.data.profissional?.permissao) {
        localStorage.setItem('userRole', res.data.profissional.permissao);
        localStorage.setItem('profissional', JSON.stringify(res.data.profissional));
        setUserRole(res.data.profissional.permissao);
        setProfissionalLogado(res.data.profissional);
      }
      if (res.data.unidade) {
        localStorage.setItem('unidade', JSON.stringify(res.data.unidade));
        setUnidadeLogada(res.data.unidade);
      }
      setTela('painel');
      setErro('');
    } catch {
      setErro('Matrícula ou senha incorretas.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserRole(null);
    setProfissionalLogado(null);
    setUnidadeLogada(null);
    setTela('login_profissional');
    setMatricula('');
    setSenhaProfissional('');
    setAbaAtiva('inicio');
  };

  const handleAbaAtiva = (aba) => {
    if (aba === 'agendar') { setPopupAgendar(true); return; }
    setAbaAtiva(aba);
  };

  const handleAcao = (id) => {
    setAcaoSolicitada(id);
    setAbaAtiva('servicos');
  };

  const handleEscolhaAgendar = (id) => {
    setPopupAgendar(false);
    handleAcao(id);
  };

  return (
    <div className="app-container">
      {tela === 'login_profissional' && (
        <div className="login-split-container">
          <div className="login-image-bg"></div>
          <div className="login-sidebar">
            <div className="login-logo"><span className="logo-icon">❀</span> SIG-MAMO</div>
            {erro && <p className="erro">{erro}</p>}
            <form onSubmit={handleLoginProfissional} className="login-form">
              <div className="input-group">
                <label>Login Profissional</label>
                <input type="text" placeholder="Digite sua matrícula" value={matricula} onChange={(e) => setMatricula(e.target.value)} required className="input-hap" />
              </div>
              <div className="input-group">
                <label>Senha</label>
                <input type="password" placeholder="Digite sua senha" value={senhaProfissional} onChange={(e) => setSenhaProfissional(e.target.value)} required className="input-hap" />
              </div>
              <button type="submit" className="btn-primary-hap">Acessar conta ➔</button>
            </form>
          </div>
        </div>
      )}

      {tela === 'painel' && (
        <div className="painel-layout">
          <Sidebar abaAtiva={abaAtiva} setAbaAtiva={handleAbaAtiva} recolhida={recolhida} setRecolhida={setRecolhida} />
          <div className="painel-corpo">
            <Topbar titulo={TITULOS[abaAtiva] || 'Painel'} profissional={profissionalLogado} onLogout={handleLogout} />
            <main className="painel-main">
              {abaAtiva === 'inicio' && (
                userRole === 'gestor' 
                  ? <PainelGestor unidadeLogada={unidadeLogada} />
                  : <PaginaInicio userRole={userRole} onAcao={handleAcao} />
              )}
              
              {abaAtiva === 'servicos' && (
                userRole === 'admin' 
                  ? <PainelAdmin unidadeLogada={unidadeLogada} acaoInicial={acaoSolicitada} onAcaoConsumida={() => setAcaoSolicitada(null)} />
                  : <PaginaServicos onAcao={handleAcao} />
              )}

              {abaAtiva === 'perfil' && (
                <PaginaPerfil profissional={profissionalLogado} unidade={unidadeLogada} />
              )}
            </main>
          </div>
          {popupAgendar && (
            <PopupAgendar onClose={() => setPopupAgendar(false)} onEscolha={handleEscolhaAgendar} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;