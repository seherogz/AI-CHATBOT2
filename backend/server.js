const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const bcrypt = require('bcryptjs');

// Database ve middleware import
const { syncDatabase, User, Chat, Message } = require('./models');
const { generateToken, authenticateToken, optionalAuth } = require('./middleware/auth');

const app = express();

// CORS Ayarları
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.options('*', cors());

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

// Ana sayfa
app.get('/', (req, res) => {
  res.json({ message: 'AI Chatbot API çalışıyor' });
});

// --- AUTH ENDPOINTS ---

// Kullanıcı kaydı
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    console.log('Register attempt:', { username, email });
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tüm alanlar zorunludur.' 
      });
    }
    
    // Kullanıcı kontrolü
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kullanıcı adı veya email zaten kullanılıyor.' 
      });
    }
    
    // Yeni kullanıcı oluştur
    const user = await User.create({
      username,
      email,
      password
    });
    
    // JWT token oluştur
    const token = generateToken(user);
    
    console.log('User registered successfully:', { id: user.id, username: user.username });
    
    res.status(201).json({ 
      success: true, 
      message: 'Kayıt başarılı.',
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kayıt sırasında hata oluştu.' 
    });
  }
});

// Kullanıcı girişi
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username });
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kullanıcı adı ve şifre zorunludur.' 
      });
    }
    
    // Kullanıcıyı bul
    const user = await User.findOne({
      where: { username: username }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı adı veya şifre hatalı.' 
      });
    }
    
    // Şifre kontrolü
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı adı veya şifre hatalı.' 
      });
    }
    
    // JWT token oluştur
    const token = generateToken(user);
    
    console.log('User logged in successfully:', { id: user.id, username: user.username });
    
    res.status(200).json({ 
      success: true, 
      message: 'Giriş başarılı.',
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Giriş sırasında hata oluştu.' 
    });
  }
});

// Kullanıcı profili
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil bilgileri alınırken hata oluştu.'
    });
  }
});

// Kullanıcı çıkışı
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    console.log('User logout:', { id: req.user.id, username: req.user.username });
    
    // JWT token'ı blacklist'e eklenebilir (opsiyonel)
    // Şimdilik sadece başarılı logout mesajı döndürüyoruz
    
    res.status(200).json({
      success: true,
      message: 'Çıkış başarılı.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Çıkış sırasında hata oluştu.'
    });
  }
});

// --- CHAT ENDPOINTS ---

// Tüm sohbetleri getir
app.get('/api/chats', optionalAuth, async (req, res) => {
  try {
    let whereClause = {};
    
    if (req.user) {
      // Giriş yapmış kullanıcının sohbetleri
      whereClause = {
        [require('sequelize').Op.or]: [
          { userId: req.user.id },
          { isAnonymous: true }
        ]
      };
    } else {
      // Anonim sohbetler
      whereClause = { isAnonymous: true };
    }
    
    const chats = await Chat.findAll({
      where: whereClause,
      include: [
        {
          model: Message,
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    console.log('Returning chats:', chats.length);
    res.status(200).json({ success: true, chats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sohbetler alınamadı.' 
    });
  }
});

// Yeni sohbet oluştur
app.post('/api/chats', optionalAuth, async (req, res) => {
  try {
    console.log('Creating new chat, received body:', req.body);
    const { title } = req.body;
    
    if (!title) {
      console.log('Title is required but was not provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Başlık zorunludur.' 
      });
    }
    
    const newChat = await Chat.create({
      title,
      userId: req.user ? req.user.id : null,
      isAnonymous: !req.user
    });
    
    console.log('New chat created successfully:', newChat);
    
    return res.status(200).json({ success: true, chat: newChat });
  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Yeni sohbet oluşturulamadı.' 
    });
  }
});

// Sohbet başlığını güncelle
app.put('/api/chats/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    const chat = await Chat.findOne({
      where: { id, userId: req.user.id }
    });

    if (chat) {
      chat.title = title;
      await chat.save();
      console.log('Chat updated:', chat);
      res.status(200).json({ success: true, chat });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Sohbet bulunamadı.' 
      });
    }
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sohbet güncellenemedi.' 
    });
  }
});

