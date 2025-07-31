import React from 'react';
import './ModelSelector.css';

const ModelSelector = ({ selectedModel, onModelChange, disabled = false, compact = false }) => {
  const models = [
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Hızlı ve ekonomik',
      provider: 'OpenAI'
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'En gelişmiş model',
      provider: 'OpenAI'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'En güncel GPT-4',
      provider: 'OpenAI'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'En yeni OpenAI modeli',
      provider: 'OpenAI'
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Hızlı ve ekonomik GPT-4o',
      provider: 'OpenAI'
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