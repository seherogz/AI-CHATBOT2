import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const Login = ({ onLogin, error, isLoading }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => { //kullanıcı klavyeye her bir şey yazdığında çalıştırılır.
    setFormData({
      ...formData,
      [e.target.name]: e.target.value //[e.target.name]: Hangi input değiştiyse onun adı (username, password, email gibi). e.target.value: Kullanıcının yazdığı yeni değerdir
    });
    setLocalError('');
  };

  const handleSubmit = async (e) => { //kullanıcı giriş yap butonuna basınca aktifleştirilir, eğer giriş yapıldıysa başarılı şekilde handleLogin->api.login fonk ile backende servera istek atar.
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setLocalError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const result = await onLogin(formData.username, formData.password);//handleLogin fonksiyonunu çağırır, bu fonksiyon api.js dosyasındaki login fonksiyonunu çağırır ve backend'e istek atar.Form boş değilse → onLogin() fonksiyonunu çağırır → App.js’teki handleLogin tetiklenir.
      
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