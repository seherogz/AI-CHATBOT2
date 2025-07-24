import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor ekleyelim
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    if (error.response) {
      return Promise.reject({
        success: false,
        message: error.response.data?.message || 'Bir hata oluştu',
        error: error.response.data
      });
    }
    if (error.request) {
      // İstek yapıldı ama yanıt alınamadı
      console.error('No response received:', error.request);
      return Promise.reject({
        success: false,
        message: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
        error: error.request
      });
    }
    // İstek oluşturulurken hata oluştu
    return Promise.reject({
      success: false,
      message: 'İstek gönderilemedi',
      error: error
    });
  }
);

class ApiService {
  // Auth endpoints
  async login(username, password) {
    try {
      const response = await apiClient.post('/api/auth/login', { username, password });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      return error;
    }
  }

  async register(username, email, password) {
    try {
      const response = await apiClient.post('/api/auth/register', { username, email, password });
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
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

  async sendMessage(chatId, message) {
    try {
      const response = await apiClient.post(`/api/chats/${chatId}/messages`, { message });
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      return error;
    }
  }
}

const api = new ApiService();
export default api; 