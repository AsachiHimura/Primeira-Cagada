import { useState, useEffect } from 'react';
import api from './services/api';

function humanizar(nome) {
  if (nome === 'unidade_id') return 'Unidade';
  if (nome === 'cpf') return 'CPF do paciente';
  if (nome === 'profissional_matricula') return 'Matrícula do profissional';
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

function rotuloOpcao(opcao) {
  const cargos = {
    medico: 'Médico', médico: 'Médico', enfermeiro: 'Enfermeiro',
    enfermeira: 'Enfermeira', gestor: 'Gestor', recepcionista: 'Recepcionista',
    rececionista: 'Recepcionista', admin: 'Administrador', ceo: 'CEO',
  };
  if (cargos[opcao]) return cargos[opcao];
  if (opcao === 'fila_espera') return 'Fila de espera';
  if (opcao === 'busca_ativa') return 'Busca ativa';
  if (opcao === 'false' || opcao === 'nao') return 'Negativo';
  if (opcao === 'true' || opcao === 'sim') return 'Afirmativo';
  if (opcao === 'nao_sabe') return 'Não sabe';
  return opcao;
}

function mensagemErroApi(err, fallback) {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg?.replace(/^Value error,?\s*/i, '')).filter(Boolean).join(' · ') || fallback;
  }
  if (typeof detail === 'string') return detail;
  return typeof err.response?.data?.mensagem === 'string' ? err.response.data.mensagem : fallback;
}

