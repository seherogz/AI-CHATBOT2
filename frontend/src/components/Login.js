import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await onLogin(formData.username, formData.password);
      
      if (!result.success) {
        setError(result.error || 'Giriş yapılırken bir hata oluştu');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Giriş yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>AI Chatbot</h1>
          <h2>Giriş Yap</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
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