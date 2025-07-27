import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import api from './services/api';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('tr');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const messagesEndRef = useRef(null);
  const loadChatsRef = useRef(false);
  const navigate = useNavigate();

  // Uygulama başladığında token kontrolü
  useEffect(() => {
    console.log('useEffect[1]: Token check started');
    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          console.log('useEffect[1]: User is authenticated, checking profile...');
          const response = await api.getProfile();
          if (response.success) {
            console.log('useEffect[1]: Profile check successful, setting auth state');
            setIsAuthenticated(true);
            setCurrentUser(response.user);
            // Eğer login sayfasındaysa chat ekranına yönlendir
            if (window.location.pathname === '/login') {
              navigate('/');
            }
          } else {
            console.log('useEffect[1]: Profile check failed, logging out');
            api.logout();
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('useEffect[1]: Auth check failed:', error);
          api.logout();
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        console.log('useEffect[1]: No token found');
      }
    };

    checkAuth();
  }, [navigate]);

  // Giriş yapıldığında chatleri yükle - sadece bu useEffect'te loadChats çağır
  useEffect(() => {
    console.log('useEffect[2]: Auth state changed:', { isAuthenticated, currentUser: currentUser?.username });
    if (isAuthenticated && currentUser && !loadChatsRef.current) {
      console.log('useEffect[2]: Loading chats for authenticated user:', currentUser.username);
      loadChatsRef.current = true;
      loadChats();
    }
  }, [isAuthenticated, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogin = async (username, password) => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log('Attempting login with:', { username });
      const response = await api.login(username, password);
      console.log('Login response:', response);
      
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.user);
        // loadChats() çağrısını kaldırdık çünkü useEffect'te zaten çağrılıyor
        // Başarılı giriş sonrası chat ekranına yönlendir
        navigate('/');
        return { success: true };
      } else {
        // Backend'den gelen hata mesajını kullan
        const errorMessage = response.message || 'Giriş yapılırken bir hata oluştu';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Login error:', error);
      // API'den gelen hata mesajını kullan
      const errorMessage = error.message || 'Giriş yapılırken bir hata oluştu';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log('Attempting register with:', { username, email });
      const response = await api.register(username, email, password);
      console.log('Register response:', response);
      
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.user);
        // loadChats() çağrısını kaldırdık çünkü useEffect'te zaten çağrılıyor
        // Başarılı kayıt sonrası chat ekranına yönlendir
        navigate('/');
        return { success: true };
      } else {
        // Backend'den gelen hata mesajını kullan
        const errorMessage = response.message || 'Kayıt olurken bir hata oluştu';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Register error:', error);
      // API'den gelen hata mesajını kullan
      const errorMessage = error.message || 'Kayıt olurken bir hata oluştu';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const loadChats = async () => {
    // Eğer zaten yükleniyorsa, tekrar çağırma
    if (isLoadingChats) {
      console.log('loadChats: Already loading, skipping duplicate call');
      return;
    }
    
    console.log('loadChats: Starting to load chats...');
    try {
      setIsLoadingChats(true);
      setError(null);
      const response = await api.getChats();
      console.log('loadChats: Response received:', response);
      
      if (response.success) {
        setChats(response.chats || []);
        console.log('loadChats: Chats loaded successfully, count:', response.chats?.length || 0);
      } else {
        setError(response.message);
        console.log('loadChats: Error loading chats:', response.message);
      }
    } catch (error) {
      console.error('loadChats: Exception occurred:', error);
      setError(error.message);
    } finally {
      setIsLoadingChats(false);
      console.log('loadChats: Finished loading chats');
    }
  };

  const createNewChat = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log('Creating new chat...');
      const response = await api.createChat(`Sohbet ${chats.length + 1}`);
      console.log('Create chat response:', response);
      
      if (response.success) {
        // Yeni chat'i doğrudan state'e ekle, loadChats çağırma
        setChats(prevChats => [...prevChats, response.chat]);
        setCurrentChatId(response.chat.id);
        setMessages([]);
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Create chat error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectChat = async (chatId) => {
    try {
      setError(null);
      setCurrentChatId(chatId);
      
      console.log('Selecting chat:', chatId);
      const response = await api.getChatMessages(chatId);
      console.log('Get messages response:', response);
      
      if (response.success) {
        setMessages(response.messages || []);
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Select chat error:', error);
      setError(error.message);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentChatId) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending message:', { chatId: currentChatId, message: inputMessage });
      const response = await api.sendMessage(currentChatId, inputMessage);
      console.log('Send message response:', response);
      
      if (response.success && response.aiResponse) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      setError(null);
      
      console.log('Deleting chat:', chatId);
      const response = await api.deleteChat(chatId);
      console.log('Delete chat response:', response);
      
      if (response.success) {
        // Silinen chat'i doğrudan state'den çıkar, loadChats çağırma
        setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([]);
        }
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Delete chat error:', error);
      setError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out...');
      
      // Backend'e logout isteği gönder
      const response = await api.logout();
      console.log('Logout response:', response);
      
      // State'i temizle
      setIsAuthenticated(false);
      setCurrentUser(null);
      setChats([]);
      setCurrentChatId(null);
      setMessages([]);
      setError(null);
      loadChatsRef.current = false; // Ref'i sıfırla
      
      // Logout sonrası login sayfasına yönlendir
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Hata olsa bile state'i temizle
      setIsAuthenticated(false);
      setCurrentUser(null);
      setChats([]);
      setCurrentChatId(null);
      setMessages([]);
      setError(null);
      loadChatsRef.current = false;
      navigate('/login');
    }
  };

  const translations = {
    en: {
      newChat: 'New Chat',
      typeMessage: 'Type your message...',
      send: 'Send',
      logout: 'Logout',
      darkMode: 'Dark Mode',
      language: 'Language',
      delete: 'Delete',
      welcome: 'Welcome to AI Chatbot!',
      startChat: 'Create a new chat to start conversation.',
      error: 'Error',
      login: 'Login',
      register: 'Register'
    },
    tr: {
      newChat: 'Yeni Sohbet',
      typeMessage: 'Mesajınızı yazın...',
      send: 'Gönder',
      logout: 'Çıkış',
      darkMode: 'Karanlık Mod',
      language: 'Dil',
      delete: 'Sil',
      welcome: 'AI Chatbot\'a Hoş Geldiniz!',
      startChat: 'Sohbete başlamak için yeni bir chat oluşturun.',
      error: 'Hata',
      login: 'Giriş Yap',
      register: 'Kayıt Ol'
    }
  };

  const t = translations[language];
  const location = useLocation();

  // Giriş yapmamış kullanıcıları login sayfasına yönlendir
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') {
      navigate('/login');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (location.pathname === '/login') {
    return <Login onLogin={handleLogin} error={error} isLoading={isLoading} />;
  }
  if (location.pathname === '/register') {
    return <Register onRegister={handleRegister} error={error} isLoading={isLoading} />;
  }

  // Giriş yapmamış kullanıcılar için login sayfasını göster
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} error={error} isLoading={isLoading} />;
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <div className="chat-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>AI Chatbot</h2>
            <div className="user-info">
              {currentUser ? (
                <>
                  <span>Hoş geldin, {currentUser.username}!</span>
                  <button onClick={handleLogout} className="logout-btn">
                    {t.logout}
                  </button>
                </>
              ) : (
                <div className="auth-buttons">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="login-btn"
                  >
                    {t.login}
                  </button>
                  <button
                    onClick={() => window.location.href = '/register'}
                    className="register-btn"
                  >
                    {t.register}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="controls">
            <button 
              onClick={createNewChat} 
              className="new-chat-btn"
              disabled={isLoading}
            >
              {t.newChat}
            </button>
            
            <div className="settings">
              <label>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                {t.darkMode}
              </label>
              
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>
          </div>

          <div className="chat-list">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                onClick={() => selectChat(chat.id)}
              >
                <span className="chat-title">{chat.title}</span>
                {isAuthenticated && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="delete-chat-btn"
                  >
                    {t.delete}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="main-chat">
          {error && (
            <div className="error-message">
              {t.error}: {error}
            </div>
          )}
          
          {currentChatId ? (
            <>
              <div className="messages-container">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
                  >
                    <div className="message-content">
                      {message.text}
                    </div>
                    <div className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message ai-message">
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="input-container">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={t.typeMessage}
                  disabled={isLoading}
                  className="message-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="send-btn"
                >
                  {t.send}
                </button>
              </div>
            </>
          ) : (
            <div className="welcome-message">
              <h3>{t.welcome}</h3>
              <p>{t.startChat}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AppContent />} />
        <Route path="/register" element={<AppContent />} />
        <Route path="/" element={<AppContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
