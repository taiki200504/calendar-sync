import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncService } from '../services/syncService';
import { calendarService } from '../services/calendarService';
export function SyncPage() {
  const queryClient = useQueryClient();

  const { data: calendarsData, isLoading: calendarsLoading } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars()
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => syncService.getOverallSyncStatus()
  });

  const { data: syncHistory } = useQuery({
    queryKey: ['sync-history'],
    queryFn: () => syncService.getSyncHistory(10)
  });

  const manualSyncMutation = useMutation({
    mutationFn: () => syncService.triggerSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    }
  });

  const updateCalendarMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      calendarService.updateCalendar(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    }
  });

  const calendars = calendarsData?.calendars ?? [];
  const enabledCalendars = calendars.filter((c: any) => c.sync_enabled);

  if (calendarsLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">同期設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          カレンダーごとの同期設定と手動同期を管理します
        </p>
      </div>

      {/* 同期ステータス概要 */}
      {syncStatus && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">同期ステータス</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{syncStatus.enabledCalendars || 0}</div>
              <div className="text-sm text-gray-500">同期有効</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{syncStatus.totalCalendars || 0}</div>
              <div className="text-sm text-gray-500">全カレンダー</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{syncStatus.successRate ?? 100}%</div>
              <div className="text-sm text-gray-500">成功率（7日間）</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{syncStatus.errorCount || 0}</div>
              <div className="text-sm text-gray-500">エラー（7日間）</div>
            </div>
          </div>
        </div>
      )}

      {/* カレンダー同期設定 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">カレンダー同期設定</h2>
        {calendars.length === 0 ? (
          <p className="text-sm text-gray-500">カレンダーがまだ接続されていません。ダッシュボードからGoogleアカウントを連携してください。</p>
        ) : (
          <div className="space-y-3">
            {calendars.map((calendar: any) => (
              <div key={calendar.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={calendar.sync_enabled}
                    onChange={(e) =>
                      updateCalendarMutation.mutate({
                        id: calendar.id,
                        updates: { sync_enabled: e.target.checked }
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{calendar.name}</div>
                    {calendar.account_email && (
                      <div className="text-xs text-gray-500">{calendar.account_email}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={calendar.sync_direction || 'bidirectional'}
                    onChange={(e) =>
                      updateCalendarMutation.mutate({
                        id: calendar.id,
                        updates: { sync_direction: e.target.value }
                      })
                    }
                    className="text-xs border-gray-300 rounded-md"
                  >
                    <option value="bidirectional">双方向</option>
                    <option value="readonly">読み取りのみ</option>
                    <option value="writeonly">書き込みのみ</option>
                  </select>
                  <select
                    value={calendar.privacy_mode || 'detail'}
                    onChange={(e) =>
                      updateCalendarMutation.mutate({
                        id: calendar.id,
                        updates: { privacy_mode: e.target.value }
                      })
                    }
                    className="text-xs border-gray-300 rounded-md"
                  >
                    <option value="detail">詳細表示</option>
                    <option value="busy-only">予定ありのみ</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 手動同期 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">手動同期</h2>
        <p className="text-sm text-gray-500 mb-4">
          自動同期は15分間隔で実行されます。今すぐ同期する場合は以下のボタンを押してください。
        </p>
        <button
          onClick={() => manualSyncMutation.mutate()}
          disabled={manualSyncMutation.isPending || enabledCalendars.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          {manualSyncMutation.isPending ? '同期中...' : `今すぐ同期（${enabledCalendars.length}件）`}
        </button>
        {manualSyncMutation.isSuccess && (
          <p className="mt-2 text-sm text-green-600">同期が完了しました</p>
        )}
        {manualSyncMutation.isError && (
          <p className="mt-2 text-sm text-red-600">同期でエラーが発生しました</p>
        )}
      </div>

      {/* 同期履歴 */}
      {syncHistory && syncHistory.items && syncHistory.items.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">最近の同期履歴</h2>
          <div className="space-y-2">
            {syncHistory.items.map((item: any, index: number) => (
              <div key={item.id || index} className="flex items-center justify-between text-sm p-2 border-b">
                <span className="text-gray-600">
                  {new Date(item.timestamp || item.created_at).toLocaleString('ja-JP')}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  item.result === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.result === 'success' ? '成功' : 'エラー'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
