import React, { useState } from 'react';
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

const ACOES_GESTOR = [
  { id: 'cadastrar-paciente', metodo: 'POST', rota: '/api/pacientes/cadastro', titulo: 'Cadastrar Paciente', icone: '🧾', campos: [{ nome: 'nome', label: 'Nome completo', tipo: 'text' }, { nome: 'cpf', label: 'CPF', tipo: 'text' }, { nome: 'data_nascimento', label: 'Data de nascimento', tipo: 'date' }, { nome: 'telefone', label: 'Telefone', tipo: 'text' }, { nome: 'endereco', label: 'Endereço', tipo: 'text' }] },
  { id: 'atualizar-paciente', metodo: 'PUT', rota: '/api/pacientes/atualizar/{paciente_id}', titulo: 'Atualizar Paciente', icone: '✏️', campos: [{ nome: 'telefone', label: 'Telefone', tipo: 'text' }, { nome: 'endereco', label: 'Endereço', tipo: 'text' }] },
  { id: 'fila-atual', metodo: 'GET', rota: '/api/unidades/{unidade_id}/fila-atual', titulo: 'Gerenciar Filas', icone: '📊', campos: [], resultado: 'fila' },
  { id: 'gerenciar-vagas', metodo: 'GET', rota: '/api/unidades/{unidade_id}/vagas', titulo: 'Gerenciar Vagas', icone: '🏥', campos: [] },
  { id: 'criar-agendamento', metodo: 'POST', rota: '/api/agendamentos/agendar', titulo: 'Criar Agendamento', icone: '📅', campos: [{ nome: 'paciente_id', label: 'ID do paciente', tipo: 'number' }, { nome: 'profissional_id', label: 'ID do profissional', tipo: 'number' }, { nome: 'data_hora', label: 'Data e hora', tipo: 'datetime-local' }, { nome: 'especialidade', label: 'Especialidade', tipo: 'text' }, { nome: 'indicacao_clinica', label: 'Indicação clínica', tipo: 'textarea' }], resultado: 'agendamento' },
  { id: 'obter-agendamento', metodo: 'GET', rota: '/api/agendamentos/{agendamento_id}', titulo: 'Obter Agendamento', icone: '🔍', campos: [] },
  { id: 'atualizar-status', metodo: 'PATCH', rota: '/api/agendamentos/{agendamento_id}/status', titulo: 'Atualizar Agendamento', icone: '🔄', campos: [{ nome: 'status', label: 'Novo status', tipo: 'select', opcoes: ['fila_espera', 'Agendado', 'Concluído', 'Cancelado'] }] },
  { id: 'emitir-relatorios', metodo: 'GET', rota: '/api/unidades/{unidade_id}/relatorios', titulo: 'Emitir Relatórios', icone: '📈', campos: [] }
];

function ResultadoAcao({ acao, resultado }) {
  if (!resultado) return null;
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

function ModalAcaoGestor({ acao, unidadeLogada, onClose }) {
  const parametrosRota = extrairParametrosRota(acao.rota);
  const camposCompletos = [
    ...parametrosRota.map((p) => ({ nome: p, label: humanizar(p), tipo: /id$/i.test(p) ? 'number' : 'text', isPath: true })),
    ...acao.campos,
  ];
  
  const [valores, setValores] = useState(() => {
    const inicial = {};
    camposCompletos.forEach((c) => {
      // Ignora o unidade_id no estado visual, ele será injetado depois
      if (c.nome !== 'unidade_id') {
         inicial[c.nome] = c.tipo === 'select' ? c.opcoes[0] : '';
      }
    });
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
      // Injeta magicamente o unidade_id da unidade logada
      const valoresFinais = { ...valores, unidade_id: unidadeLogada?.id };
      const url = montarUrl(acao.rota, valoresFinais);
      
      const corpo = { unidade_id: unidadeLogada?.id };
      acao.campos.forEach((c) => {
        let valor = valores[c.nome];
        if (c.tipo === 'number' && valor !== '') valor = Number(valor);
        if (c.tipo === 'datetime-local' && valor) valor = valor.replace('T', ' ');
        if (c.nome !== 'unidade_id') corpo[c.nome] = valor;
      });
      
      const resposta = await api.request({ method: acao.metodo.toLowerCase(), url, data: acao.metodo === 'GET' ? undefined : corpo });
      setResultado(resposta.data);
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
            {camposCompletos.map((c) => {
              // A MAGIA: Não desenha o campo unidade_id na tela para o Gestor!
              if (c.nome === 'unidade_id') return null;
              return (
                <div key={c.nome} className="campo-admin">
                  <label>{c.label}</label>
                  {c.tipo === 'select' ? (
                    <select className="input-hap" value={valores[c.nome] || ''} onChange={(e) => setCampo(c.nome, e.target.value)}>{c.opcoes.map((op) => <option key={op} value={op}>{op}</option>)}</select>
                  ) : c.tipo === 'textarea' ? (
                    <textarea className="input-hap" style={{ minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} value={valores[c.nome] || ''} onChange={(e) => setCampo(c.nome, e.target.value)} required />
                  ) : (
                    <input className="input-hap" type={c.tipo} value={valores[c.nome] || ''} onChange={(e) => setCampo(c.nome, e.target.value)} required />
                  )}
                </div>
              );
            })}
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

function PainelGestor({ unidadeLogada }) {
  const [acaoAtiva, setAcaoAtiva] = useState(null);
  const [busca, setBusca] = useState('');

  const acoesFiltradas = ACOES_GESTOR.filter((acao) =>
    acao.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="painel-admin-wrapper">
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
      </div>

      {acaoAtiva && <ModalAcaoGestor acao={acaoAtiva} unidadeLogada={unidadeLogada} onClose={() => setAcaoAtiva(null)} />}
    </div>
  );
}

export default PainelGestor;