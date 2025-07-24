const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

const app = express();

// CORS Ayarları
app.use(cors({
  origin: 'http://localhost:3000', // frontend portu
  credentials: true
}));

app.options('*', cors()); // Preflight isteklerini karşılamak için

// Body parser middleware
app.use(express.json());

// --- LOGLAMA MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body:', req.body);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası oluştu',
    error: err.message
  });
});

// --- HAFIZADA VERİ SAKLAMA ---
const chats = new Map();
const users = new Map(); // Kullanıcılar için basit hafıza depolama

// --- AUTH ENDPOINTS ---

// Kullanıcı kaydı
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    console.log('Register attempt:', { username, email, password });
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur.' });
    }
    
    // Username kontrolü
    const existingUserByUsername = Array.from(users.values()).find(user => user.username === username);
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }
    
    // Email kontrolü
    if (users.has(email)) {
      return res.status(400).json({ success: false, message: 'Bu email zaten kayıtlı.' });
    }
    
    const user = {
      id: Date.now().toString(),
      username,
      email,
      password, // Gerçek uygulamada şifrelenmeli
      createdAt: new Date().toISOString()
    };
    
    users.set(email, user);
    console.log('User registered successfully:', { id: user.id, username: user.username, email: user.email });
    
    res.status(201).json({ 
      success: true, 
      message: 'Kayıt başarılı.',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Kayıt sırasında hata oluştu.' });
  }
});

// Kullanıcı girişi
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, password });
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre zorunludur.' });
    }
    
    // Username ile kullanıcı arama
    const user = Array.from(users.values()).find(user => user.username === username);
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
    }
    
    console.log('User logged in successfully:', { id: user.id, username: user.username });
    
    res.status(200).json({ 
      success: true, 
      message: 'Giriş başarılı.',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Giriş sırasında hata oluştu.' });
  }
});

// --- CHAT ENDPOINTS ---

// Ana sayfa yönlendirmesi
app.get('/', (req, res) => {
  res.json({ message: 'AI Chatbot API çalışıyor' });
});

// API bilgi sayfası
app.get('/api', (req, res) => {
  res.json({ 
    message: 'AI Chatbot API',
    status: 'running',
  });
});

// Tarayıcı isteklerini kontrol et
app.use((req, res, next) => {
  const acceptHeader = req.get('Accept');
  if (acceptHeader && acceptHeader.includes('text/html')) {
    return res.redirect('http://localhost:3000');
  }
  next();
});

// Test Endpoint'i
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Backend sunucusu çalışıyor!' });
});

// OpenRouter API ile direkt sohbet
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Mesaj zorunludur.' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'AI servisi yapılandırılmamış. Lütfen API anahtarını ayarlayın.' 
      });
    }

    // OpenRouter API çağrısı
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { 
        model: 'mistralai/mistral-7b-instruct:free', 
        messages: [
          {
            role: 'system',
            content: `Sen yardımsever bir AI asistanısın. Kullanıcılara kibar, açıklayıcı ve yararlı yanıtlar ver. Türkçe ve İngilizce dillerini destekliyorsun.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      { 
        headers: { 
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      const aiResponse = response.data.choices[0].message.content;
      return res.status(200).json({ 
        success: true, 
        message: aiResponse 
      });
    } else {
      throw new Error('Invalid API response');
    }

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'AI servisi ile iletişim sırasında bir hata oluştu.' 
    });
  }
});

// Tüm sohbetleri getir
app.get('/api/chats', (req, res) => {
  try {
    const allChats = Array.from(chats.values()).map(chat => ({
      id: chat.id,
      title: chat.title,
      lastMessage: chat.messages && chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1] 
        : null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    }));
    
    console.log('Returning chats:', allChats);
    res.status(200).json({ success: true, chats: allChats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ success: false, message: 'Sohbetler alınamadı.' });
  }
});

// Yeni sohbet oluştur
app.post('/api/chats', (req, res) => {
  try {
    console.log('Creating new chat, received body:', req.body);
    const { title } = req.body;
    
    if (!title) {
      console.log('Title is required but was not provided');
      return res.status(400).json({ success: false, message: 'Başlık zorunludur.' });
    }
    
    const newChat = {
      id: Date.now().toString(),
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    chats.set(newChat.id, newChat);
    console.log('New chat created successfully:', newChat);
    
    return res.status(200).json({ success: true, chat: newChat });
  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ success: false, message: 'Yeni sohbet oluşturulamadı.' });
  }
});

// Sohbet başlığını güncelle
app.put('/api/chats/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const chat = chats.get(id);

    if (chat) {
      chat.title = title;
      chat.updatedAt = new Date().toISOString();
      chats.set(id, chat);
      console.log('Chat updated:', chat);
      res.status(200).json({ success: true, chat });
    } else {
      res.status(404).json({ success: false, message: 'Sohbet bulunamadı.' });
    }
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ success: false, message: 'Sohbet güncellenemedi.' });
  }
});

// Sohbeti sil
app.delete('/api/chats/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = chats.delete(id);
    if (deleted) {
      console.log('Chat deleted:', id);
      res.status(200).json({ success: true, message: 'Sohbet silindi.' });
    } else {
      res.status(404).json({ success: false, message: 'Sohbet bulunamadı.' });
    }
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ success: false, message: 'Sohbet silinemedi.' });
  }
});

// Sohbet mesajlarını getir
app.get('/api/chats/:id/messages', (req, res) => {
  try {
    const { id } = req.params;
    const chat = chats.get(id);
    
    if (chat) {
      console.log('Returning messages for chat:', id, chat.messages);
      res.status(200).json({ success: true, messages: chat.messages || [] });
    } else {
      res.status(404).json({ success: false, message: 'Sohbet bulunamadı.' });
    }
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Mesajlar alınamadı.' });
  }
});

// Sohbete yeni mesaj ekle
app.post('/api/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Mesaj zorunludur.' });
    }

    let chat = chats.get(id);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Sohbet bulunamadı.' });
    }

    // Yeni mesajı ekle
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    if (!chat.messages) {
      chat.messages = [];
    }
    
    chat.messages.push(newMessage);
    chat.updatedAt = new Date().toISOString();
    chats.set(id, chat);

    console.log('New message added to chat:', id, newMessage);
    
    res.status(200).json({ 
      success: true, 
      message: 'Mesaj eklendi.',
      chat: chat
    });

  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ success: false, message: 'Mesaj eklenemedi.' });
  }
});

// --- SUNUCUYU BAŞLATMA ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
  console.log('Registered users:', users.size);
  console.log('Active chats:', chats.size);
}); 