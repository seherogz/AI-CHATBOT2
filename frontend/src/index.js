import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

/*App.js bir formdan kullanıcı adı/şifre alır
api.js'teki login() fonksiyonunu çağırır
api.js sunucuya istek atar, token alır
App.js gelen cevaba göre yönlendirir (örneğin: chat ekranına geç)*/

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
