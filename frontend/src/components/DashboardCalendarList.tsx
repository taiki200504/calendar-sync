import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '../services/calendarService';
import { Calendar } from '../types';
import { useState } from 'react';

export function DashboardCalendarList() {
  const queryClient = useQueryClient();
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { sync_enabled?: boolean } }) =>
      calendarService.updateCalendar(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-4 text-gray-500">カレンダーを読み込み中...</div>
      </div>
    );
  }

  const calendars = data?.calendars || [];

  const calendarsByAccount = calendars.reduce(
    (acc: Record<string, Calendar[]>, calendar: Calendar) => {
      const email = calendar.account_email ?? 'Unknown';
      if (!acc[email]) acc[email] = [];
      acc[email].push(calendar);
      return acc;
    },
    {}
  );

  const toggleAccount = (email: string) => {
    setExpandedAccounts((prev) => ({ ...prev, [email]: !prev[email] }));
  };

  const handleToggleSync = (calendar: Calendar, enabled: boolean) => {
    updateMutation.mutate({ id: calendar.id, updates: { sync_enabled: enabled } });
  };

  if (calendars.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">カレンダー一覧</h2>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500 mb-2">まだカレンダーがありません</p>
          <p className="text-sm text-gray-400">
            アカウントを追加すると自動でカレンダーが取得されます。既存アカウントは
            <span className="font-medium text-gray-600">カレンダーを再取得</span>
            で更新できます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">カレンダー一覧</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          複数アカウント・複数カレンダーを一覧で管理（同期ON/OFFで表示対象を切り替え）
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {Object.entries(calendarsByAccount).map(([email, accountCalendars]) => {
          const isExpanded = expandedAccounts[email] !== false;
          const enabledCount = accountCalendars.filter((c) => c.sync_enabled).length;
          return (
            <div key={email}>
              <button
                type="button"
                onClick={() => toggleAccount(email)}
                className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      isExpanded ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="font-medium text-gray-900">{email}</span>
                  <span className="text-xs text-gray-500">
                    {enabledCount}/{accountCalendars.length} 同期ON
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExpanded && (
                <ul className="px-6 pb-4 pt-0 space-y-1 bg-gray-50/50">
                  {accountCalendars.map((calendar) => (
                    <li
                      key={calendar.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-white/80"
                    >
                      <span className="text-sm text-gray-800 truncate flex-1 mr-3">
                        {calendar.name || '無題のカレンダー'}
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                        <span className="text-xs text-gray-500">同期</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={calendar.sync_enabled}
                          onClick={() => handleToggleSync(calendar, !calendar.sync_enabled)}
                          disabled={updateMutation.isPending}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            calendar.sync_enabled ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition ${
                              calendar.sync_enabled ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
