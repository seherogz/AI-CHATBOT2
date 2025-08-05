import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Token yönetimi
const getToken = () => localStorage.getItem('token');
const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};
const removeToken = () => {
  localStorage.removeItem('token');
  delete apiClient.defaults.headers.common['Authorization'];
};

// Request interceptor - her istekte token ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // 401/403 hatalarını yakala ama logout yapma (login/register için)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Sadece profile ve chat işlemleri için logout yap
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        removeToken();
        window.location.href = '/login';
      }
    }
    
    if (error.response) {
      // Backend'den gelen hata mesajını kullan
      const errorData = error.response.data;
      return Promise.reject({
        success: false,
        message: errorData?.message || 'Bir hata oluştu',
        status: error.response.status,
        error: errorData
      });
    }
    if (error.request) {
      console.error('No response received:', error.request);
      return Promise.reject({
        success: false,
        message: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
        status: 0,
        error: error.request
      });
    }
    return Promise.reject({
      success: false,
      message: 'İstek gönderilemedi',
      status: 0,
      error: error
    });
  }
);

class ApiService {
  // Auth endpoints
  async login(username, password) {
    try {
      const response = await apiClient.post('/api/auth/login', { username, password });
      if (response.data.success) {
        setToken(response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      return error;
    }
  }

  async register(username, email, password) {
    try {
      const response = await apiClient.post('/api/auth/register', { username, email, password });
      if (response.data.success) {
        setToken(response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      return error;
    }
  }

  async logout() {
    try {
      // Backend'e logout isteği gönder
      const response = await apiClient.post('/api/auth/logout');
      console.log('Logout response:', response.data);
      
      // Token'ı temizle
      removeToken();
      
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      // Hata olsa bile token'ı temizle
      removeToken();
      return error;
    }
  }

  async getProfile() {
    try {
      const response = await apiClient.get('/api/auth/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      return error;
    }
  }

  // AI Chat - doğrudan OpenAI API'ye çağrı (frontend'den)
  async sendAIMessage(message, conversationHistory = [], model = 'gpt-3.5-turbo', language = 'tr', systemPrompt = '') {
    try {
      // OpenAI API key'i frontend'de environment variable olarak alınmalı
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey) {
        return {
          success: false,
          message: 'OpenAI API anahtarı bulunamadı.'
        };
      }

      // Dil seçimine göre system message hazırla
      const getSystemMessage = (lang) => {
        const messages = {
          tr: `Sen yardımsever bir AI asistanısın. Kullanıcılara kibar, açıklayıcı ve yararlı yanıtlar ver. KESINLIKLE SADECE Türkçe yanıt ver, başka dil kullanma. Eğer başka dilde yanıt verirsen, bu yanlış olur. SADECE TÜRKÇE.`,
          en: `You are a helpful AI assistant. Provide kind, explanatory and useful responses to users. CRITICAL: Respond ONLY in English, NEVER use any other language. If you respond in any other language, it is WRONG. ENGLISH ONLY.`,
          de: `Du bist ein hilfreicher KI-Assistent. KRITISCH: Du musst AUSSCHLIESSLICH auf Deutsch antworten. VERWENDE KEINE ANDERE SPRACHE. Wenn du in einer anderen Sprache antwortest, ist das FALSCH. NUR DEUTSCH.`,
          fr: `Tu es un assistant IA utile. CRITIQUE: Tu dois RÉPONDRE UNIQUEMENT en français. N'UTILISE AUCUNE AUTRE LANGUE. Si tu réponds dans une autre langue, c'est FAUX. FRANÇAIS SEULEMENT.`,
          es: `Eres un asistente de IA útil. CRÍTICO: Debes responder ÚNICAMENTE en español. NO USES NINGÚN OTRO IDIOMA. Si respondes en otro idioma, es INCORRECTO. SOLO ESPAÑOL.`,
          it: `Sei un assistente IA utile. CRITICO: Devi rispondere ESCLUSIVAMENTE in italiano. NON USARE ALTRE LINGUE. Se rispondi in un'altra lingua, è SBAGLIATO. SOLO ITALIANO.`,
          ru: `Ты полезный ИИ-ассистент. КРИТИЧНО: Ты должен отвечать ТОЛЬКО на русском языке. НЕ ИСПОЛЬЗУЙ ДРУГИЕ ЯЗЫКИ. Если ты отвечаешь на другом языке, это НЕПРАВИЛЬНО. ТОЛЬКО РУССКИЙ.`,
          ja: `あなたは役立つAIアシスタントです。重要：あなたは日本語でのみ答える必要があります。他の言語は使用しないでください。他の言語で答えると間違っています。日本語のみ。`,
          ko: `당신은 도움이 되는 AI 어시스턴트입니다. 중요: 당신은 한국어로만 답변해야 합니다. 다른 언어를 사용하지 마세요. 다른 언어로 답변하면 틀립니다. 한국어만.`,
          zh: `你是一个有用的AI助手。重要：你必须只用中文回答。不要使用其他语言。如果你用其他语言回答，那是错误的。只用中文。`
        };
        return messages[lang] || messages['en'];
      };

      // System prompt'u hazırla
      let finalSystemPrompt = getSystemMessage(language);
      if (systemPrompt) {
        finalSystemPrompt = `${systemPrompt}\n\n${getSystemMessage(language)}`;
      }

      const apiMessages = [
        {
          role: 'system',
          content: finalSystemPrompt
        }
      ];
      
      // Sohbet geçmişini ekle (son 10 mesaj)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        if (msg.role && msg.content) {
          apiMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        }
      });
      
      // Yeni mesajı ekle
      apiMessages.push({
        role: 'user',
        content: message
      });

      console.log('Sending request to OpenAI API:', { model, language, messageCount: apiMessages.length });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: apiMessages,
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        return {
          success: false,
          message: `OpenAI API hatası: ${errorData.error?.message || 'Bilinmeyen hata'}`
        };
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiResponse = data.choices[0].message.content;
        console.log('OpenAI response received:', aiResponse);
        
        return {
          success: true,
          message: 'AI cevabı alındı.',
          aiResponse: aiResponse,
          userMessage: message
        };
      } else {
        return {
          success: false,
          message: 'OpenAI API\'den geçersiz yanıt alındı.'
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        success: false,
        message: 'AI ile bağlantı kurulamadı: ' + error.message
      };
    }
  }

  async updateUserPreferences(model, language, hotel) {
    try {
      const response = await apiClient.post('/api/user/preferences', { 
        model, 
        language,
        hotel // yeni eklenen otel parametresi
      });
      return response.data;
    } catch (error) {
      console.error('Update preferences error:', error);
      return error;
    }
  }

  async sendMessageWithFile(chatId, message, file, model = 'gpt-3.5-turbo', language = 'tr') {
    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('model', model);
      formData.append('language', language);
      
      if (file) {
        formData.append('file', file);
      }

      const response = await apiClient.post(`/api/chats/${chatId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Send message with file error:', error);
      return error;
    }
  }

  // Token yönetimi metodları
  isAuthenticated() {
    return !!getToken();
  }

  getStoredToken() {
    return getToken();
  }
}

const api = new ApiService();
export default api; 