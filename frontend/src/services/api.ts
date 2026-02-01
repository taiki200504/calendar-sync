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
      // 認証エラーの場合、OAuth認証ページへリダイレクト
      // これにより、トークンリフレッシュに失敗した場合でも自動的に再認証できる
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      window.location.href = `${API_BASE_URL}/auth/google`;
      return Promise.reject(error);
    }
    // 500 の原因特定のためコンソールに URL とレスポンスを出力
    if (error.response?.status === 500) {
      const url = error.config?.url ?? error.config?.baseURL ?? 'unknown';
      const data = error.response?.data;
      console.error('[500] Failed request:', url, data ?? error.message);
    }
    return Promise.reject(error);
  }
);

export async function searchFreeSlots(params: SearchParams): Promise<FreeSlot[]> {
  const response = await api.post('/freebusy/search', params);
  return response.data.slots;
}

export default api;
