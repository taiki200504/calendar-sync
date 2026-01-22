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
    refetchInterval: 5000, // 5秒ごとに更新
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-4">読み込み中...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500 text-center">データがありません</p>
      </div>
    );
  }

  // デフォルト値を設定してundefinedを防ぐ
  const successRate = status.successRate ?? 0;
  const errorCount = status.errorCount ?? 0;

  const circumference = 2 * Math.PI * 45; // 半径45の円周
  const offset = circumference - (successRate / 100) * circumference;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">同期ステータス</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 成功率 */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24">
            <svg className="transform -rotate-90 w-24 h-24">
              <circle
                cx="48"
                cy="48"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="48"
                cy="48"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-green-500 transition-all duration-300"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900">
                {successRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">成功率</p>
        </div>

        {/* エラー数 */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-gray-900">{errorCount}</div>
          <p className="mt-2 text-sm text-gray-600">エラー数</p>
          {errorCount > 0 && (
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              要確認
            </span>
          )}
        </div>

        {/* 有効なカレンダー数 */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-gray-900">
            {status.enabledCalendars ?? 0}
          </div>
          <p className="mt-2 text-sm text-gray-600">有効なカレンダー</p>
          {status.totalCalendars !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              全 {status.totalCalendars} カレンダー中
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
