import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncService } from '../services/syncService';
import { calendarService } from '../services/calendarService';
import { useState } from 'react';

export function SyncPage() {
  const queryClient = useQueryClient();
  const [selectedCalendars, setSelectedCalendars] = useState<number[]>([]);

  const { data: syncSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['sync-settings'],
    queryFn: () => syncService.getSyncSettings()
  });

  const { data: calendars, isLoading: calendarsLoading } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars()
  });

  const updateMutation = useMutation({
    mutationFn: (settings: any) => syncService.updateSyncSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-settings'] });
    }
  });

  const manualSyncMutation = useMutation({
    mutationFn: (calendarIds?: number[]) =>
      syncService.triggerManualSync(calendarIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      alert('同期ジョブをキューに追加しました');
    }
  });

  const handleSyncNow = () => {
    const calendarIds =
      selectedCalendars.length > 0 ? selectedCalendars : undefined;
    manualSyncMutation.mutate(calendarIds);
  };

  if (settingsLoading || calendarsLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">同期設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          カレンダーの同期間隔と動作を設定します
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          自動同期設定
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              同期間隔（分）
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              value={syncSettings?.syncInterval || 15}
              onChange={(e) =>
                updateMutation.mutate({
                  syncInterval: parseInt(e.target.value)
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={syncSettings?.bidirectional || false}
                onChange={(e) =>
                  updateMutation.mutate({ bidirectional: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                双方向同期を有効にする
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              競合解決方法
            </label>
            <select
              value={syncSettings?.conflictResolution || 'newer'}
              onChange={(e) =>
                updateMutation.mutate({
                  conflictResolution: e.target.value
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="source">ソース優先</option>
              <option value="target">ターゲット優先</option>
              <option value="newer">新しい方優先</option>
              <option value="manual">手動解決</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          手動同期
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              同期するカレンダー（未選択の場合はすべて）
            </label>
            <div className="space-y-2">
              {calendars?.calendars
                ?.filter((c: any) => c.sync_enabled)
                .map((calendar: any) => (
                  <label key={calendar.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCalendars.includes(calendar.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCalendars([
                            ...selectedCalendars,
                            calendar.id
                          ]);
                        } else {
                          setSelectedCalendars(
                            selectedCalendars.filter((id) => id !== calendar.id)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {calendar.name}
                    </span>
                  </label>
                ))}
            </div>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={manualSyncMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {manualSyncMutation.isPending ? '同期中...' : '今すぐ同期'}
          </button>
        </div>
      </div>
    </div>
  );
}
