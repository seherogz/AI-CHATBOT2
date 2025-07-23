import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import api from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef(null);

  // Uygulama yüklendiğinde login sayfasını göster
  useEffect(() => {
    console.log('App loading, clearing localStorage...');
    localStorage.clear();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogin = async (username, password) => {
    try {
      console.log('Attempting login with:', { username, password });
      const response = await api.login(username, password);
      console.log('Login response:', response);
      
      if (response.success) {
        console.log('Login successful, setting authenticated state...');
        setIsAuthenticated(true);
        setCurrentUser(response.user);
        console.log('Loading chats...');
        await loadChats();
        console.log('Login process completed, user should be redirected to chat');
        return { success: true };
      } else {
        console.log('Login failed:', response.message);
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Giriş yapılırken bir hata oluştu' };
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      console.log('Attempting register with:', { username, email, password });
      const response = await api.register(username, email, password);
      console.log('Register response:', response);
      
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.user);
        await loadChats();
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Kayıt olurken bir hata oluştu' };
    }
  };

  const loadChats = async () => {
    try {
      console.log('Loading chats...');
      const response = await api.getChats();
      console.log('Chats loaded:', response);
      setChats(response.chats || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const createNewChat = async () => {
    try {
      console.log('Creating new chat...');
      const response = await api.createChat(`Chat ${chats.length + 1}`);
      console.log('New chat created:', response);
      
      if (response.success) {
        await loadChats();
        setCurrentChatId(response.chat.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const selectChat = async (chatId) => {
    try {
      console.log('Selecting chat:', chatId);
      setCurrentChatId(chatId);
      const response = await api.getChatMessages(chatId);
      console.log('Chat messages loaded:', response);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Error loading chat messages:', error);
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

    try {
      console.log('Sending message:', { chatId: currentChatId, message: inputMessage });
      const response = await api.sendMessage(currentChatId, inputMessage);
      console.log('Message sent, AI response:', response);

      if (response.success && response.aiResponse) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      console.log('Deleting chat:', chatId);
      const response = await api.deleteChat(chatId);
      console.log('Chat deleted:', response);
      
      if (response.success) {
        await loadChats();
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleLogout = () => {
    console.log('Logging out...');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setChats([]);
    setCurrentChatId(null);
    setMessages([]);
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
      delete: 'Delete'
    },
    tr: {
      newChat: 'Yeni Sohbet',
      typeMessage: 'Mesajınızı yazın...',
      send: 'Gönder',
      logout: 'Çıkış',
      darkMode: 'Karanlık Mod',
      language: 'Dil',
      delete: 'Sil'
    }
  };

  const t = translations[language];

  if (!isAuthenticated) {
    return (
      <Router>
        <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onRegister={handleRegister} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <div className="chat-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>AI Chatbot</h2>
            <div className="user-info">
              <span>Hoş geldin, {currentUser?.username}!</span>
              <button onClick={handleLogout} className="logout-btn">
                {t.logout}
              </button>
            </div>
          </div>
          
          <div className="controls">
            <button onClick={createNewChat} className="new-chat-btn">
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
            ))}
          </div>
        </div>

        <div className="main-chat">
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
              <h3>AI Chatbot'a Hoş Geldiniz!</h3>
              <p>Sohbete başlamak için yeni bir chat oluşturun.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
