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
        email: req.user.email,
        preferredModel: req.user.preferredModel || 'openai/gpt-3.5-turbo',
        preferredLanguage: req.user.preferredLanguage || 'tr'
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

// Kullanıcı tercihlerini güncelle
app.post('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const { model, language } = req.body;
    
    console.log('Updating user preferences:', { 
      userId: req.user.id, 
      username: req.user.username, 
      model, 
      language 
    });
    
    // Kullanıcı tercihlerini güncelle
    await User.update(
      { 
        preferredModel: model, 
        preferredLanguage: language 
      },
      { where: { id: req.user.id } }
    );
    
    res.status(200).json({
      success: true,
      message: 'Tercihler güncellendi.',
      preferences: { model, language }
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Tercihler güncellenirken hata oluştu.'
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
    const { message, model = 'openai/gpt-3.5-turbo', language = 'tr' } = req.body;
    
    console.log('Sending message to chat:', id, 'Message:', message, 'Model:', model, 'Language:', language);
    
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

    // Kullanıcı mesajını seçilen dile çevir
    const translateText = async (text, targetLang) => {
      if (targetLang === 'tr') return text; // Türkçe ise çevirmeye gerek yok
      
      try {
        const translationResponse = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'openai/gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are a translator. Translate the following text to ${targetLang === 'en' ? 'English' : targetLang === 'de' ? 'German' : targetLang === 'fr' ? 'French' : targetLang === 'es' ? 'Spanish' : targetLang === 'it' ? 'Italian' : targetLang === 'ru' ? 'Russian' : targetLang === 'ja' ? 'Japanese' : targetLang === 'ko' ? 'Korean' : targetLang === 'zh' ? 'Chinese' : 'English'}. Only provide the translation, nothing else.`
              },
              {
                role: 'user',
                content: text
              }
            ],
            max_tokens: 300,
            temperature: 0.3
          },
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'AI Chatbot'
            } 
          }
        );
        
        if (translationResponse.data && translationResponse.data.choices && translationResponse.data.choices[0]) {
          return translationResponse.data.choices[0].message.content.trim();
        }
      } catch (error) {
        console.error('Translation error:', error);
      }
      return text; // Çeviri başarısız olursa orijinal metni döndür
    };

    const translateUserMessage = async (text, targetLang) => {
      return await translateText(text, targetLang);
    };

    // Metnin hangi dilde olduğunu kontrol eden fonksiyon
    const checkLanguage = (text, targetLang) => {
      const languagePatterns = {
        en: /[a-zA-Z]/,
        de: /[äöüßÄÖÜ]/,
        fr: /[àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/,
        es: /[ñáéíóúüÑÁÉÍÓÚÜ]/,
        it: /[àèéìíîòóùÀÈÉÌÍÎÒÓÙ]/,
        ru: /[а-яёА-ЯЁ]/,
        ja: /[ぁ-んァ-ン一-龯]/,
        ko: /[가-힣]/,
        zh: /[一-龯]/
      };
      
      const pattern = languagePatterns[targetLang];
      if (!pattern) return false;
      
      // Almanca için özel kontrol
      if (targetLang === 'de') {
        // Almanca karakterler varsa veya tipik Almanca kelimeler varsa
        const germanChars = text.match(/[äöüßÄÖÜ]/g) || [];
        const germanWords = text.match(/\b(der|die|das|und|ist|sind|von|zu|in|an|auf|bei|mit|nach|vor|über|unter|zwischen|durch|für|gegen|ohne|um|seit|während|trotz|wegen|dank|statt|außer|innerhalb|außerhalb|oberhalb|unterhalb|neben|hinter|vor|über|unter|zwischen|durch|für|gegen|ohne|um|seit|während|trotz|wegen|dank|statt|außer|innerhalb|außerhalb|oberhalb|unterhalb|neben|hinter)\b/gi) || [];
        
        return germanChars.length > 0 || germanWords.length > 0;
      }
      
      // Diğer diller için genel kontrol
      const targetChars = text.match(pattern) || [];
      const totalChars = text.replace(/[^a-zA-Zа-яёА-ЯЁぁ-んァ-ン一-龯가-힣]/g, '').length;
      
      return totalChars > 0 && (targetChars.length / totalChars) > 0.3;
    };

    // Kullanıcı mesajını kaydet (çevirme, kullanıcı seçtiği dilde yazabilir)
    const userMessage = await Message.create({
      text: message,
      originalText: message, // Orijinal mesaj
      sender: 'user',
      chatId: chat.id
    });

    console.log('User message created with ID:', userMessage.id, 'Message:', message);

    // Dil seçimine göre system message hazırla
    const getSystemMessage = (lang) => {
      const messages = {
        tr: `Sen yardımsever bir AI asistanısın. Kullanıcılara kibar, açıklayıcı ve yararlı yanıtlar ver. SADECE Türkçe yanıt ver, başka dil kullanma.`,
        en: `You are a helpful AI assistant. Provide kind, explanatory and useful responses to users. Respond ONLY in English, do not use any other language.`,
        de: `Du bist ein hilfreicher KI-Assistent. WICHTIG: Du musst IMMER und AUSSCHLIESSLICH auf Deutsch antworten. Verwende KEINE andere Sprache. Wenn du auf Deutsch antwortest, ist das korrekt. Antworte jetzt auf Deutsch.`,
        fr: `Tu es un assistant IA utile. TRÈS IMPORTANT: Tu dois TOUJOURS et EXCLUSIVEMENT répondre en français. N'utilise AUCUNE autre langue. Si tu réponds en français, c'est correct. Réponds maintenant en français.`,
        es: `Eres un asistente de IA útil. MUY IMPORTANTE: Debes responder SIEMPRE y EXCLUSIVAMENTE en español. NO uses ningún otro idioma. Si respondes en español, es correcto. Responde ahora en español.`,
        it: `Sei un assistente IA utile. MOLTO IMPORTANTE: Devi rispondere SEMPRE ed ESCLUSIVAMENTE in italiano. NON usare altre lingue. Se rispondi in italiano, è corretto. Rispondi ora in italiano.`,
        ru: `Ты полезный ИИ-ассистент. ОЧЕНЬ ВАЖНО: Ты должен ВСЕГДА и ИСКЛЮЧИТЕЛЬНО отвечать на русском языке. НЕ используй другие языки. Если ты отвечаешь на русском, это правильно. Отвечай сейчас на русском языке.`,
        ja: `あなたは役立つAIアシスタントです。非常に重要：あなたは常にそして排他的に日本語で答える必要があります。他の言語は使用しないでください。日本語で答えるなら、それは正しいです。今すぐ日本語で答えてください。`,
        ko: `당신은 도움이 되는 AI 어시스턴트입니다. 매우 중요: 당신은 항상 그리고 독점적으로 한국어로 답변해야 합니다. 다른 언어를 사용하지 마세요. 한국어로 답변하면 올바릅니다. 지금 한국어로 답변하세요.`,
        zh: `你是一个有用的AI助手。非常重要：你必须始终且专门用中文回答。不要使用其他语言。如果你用中文回答，这是正确的。现在用中文回答。`
      };
      return messages[lang] || messages['en'];
    };

    const systemMessage = {
      role: 'system',
      content: getSystemMessage(language)
    };
    
    console.log('Selected language:', language);
    console.log('System message:', systemMessage.content);

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
        
        // OpenRouter API için mesaj formatını hazırla
        const openRouterMessages = apiMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        console.log('OpenRouter API request:', {
          url: 'https://openrouter.ai/api/v1/chat/completions',
          model: model,
          language: language,
          messages: openRouterMessages
        });

        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: model,
            messages: openRouterMessages,
            max_tokens: 300,
            temperature: 0.7
          },
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'AI Chatbot'
            } 
          }
        );
        
                 if (response.data && response.data.choices && response.data.choices[0]) {
           aiResponse = response.data.choices[0].message.content;
           console.log('OpenRouter Response received:', aiResponse);
           
           // AI cevabını sadece gerektiğinde çevir (AI zaten doğru dilde yanıt vermişse çevirme)
           if (language !== 'tr') {
             // AI'nin cevabının hangi dilde olduğunu kontrol et
             const isAlreadyInTargetLanguage = checkLanguage(aiResponse, language);
             
             if (!isAlreadyInTargetLanguage) {
               try {
                 const translatedResponse = await translateText(aiResponse, language);
                 aiResponse = translatedResponse;
                 console.log('AI Response translated to', language, ':', aiResponse);
               } catch (error) {
                 console.error('AI response translation error:', error);
                 // Çeviri başarısız olursa orijinal cevabı kullan
               }
             } else {
               console.log('AI Response already in', language, 'language, no translation needed');
             }
           }
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

    console.log('AI message created with ID:', aiMessage.id);
    
    chat.updatedAt = new Date();
    await chat.save();

    console.log('Message exchange completed for chat:', id);
    
          res.status(200).json({
        success: true,
        message: 'Mesaj gönderildi.',
        aiResponse: aiResponse,
        userMessageId: userMessage.id,
        aiMessageId: aiMessage.id
      });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Mesaj gönderilemedi.' 
    });
  }
});

