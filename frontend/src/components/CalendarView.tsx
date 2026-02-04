import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarService, CalendarEvent } from '../services/calendarService';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');

  // 週の開始日と終了日を計算
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 月曜始まり
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // イベントを取得（2週間分）
  const timeMin = subWeeks(weekStart, 1).toISOString();
  const timeMax = addWeeks(weekEnd, 1).toISOString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['allEvents', timeMin, timeMax],
    queryFn: () => calendarService.getAllEvents(timeMin, timeMax),
    refetchInterval: 60000, // 1分ごとに更新
  });

  const events = data?.events || [];

  // イベントを日付ごとにグループ化
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const dateKey = format(parseISO(event.start), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    // 各日付内で時間順にソート
    Object.values(grouped).forEach(dayEvents => {
      dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });
    return grouped;
  }, [events]);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) return '終日';
    return format(parseISO(event.start), 'HH:mm');
  };

  const getEventColor = (event: CalendarEvent) => {
    // カレンダーの色があれば使用、なければデフォルト
    return event.calendarColor || '#4285f4';
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">イベントを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">イベントの取得に失敗しました</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">カレンダー</h2>
          <span className="text-sm text-gray-500">
            {format(weekStart, 'M月d日', { locale: ja })} - {format(weekEnd, 'M月d日', { locale: ja })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md"
          >
            今日
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="ml-2 border-l border-gray-200 pl-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm rounded-md ${viewMode === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              週
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              リスト
            </button>
          </div>
        </div>
      </div>

      {/* イベントがない場合 */}
      {events.length === 0 && (
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">この期間にイベントはありません</p>
          <p className="text-sm text-gray-400">同期ONのカレンダーのイベントが表示されます</p>
        </div>
      )}

      {/* 週表示 */}
      {viewMode === 'week' && events.length > 0 && (
        <div className="grid grid-cols-7 divide-x divide-gray-200">
          {daysOfWeek.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];
            const isCurrentDay = isToday(day);

            return (
              <div key={dateKey} className={`min-h-[200px] ${isCurrentDay ? 'bg-blue-50/50' : ''}`}>
                {/* 日付ヘッダー */}
                <div className={`sticky top-0 px-2 py-2 text-center border-b border-gray-100 ${isCurrentDay ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="text-xs text-gray-500">
                    {format(day, 'E', { locale: ja })}
                  </div>
                  <div className={`text-lg font-semibold ${isCurrentDay ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                {/* イベント */}
                <div className="p-1 space-y-1">
                  {dayEvents.slice(0, 5).map((event) => (
                    <a
                      key={event.id}
                      href={event.htmlLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-1.5 text-xs rounded hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: `${getEventColor(event)}20`, borderLeft: `3px solid ${getEventColor(event)}` }}
                      title={`${event.title}\n${event.calendarName || ''}`}
                    >
                      <div className="font-medium text-gray-900 truncate">{event.title}</div>
                      <div className="text-gray-500">{formatEventTime(event)}</div>
                    </a>
                  ))}
                  {dayEvents.length > 5 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{dayEvents.length - 5}件
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* リスト表示 */}
      {viewMode === 'list' && events.length > 0 && (
        <div className="divide-y divide-gray-100">
          {daysOfWeek.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];
            const isCurrentDay = isToday(day);

            if (dayEvents.length === 0) return null;

            return (
              <div key={dateKey}>
                {/* 日付ヘッダー */}
                <div className={`px-4 py-2 sticky top-0 ${isCurrentDay ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <span className={`font-medium ${isCurrentDay ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, 'M月d日(E)', { locale: ja })}
                  </span>
                  {isCurrentDay && <span className="ml-2 text-xs text-blue-600">今日</span>}
                </div>
                {/* イベントリスト */}
                <ul className="divide-y divide-gray-50">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <a
                        href={event.htmlLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-1 h-12 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getEventColor(event) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>{formatEventTime(event)}</span>
                            {event.calendarName && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="truncate">{event.calendarName}</span>
                              </>
                            )}
                          </div>
                          {event.location && (
                            <div className="text-sm text-gray-400 truncate mt-1">
                              📍 {event.location}
                            </div>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
