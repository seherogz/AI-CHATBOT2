import React from 'react';
import './ModelSelector.css';

const ModelSelector = ({ selectedModel, onModelChange, disabled = false, compact = false }) => {
  const models = [
    {
      id: 'openai/gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Hızlı ve ekonomik',
      provider: 'OpenAI'
    },
    {
      id: 'openai/gpt-4',
      name: 'GPT-4',
      description: 'En gelişmiş model',
      provider: 'OpenAI'
    },
    {
      id: 'anthropic/claude-3-haiku',
      name: 'Claude 3 Haiku',
      description: 'Hızlı ve akıllı',
      provider: 'Anthropic'
    },
    {
      id: 'anthropic/claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      description: 'Dengeli performans',
      provider: 'Anthropic'
    },
    {
      id: 'google/gemini-pro',
      name: 'Gemini Pro',
      description: 'Google\'ın en iyi modeli',
      provider: 'Google'
    },
    {
      id: 'meta-llama/llama-3.1-8b-instruct',
      name: 'Llama 3.1 8B',
      description: 'Açık kaynak model',
      provider: 'Meta'
    }
  ];

  return (
    <div className={`model-selector ${compact ? 'compact' : ''}`}>
      {!compact && <label className="model-selector-label">AI Modeli:</label>}
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className={`model-select ${compact ? 'compact' : ''}`}
        title={compact ? models.find(m => m.id === selectedModel)?.name : undefined}
      >
        {models.map(model => (
          <option key={model.id} value={model.id}>
            {compact ? model.name : `${model.name} (${model.provider}) - ${model.description}`}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector; 