const ACOES = [
  { grupo: 'Unidades', id: 'cadastrar-unidade', metodo: 'POST', rota: '/api/unidades/cadastro', titulo: 'Cadastrar Unidade', icone: '🏥', campos: [{ nome: 'nome', label: 'Nome da unidade', tipo: 'text' }], resultado: 'unidade' },
  { grupo: 'Profissionais', id: 'cadastrar-profissional', metodo: 'POST', rota: '/api/profissionais/cadastro', titulo: 'Cadastrar Profissional', icone: '🩺', campos: [{ nome: 'unidade_id', label: 'ID da unidade', tipo: 'number' }, { nome: 'nome', label: 'Nome completo', tipo: 'text' }, { nome: 'cargo', label: 'Cargo', tipo: 'select', opcoes: ['medico', 'enfermeiro', 'enfermeira', 'gestor', 'recepcionista', 'admin', 'ceo'] }, { nome: 'permissao', label: 'Permissão', tipo: 'select', opcoes: ['clinico', 'recepcao', 'gestor', 'admin'] }], resultado: 'profissional' },
  { grupo: 'Pacientes', id: 'cadastrar-paciente', metodo: 'POST', rota: '/api/pacientes/cadastro', titulo: 'Cadastrar Paciente', icone: '🧾', campos: [{ nome: 'unidade_id', label: 'ID da unidade', tipo: 'number' }, { nome: 'nome', label: 'Nome completo', tipo: 'text' }, { nome: 'idade', label: 'Idade', tipo: 'number' }, { nome: 'cpf', label: 'CPF', tipo: 'text' }, { nome: 'data_nascimento', label: 'Data de nascimento', tipo: 'date' }, { nome: 'telefone', label: 'Telefone', tipo: 'text' }, { nome: 'endereco', label: 'Endereço', tipo: 'text' }, { nome: 'cep', label: 'CEP', tipo: 'text' }] },
  { grupo: 'Pacientes', id: 'atualizar-paciente', metodo: 'PUT', rota: '/api/pacientes/atualizar/{cpf}', titulo: 'Atualizar Paciente', icone: '✏️', campos: [{ nome: 'telefone', label: 'Telefone', tipo: 'text' }, { nome: 'endereco', label: 'Endereço', tipo: 'text' }] },
  { grupo: 'Requisições', id: 'criar-requisicao', metodo: 'POST', rota: '/api/requisicoes/mamografia/com-agendamento', titulo: 'Registrar Requisição de Mamografia', icone: '🩺', resultado: 'requisicao', campos: [{ nome: 'agendamento_id', label: 'Agendamento interno', tipo: 'number' }, { nome: 'paciente_id', label: 'Paciente interno', tipo: 'number' }, { nome: 'profissional_id', label: 'Profissional interno', tipo: 'number' }, { nome: 'nodulo_mama_direita', label: 'Nódulo na mama direita', tipo: 'select', opcoes: ['false', 'true'] }, { nome: 'nodulo_mama_esquerda', label: 'Nódulo na mama esquerda', tipo: 'select', opcoes: ['false', 'true'] }, { nome: 'risco_elevado', label: 'Risco elevado', tipo: 'select', opcoes: ['nao', 'sim', 'nao_sabe'] }, { nome: 'subcategoria_rastreamento', label: 'Subcategoria de rastreamento', tipo: 'select', opcoes: ['8a', '8b'] }, { nome: 'mamas_examinadas', label: 'Mamas examinadas', tipo: 'select', opcoes: ['sim', 'nao'] }, { nome: 'fez_mamografia', label: 'Já fez mamografia', tipo: 'select', opcoes: ['nao', 'sim'] }, { nome: 'ano_ultima_mamografia', label: 'Ano da última mamografia', tipo: 'number' }, { nome: 'fez_radioterapia', label: 'Já fez radioterapia', tipo: 'select', opcoes: ['nao', 'sim'] }, { nome: 'ano_radioterapia_direita', label: 'Ano da radioterapia direita', tipo: 'number' }, { nome: 'ano_radioterapia_esquerda', label: 'Ano da radioterapia esquerda', tipo: 'number' }, { nome: 'fez_cirurgia', label: 'Já fez cirurgia', tipo: 'select', opcoes: ['nao', 'sim'] }, { nome: 'cirurgias_mama_direita', label: 'Cirurgias na mama direita', tipo: 'text' }, { nome: 'cirurgias_mama_esquerda', label: 'Cirurgias na mama esquerda', tipo: 'text' }, { nome: 'indicacao_clinica', label: 'Indicação clínica', tipo: 'textarea' }] },
  { grupo: 'Fila e Monitoramento', id: 'exportar-csv', metodo: 'GET', rota: '/api/requisicoes/exportar/csv?unidade_id={unidade_id}', titulo: 'Baixar Requisições em CSV', icone: '📄', campos: [], download: 'requisicoes_mamografia.csv' },
  { grupo: 'Fila e Monitoramento', id: 'exportar-pdf', metodo: 'GET', rota: '/api/requisicoes/exportar/pdf?unidade_id={unidade_id}', titulo: 'Baixar Requisições em PDF', icone: '📈', campos: [], download: 'requisicoes_mamografia.pdf' },
  { grupo: 'Agendamentos Clínicos', id: 'criar-agendamento', metodo: 'POST', rota: '/api/agendamentos/agendar', titulo: 'Criar Agendamento', icone: '📋', campos: [{ nome: 'paciente_cpf', label: 'CPF do paciente', tipo: 'text' }, { nome: 'unidade_id', label: 'ID da unidade', tipo: 'number' }, { nome: 'profissional_matricula', label: 'Matrícula do profissional', tipo: 'text' }, { nome: 'data_hora', label: 'Data e hora', tipo: 'datetime-local' }, { nome: 'especialidade', label: 'Especialidade', tipo: 'text' }, { nome: 'indicacao_clinica', label: 'Indicação clínica', tipo: 'textarea' }], resultado: 'agendamento' },
  { grupo: 'Agendamentos Clínicos', id: 'obter-agendamento', metodo: 'GET', rota: '/api/agendamentos/unidade/{unidade_id}', titulo: 'Agendamentos por Unidade', icone: '🔍', campos: [], resultado: 'lista-agendamentos' },
  { grupo: 'Agendamentos Clínicos', id: 'atualizar-status', metodo: 'PATCH', rota: '/api/agendamentos/{agendamento_id}/status', titulo: 'Atualizar Status do Agendamento', icone: '🔄', campos: [{ nome: 'status', label: 'Status', tipo: 'select', opcoes: ['fila_espera', 'busca_ativa', 'Agendado', 'Concluído', 'Cancelado'] }] },
  { grupo: 'Fila e Monitoramento', id: 'fila-atual', metodo: 'GET', rota: '/api/unidades/{unidade_id}/fila-atual', titulo: 'Ver Fila Atual', icone: '📊', campos: [], resultado: 'fila' },
];

