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
    const url = error.config?.url ?? error.config?.baseURL ?? 'unknown';
    
    if (error.response?.status === 401) {
      const data = error.response?.data;
      console.debug('Auth check failed:', { url, data });
      
      if (data?.code === 'ENCRYPTION_KEY_MISMATCH') {
        alert(data?.error || '暗号化キーの不一致のため、Googleアカウントを再連携してください。');
      }
      
      // /auth/me の401は認証チェック用なのでリダイレクトしない（ProtectedRouteで処理）
      if (url.includes('/auth/me')) {
        return Promise.reject(error);
      }
      
      // その他のAPIで401が返った場合はログインにリダイレクト
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      window.location.href = `${API_BASE_URL}/auth/google`;
      return Promise.reject(error);
    }
    
    // 500 の原因特定のためコンソールに URL とレスポンスを出力
    if (error.response?.status === 500) {
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