// Sohbeti sil
app.delete('/api/chats/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const chat = await Chat.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (chat) {
      await chat.destroy();
      console.log('Chat deleted:', id);
      res.status(200).json({ 
        success: true, 
        message: 'Sohbet silindi.' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Sohbet bulunamadı.' 
      });
    }
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sohbet silinemedi.' 
    });
  }
});

// Sohbet mesajlarını getir
app.get('/api/chats/:id/messages', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    let whereClause = { chatId: id };
    
    if (req.user) {
      // Giriş yapmış kullanıcı için sohbet kontrolü
      const chat = await Chat.findOne({
        where: { 
          id, 
          [require('sequelize').Op.or]: [
            { userId: req.user.id },
            { isAnonymous: true }
          ]
        }
      });
      
      if (!chat) {
        return res.status(404).json({ 
          success: false, 
          message: 'Sohbet bulunamadı.' 
        });
      }
    }
    
    const messages = await Message.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']]
    });
    
    console.log('Returning messages for chat:', id, messages.length);
    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Mesajlar alınamadı.' 
    });
  }
});

// Mesaj gönder
app.post('/api/chats/:id/messages', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    console.log('Sending message to chat:', id, 'Message:', message);
    
    // Sohbet kontrolü
    let whereClause = { id };
    if (req.user) {
      whereClause = {
        id,
        [require('sequelize').Op.or]: [
          { userId: req.user.id },
          { isAnonymous: true }
        ]
      };
    } else {
      whereClause = { id, isAnonymous: true };
    }
    
    const chat = await Chat.findOne({ where: whereClause });
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sohbet bulunamadı.' 
      });
    }

    // Kullanıcı mesajını kaydet
    const userMessage = await Message.create({
      text: message,
      sender: 'user',
      chatId: chat.id
    });

    // OpenRouter API için mesajları hazırla
    const systemMessage = {
      role: 'system',
      content: `Sen yardımsever bir AI asistanısın. Kullanıcılara kibar, açıklayıcı ve yararlı yanıtlar ver. Türkçe ve İngilizce dillerini destekliyorsun.`
    };

    const apiMessages = [systemMessage];
    
    // Son 10 mesajı API'ye gönder
    const recentMessages = await Message.findAll({
      where: { chatId: chat.id },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    recentMessages.reverse().forEach(msg => {
      apiMessages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });

    let aiResponse = 'Üzgünüm, şu anda AI servisi ile bağlantı kuramıyorum. Lütfen daha sonra tekrar deneyin.';

    // OpenRouter API çağrısı
    if (process.env.OPENROUTER_API_KEY) {
      try {
        console.log('Calling OpenRouter API...');
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          { 
            model: 'mistralai/mistral-7b-instruct:free', 
            messages: apiMessages,
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
          aiResponse = response.data.choices[0].message.content;
          console.log('AI Response received:', aiResponse);
        }
      } catch (apiError) {
        console.error('OpenRouter API Hatası:', apiError.response ? apiError.response.data : apiError.message);
        aiResponse = 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
      }
    } else {
      console.warn('OPENROUTER_API_KEY not found in environment variables');
      aiResponse = 'AI servisi yapılandırılmamış. Lütfen API anahtarını ayarlayın.';
    }

    // AI yanıtını kaydet
    const aiMessage = await Message.create({
      text: aiResponse,
      sender: 'ai',
      chatId: chat.id
    });
    
    chat.updatedAt = new Date();
    await chat.save();

    console.log('Message exchange completed for chat:', id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Mesaj gönderildi.',
      aiResponse: aiResponse
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Mesaj gönderilemedi.' 
    });
  }
});

// --- SUNUCUYU BAŞLATMA ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Database'i senkronize et
    await syncDatabase();
    
    // Sunucuyu başlat
    app.listen(PORT, () => {
      console.log(`Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer(); 