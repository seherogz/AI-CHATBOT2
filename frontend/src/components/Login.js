import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const Login = ({ onLogin, error, isLoading }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setLocalError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const result = await onLogin(formData.username, formData.password);
      
      if (!result.success) {
        setLocalError(result.error || 'Giriş yapılırken bir hata oluştu');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLocalError(error.message || 'Giriş yapılırken bir hata oluştu');
    }
  };

  const displayError = error || localError;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>AI Chatbot</h1>
          <h2>Giriş Yap</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {displayError && (
            <div className="error-message auth-error">
              <span className="error-icon">⚠️</span>
              {displayError}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Kullanıcı adınızı girin"
              disabled={isLoading}
              required
              className={displayError ? 'error-input' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Şifrenizi girin"
              disabled={isLoading}
              required
              className={displayError ? 'error-input' : ''}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Hesabınız yok mu? 
            <Link to="/register" className="auth-link">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 