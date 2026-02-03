import { useQuery } from '@tanstack/react-query';
import { syncService } from '../services/syncService';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// バックエンドのsync_logテーブルの構造に合わせた型定義
interface SyncLogEntry {
  id: number;
  timestamp: string;
  operation: string;
  from_account_id?: string;
  to_account_id?: string;
  event_id?: string;
  result: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function SyncLog() {
  const { data: logs, isLoading, error } = useQuery<SyncLogEntry[]>({
    queryKey: ['syncLogs'],
    queryFn: () => syncService.getSyncLogs(10),
    refetchInterval: 5000, // 5秒ごとに更新
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">同期ログを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">同期ログ</h2>
        <p className="text-red-500 text-center py-4">
          ログの取得に失敗しました
        </p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">同期ログ</h2>
        <p className="text-gray-500 text-center py-4">ログがありません</p>
        <p className="text-xs text-gray-400 text-center">同期を実行するとここにログが表示されます</p>
      </div>
    );
  }

  const getOperationLabel = (operation: string) => {
    switch (operation) {
      case 'sync':
      case 'create':
        return '同期';
      case 'update':
        return '更新';
      case 'delete':
        return '削除';
      case 'error':
        return 'エラー';
      case 'pending':
        return '待機中';
      default:
        return operation || '不明';
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            成功
          </span>
        );
      case 'failed':
      case 'error':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            失敗
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            実行中
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {result || '不明'}
          </span>
        );
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">同期ログ</h2>
        <span className="text-xs text-gray-500">最新{logs.length}件</span>
      </div>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                時刻
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                結果
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                詳細
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(log.timestamp), 'MM/dd HH:mm', { locale: ja })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {getOperationLabel(log.operation)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {getResultBadge(log.result)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell max-w-xs truncate">
                  {log.error ? (
                    <span className="text-red-600" title={log.error}>
                      {log.error.substring(0, 50)}{log.error.length > 50 ? '...' : ''}
                    </span>
                  ) : log.event_id ? (
                    <span className="text-gray-400 font-mono text-xs">
                      {log.event_id.substring(0, 20)}...
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
