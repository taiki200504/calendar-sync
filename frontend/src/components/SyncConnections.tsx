import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '../services/calendarService';
import { syncConnectionsService, SyncConnection } from '../services/syncConnectionsService';
import { Calendar } from '../types';
import { useState } from 'react';

export function SyncConnections() {
  const queryClient = useQueryClient();
  const [calendarA, setCalendarA] = useState<string>('');
  const [calendarB, setCalendarB] = useState<string>('');

  const { data: calendarsData } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars(),
  });
  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ['syncConnections'],
    queryFn: () => syncConnectionsService.getConnections(),
  });

  const createMutation = useMutation({
    mutationFn: ({ a, b }: { a: string; b: string }) =>
      syncConnectionsService.createConnection(a, b),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncConnections'] });
      setCalendarA('');
      setCalendarB('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => syncConnectionsService.deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncConnections'] });
    },
  });

  const calendars = (calendarsData?.calendars || []).filter(
    (c: Calendar) => c.sync_enabled
  ) as Calendar[];
  const connections = connectionsData?.connections || [];

  const handleConnect = () => {
    if (!calendarA || !calendarB || calendarA === calendarB) {
      alert('異なる2つのカレンダーを選択してください');
      return;
    }
    createMutation.mutate({ a: calendarA, b: calendarB });
  };

  const calendarLabel = (c: Calendar) =>
    `${c.account_email ?? ''} / ${c.name || '無題'}`;

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-4 text-gray-500">同期接続を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">同期接続</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          相互同期するカレンダーを2つ選んで接続します（接続したペア間でのみイベントが同期されます）
        </p>
      </div>
      <div className="px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">カレンダー A</span>
            <select
              value={calendarA}
              onChange={(e) => setCalendarA(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[200px]"
            >
              <option value="">選択</option>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {calendarLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <span className="text-gray-400 self-center">↔</span>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">カレンダー B</span>
            <select
              value={calendarB}
              onChange={(e) => setCalendarB(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[200px]"
            >
              <option value="">選択</option>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {calendarLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleConnect}
            disabled={createMutation.isPending || !calendarA || !calendarB || calendarA === calendarB}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? '接続中...' : '接続する'}
          </button>
        </div>
        {calendars.length === 0 && (
          <p className="text-sm text-gray-500">
            同期ONのカレンダーがありません。上でカレンダーを有効にしてから接続してください。
          </p>
        )}

        {connections.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">接続中のペア</h3>
            <ul className="space-y-2">
              {connections.map((conn: SyncConnection) => (
                <li
                  key={conn.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50"
                >
                  <span className="text-sm text-gray-800">
                    {conn.calendar_1_name} ({conn.calendar_1_email}) ↔ {conn.calendar_2_name} (
                    {conn.calendar_2_email})
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(conn.id)}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
