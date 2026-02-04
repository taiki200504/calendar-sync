import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarService, CalendarEvent } from '../services/calendarService';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, parseISO, differenceInMinutes, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

// 時間帯の設定
const START_HOUR = 6;
const END_HOUR = 24;
const HOUR_HEIGHT = 60; // 1時間あたりのピクセル高さ

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // 現在時刻を更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 週の開始日と終了日を計算
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 月曜始まり
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // イベントを取得（前後2週間分）
  const timeMin = subWeeks(weekStart, 1).toISOString();
  const timeMax = addWeeks(weekEnd, 2).toISOString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['allEvents', timeMin, timeMax],
    queryFn: () => calendarService.getAllEvents(timeMin, timeMax),
    refetchInterval: 60000,
  });

  const events = data?.events || [];

  // イベントを日付ごとにグループ化
  const { allDayEventsByDate, timedEventsByDate } = useMemo(() => {
    const allDay: Record<string, CalendarEvent[]> = {};
    const timed: Record<string, CalendarEvent[]> = {};

    events.forEach(event => {
      const startDate = parseISO(event.start);
      const dateKey = format(startDate, 'yyyy-MM-dd');

      if (event.allDay) {
        if (!allDay[dateKey]) allDay[dateKey] = [];
        allDay[dateKey].push(event);
      } else {
        if (!timed[dateKey]) timed[dateKey] = [];
        timed[dateKey].push(event);
      }
    });

    // 時間順にソート
    Object.values(timed).forEach(dayEvents => {
      dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });

    return { allDayEventsByDate: allDay, timedEventsByDate: timed };
  }, [events]);

  // 週ナビゲーション
  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // イベントの位置とサイズを計算
  const getEventStyle = (event: CalendarEvent) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    const dayStart = startOfDay(start);
    dayStart.setHours(START_HOUR, 0, 0, 0);

    const startMinutes = differenceInMinutes(start, dayStart);
    const duration = Math.max(30, differenceInMinutes(end, start)); // 最低30分表示

    const top = Math.max(0, (startMinutes / 60) * HOUR_HEIGHT);
    const height = Math.max(24, (duration / 60) * HOUR_HEIGHT - 2);

    return { top, height };
  };

  // 現在時刻インジケーターの位置
  const getCurrentTimePosition = () => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = (hours - START_HOUR) * 60 + minutes;
    return Math.max(0, (totalMinutes / 60) * HOUR_HEIGHT);
  };

  // 時間ラベル配列
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">カレンダーを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">カレンダーの取得に失敗しました</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              {format(currentDate, 'yyyy年 M月', { locale: ja })}
            </h2>
            <span className="text-sm text-gray-500">
              {format(weekStart, 'M/d', { locale: ja })} - {format(weekEnd, 'M/d', { locale: ja })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="前の週"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              今日
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="次の週"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className="flex flex-col">
        {/* 日付ヘッダー */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
          <div className="w-14 flex-shrink-0"></div>
          {daysOfWeek.map((day) => {
            const isCurrentDay = isToday(day);
            const dayOfWeek = format(day, 'E', { locale: ja });
            const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 text-center py-2 border-l border-gray-100 ${isCurrentDay ? 'bg-blue-50' : ''}`}
              >
                <div className={`text-xs font-medium ${isWeekend ? 'text-red-500' : 'text-gray-500'}`}>
                  {dayOfWeek}
                </div>
                <div className={`text-lg font-semibold mt-0.5 ${
                  isCurrentDay
                    ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                    : isWeekend ? 'text-red-500' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* 終日イベント */}
        {Object.keys(allDayEventsByDate).some(key =>
          daysOfWeek.some(day => format(day, 'yyyy-MM-dd') === key)
        ) && (
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <div className="w-14 flex-shrink-0 text-[10px] text-gray-400 text-right pr-2 pt-1">
              終日
            </div>
            {daysOfWeek.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAllDayEvents = allDayEventsByDate[dateKey] || [];

              return (
                <div key={dateKey} className="flex-1 border-l border-gray-100 p-0.5 min-h-[32px]">
                  <div className="space-y-0.5">
                    {dayAllDayEvents.slice(0, 3).map((event) => (
                      <a
                        key={event.id}
                        href={event.htmlLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-1.5 py-0.5 text-[11px] rounded truncate text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: event.calendarColor || '#4285f4' }}
                        title={event.title}
                      >
                        {event.title}
                      </a>
                    ))}
                    {dayAllDayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500 px-1">
                        +{dayAllDayEvents.length - 3}件
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 時間グリッド */}
        <div className="flex overflow-y-auto relative" style={{ height: '700px' }}>
          {/* 時間ラベル列 */}
          <div className="w-14 flex-shrink-0 relative">
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2.5 right-2 text-[11px] text-gray-400 font-medium">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* 各日のカラム */}
          {daysOfWeek.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTimedEvents = timedEventsByDate[dateKey] || [];
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                className={`flex-1 border-l border-gray-100 relative ${isCurrentDay ? 'bg-blue-50/20' : ''}`}
              >
                {/* 時間グリッド線 */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-gray-100"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    {/* 30分の点線 */}
                    <div className="border-b border-dashed border-gray-50" style={{ height: HOUR_HEIGHT / 2 }}></div>
                  </div>
                ))}

                {/* 現在時刻インジケーター */}
                {isCurrentDay && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: getCurrentTimePosition() }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                      <div className="flex-1 h-0.5 bg-red-500"></div>
                    </div>
                  </div>
                )}

                {/* イベント */}
                {dayTimedEvents.map((event, idx) => {
                  const { top, height } = getEventStyle(event);
                  const startTime = format(parseISO(event.start), 'HH:mm');

                  return (
                    <a
                      key={`${event.id}-${idx}`}
                      href={event.htmlLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute left-0.5 right-0.5 rounded-md overflow-hidden cursor-pointer hover:brightness-95 transition-all shadow-sm border-l-2"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: `${event.calendarColor || '#4285f4'}20`,
                        borderLeftColor: event.calendarColor || '#4285f4',
                      }}
                      title={`${event.title}\n${startTime} - ${format(parseISO(event.end), 'HH:mm')}\n${event.calendarName || ''}`}
                    >
                      <div className="p-1 h-full overflow-hidden">
                        <div
                          className="text-[11px] font-semibold truncate"
                          style={{ color: event.calendarColor || '#4285f4' }}
                        >
                          {event.title}
                        </div>
                        {height > 32 && (
                          <div className="text-[10px] text-gray-600 truncate">
                            {startTime}
                          </div>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* イベントがない場合のメッセージ */}
      {events.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 font-medium">イベントがありません</p>
            <p className="text-sm text-gray-400 mt-1">同期ONのカレンダーのイベントが表示されます</p>
          </div>
        </div>
      )}
    </div>
  );
}
