// 共通型定義

/**
 * APIレスポンスの共通型
 * @template T レスポンスデータの型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SyncJobData {
  userId: number;
  calendarIds?: number[];
  manual?: boolean;
}
