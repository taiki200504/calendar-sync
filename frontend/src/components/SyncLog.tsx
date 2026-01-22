import { useQuery } from '@tanstack/react-query';
import { syncService } from '../services/syncService';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SyncLog {
  id: number;
  timestamp: string;
  operation: 'sync' | 'error' | 'pending';
  result: 'success' | 'failed' | 'pending';
  eventsSynced: number;
  errors: string[];
}

export function SyncLog() {
  const { data: logs, isLoading } = useQuery<SyncLog[]>({
    queryKey: ['syncLogs'],
    queryFn: () => syncService.getSyncLogs(10),
    refetchInterval: 5000, // 5秒ごとに更新
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-4">読み込み中...</div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">同期ログ</h2>
        <p className="text-gray-500 text-center py-4">ログがありません</p>
      </div>
    );
  }

  const getOperationLabel = (operation: string) => {
    switch (operation) {
      case 'sync':
        return '同期';
      case 'error':
        return 'エラー';
      case 'pending':
        return '待機中';
      default:
        return operation;
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
        return null;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">同期ログ</h2>
      <div className="overflow-x-auto">
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                イベント数
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {getOperationLabel(log.operation)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {getResultBadge(log.result)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {log.eventsSynced}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
