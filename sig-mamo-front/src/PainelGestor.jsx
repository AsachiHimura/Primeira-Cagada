import { useState } from 'react';
import api from './services/api';

function humanizar(nome) {
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

const ACOES_GESTOR = [
  { id: 'cadastrar-profissional', metodo: 'POST', rota: '/api/profissionais/cadastro', titulo: 'Cadastrar Profissional', icone: '🩺', campos: [{ nome: 'nome', label: 'Nome completo', tipo: 'text' }, { nome: 'cargo', label: 'Cargo', tipo: 'select', opcoes: ['medico', 'enfermeiro', 'enfermeira', 'gestor', 'recepcionista'] }, { nome: 'permissao', label: 'Permissão', tipo: 'select', opcoes: ['clinico', 'recepcao'] }], resultado: 'profissional' },
  { id: 'cadastrar-paciente', metodo: 'POST', rota: '/api/pacientes/cadastro', titulo: 'Cadastrar Paciente', icone: '🧾', campos: [{ nome: 'nome', label: 'Nome completo', tipo: 'text' }, { nome: 'idade', label: 'Idade', tipo: 'number' }, { nome: 'cpf', label: 'CPF', tipo: 'text' }, { nome: 'data_nascimento', label: 'Data de nascimento', tipo: 'date' }, { nome: 'telefone', label: 'Telefone', tipo: 'text' }, { nome: 'endereco', label: 'Endereço', tipo: 'text' }, { nome: 'cep', label: 'CEP', tipo: 'text' }] },
  { id: 'atualizar-paciente', metodo: 'PUT', rota: '/api/pacientes/atualizar/{cpf}', titulo: 'Atualizar Paciente', icone: '✏️', campos: [{ nome: 'telefone', label: 'Telefone', tipo: 'text' }, { nome: 'endereco', label: 'Endereço', tipo: 'text' }] },
  { id: 'criar-agendamento', metodo: 'POST', rota: '/api/agendamentos/agendar', titulo: 'Criar Agendamento', icone: '📅', campos: [{ nome: 'paciente_cpf', label: 'CPF do paciente', tipo: 'text' }, { nome: 'profissional_matricula', label: 'Matrícula do profissional', tipo: 'text' }, { nome: 'data_hora', label: 'Data e hora', tipo: 'datetime-local' }, { nome: 'especialidade', label: 'Especialidade', tipo: 'text' }, { nome: 'indicacao_clinica', label: 'Indicação clínica', tipo: 'textarea' }], resultado: 'agendamento' },
  { id: 'obter-agendamento', metodo: 'GET', rota: '/api/agendamentos/unidade/{unidade_id}', titulo: 'Agendamentos da Unidade', icone: '🔍', campos: [{ nome: 'cpf', label: 'CPF do paciente', tipo: 'text' }], resultado: 'lista-agendamentos' },
  { id: 'atualizar-status', metodo: 'PATCH', rota: '/api/agendamentos/{agendamento_id}/status', titulo: 'Atualizar Agendamento', icone: '🔄', campos: [{ nome: 'status', label: 'Novo status', tipo: 'select', opcoes: ['fila_espera', 'busca_ativa', 'Agendado', 'Concluído', 'Cancelado'] }] },
  { id: 'criar-requisicao', metodo: 'POST', rota: '/api/requisicoes/mamografia', titulo: 'Registrar Requisição de Mamografia', icone: '🩺', campos: [{ nome: 'agendamento_id', label: 'ID do agendamento', tipo: 'number' }, { nome: 'paciente_id', label: 'ID do paciente', tipo: 'number' }, { nome: 'profissional_id', label: 'ID do profissional', tipo: 'number' }, { nome: 'nodulo_mama_direita', label: 'Nódulo na mama direita', tipo: 'select', opcoes: ['false', 'true'] }, { nome: 'nodulo_mama_esquerda', label: 'Nódulo na mama esquerda', tipo: 'select', opcoes: ['false', 'true'] }, { nome: 'risco_elevado', label: 'Risco elevado', tipo: 'select', opcoes: ['nao', 'sim', 'nao_sabe'] }, { nome: 'subcategoria_rastreamento', label: 'Subcategoria de rastreamento', tipo: 'select', opcoes: ['8a', '8b'] }, { nome: 'mamas_examinadas', label: 'Mamas examinadas', tipo: 'select', opcoes: ['sim', 'nao'] }, { nome: 'fez_mamografia', label: 'Já fez mamografia', tipo: 'select', opcoes: ['nao', 'sim'] }, { nome: 'ano_ultima_mamografia', label: 'Ano da última mamografia', tipo: 'number' }, { nome: 'fez_radioterapia', label: 'Já fez radioterapia', tipo: 'select', opcoes: ['nao', 'sim'] }, { nome: 'ano_radioterapia_direita', label: 'Ano da radioterapia direita', tipo: 'number' }, { nome: 'ano_radioterapia_esquerda', label: 'Ano da radioterapia esquerda', tipo: 'number' }, { nome: 'fez_cirurgia', label: 'Já fez cirurgia', tipo: 'select', opcoes: ['nao', 'sim'] }, { nome: 'cirurgias_mama_direita', label: 'Cirurgias na mama direita', tipo: 'text' }, { nome: 'cirurgias_mama_esquerda', label: 'Cirurgias na mama esquerda', tipo: 'text' }, { nome: 'indicacao_clinica', label: 'Indicação clínica', tipo: 'textarea' }] },
  { id: 'exportar-csv', metodo: 'GET', rota: '/api/requisicoes/exportar/csv?unidade_id={unidade_id}', titulo: 'Baixar Requisições da Unidade em CSV', icone: '📄', campos: [], download: 'requisicoes_mamografia.csv' },
  { id: 'exportar-pdf', metodo: 'GET', rota: '/api/requisicoes/exportar/pdf?unidade_id={unidade_id}', titulo: 'Baixar Requisições da Unidade em PDF', icone: '📈', campos: [], download: 'requisicoes_mamografia.pdf' }
];

function ResultadoAcao({ acao, resultado }) {
  const [buscaFila, setBuscaFila] = useState('');
  const [statusFila, setStatusFila] = useState('');
  const [paginaFila, setPaginaFila] = useState(0);
  if (!resultado) return null;
  if (acao.resultado === 'profissional') return <div className="sucessoCaixa">Profissional cadastrado com sucesso!<br />Matrícula: <strong>{resultado.matricula_gerada || resultado.matricula}</strong><br />Senha gerada: <strong>{resultado.senha_gerada || resultado.senha}</strong></div>;
  if (acao.resultado === 'agendamento') return <div className="sucessoCaixa">Agendamento #{resultado.agendamento_id} criado.<br />Registre a anamnese para gerar a requisição e calcular a prioridade.</div>;
  if (acao.id === 'criar-requisicao') return <div className="sucessoCaixa">Requisição #{resultado.requisicao_id} criada no novo agendamento #{resultado.agendamento_id}.<br />Prioridade calculada: {resultado.prioridade_score}.</div>;
  if (acao.resultado === 'agendamento-detalhe') return <div className="sucessoCaixa"><strong>Agendamento #{resultado.id}</strong><br />Paciente (CPF): {resultado.paciente_cpf}<br />Profissional (matrícula): {resultado.profissional_matricula}<br />Unidade: {resultado.unidade_id}<br />Data e hora: {resultado.data_hora}<br />Especialidade: {resultado.especialidade}<br />Procedimento: {resultado.procedimento || '—'}<br />Status: {resultado.status}<br />Prioridade: {resultado.prioridade_score ?? '—'}<br />Indicação clínica: {resultado.indicacao_clinica || '—'}</div>;
  if (acao.resultado === 'lista-agendamentos') {
    const agendamentos = resultado.agendamentos || [];
    if (!agendamentos.length) return <p className="texto-pendencias-admin">Nenhum agendamento encontrado para este CPF nesta unidade.</p>;
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

function ModalAcaoGestor({ acao, unidadeLogada, unidadeId, onClose }) {
  const camposAcao = acao.id === 'criar-requisicao'
    ? [{ nome: 'paciente_cpf', label: 'CPF do paciente', tipo: 'text' }, { nome: 'profissional_matricula', label: 'Matrícula do profissional', tipo: 'text' }, { nome: 'data_hora', label: 'Data e hora', tipo: 'datetime-local' }, { nome: 'especialidade', label: 'Especialidade', tipo: 'text' }, ...acao.campos.filter((campo) => !['agendamento_id', 'paciente_id', 'profissional_id'].includes(campo.nome))]
    : acao.campos.filter((campo) => !['paciente_id', 'profissional_id'].includes(campo.nome));
  const parametrosRota = extrairParametrosRota(acao.rota);
  const camposCompletos = [
    ...parametrosRota.map((p) => ({ nome: p, label: humanizar(p), tipo: /id$/i.test(p) ? 'number' : 'text', isPath: true })),
    ...camposAcao,
  ];
  
  const [valores, setValores] = useState(() => {
    const inicial = {};
    camposCompletos.forEach((c) => {
      if (c.nome !== 'unidade_id') {
         inicial[c.nome] = c.tipo === 'select' ? c.opcoes[0] : '';
      }
    });
    return inicial;
  });
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [alterado, setAlterado] = useState(false);
  const idUnidade = unidadeLogada?.id ?? unidadeId;
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
      const valoresFinais = { ...valores, unidade_id: idUnidade };
      const urlBase = acao.id === 'criar-requisicao' ? '/api/requisicoes/mamografia/com-agendamento' : montarUrl(acao.rota, valoresFinais);
      const url = acao.id === 'obter-agendamento' ? `${urlBase}?cpf=${encodeURIComponent(valores.cpf)}` : urlBase;
      
      const corpo = { unidade_id: idUnidade };
      camposAcao.forEach((c) => {
        let valor = valores[c.nome];
        if (c.tipo === 'number' && valor !== '') valor = Number(valor);
        if (c.tipo === 'datetime-local' && valor) valor = valor.replace('T', ' ');
        if (c.nome !== 'unidade_id') corpo[c.nome] = valor;
      });
      if (acao.id === 'criar-requisicao') { delete corpo.agendamento_id; delete corpo.paciente_id; delete corpo.profissional_id; }
      
      const resposta = await api.request({ method: acao.metodo.toLowerCase(), url, data: acao.metodo === 'GET' ? undefined : corpo, responseType: acao.download ? 'blob' : undefined });
      if (acao.download) {
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(resposta.data);
        link.href = objectUrl;
        link.download = ['exportar-csv', 'exportar-pdf'].includes(acao.id) ? `requisicoes_mamografia_unidade_${idUnidade}.${acao.id === 'exportar-csv' ? 'csv' : 'pdf'}` : acao.download;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        setResultado({ mensagem: 'Arquivo baixado.' });
      } else {
        setResultado(resposta.data);
      }
      setAlterado(false);
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
            {camposCompletos.map((c) => {
              if (c.nome === 'unidade_id') return null;
              return (
                <div key={c.nome} className="campo-admin">
                  <label>{c.label}</label>
                  {c.tipo === 'select' ? (
                    <select className="input-hap" value={valores[c.nome] || ''} onChange={(e) => setCampo(c.nome, e.target.value)}>{c.opcoes.map((op) => <option key={op} value={op}>{rotuloOpcao(op)}</option>)}</select>
                  ) : c.tipo === 'textarea' ? (
                    <textarea className="input-hap" style={{ minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} value={valores[c.nome] || ''} onChange={(e) => setCampo(c.nome, e.target.value)} required />
                  ) : (
                    <input className="input-hap" type={c.tipo} value={valores[c.nome] || ''} onChange={(e) => setCampo(c.nome, e.target.value)} required />
                  )}
                </div>
              );
            })}
            {erro && <p className="erro">{erro}</p>}
            <button type="submit" className="btn-primary-hap" disabled={carregando}>{carregando ? (acao.download ? 'Baixando...' : 'Enviando...') : (acao.download ? 'Baixar arquivo' : 'Executar')}</button>
          </form>
          <ResultadoAcao acao={acao} resultado={resultado} />
        </div>
      </div>
    </div>
  );
}

function PainelGestor({ unidadeLogada, unidadeId, acaoInicial, onAcaoConsumida, somenteModal = false }) {
  const [acaoManual, setAcaoManual] = useState(null);
  const acaoAtiva = ACOES_GESTOR.find((acao) => acao.id === acaoInicial) || acaoManual;
  const [fila, setFila] = useState(null);
  const [filaAberta, setFilaAberta] = useState(false);
  const [carregandoFila, setCarregandoFila] = useState(false);
  const [erroFila, setErroFila] = useState('');
  const idUnidade = unidadeLogada?.id ?? unidadeId;

  if (somenteModal) {
    if (!acaoAtiva) return null;
    return <ModalAcaoGestor acao={acaoAtiva} unidadeLogada={unidadeLogada} unidadeId={idUnidade} onClose={onAcaoConsumida} />;
  }

  const carregarFila = async () => {
    if (!idUnidade) {
      setErroFila('Esta conta não está vinculada a uma unidade.');
      return;
    }
    setCarregandoFila(true);
    setErroFila('');
    try {
      const resposta = await api.get(`/api/unidades/${idUnidade}/fila-atual`);
      setFila(resposta.data);
      setFilaAberta(true);
    } catch (erro) {
      setErroFila(erro.response?.data?.detail || 'Não foi possível carregar a fila desta unidade.');
    } finally {
      setCarregandoFila(false);
    }
  };

  if (!idUnidade) {
    return (
      <div className="painel-admin-wrapper">
        <p className="pagina-subtitulo">Ações da Unidade</p>
        <p className="texto-pendencias-admin">Sua conta ainda não está vinculada a uma unidade. Peça ao administrador para fazer o vínculo.</p>
      </div>
    );
  }

  return (
    <div className="painel-admin-wrapper">
      <p className="pagina-subtitulo">Ações da Unidade</p>
      <div className="servicos-grid">
        <button className="card-servico" onClick={carregarFila} disabled={carregandoFila}>
          <span className="card-servico-icone">📊</span>
          <span className="card-servico-label">{carregandoFila ? 'Carregando fila...' : 'Gerenciar Filas'}</span>
        </button>
      </div>
      {erroFila && <p className="erro">{erroFila}</p>}
      {filaAberta && fila && (
        <div className="modal-overlay" onClick={() => setFilaAberta(false)}>
          <div className="modal-conteudo fila-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Gerenciar Filas</h3><button className="modal-fechar" onClick={() => setFilaAberta(false)}>×</button></div>
            <div className="modal-body"><ResultadoAcao acao={{ resultado: 'fila' }} resultado={fila} /></div>
          </div>
        </div>
      )}
      <div className="servicos-grid">
        {ACOES_GESTOR.map((acao) => (
          <button key={acao.id} className="card-servico" onClick={() => setAcaoManual(acao)}>
            <span className="card-servico-icone">{acao.icone}</span>
            <span className="card-servico-label">{acao.titulo}</span>
          </button>
        ))}
      </div>

      {acaoAtiva && <ModalAcaoGestor acao={acaoAtiva} unidadeLogada={unidadeLogada} unidadeId={idUnidade} onClose={() => { setAcaoManual(null); onAcaoConsumida?.(); }} />}
    </div>
  );
}

export default PainelGestor;
