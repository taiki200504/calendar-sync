import axios from 'axios';
import { SearchParams, FreeSlot, Calendar } from '../types';

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

/**
 * フロントエンドのSearchParamsをバックエンドのFreeBusySearchParams形式に変換
 */
function convertSearchParams(params: SearchParams): {
  accountIds: string[];
  startDate: string;
  endDate: string;
  duration: number;
  workingHours: { start: number; end: number };
  buffer: number;
  preferredDays: string[];
} {
  // 期間の計算
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (params.period === 'thisWeek') {
    // 今週の開始（月曜）と終了（日曜）
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate = new Date(now);
    startDate.setDate(now.getDate() - diff);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (params.period === 'nextWeek') {
    // 来週の開始と終了
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate = new Date(now);
    startDate.setDate(now.getDate() - diff + 7);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // カスタム期間
    startDate = new Date(params.customStartDate || now);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(params.customEndDate || now);
    endDate.setHours(23, 59, 59, 999);
  }

  // 営業時間の変換 (HH:mm -> hour number)
  const startHour = parseInt(params.businessHoursStart.split(':')[0], 10);
  const endHour = parseInt(params.businessHoursEnd.split(':')[0], 10);

  // 優先曜日の変換 (数字 -> 曜日名)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const preferredDays = params.preferredDays.map(d => dayNames[d]);

  return {
    accountIds: [], // カレンダー取得後に設定
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    duration: params.duration,
    workingHours: { start: startHour, end: endHour },
    buffer: params.buffer,
    preferredDays,
  };
}

export async function searchFreeSlots(params: SearchParams): Promise<FreeSlot[]> {
  // まずカレンダー一覧を取得してカレンダーIDを取得
  const calendarsResponse = await api.get('/calendars');
  const calendars: Calendar[] = calendarsResponse.data.calendars || [];

  // 同期有効なカレンダーのIDを取得
  const enabledCalendarIds = calendars
    .filter((c: Calendar) => c.sync_enabled)
    .map((c: Calendar) => c.id);

  if (enabledCalendarIds.length === 0) {
    throw new Error('同期有効なカレンダーがありません。ダッシュボードでカレンダーの同期をONにしてください。');
  }

  // パラメータを変換
  const convertedParams = convertSearchParams(params);
  convertedParams.accountIds = enabledCalendarIds;

  const response = await api.post('/freebusy/search', convertedParams);
  return response.data.slots;
}

export default api;
