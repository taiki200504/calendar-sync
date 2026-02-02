import { useQuery } from '@tanstack/react-query';
import { syncService } from '../services/syncService';

interface SyncStatusData {
  successRate?: number;
  errorCount?: number;
  avgDelay?: number;
  enabledCalendars?: number;
  totalCalendars?: number;
  last7Days?: {
    success: number;
    errors: number;
    total: number;
  };
}

export function SyncStatus() {
  const { data: status, isLoading } = useQuery<SyncStatusData>({
    queryKey: ['syncStatus'],
    queryFn: () => syncService.getOverallSyncStatus(),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg px-4 py-3">
        <span className="text-sm text-gray-500">同期ステータス: 読み込み中...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white shadow rounded-lg px-4 py-3">
        <span className="text-sm text-gray-500">同期ステータス: データがありません</span>
      </div>
    );
  }

  const successRate = status.successRate ?? 0;
  const errorCount = status.errorCount ?? 0;
  const enabledCalendars = status.enabledCalendars ?? 0;
  const totalCalendars = status.totalCalendars ?? 0;
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (successRate / 100) * circumference;

  return (
    <div className="bg-white shadow rounded-lg px-4 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">同期ステータス</span>
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200" />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-green-500 transition-all duration-300"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900">
              {successRate.toFixed(0)}%
            </span>
          </div>
          <span className="text-xs text-gray-600">成功率</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">{errorCount}</span>
          <span className="text-xs text-gray-600">エラー</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">{enabledCalendars}</span>
          <span className="text-xs text-gray-600">有効 / 全{totalCalendars} カレンダー</span>
        </div>
      </div>
    </div>
  );
}
