import axios from 'axios';
import { SearchParams, FreeSlot } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // セッション認証のためにクッキーを送信
});

// セッションベースの認証を使用するため、トークンインターセプターは不要
// クッキーが自動的に送信される

// レスポンスインターセプターでエラーハンドリング
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // セッションが無効な場合、ログインページにリダイレクト
      // セッションベースの認証では、リフレッシュトークンは不要
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export async function searchFreeSlots(params: SearchParams): Promise<FreeSlot[]> {
  const response = await api.post('/freebusy/search', params);
  return response.data.slots;
}

export default api;
