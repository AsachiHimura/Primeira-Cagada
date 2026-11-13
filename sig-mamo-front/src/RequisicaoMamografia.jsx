import { useState } from 'react';
import api from './services/api';
import './RequisicaoMamografia.css';

export default function RequisicaoMamografia({ agendamentoId, onSalvar }) {
  const [abaAtiva, setAbaAtiva] = useState('anamnese');
  
  const [formData, setFormData] = useState({
    agendamento_id: agendamentoId ?? null,
    nodulo_mama_direita: false,
    nodulo_mama_esquerda: false,
    risco_elevado: 'nao',
    mamas_examinadas: 'sim',
    fez_mamografia: 'nao',
    ano_ultima_mamografia: '',
    indicacao_clinica: '',
    subcategoria_rastreamento: '8a'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agendamento_id) {
      alert('Vincule a requisição a um agendamento válido.');
      return;
    }
    try {
      const response = await api.post('/api/requisicoes/mamografia', formData);
      alert(`Requisição salva. Prioridade: ${response.data.prioridade_score} pts.`);
      if (onSalvar) onSalvar(response.data);
    } catch {
      alert('Erro ao guardar a requisição de mamografia.');
    }
  };

  return (
    <div className="requisicao-container">
      <div className="header-sus">
        <h2>Requisição de Mamografia — Fluxo SUS</h2>
        <div className="acoes-topo">
          <button type="submit" form="form-mamo" className="btn-salvar">Salvar Agendamento</button>
        </div>
      </div>

      <div className="abas">
        <button type="button" className={abaAtiva === 'anamnese' ? 'aba ativa' : 'aba'} onClick={() => setAbaAtiva('anamnese')}>Dados da Anamnese</button>
        <button type="button" className={abaAtiva === 'indicacao' ? 'aba ativa' : 'aba'} onClick={() => setAbaAtiva('indicacao')}>Indicação Clínica</button>
      </div>

      <form id="form-mamo" onSubmit={handleSubmit} className="formulario-corpo">
        {abaAtiva === 'anamnese' && (
          <div className="secao-anamnese">
            <div className="pergunta-bloco">
              <label className="pergunta-titulo">1 - Tem nódulo ou caroço na mama?</label>
              <div className="opcoes-linha">
                <label><input type="checkbox" name="nodulo_mama_direita" checked={formData.nodulo_mama_direita} onChange={handleChange}/> Sim, mama direita</label>
                <label><input type="checkbox" name="nodulo_mama_esquerda" checked={formData.nodulo_mama_esquerda} onChange={handleChange}/> Sim, mama esquerda</label>
              </div>
            </div>

            <div className="pergunta-bloco">
              <label className="pergunta-titulo">2 - Apresenta risco elevado para câncer de mama?</label>
              <div className="opcoes-linha">
                {['sim', 'nao', 'nao_sabe'].map((val) => (
                  <label key={val}><input type="radio" name="risco_elevado" value={val} checked={formData.risco_elevado === val} onChange={handleChange}/> {val.toUpperCase()}</label>
                ))}
              </div>
            </div>

            <div className="pergunta-bloco destaque-rastreio">
              <label className="pergunta-titulo">8 - Mamografia de Rastreamento</label>
              <div className="opcoes-coluna">
                <label><input type="radio" name="subcategoria_rastreamento" value="8a" checked={formData.subcategoria_rastreamento === '8a'} onChange={handleChange} /> 8a. População alvo</label>
                <label><input type="radio" name="subcategoria_rastreamento" value="8b" checked={formData.subcategoria_rastreamento === '8b'} onChange={handleChange} /> 8b. População de risco elevado</label>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'indicacao' && (
          <div className="secao-indicacao">
            <label className="pergunta-titulo">Indicação Clínica / Observações Detalhadas:</label>
            <textarea name="indicacao_clinica" rows="6" value={formData.indicacao_clinica} onChange={handleChange} placeholder="Descreva os sintomas..." />
          </div>
        )}
      </form>
    </div>
  );
}
