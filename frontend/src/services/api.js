const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    console.log(`API Request: ${config.method || 'GET'} ${url}`, config.body ? JSON.parse(config.body) : '');

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      console.log(`API Response: ${response.status}`, data);
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  // Chat endpoints
  async getChats() {
    return this.request('/chats');
  }

  async createChat(title) {
    return this.request('/chats', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async updateChat(chatId, title) {
    return this.request(`/chats/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  async deleteChat(chatId) {
    return this.request(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  }

  async getChatMessages(chatId) {
    return this.request(`/chats/${chatId}/messages`);
  }

  async sendMessage(chatId, message) {
    return this.request(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
}

const api = new ApiService();
export default api; 