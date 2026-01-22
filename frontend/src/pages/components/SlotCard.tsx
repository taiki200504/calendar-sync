import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FreeSlot } from '../../types';
import { calendarService } from '../../services/calendarService';
import { Calendar } from '../../types';

interface SlotCardProps {
  slot: FreeSlot;
  onCreateEvent: (slot: FreeSlot) => void;
}

export function SlotCard({ slot, onCreateEvent }: SlotCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const queryClient = useQueryClient();

  // カレンダー一覧を取得
  const { data: calendarsData } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars(),
  });

  const calendars = calendarsData?.calendars || [];

  // イベント作成ミューテーション
  const createEventMutation = useMutation({
    mutationFn: (data: {
      calendarId: string;
      title: string;
      start_at: string;
      end_at: string;
      description?: string;
    }) => calendarService.createEvent(data.calendarId, {
      title: data.title,
      start_at: data.start_at,
      end_at: data.end_at,
      description: data.description
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      setShowModal(false);
      setEventTitle('');
      setEventDescription('');
      setSelectedCalendarId('');
      onCreateEvent(slot);
    },
  });

  const startDate = new Date(slot.start);
  const endDate = new Date(slot.end);

  const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdayNames[startDate.getDay()];
  const timeRange = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}-${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

  const handleCreateEvent = () => {
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCalendarId) {
      alert('カレンダーを選択してください');
      return;
    }

    createEventMutation.mutate({
      calendarId: selectedCalendarId,
      title: eventTitle,
      start_at: slot.start,
      end_at: slot.end,
      description: eventDescription || undefined
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {weekday}曜 {timeRange}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {startDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              スコア: {slot.score}
            </span>
          </div>
        </div>

        {/* スコア進捗バー */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${getScoreColor(slot.score)}`}
              style={{ width: `${slot.score}%` }}
            />
          </div>
        </div>

        {/* 理由 */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {slot.reason}
        </p>

        {/* 予定作成ボタン */}
        <button
          onClick={handleCreateEvent}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          この時間で予定作成
        </button>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              予定を作成
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  カレンダー <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">選択してください</option>
                  {calendars.map((cal: Calendar) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name} ({cal.account_email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="予定のタイトル"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  説明
                </label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="予定の説明（任意）"
                />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  日時: {weekday}曜 {timeRange} ({startDate.toLocaleDateString('ja-JP')})
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEventTitle('');
                    setEventDescription('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createEventMutation.isPending ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