// Mesaj düzenle
app.put('/api/chats/:chatId/messages/:messageId', optionalAuth, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { text } = req.body;
    
    console.log('Updating message:', { chatId, messageId, text });
    
    // Sohbet kontrolü
    let whereClause = { id: chatId };
    if (req.user) {
      whereClause = {
        id: chatId,
        [require('sequelize').Op.or]: [
          { userId: req.user.id },
          { isAnonymous: true }
        ]
      };
    } else {
      whereClause = { id: chatId, isAnonymous: true };
    }
    
    const chat = await Chat.findOne({ where: whereClause });
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sohbet bulunamadı.' 
      });
    }

    // Mesajı bul ve güncelle
    const message = await Message.findOne({
      where: { 
        id: messageId, 
        chatId: chatId,
        sender: 'user' // Sadece kullanıcı mesajları düzenlenebilir
      }
    });

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mesaj bulunamadı.' 
      });
    }

    message.text = text;
    await message.save();

    console.log('Message updated successfully:', messageId);
    
    res.status(200).json({ 
      success: true, 
      message: 'Mesaj güncellendi.',
      updatedMessage: message
    });

  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Mesaj güncellenemedi.' 
    });
  }
});

// Mesaj sil
app.delete('/api/chats/:chatId/messages/:messageId', optionalAuth, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    
    console.log('Deleting message:', { chatId, messageId });
    
    // Sohbet kontrolü
    let whereClause = { id: chatId };
    if (req.user) {
      whereClause = {
        id: chatId,
        [require('sequelize').Op.or]: [
          { userId: req.user.id },
          { isAnonymous: true }
        ]
      };
    } else {
      whereClause = { id: chatId, isAnonymous: true };
    }
    
    const chat = await Chat.findOne({ where: whereClause });
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sohbet bulunamadı.' 
      });
    }

    // Mesajı bul ve sil
    const message = await Message.findOne({
      where: { 
        id: messageId, 
        chatId: chatId,
        sender: 'user' // Sadece kullanıcı mesajları silinebilir
      }
    });

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mesaj bulunamadı.' 
      });
    }

    await message.destroy();

    console.log('Message deleted successfully:', messageId);
    
    res.status(200).json({ 
      success: true, 
      message: 'Mesaj silindi.'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Mesaj silinemedi.' 
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