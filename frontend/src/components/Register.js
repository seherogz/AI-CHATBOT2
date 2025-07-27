import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const Register = ({ onRegister, error, isLoading }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
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
    
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setLocalError('Lütfen tüm alanları doldurun');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Şifreler eşleşmiyor');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      const result = await onRegister(formData.username, formData.email, formData.password);
      
      if (!result.success) {
        setLocalError(result.error || 'Kayıt olurken bir hata oluştu');
      }
    } catch (error) {
      console.error('Register error:', error);
      setLocalError(error.message || 'Kayıt olurken bir hata oluştu');
    }
  };

  const displayError = error || localError;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>AI Chatbot</h1>
          <h2>Kayıt Ol</h2>
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
            <label htmlFor="email">E-posta</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="E-posta adresinizi girin"
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Şifre Tekrar</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Şifrenizi tekrar girin"
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
            {isLoading ? 'Kayıt olunuyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Zaten hesabınız var mı? 
            <Link to="/login" className="auth-link">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 