import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '../services/calendarService';
import { useState } from 'react';

export function CalendarsPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    calendarId: '',
    name: '',
    color: '#4285f4'
  });

  const { data: calendars, isLoading } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars()
  });

  const addMutation = useMutation({
    mutationFn: async (_data: { calendarId: string; name: string; color: string }) => {
      // カレンダー追加機能は現在未実装
      throw new Error('カレンダー追加機能は現在利用できません');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      setShowAddForm(false);
      setFormData({ calendarId: '', name: '', color: '#4285f4' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      calendarService.updateCalendar(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (_id: string) => {
      // カレンダー削除機能は現在未実装
      throw new Error('カレンダー削除機能は現在利用できません');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">カレンダー管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            同期するGoogleカレンダーを管理します
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          {showAddForm ? 'キャンセル' : '+ カレンダー追加'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  GoogleカレンダーID
                </label>
                <input
                  type="text"
                  required
                  value={formData.calendarId}
                  onChange={(e) =>
                    setFormData({ ...formData, calendarId: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="primary または カレンダーID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  表示名
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  色
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                追加
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {calendars?.calendars?.map((calendar: any) => (
            <li key={calendar.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: calendar.color }}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {calendar.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {calendar.googleCalendarId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={calendar.enabled}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: String(calendar.id),
                            updates: { sync_enabled: e.target.checked }
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">有効</span>
                    </label>
                    <button
                      onClick={() => deleteMutation.mutate(String(calendar.id))}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {(!calendars?.calendars || calendars.calendars.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            カレンダーが登録されていません
          </div>
        )}
      </div>
    </div>
  );
}
