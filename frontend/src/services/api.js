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

  // Chat endpoints
  async getChats() {
    try {
      const response = await apiClient.get('/api/chats');
      return response.data;
    } catch (error) {
      console.error('Get chats error:', error);
      return error;
    }
  }

  async createChat(title) {
    try {
      console.log('Creating chat with title:', title);
      const response = await apiClient.post('/api/chats', { title });
      console.log('Create chat response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create chat error:', error);
      return error;
    }
  }

  async updateChatTitle(chatId, title) {
    try {
      const response = await apiClient.put(`/api/chats/${chatId}`, { title });
      return response.data;
    } catch (error) {
      console.error('Update chat title error:', error);
      return error;
    }
  }

  async deleteChat(chatId) {
    try {
      const response = await apiClient.delete(`/api/chats/${chatId}`);
      return response.data;
    } catch (error) {
      console.error('Delete chat error:', error);
      return error;
    }
  }

  async getChatMessages(chatId) {
    try {
      const response = await apiClient.get(`/api/chats/${chatId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Get messages error:', error);
      return error;
    }
  }

  async sendMessage(chatId, message, model = 'openai/gpt-3.5-turbo', language = 'tr') {
    try {
      const response = await apiClient.post(`/api/chats/${chatId}/messages`, { 
        message, 
        model, 
        language 
      });
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      return error;
    }
  }

  async updateMessage(chatId, messageId, text) {
    try {
      const response = await apiClient.put(`/api/chats/${chatId}/messages/${messageId}`, { text });
      return response.data;
    } catch (error) {
      console.error('Update message error:', error);
      return error;
    }
  }

  async deleteMessage(chatId, messageId) {
    try {
      const response = await apiClient.delete(`/api/chats/${chatId}/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Delete message error:', error);
      return error;
    }
  }

  async updateUserPreferences(model, language) {
    try {
      const response = await apiClient.post('/api/user/preferences', { 
        model, 
        language 
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