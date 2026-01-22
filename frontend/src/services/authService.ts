import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const authService = {
  // バックエンドがリダイレクトを返すので、直接リダイレクト
  async getAuthUrl() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },

  // セッションベースの認証では、リフレッシュトークンは不要
  // セッションが有効な限り、認証は維持される

  async logout() {
    try {
      // セッションを破棄
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
};
