import React, { useState } from 'react';
import api from './services/api'; 
import './App.css';
import PainelGestor from './PainelGestor'; 
import PainelAdmin from './PainelAdmin'; // Importe seu novo painel admin

function App() {
  const [tela, setTela] = useState('login_profissional');
  const [abaAtiva, setAbaAtiva] = useState('paciente');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || null);

  const [matricula, setMatricula] = useState('');
  const [senhaProfissional, setSenhaProfissional] = useState('');
  const [unidadeLogada, setUnidadeLogada] = useState(null);

  const handleLoginProfissional = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/profissionais/login', { matricula, senha: senhaProfissional });
      if (res.data.access_token) localStorage.setItem('token', res.data.access_token);
      
      if (res.data.profissional?.permissao) {
        localStorage.setItem('userRole', res.data.profissional.permissao);
        setUserRole(res.data.profissional.permissao);
      }
      
      setUnidadeLogada(res.data.unidade);
      setTela('painel');
      setErro('');
    } catch (err) {
      setErro('Matrícula ou senha incorretas.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserRole(null);
    setTela('login_profissional');
    setMatricula('');
    setSenhaProfissional('');
  };

  return (
    <div className="app-container">
      {/* TELA DE LOGIN ÚNICA */}
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

      {/* TELA PAINEL */}
      {tela === 'painel' && (
        <div>
          <nav className="navbar">
            <div className="nav-menu">
              <span className="nav-logo">SIG-MAMO ✚</span>
              <button onClick={() => setAbaAtiva('paciente')} className={abaAtiva === 'paciente' ? 'abaAtiva' : 'abaInativa'}>Pacientes</button>
              
              {/* O Admin ou Gestor podem ver a gestão de profissionais */}
              {(userRole === 'gestor' || userRole === 'admin') && (
                <button onClick={() => setAbaAtiva('profissionais')} className={abaAtiva === 'profissionais' ? 'abaAtiva' : 'abaInativa'}>
                  Gestão de Profissionais
                </button>
              )}
            </div>
            <button onClick={handleLogout} className="botaoSair">Sair</button>
          </nav>

          <div className="main-content">
            {abaAtiva === 'paciente' && (
              <div className="conteudoAba">
                <h2>Pacientes</h2>
                <p>Em breve: busca de paciente.</p>
              </div>
            )}
            
            {/* Lógica de Painel baseada na role */}
            {abaAtiva === 'profissionais' && (
              userRole === 'admin' ? (
                <PainelAdmin unidadeLogada={unidadeLogada} />
              ) : (
                <PainelGestor unidadeLogada={unidadeLogada} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;