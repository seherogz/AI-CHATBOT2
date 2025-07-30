import React from 'react';
import './LanguageSelector.css';

const LanguageSelector = ({ selectedLanguage, onLanguageChange, disabled = false, compact = false }) => {
  const languages = [
    {
      code: 'tr',
      name: 'Türkçe',
      flag: '🇹🇷',
      description: 'Türkçe'
    },
    {
      code: 'en',
      name: 'English',
      flag: '🇺🇸',
      description: 'English'
    },
    {
      code: 'de',
      name: 'Deutsch',
      flag: '🇩🇪',
      description: 'German'
    },
    {
      code: 'fr',
      name: 'Français',
      flag: '🇫🇷',
      description: 'French'
    },
    {
      code: 'es',
      name: 'Español',
      flag: '🇪🇸',
      description: 'Spanish'
    },
    {
      code: 'it',
      name: 'Italiano',
      flag: '🇮🇹',
      description: 'Italian'
    },
    {
      code: 'ru',
      name: 'Русский',
      flag: '🇷🇺',
      description: 'Russian'
    },
    {
      code: 'ja',
      name: '日本語',
      flag: '🇯🇵',
      description: 'Japanese'
    },
    {
      code: 'ko',
      name: '한국어',
      flag: '🇰🇷',
      description: 'Korean'
    },
    {
      code: 'zh',
      name: '中文',
      flag: '🇨🇳',
      description: 'Chinese'
    }
  ];

  return (
    <div className={`language-selector ${compact ? 'compact' : ''}`}>
      {!compact && <label className="language-selector-label">Dil:</label>}
      <select
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        disabled={disabled}
        className={`language-select ${compact ? 'compact' : ''}`}
        title={compact ? languages.find(l => l.code === selectedLanguage)?.name : undefined}
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {compact ? `${lang.flag} ${lang.name}` : `${lang.flag} ${lang.name} (${lang.description})`}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector; 