function ListaUnidades({ recarregarChave }) {
  const [unidades, setUnidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/api/unidades/listar')
      .then((res) => setUnidades(res.data || []))
      .catch((err) => setErro(mensagemErroApi(err, 'Erro ao carregar unidades.')))
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
  const [buscaFila, setBuscaFila] = useState('');
  const [statusFila, setStatusFila] = useState('');
  const [paginaFila, setPaginaFila] = useState(0);
  if (!resultado) return null;
  if (acao.resultado === 'unidade') return <div className="sucessoCaixa">Unidade criada com sucesso!<br />CNES: <strong>{resultado.codigo_cnes}</strong><br />Senha gerada: <strong>{resultado.senha_gerada}</strong></div>;
  if (acao.resultado === 'profissional') return <div className="sucessoCaixa">Profissional cadastrado com sucesso!<br />Matrícula: <strong>{resultado.matricula_gerada || resultado.matricula}</strong><br />Senha gerada: <strong>{resultado.senha_gerada || resultado.senha}</strong></div>;
  if (acao.resultado === 'agendamento') return <div className="sucessoCaixa">Agendamento #{resultado.agendamento_id} criado.<br />Registre a anamnese para gerar a requisição e calcular a prioridade.</div>;
  if (acao.id === 'criar-requisicao') return <div className="sucessoCaixa">Requisição #{resultado.requisicao_id} criada no novo agendamento #{resultado.agendamento_id}.<br />Prioridade calculada: {resultado.prioridade_score}.</div>;
  if (acao.resultado === 'agendamento-detalhe') return <div className="sucessoCaixa"><strong>Agendamento #{resultado.id}</strong><br />Paciente (CPF): {resultado.paciente_cpf}<br />Profissional (matrícula): {resultado.profissional_matricula}<br />Unidade: {resultado.unidade_id}<br />Data e hora: {resultado.data_hora}<br />Especialidade: {resultado.especialidade}<br />Procedimento: {resultado.procedimento || '—'}<br />Status: {resultado.status}<br />Prioridade: {resultado.prioridade_score ?? '—'}<br />Indicação clínica: {resultado.indicacao_clinica || '—'}</div>;
  if (acao.resultado === 'lista-agendamentos') {
    const agendamentos = resultado.agendamentos || [];
    if (!agendamentos.length) return <p className="texto-pendencias-admin">Nenhum agendamento encontrado nesta unidade.</p>;
    return <div className="fila-container-admin">{agendamentos.map((a) => <div key={a.id} className="paciente-card-admin"><strong>{a.paciente_nome} — {a.paciente_cpf}</strong><p className="texto-pendencias-admin">{a.data_hora} · {a.especialidade} · {a.status}</p><p className="texto-pendencias-admin">Profissional: {a.profissional_nome} (matrícula {a.profissional_matricula})</p><p className="texto-pendencias-admin">Procedimento: {a.procedimento || '—'} · Prioridade: {a.prioridade_score ?? '—'}</p></div>)}</div>;
  }
  if (acao.resultado === 'fila') {
    const pacientes = resultado.pacientes || [];
    if (pacientes.length === 0) return <p className="texto-pendencias-admin">Fila vazia para esta unidade.</p>;
    const termo = buscaFila.trim().toLocaleLowerCase('pt-BR');
    const cpfTermo = termo.replace(/\D/g, '');
    const filtrados = pacientes.filter((p) => (!statusFila || p.status === statusFila)
      && (!termo || p.paciente_nome.toLocaleLowerCase('pt-BR').includes(termo) || (cpfTermo && (p.paciente_cpf || '').replace(/\D/g, '').includes(cpfTermo))));
    const porPagina = 20;
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
    const paginaAtual = Math.min(paginaFila, totalPaginas - 1);
    const visiveis = filtrados.slice(paginaAtual * porPagina, (paginaAtual + 1) * porPagina);
    return (
      <div className="fila-tabela-container">
        <div className="fila-tabela-titulo"><h3>Fila da unidade</h3><span>{filtrados.length} de {resultado.total_na_fila ?? pacientes.length} pacientes</span></div>
        <div className="fila-filtros"><input className="input-hap" placeholder="Buscar por nome ou CPF" value={buscaFila} onChange={(e) => { setBuscaFila(e.target.value); setPaginaFila(0); }} /><select className="input-hap" value={statusFila} onChange={(e) => { setStatusFila(e.target.value); setPaginaFila(0); }}><option value="">Todos os status</option>{['fila_espera', 'busca_ativa', 'Agendado', 'Concluído', 'Cancelado'].map((status) => <option key={status} value={status}>{rotuloOpcao(status)}</option>)}</select></div>
        <div className="fila-tabela-scroll"><table className="tabela-admin tabela-fila">
          <thead><tr><th>Paciente</th><th>CPF</th><th>Idade</th><th>Agendamento</th><th>Prioridade</th><th>Status</th><th>Cadastro</th></tr></thead>
          <tbody>{visiveis.map((p) => <tr key={p.agendamento_id}>
            <td><strong>{p.paciente_nome}</strong></td>
            <td>{p.paciente_cpf || '—'}</td>
            <td>{p.idade ?? '—'}</td>
            <td>{p.data_hora || '—'}</td>
            <td>{p.prioridade_score ?? 0}</td>
            <td><span className="fila-status">{p.status}</span></td>
            <td>{p.cadastro_incompleto ? <span className="texto-alerta-admin">Pendente: {(p.dados_pendentes || []).join(', ')}</span> : 'Completo'}</td>
          </tr>)}</tbody>
        </table></div>
        {filtrados.length === 0 ? <p className="texto-pendencias-admin">Nenhum paciente corresponde aos filtros.</p> : <div className="fila-paginacao"><span>{paginaAtual * porPagina + 1}–{Math.min((paginaAtual + 1) * porPagina, filtrados.length)} de {filtrados.length}</span><button type="button" className="btn-fila-pagina" onClick={() => setPaginaFila(paginaAtual - 1)} disabled={paginaAtual === 0}>Anterior</button><button type="button" className="btn-fila-pagina" onClick={() => setPaginaFila(paginaAtual + 1)} disabled={paginaAtual >= totalPaginas - 1}>Próxima</button></div>}
      </div>
    );
  }
  return <div className="sucessoCaixa">{resultado.mensagem || 'Ação concluída com sucesso.'}</div>;
}

function ModalAcao({ acao, unidadeLogada, onClose, onSucessoUnidade }) {
  const [unidades, setUnidades] = useState([]);
  useEffect(() => {
    if (['obter-agendamento', 'criar-requisicao', 'exportar-csv', 'exportar-pdf'].includes(acao.id)) api.get('/api/unidades/listar').then((res) => setUnidades(res.data || [])).catch(() => setUnidades([]));
  }, [acao.id]);
  const camposAcao = acao.id === 'criar-requisicao'
    ? [{ nome: 'paciente_cpf', label: 'CPF do paciente', tipo: 'text' }, { nome: 'profissional_matricula', label: 'Matrícula do profissional', tipo: 'text' }, { nome: 'data_hora', label: 'Data e hora', tipo: 'datetime-local' }, { nome: 'especialidade', label: 'Especialidade', tipo: 'text' }, ...acao.campos.filter((campo) => !['agendamento_id', 'paciente_id', 'profissional_id'].includes(campo.nome))]
    : acao.campos.filter((campo) => !['paciente_id', 'profissional_id'].includes(campo.nome));
  const parametrosRota = extrairParametrosRota(acao.rota);
  const camposCompletos = [
    ...(acao.id === 'criar-requisicao' ? [{ nome: 'unidade_id', label: 'Unidade', tipo: 'unidade' }] : []),
    ...parametrosRota.map((p) => ({ nome: p, label: humanizar(p), tipo: /id$/i.test(p) ? 'number' : 'text', isPath: true })),
    ...camposAcao,
  ];
  const [valores, setValores] = useState(() => {
    const inicial = {};
    camposCompletos.forEach((c) => { inicial[c.nome] = c.nome === 'unidade_id' && unidadeLogada?.id ? unidadeLogada.id : c.tipo === 'select' ? c.opcoes[0] : ''; });
    return inicial;
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [alterado, setAlterado] = useState(false);
  const setCampo = (nome, valor) => {
    setAlterado(true);
    setValores((v) => ({ ...v, [nome]: valor }));
  };
  const fecharModal = () => {
    if (alterado && !window.confirm('Há dados ainda não salvos. Deseja descartá-los?')) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(''); setResultado(null); setCarregando(true);
    try {
      const url = acao.id === 'criar-requisicao' ? '/api/requisicoes/mamografia/com-agendamento' : montarUrl(acao.rota, valores);
      const corpo = {};
      camposAcao.forEach((c) => {
        let valor = valores[c.nome];
        if (c.tipo === 'number' && valor !== '') valor = Number(valor);
        if (c.tipo === 'datetime-local' && valor) valor = valor.replace('T', ' ');
        corpo[c.nome] = valor;
      });
      if (acao.id === 'criar-requisicao') corpo.unidade_id = Number(valores.unidade_id);
      const resposta = await api.request({ method: acao.metodo.toLowerCase(), url, data: acao.metodo === 'GET' ? undefined : corpo, responseType: acao.download ? 'blob' : undefined });
      if (acao.download) {
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(resposta.data);
        link.href = objectUrl;
        link.download = ['exportar-csv', 'exportar-pdf'].includes(acao.id) ? `requisicoes_mamografia_unidade_${valores.unidade_id}.${acao.id === 'exportar-csv' ? 'csv' : 'pdf'}` : acao.download;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        setResultado({ mensagem: 'Arquivo baixado.' });
      } else {
        setResultado(resposta.data);
      }
      setAlterado(false);
      if (acao.resultado === 'unidade' && onSucessoUnidade) onSucessoUnidade();
    } catch (err) {
      setErro(mensagemErroApi(err, 'Erro ao executar a ação.'));
    } finally { setCarregando(false); }
  };

  return (
    <div className="modal-overlay" onClick={fecharModal}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>{acao.titulo}</h3><button className="modal-fechar" onClick={fecharModal}>×</button></div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {camposCompletos.map((c) => (
              <div key={c.nome} className="campo-admin">
                <label>{c.label}</label>
                {c.nome === 'unidade_id' && ['obter-agendamento', 'criar-requisicao', 'exportar-csv', 'exportar-pdf'].includes(acao.id) ? (
                  <select className="input-hap" value={valores[c.nome]} onChange={(e) => setCampo(c.nome, e.target.value)} required><option value="">Selecione uma unidade</option>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
                ) : c.tipo === 'select' ? (
                  <select className="input-hap" value={valores[c.nome]} onChange={(e) => setCampo(c.nome, e.target.value)}>{c.opcoes.map((op) => <option key={op} value={op}>{rotuloOpcao(op)}</option>)}</select>
                ) : c.tipo === 'textarea' ? (
                  <textarea className="input-hap" style={{ minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} value={valores[c.nome]} onChange={(e) => setCampo(c.nome, e.target.value)} required />
                ) : (
                  <input className="input-hap" type={c.tipo} value={valores[c.nome]} onChange={(e) => setCampo(c.nome, e.target.value)} required />
                )}
              </div>
            ))}
            {erro && <p className="erro">{erro}</p>}
            <button type="submit" className="btn-primary-hap" disabled={carregando}>{carregando ? (acao.download ? 'Baixando...' : 'Enviando...') : (acao.download ? 'Baixar arquivo' : 'Executar')}</button>
          </form>
          <ResultadoAcao acao={acao} resultado={resultado} />
        </div>
      </div>
    </div>
  );
}

function ModalAssistente({ onClose }) {
  const [cpf, setCpf] = useState('');
  const [agendamentoId, setAgendamentoId] = useState('');
  const [texto, setTexto] = useState('');
  const [log, setLog] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const enviar = async () => {
    if (!texto.trim()) return;
    const mensagemUsuario = texto;
    setLog((l) => [...l, { autor: 'user', texto: mensagemUsuario }]);
    setTexto(''); setCarregando(true);
    try {
      const res = await api.post('/assistente', { cpf, texto: mensagemUsuario, agendamento_id: agendamentoId ? Number(agendamentoId) : null });
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
          <input className="input-hap" type="number" placeholder="ID do agendamento (para cancelar)" value={agendamentoId} onChange={(e) => setAgendamentoId(e.target.value)} />
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

function PainelAdmin({ unidadeLogada, acaoInicial, onAcaoConsumida, somenteModal = false }) {
  const [acaoManual, setAcaoManual] = useState(null);
  const acaoAtiva = ACOES.find((acao) => acao.id === acaoInicial) || acaoManual;
  const [chatAberto, setChatAberto] = useState(false);
  const [recarregarChave, setRecarregarChave] = useState(0);
  const [busca, setBusca] = useState(''); // Estado da barra de pesquisa

  if (somenteModal) {
    return acaoAtiva ? <ModalAcao acao={acaoAtiva} unidadeLogada={unidadeLogada} onClose={onAcaoConsumida} onSucessoUnidade={() => setRecarregarChave((c) => c + 1)} /> : null;
  }

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
          <button key={acao.id} className="card-servico" onClick={() => setAcaoManual(acao)}>
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

      {acaoAtiva && <ModalAcao acao={acaoAtiva} unidadeLogada={unidadeLogada} onClose={() => { setAcaoManual(null); onAcaoConsumida?.(); }} onSucessoUnidade={() => setRecarregarChave((c) => c + 1)} />}
      {chatAberto && <ModalAssistente onClose={() => setChatAberto(false)} />}
    </div>
  );
}
export default PainelAdmin;
