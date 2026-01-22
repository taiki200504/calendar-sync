import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '../../../services/calendarService';
import { Calendar } from '../../../types';
import { useState } from 'react';

export function CalendarSettings() {
  const queryClient = useQueryClient();
  const [warning, setWarning] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      calendarService.updateCalendar(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  const calendars = data?.calendars || [];

  // アカウント別にグループ化
  const calendarsByAccount = calendars.reduce((acc: Record<string, Calendar[]>, calendar: Calendar) => {
    const email = calendar.account_email || 'Unknown';
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(calendar);
    return acc;
  }, {});

  // 全カレンダーがOFFかチェック
  const allDisabled = calendars.length > 0 && calendars.every((cal: Calendar) => !cal.sync_enabled);
  if (allDisabled && !warning) {
    setWarning('すべてのカレンダーが同期OFFになっています。');
  } else if (!allDisabled && warning) {
    setWarning(null);
  }

  const handleToggle = async (calendar: Calendar, enabled: boolean) => {
    await updateMutation.mutateAsync({
      id: calendar.id,
      updates: { sync_enabled: enabled }
    });
  };

  const handleDirectionChange = async (calendar: Calendar, direction: 'bidirectional' | 'readonly' | 'writeonly') => {
    // Busy-onlyは双方向のみ適用可能
    if (calendar.privacy_mode === 'busy-only' && direction !== 'bidirectional') {
      alert('Busy-onlyモードは双方向同期のみ使用できます。');
      return;
    }
    await updateMutation.mutateAsync({
      id: calendar.id,
      updates: { sync_direction: direction }
    });
  };

  const handlePrivacyChange = async (calendar: Calendar, privacy: 'detail' | 'busy-only') => {
    // Busy-onlyは双方向のみ適用可能
    if (privacy === 'busy-only' && calendar.sync_direction !== 'bidirectional') {
      alert('Busy-onlyモードは双方向同期のみ使用できます。同期方向を「双方向」に変更してください。');
      return;
    }
    await updateMutation.mutateAsync({
      id: calendar.id,
      updates: { privacy_mode: privacy }
    });
  };

  return (
    <div className="space-y-6">
      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{warning}</p>
            </div>
          </div>
        </div>
      )}

      {Object.entries(calendarsByAccount).map(([email, accountCalendars]) => (
        <div key={email} className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">{email}</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            {accountCalendars.map((calendar: Calendar) => (
              <div
                key={calendar.id}
                className="border border-gray-200 rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">
                      {calendar.name || '無題のカレンダー'}
                    </h3>
                    {calendar.role && (
                      <p className="text-sm text-gray-500">権限: {calendar.role}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 text-sm text-gray-700">同期ON/OFF</span>
                    <button
                      onClick={() => handleToggle(calendar, !calendar.sync_enabled)}
                      className={`${
                        calendar.sync_enabled
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          calendar.sync_enabled ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                </div>

                {calendar.sync_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 同期方向 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        同期方向
                      </label>
                      <select
                        value={calendar.sync_direction}
                        onChange={(e) =>
                          handleDirectionChange(
                            calendar,
                            e.target.value as 'bidirectional' | 'readonly' | 'writeonly'
                          )
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="bidirectional">双方向</option>
                        <option value="readonly">読み取りのみ</option>
                        <option value="writeonly">書き込みのみ</option>
                      </select>
                    </div>

                    {/* プライバシーモード */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        プライバシーモード
                      </label>
                      <select
                        value={calendar.privacy_mode}
                        onChange={(e) =>
                          handlePrivacyChange(
                            calendar,
                            e.target.value as 'detail' | 'busy-only'
                          )
                        }
                        disabled={calendar.sync_direction !== 'bidirectional'}
                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          calendar.sync_direction !== 'bidirectional'
                            ? 'bg-gray-100 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <option value="detail">詳細</option>
                        <option value="busy-only">Busy-only</option>
                      </select>
                      {calendar.sync_direction !== 'bidirectional' && (
                        <p className="mt-1 text-xs text-gray-500">
                          Busy-onlyは双方向同期のみ使用可能
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {calendars.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">カレンダーが登録されていません</p>
        </div>
      )}
    </div>
  );
}
