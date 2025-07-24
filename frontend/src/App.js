import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogin = async (username, password) => {
    try {
      setError(null);
      const response = await api.login(username, password);
      
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.user);
        await loadChats();
        return { success: true };
      } else {
        setError(response.message);
        return { success: false, error: response.message };
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      setError(null);
      const response = await api.register(username, email, password);
      
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.user);
        await loadChats();
        return { success: true };
      } else {
        setError(response.message);
        return { success: false, error: response.message };
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const loadChats = async () => {
    try {
      setError(null);
      const response = await api.getChats();
      if (response.success) {
        setChats(response.chats || []);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const createNewChat = async () => {
    try {
      setError(null);
      setIsLoading(true);
      console.log('Creating new chat...');
      const defaultTitle = `Yeni Sohbet ${chats.length + 1}`;
      const response = await api.createChat(defaultTitle);
      console.log('Create chat response:', response);
      
      if (response.success) {
        console.log('Chat created successfully:', response.chat);
        await loadChats();
        setCurrentChatId(response.chat.id);
        setMessages([]);
      } else {
        console.log('Failed to create chat:', response.message);
        setError(response.message || 'Sohbet oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error.message || 'Sohbet oluşturulamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const updateChatTitle = async (chatId, newTitle) => {
    try {
      setError(null);
      const response = await api.updateChatTitle(chatId, newTitle);
      
      if (response.success) {
        await loadChats();
      } else {
        setError(response.message || 'Başlık güncellenemedi');
      }
    } catch (error) {
      setError(error.message || 'Başlık güncellenemedi');
    }
  };

  const selectChat = async (chatId) => {
    try {
      setError(null);
      setCurrentChatId(chatId);
      const response = await api.getChatMessages(chatId);
      
      if (response.success) {
        setMessages(response.messages || []);
      } else {
        setError(response.message);
      }
    } catch (error) {
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
      console.log('Message response:', response);
      
      if (response.success && response.aiResponse) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setError(response.message || 'Mesaj gönderilemedi');
        console.log('Failed to send message:', response.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message || 'Mesaj gönderilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      setError(null);
      const response = await api.deleteChat(chatId);
      
      if (response.success) {
        await loadChats();
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([]);
        }
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setChats([]);
    setCurrentChatId(null);
    setMessages([]);
    setError(null);
    localStorage.clear();
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
      login: 'Login'
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
      login: 'Giriş Yap'
    }
  };

  const t = translations[language];
  const location = useLocation();

  if (location.pathname === '/login') {
    return <Login onLogin={handleLogin} error={error} />;
  }
  if (location.pathname === '/register') {
    return <Register onRegister={handleRegister} error={error} />;
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
                <button
                  onClick={() => window.location.href = '/login'}
                  className="login-btn"
                >
                  {t.login}
                </button>
              )}
            </div>
          </div>
          
          <div className="controls">
            <button 
              onClick={createNewChat} 
              className="new-chat-btn"
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
              >
                <input
                  type="text"
                  value={chat.title}
                  onChange={(e) => {
                    const newChats = chats.map(c => 
                      c.id === chat.id ? { ...c, title: e.target.value } : c
                    );
                    setChats(newChats);
                  }}
                  onBlur={(e) => updateChatTitle(chat.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="chat-title-input"
                />
                <div className="chat-item-buttons">
                  <button
                    onClick={() => selectChat(chat.id)}
                    className="select-chat-btn"
                  >
                    Seç
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="delete-chat-btn"
                  >
                    {t.delete}
                  </button>
                </div>
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
        <Route path="*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
