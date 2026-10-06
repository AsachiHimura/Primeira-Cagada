import React, { useState } from 'react';
import './RequisicaoMamografia.css'; // ou utilize classes do Tailwind CSS

export default function RequisicaoMamografia({ agendamentoId, pacienteId, profissionalId, onSalvar }) {
  const [abaAtiva, setAbaAtiva] = useState('anamnese');
  
  const [formData, setFormData] = useState({
    agendamento_id: agendamentoId,
    paciente_id: pacienteId,
    profissional_id: profissionalId,
    nodulo_mama_direita: false,
    nodulo_mama_esquerda: false,
    risco_elevado: 'nao',
    mamas_examinadas: 'sim',
    fez_mamografia: 'nao',
    ano_ultima_mamografia: '',
    fez_radioterapia: 'nao',
    ano_radioterapia_direita: '',
    ano_radioterapia_esquerda: '',
    fez_cirurgia: 'nao',
    cirurgias_mama_direita: '',
    cirurgias_mama_esquerda: '',
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
    try {
      const response = await fetch('https://seu-backend-no-render.onrender.com/api/requisicoes/mamografia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Token de autenticação
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Requisição salva com sucesso! Score de Prioridade SUS: ${data.prioridade_score}`);
        if (onSalvar) onSalvar(data);
      } else {
        alert('Erro ao salvar a requisição.');
      }
    } catch (error) {
      console.error('Erro de rede:', error);
    }
  };

  return (
    <div className="requisicao-container">
      {/* Cabeçalho igual à imagem do SUS */}
      <div className="header-sus">
        <h2>Requisição Mamografia</h2>
        <div className="acoes-topo">
          <button type="submit" form="form-mamo" className="btn-salvar">Salvar</button>
          <button type="button" className="btn-sair">Sair</button>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="abas">
        <button 
          className={abaAtiva === 'anamnese' ? 'aba ativa' : 'aba'} 
          onClick={() => setAbaAtiva('anamnese')}
        >
          Dados da Anamnese
        </button>
        <button 
          className={abaAtiva === 'indicacao' ? 'aba ativa' : 'aba'} 
          onClick={() => setAbaAtiva('indicacao')}
        >
          Indicação Clínica
        </button>
      </div>

      <form id="form-mamo" onSubmit={handleSubmit} className="formulario-corpo">
        {abaAtiva === 'anamnese' && (
          <div className="secao-anamnese">
            
            {/* Pergunta 1 */}
            <div className="pergunta-bloco">
              <label className="pergunta-titulo">1 - Tem nódulo ou caroço na mama?</label>
              <div className="opcoes-linha">
                <label>
                  <input 
                    type="checkbox" 
                    name="nodulo_mama_direita" 
                    checked={formData.nodulo_mama_direita} 
                    onChange={handleChange}
                  /> Sim, mama direita
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    name="nodulo_mama_esquerda" 
                    checked={formData.nodulo_mama_esquerda} 
                    onChange={handleChange}
                  /> Sim, mama esquerda
                </label>
              </div>
            </div>

            {/* Pergunta 2 */}
            <div className="pergunta-bloco">
              <label className="pergunta-titulo">2 - Apresenta risco elevado para câncer de mama?</label>
              <div className="opcoes-linha">
                {['sim', 'nao', 'nao_sabe'].map((val) => (
                  <label key={val}>
                    <input 
                      type="radio" 
                      name="risco_elevado" 
                      value={val} 
                      checked={formData.risco_elevado === val} 
                      onChange={handleChange}
                    /> {val === 'sim' ? 'Sim' : val === 'nao' ? 'Não' : 'Não sabe'}
                  </label>
                ))}
              </div>
            </div>

            {/* Pergunta 3 */}
            <div className="pergunta-bloco">
              <label className="pergunta-titulo">3 - Já teve suas mamas examinadas por um profissional de saúde?</label>
              <div className="opcoes-linha">
                {['sim', 'nunca', 'nao_sabe'].map((val) => (
                  <label key={val}>
                    <input 
                      type="radio" 
                      name="mamas_examinadas" 
                      value={val} 
                      checked={formData.mamas_examinadas === val} 
                      onChange={handleChange}
                    /> {val === 'sim' ? 'Sim' : val === 'nunca' ? 'Nunca foram examinadas' : 'Não sabe'}
                  </label>
                ))}
              </div>
            </div>

            {/* Pergunta 4 */}
            <div className="pergunta-bloco">
              <label className="pergunta-titulo">4 - Fez mamografia alguma vez?</label>
              <div className="opcoes-linha-com-input">
                <label>
                  <input 
                    type="radio" 
                    name="fez_mamografia" 
                    value="sim" 
                    checked={formData.fez_mamografia === 'sim'} 
                    onChange={handleChange}
                  /> Sim. Quando fez a última mamografia? (ano)
                </label>
                <input 
                  type="text" 
                  name="ano_ultima_mamografia" 
                  placeholder="Ex: 2024" 
                  value={formData.ano_ultima_mamografia} 
                  onChange={handleChange}
                  disabled={formData.fez_mamografia !== 'sim'}
                />
              </div>
            </div>

            {/* Pergunta 8 - Rastreamento */}
            <div className="pergunta-bloco destaque-rastreio">
              <label className="pergunta-titulo">8 - Mamografia de Rastreamento</label>
              <div className="opcoes-coluna">
                <label>
                  <input type="radio" name="subcategoria_rastreamento" value="8a" checked={formData.subcategoria_rastreamento === '8a'} onChange={handleChange} />
                  <strong>8a.</strong> População alvo
                </label>
                <label>
                  <input type="radio" name="subcategoria_rastreamento" value="8b" checked={formData.subcategoria_rastreamento === '8b'} onChange={handleChange} />
                  <strong>8b.</strong> População de risco elevado (história familiar)
                </label>
                <label>
                  <input type="radio" name="subcategoria_rastreamento" value="8c" checked={formData.subcategoria_rastreamento === '8c'} onChange={handleChange} />
                  <strong>8c.</strong> Paciente já tratado de câncer de mama
                </label>
              </div>
            </div>

          </div>
        )}

        {abaAtiva === 'indicacao' && (
          <div className="secao-indicacao">
            <label className="pergunta-titulo">Indicação Clínica / Observações Detalhadas:</label>
            <textarea 
              name="indicacao_clinica" 
              rows="6" 
              value={formData.indicacao_clinica} 
              onChange={handleChange}
              placeholder="Descreva os sintomas, achados do exame físico ou justificativa para o prognóstico..."
            />
          </div>
        )}
      </form>
    </div>
  );
}