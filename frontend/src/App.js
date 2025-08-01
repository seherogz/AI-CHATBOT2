import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import ModelSelector from './components/ModelSelector';
import LanguageSelector from './components/LanguageSelector';
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
  const [selectedModel, setSelectedModel] = useState('openai/gpt-3.5-turbo');
  const [darkMode, setDarkMode] = useState(false);
  
  // Seçim değişikliklerini backend'e bildiren fonksiyonlar
  const handleModelChange = async (newModel) => {
    setSelectedModel(newModel);
    try {
      await api.updateUserPreferences(newModel, language);
      console.log('Model preference updated:', newModel);
    } catch (error) {
      console.error('Failed to update model preference:', error);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    setLanguage(newLanguage);
    try {
      await api.updateUserPreferences(selectedModel, newLanguage);
      console.log('Language preference updated:', newLanguage);
    } catch (error) {
      console.error('Failed to update language preference:', error);
    }
  };
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');
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
          
          // Kullanıcı tercihlerini yükle
          if (response.user.preferredModel) {
            setSelectedModel(response.user.preferredModel);
          }
          if (response.user.preferredLanguage) {
            setLanguage(response.user.preferredLanguage);
          }
          
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
        // Backend'den gelen mesajları doğrudan kullan
        const messagesWithTimestamps = (response.messages || []).map(msg => ({
          ...msg,
          timestamp: msg.createdAt || new Date().toISOString()
        }));
        setMessages(messagesWithTimestamps);
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

    const tempUserMessage = {
      id: `temp_${Date.now()}`,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending message:', { chatId: currentChatId, message: inputMessage, model: selectedModel, language: language });
      const response = await api.sendMessage(currentChatId, inputMessage, selectedModel, language);
      console.log('Send message response:', response);
      
      if (response.success) {
        // Backend'den dönen gerçek mesaj ID'lerini kullan
        const realUserMessage = {
          id: response.userMessageId || tempUserMessage.id,
          text: response.translatedMessage || inputMessage, // Çevrilmiş mesaj
          originalText: inputMessage, // Orijinal mesaj
          sender: 'user',
          timestamp: new Date().toISOString()
        };

        const aiMessage = {
          id: response.aiMessageId || `ai_${Date.now()}`,
          text: response.aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };

        // Geçici mesajı gerçek mesajla değiştir
        setMessages(prev => prev.map(msg => 
          msg.id === tempUserMessage.id ? realUserMessage : msg
        ).concat(aiMessage));
      } else {
        // Hata durumunda geçici mesajı kaldır
        setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
        setError(response.message);
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Hata durumunda geçici mesajı kaldır
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
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

  const startEditMessage = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEditMessage = async (messageId) => {
    if (!editingText.trim()) return;

    // Eğer geçici ID ise (temp_ ile başlıyorsa), düzenlemeye izin verme
    if (typeof messageId === 'string' && messageId.startsWith('temp_')) {
      setError('Bu mesaj henüz kaydedilmedi, düzenlenemez.');
      setEditingMessageId(null);
      setEditingText('');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      console.log('Updating message:', { chatId: currentChatId, messageId, text: editingText });
      const response = await api.updateMessage(currentChatId, messageId, editingText);
      console.log('Update message response:', response);
      
      if (response.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, text: editingText } : msg
        ));
        setEditingMessageId(null);
        setEditingText('');
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Update message error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    // Eğer geçici ID ise (temp_ ile başlıyorsa), sadece frontend'den kaldır
    if (typeof messageId === 'string' && messageId.startsWith('temp_')) {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      return;
    }

    try {
      setError(null);
      
      console.log('Deleting message:', { chatId: currentChatId, messageId });
      const response = await api.deleteMessage(currentChatId, messageId);
      console.log('Delete message response:', response);
      
      if (response.success) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Delete message error:', error);
      setError(error.message);
    }
  };

  const startEditChatTitle = (chatId, currentTitle) => {
    setEditingChatId(chatId);
    setEditingChatTitle(currentTitle);
  };

  const cancelEditChatTitle = () => {
    setEditingChatId(null);
    setEditingChatTitle('');
  };

  const saveEditChatTitle = async (chatId) => {
    if (!editingChatTitle.trim()) return;

    try {
      setError(null);
      setIsLoading(true);
      
      console.log('Updating chat title:', { chatId, title: editingChatTitle });
      const response = await api.updateChatTitle(chatId, editingChatTitle);
      console.log('Update chat title response:', response);
      
      if (response.success) {
        setChats(prev => prev.map(chat => 
          chat.id === chatId ? { ...chat, title: editingChatTitle } : chat
        ));
        setEditingChatId(null);
        setEditingChatTitle('');
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Update chat title error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
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
      register: 'Register',
      aiModel: 'AI Model',
      selectLanguage: 'Select Language'
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
      register: 'Kayıt Ol',
      aiModel: 'AI Modeli',
      selectLanguage: 'Dil Seçin'
    },
    de: {
      newChat: 'Neuer Chat',
      typeMessage: 'Nachricht eingeben...',
      send: 'Senden',
      logout: 'Abmelden',
      darkMode: 'Dunkler Modus',
      language: 'Sprache',
      delete: 'Löschen',
      welcome: 'Willkommen beim AI Chatbot!',
      startChat: 'Erstellen Sie einen neuen Chat, um zu beginnen.',
      error: 'Fehler',
      login: 'Anmelden',
      register: 'Registrieren',
      aiModel: 'KI-Modell',
      selectLanguage: 'Sprache auswählen'
    },
    fr: {
      newChat: 'Nouveau Chat',
      typeMessage: 'Tapez votre message...',
      send: 'Envoyer',
      logout: 'Déconnexion',
      darkMode: 'Mode Sombre',
      language: 'Langue',
      delete: 'Supprimer',
      welcome: 'Bienvenue sur AI Chatbot!',
      startChat: 'Créez un nouveau chat pour commencer.',
      error: 'Erreur',
      login: 'Connexion',
      register: 'S\'inscrire',
      aiModel: 'Modèle IA',
      selectLanguage: 'Sélectionner la langue'
    },
    es: {
      newChat: 'Nuevo Chat',
      typeMessage: 'Escribe tu mensaje...',
      send: 'Enviar',
      logout: 'Cerrar Sesión',
      darkMode: 'Modo Oscuro',
      language: 'Idioma',
      delete: 'Eliminar',
      welcome: '¡Bienvenido a AI Chatbot!',
      startChat: 'Crea un nuevo chat para comenzar.',
      error: 'Error',
      login: 'Iniciar Sesión',
      register: 'Registrarse',
      aiModel: 'Modelo IA',
      selectLanguage: 'Seleccionar Idioma'
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
            </div>
          </div>

          <div className="chat-list">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                onClick={() => selectChat(chat.id)}
              >
                {editingChatId === chat.id ? (
                  // Düzenleme modu
                  <div className="chat-edit-container">
                    <input
                      type="text"
                      value={editingChatTitle}
                      onChange={(e) => setEditingChatTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEditChatTitle(chat.id)}
                      className="chat-title-edit-input"
                      autoFocus
                    />
                    <div className="chat-edit-buttons">
                      <button
                        onClick={() => saveEditChatTitle(chat.id)}
                        className="save-chat-edit-btn"
                        disabled={isLoading}
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditChatTitle}
                        className="cancel-chat-edit-btn"
                        disabled={isLoading}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal görünüm
                  <>
                    <span className="chat-title">{chat.title}</span>
                    <div className="chat-item-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditChatTitle(chat.id, chat.title);
                        }}
                        className="edit-chat-btn"
                        title="Düzenle"
                      >
                        ✏️
                      </button>
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
                  </>
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
                    {editingMessageId === message.id ? (
                      // Düzenleme modu
                      <div className="message-edit-container">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEditMessage(message.id)}
                          className="message-edit-input"
                          autoFocus
                        />
                        <div className="message-edit-buttons">
                          <button
                            onClick={() => saveEditMessage(message.id)}
                            className="save-edit-btn"
                            disabled={isLoading}
                          >
                            Kaydet
                          </button>
                          <button
                            onClick={cancelEditMessage}
                            className="cancel-edit-btn"
                            disabled={isLoading}
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal görünüm
                      <>
                        <div className="message-content">
                          {message.text}
                          {message.originalText && message.originalText !== message.text && (
                            <div className="original-text">
                              <small>Orijinal: {message.originalText}</small>
                            </div>
                          )}
                        </div>
                        <div className="message-actions">
                          {message.sender === 'user' && (
                            <>
                              <button
                                onClick={() => startEditMessage(message.id, message.text)}
                                className="edit-message-btn"
                                title="Düzenle"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteMessage(message.id)}
                                className="delete-message-btn"
                                title="Sil"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                        <div className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </>
                    )}
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
                <div className="input-controls">
                                <ModelSelector
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                disabled={isLoading}
                compact={true}
              />
              <LanguageSelector
                selectedLanguage={language}
                onLanguageChange={handleLanguageChange}
                disabled={isLoading}
                compact={true}
              />
                </div>
                <div className="input-row">
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
