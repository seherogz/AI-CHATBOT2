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
  
  // LocalStorage keys
  const CHATS_KEY = 'ai_chatbot_chats';
  const CURRENT_CHAT_KEY = 'ai_chatbot_current_chat';
  
  // Seçim değişikliklerini backend'e bildiren fonksiyonlar
  const handleModelChange = async (newModel) => {
    setSelectedModel(newModel);
    if (isAuthenticated) {
      try {
        await api.updateUserPreferences(newModel, language);
        console.log('Model preference updated:', newModel);
      } catch (error) {
        console.error('Failed to update model preference:', error);
      }
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    setLanguage(newLanguage);
    if (isAuthenticated) {
      try {
        await api.updateUserPreferences(selectedModel, newLanguage);
        console.log('Language preference updated:', newLanguage);
      } catch (error) {
        console.error('Failed to update language preference:', error);
      }
    }
  };
  
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // LocalStorage yönetim fonksiyonları
  const loadChatsFromStorage = () => {
    try {
      const storedChats = localStorage.getItem(CHATS_KEY);
      if (storedChats) {
        const parsedChats = JSON.parse(storedChats);
        setChats(parsedChats);
        console.log('Chats loaded from localStorage:', parsedChats.length);
      }
    } catch (error) {
      console.error('Error loading chats from localStorage:', error);
    }
  };

  const saveChatsToStorage = (chatsToSave) => {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chatsToSave));
      console.log('Chats saved to localStorage:', chatsToSave.length);
    } catch (error) {
      console.error('Error saving chats to localStorage:', error);
    }
  };

  const loadCurrentChatFromStorage = () => {
    try {
      const storedChatId = localStorage.getItem(CURRENT_CHAT_KEY);
      if (storedChatId) {
        setCurrentChatId(storedChatId);
        console.log('Current chat loaded from localStorage:', storedChatId);
      }
    } catch (error) {
      console.error('Error loading current chat from localStorage:', error);
    }
  };

  const saveCurrentChatToStorage = (chatId) => {
    try {
      if (chatId) {
        localStorage.setItem(CURRENT_CHAT_KEY, chatId);
      } else {
        localStorage.removeItem(CURRENT_CHAT_KEY);
      }
      console.log('Current chat saved to localStorage:', chatId);
    } catch (error) {
      console.error('Error saving current chat to localStorage:', error);
    }
  };

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
      
      // localStorage'dan chatleri yükle
      loadChatsFromStorage();
      loadCurrentChatFromStorage();
    };

    checkAuth();
  }, [navigate]);

  // Current chat değiştiğinde localStorage'a kaydet
  useEffect(() => {
    saveCurrentChatToStorage(currentChatId);
  }, [currentChatId]);

  // Chats değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (chats.length > 0) {
      saveChatsToStorage(chats);
    }
  }, [chats]);

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

  const createNewChat = () => {
    try {
      setError(null);
      
      const newChatId = `chat_${Date.now()}`;
      const newChat = {
        id: newChatId,
        title: `Sohbet ${chats.length + 1}`,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Creating new chat:', newChat);
      
      const updatedChats = [...chats, newChat];
      setChats(updatedChats);
      setCurrentChatId(newChatId);
      setMessages([]);
      
      console.log('New chat created successfully');
    } catch (error) {
      console.error('Create chat error:', error);
      setError('Yeni sohbet oluşturulamadı.');
    }
  };

  const selectChat = (chatId) => {
    // Eğer zaten seçili sohbet ise, gereksiz işlem yapma
    if (currentChatId === chatId) {
      console.log('Chat already selected, skipping:', chatId);
      return;
    }

    try {
      setError(null);
      setCurrentChatId(chatId);
      
      console.log('Selecting chat:', chatId);
      
      // localStorage'dan seçili chat'in mesajlarını yükle
      const chat = chats.find(c => c.id === chatId);
      if (chat && chat.messages) {
        setMessages(chat.messages);
        console.log('Chat messages loaded:', chat.messages.length);
      } else {
        setMessages([]);
        console.log('No messages found for chat:', chatId);
      }
    } catch (error) {
      console.error('Select chat error:', error);
      setError('Sohbet seçilemedi.');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentChatId) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Kullanıcı mesajını hemen ekle
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending message to AI:', { message: inputMessage, model: selectedModel, language: language });
      
      // Sohbet geçmişini hazırla (API için)
      const conversationHistory = updatedMessages.slice(0, -1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      
      const response = await api.sendAIMessage(inputMessage, conversationHistory, selectedModel, language);
      console.log('AI response:', response);
      
      if (response.success) {
        const aiMessage = {
          id: `ai_${Date.now()}`,
          text: response.aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };

        // AI mesajını ekle
        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        
        // Chat'i güncelle ve localStorage'a kaydet
        updateChatMessages(currentChatId, finalMessages);
      } else {
        // Hata durumunda kullanıcı mesajını kaldır
        setMessages(messages);
        setError(response.message || 'AI servisi ile bağlantı kurulamadı.');
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Hata durumunda kullanıcı mesajını kaldır
      setMessages(messages);
      setError('Mesaj gönderilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Chat mesajlarını güncelle ve localStorage'a kaydet
  const updateChatMessages = (chatId, newMessages) => {
    try {
      const updatedChats = chats.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: newMessages, 
              updatedAt: new Date().toISOString() 
            }
          : chat
      );
      setChats(updatedChats);
      console.log('Chat messages updated for:', chatId);
    } catch (error) {
      console.error('Error updating chat messages:', error);
    }
  };

  const deleteChat = (chatId) => {
    try {
      setError(null);
      
      console.log('Deleting chat:', chatId);
      
      // Chat'i listeden kaldır
      const updatedChats = chats.filter(chat => chat.id !== chatId);
      setChats(updatedChats);
      
      // Eğer silinen chat şu an seçili ise, seçimi kaldır
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
      
      console.log('Chat deleted successfully:', chatId);
    } catch (error) {
      console.error('Delete chat error:', error);
      setError('Sohbet silinemedi.');
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

    try {
      setError(null);
      setIsLoading(true);
      
      console.log('Updating message:', { messageId, text: editingText, model: selectedModel, language: language });
      
      // Düzenlenen mesajdan sonraki tüm mesajları kaldır
      const editedMessageIndex = messages.findIndex(msg => msg.id === messageId);
      if (editedMessageIndex === -1) {
        setError('Mesaj bulunamadı.');
        return;
      }
      
      // Mesajı güncelle ve sonrasını sil
      const updatedMessages = messages.slice(0, editedMessageIndex + 1);
      updatedMessages[editedMessageIndex] = {
        ...updatedMessages[editedMessageIndex],
        text: editingText
      };
      
      setMessages(updatedMessages);
      
      // Yeni AI cevabı al
      const conversationHistory = updatedMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      
      const response = await api.sendAIMessage(editingText, conversationHistory.slice(0, -1), selectedModel, language);
      console.log('AI response for edited message:', response);
      
      if (response.success) {
        const aiMessage = {
          id: `ai_${Date.now()}`,
          text: response.aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        
        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        
        // Chat'i güncelle ve localStorage'a kaydet
        updateChatMessages(currentChatId, finalMessages);
        
        setEditingMessageId(null);
        setEditingText('');
      } else {
        setError(response.message || 'AI cevabı alınamadı.');
      }
    } catch (error) {
      console.error('Update message error:', error);
      setError('Mesaj güncellenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = (messageId) => {
    try {
      setError(null);
      
      console.log('Deleting message:', messageId);
      
      // Mesajı listeden kaldır
      const updatedMessages = messages.filter(msg => msg.id !== messageId);
      setMessages(updatedMessages);
      
      // Chat'i güncelle ve localStorage'a kaydet
      updateChatMessages(currentChatId, updatedMessages);
      
      console.log('Message deleted successfully:', messageId);
    } catch (error) {
      console.error('Delete message error:', error);
      setError('Mesaj silinemedi.');
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

  const saveEditChatTitle = (chatId) => {
    if (!editingChatTitle.trim()) return;

    try {
      setError(null);
      
      console.log('Updating chat title:', { chatId, title: editingChatTitle });
      
      // Chat başlığını güncelle
      const updatedChats = chats.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              title: editingChatTitle,
              updatedAt: new Date().toISOString()
            } 
          : chat
      );
      
      setChats(updatedChats);
      setEditingChatId(null);
      setEditingChatTitle('');
      
      console.log('Chat title updated successfully:', chatId);
    } catch (error) {
      console.error('Update chat title error:', error);
      setError('Sohbet başlığı güncellenemedi.');
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
      
      // localStorage'ı temizle
      localStorage.removeItem(CHATS_KEY);
      localStorage.removeItem(CURRENT_CHAT_KEY);
      
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
      
      // localStorage'ı temizle
      localStorage.removeItem(CHATS_KEY);
      localStorage.removeItem(CURRENT_CHAT_KEY);
      
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
