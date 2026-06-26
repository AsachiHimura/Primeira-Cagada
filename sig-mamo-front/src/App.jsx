import React, { useState } from 'react';
import api from './services/api';
import './App.css';
import PainelGestor from './PainelGestor';

function App() {
  // Estados de navegação e controle
  const [tela, setTela] = useState('login_unidade');
  const [abaAtiva, setAbaAtiva] = useState('fila');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  
  // Estado para o cargo do usuário (Gestor ou não) com persistência
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || null);

  // Estados dos formulários
  const [nomeNovaUnidade, setNomeNovaUnidade] = useState('');
  const [cnes, setCnes] = useState('');
  const [senhaUnidade, setSenhaUnidade] = useState('');
  const [matricula, setMatricula] = useState('');
  const [senhaProfissional, setSenhaProfissional] = useState('');
  const [identificadorRecuperacao, setIdentificadorRecuperacao] = useState('');

  const [unidadeLogada, setUnidadeLogada] = useState(null);
  const [fila, setFila] = useState([]);

  // Estados paciente
  const [nomePaciente, setNomePaciente] = useState('');
  const [idadePaciente, setIdadePaciente] = useState('');
  const [cpfPaciente, setCpfPaciente] = useState('');
  const [dataNascPaciente, setDataNascPaciente] = useState('');
  const [telefonePaciente, setTelefonePaciente] = useState('');
  const [enderecoPaciente, setEnderecoPaciente] = useState('');
  const [cepPaciente, setCepPaciente] = useState('');
  const [historicoPaciente, setHistoricoPaciente] = useState('');

  // Funções de Ação
  const handleCadastroUnidade = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/unidades', { nome: nomeNovaUnidade });
      setSucesso(`UNIDADE CRIADA! CNES: ${res.data.codigo_cnes}`);
      setTela('login_unidade');
    } catch (err) {
      setErro('Erro ao criar unidade.');
    }
  };

  const handleLoginUnidade = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/unidades/login', { codigo_cnes: cnes, senha_login: senhaUnidade });
      localStorage.setItem('token', res.data.access_token);
      setUnidadeLogada(res.data);
      setTela('login_profissional');
    } catch (err) {
      setErro('CNES ou senha da unidade incorretos.');
    }
  };

  const handleLoginProfissional = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/profissionais/login', { matricula, senha: senhaProfissional });
      
      if (res.data.access_token) localStorage.setItem('token', res.data.access_token);
      
      // Salva permissão se existir
      if (res.data.profissional?.permissao) {
        localStorage.setItem('userRole', res.data.profissional.permissao);
        setUserRole(res.data.profissional.permissao);
      }
      setTela('painel');
    } catch (err) {
      setErro('Matrícula ou senha incorretas.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserRole(null);
    setTela('login_unidade');
    setMatricula('');
    setSenhaProfissional('');
  };

  const handleCadastroPaciente = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/pacientes', {
        unidade_id: unidadeLogada.id,
        nome: nomePaciente,
        idade: parseInt(idadePaciente),
        cpf: cpfPaciente,
        data_nascimento: dataNascPaciente,
        telefone: telefonePaciente,
        endereco: enderecoPaciente,
        cep: cepPaciente,
        historico_medico: historicoPaciente
      });
      setSucesso('Paciente cadastrado!');
    } catch (err) {
      setErro('Erro ao cadastrar paciente.');
    }
  };

  return (
    <div className="app-container">
      {/* TELA DE LOGIN UNIDADE */}
      {tela === 'login_unidade' && (
        <div className="containerCentral">
          <div className="card">
            <h2>SIG-MAMO</h2>
            <p className="subtitulo-login">Sistema Integrado de Gestão — Mamografia</p>
            {erro && <p className="erro">{erro}</p>}
            <form onSubmit={handleLoginUnidade}>
              <input type="text" placeholder="CNES" value={cnes} onChange={(e) => setCnes(e.target.value)} required className="input" />
              <input type="password" placeholder="Senha" value={senhaUnidade} onChange={(e) => setSenhaUnidade(e.target.value)} required className="input" />
              <button type="submit" className="botaoAcao">Acessar</button>
            </form>
          </div>
        </div>
      )}

      {/* TELA DE LOGIN PROFISSIONAL */}
      {tela === 'login_profissional' && (
        <div className="containerCentral">
          <div className="card">
            <h2>Acesso Profissional</h2>
            {erro && <p className="erro">{erro}</p>}
            <form onSubmit={handleLoginProfissional}>
              <input type="text" placeholder="Matrícula" value={matricula} onChange={(e) => setMatricula(e.target.value)} required className="input" />
              <input type="password" placeholder="Senha" value={senhaProfissional} onChange={(e) => setSenhaProfissional(e.target.value)} required className="input" />
              <button type="submit" className="botaoAcao">Entrar</button>
            </form>
          </div>
        </div>
      )}

      {/* TELA PAINEL - A versão segura */}
      {tela === 'painel' && (
        <div>
          <nav className="navbar">
            <div className="nav-menu">
              <span className="nav-logo">SIG-MAMO ✚</span>
              <button onClick={() => setAbaAtiva('fila')}>Fila</button>
              <button onClick={() => setAbaAtiva('paciente')}>Pacientes</button>
              {userRole === 'gestor' && (
                <button onClick={() => setAbaAtiva('profissionais')}>Gestão de Profissionais</button>
              )}
            </div>
            <button onClick={handleLogout} className="botaoSair">Sair</button>
          </nav>

          <div className="main-content">
            {/* SEGURANÇA NA FILA: Só faz .map se a fila existir */}
            {abaAtiva === 'fila' && (
              <div>
                <h2>Fila de Espera</h2>
                {Array.isArray(fila) && fila.length > 0 ? (
                  fila.map((p, index) => (
                    <div key={index} className="paciente-card">
                      <h3>{p.paciente_nome || 'Sem nome'}</h3>
                    </div>
                  ))
                ) : (
                  <p>Fila vazia ou carregando...</p>
                )}
              </div>
            )}
            
            {abaAtiva === 'paciente' && (
              <div>
                <h2>Cadastro de Paciente</h2>
                <form onSubmit={handleCadastroPaciente}>
                  <input type="text" placeholder="Nome" value={nomePaciente} onChange={(e) => setNomePaciente(e.target.value)} />
                  <button type="submit">Salvar</button>
                </form>
              </div>
            )}

            {abaAtiva === 'profissionais' && userRole === 'gestor' && (
              <PainelGestor unidadeLogada={unidadeLogada} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
