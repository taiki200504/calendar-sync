import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService, CalendarEvent } from '../services/calendarService';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, parseISO, differenceInMinutes, startOfDay, addHours } from 'date-fns';
import { ja } from 'date-fns/locale';

// 時間帯の設定
const START_HOUR = 6;
const END_HOUR = 24;
const HOUR_HEIGHT = 60; // 1時間あたりのピクセル高さ

interface EventFormData {
  title: string;
  start_at: string;
  end_at: string;
  location: string;
  description: string;
}

interface EventModalState {
  mode: 'create' | 'edit' | 'view';
  event?: CalendarEvent;
  defaultDate?: Date;
  defaultHour?: number;
}

export function CalendarView() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [modal, setModal] = useState<EventModalState | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    start_at: '',
    end_at: '',
    location: '',
    description: '',
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // 現在時刻を更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 初回マウント時に現在時刻にスクロール
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const offsetMinutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
      const scrollTarget = Math.max(0, (offsetMinutes / 60) * HOUR_HEIGHT - 200);
      scrollRef.current.scrollTop = scrollTarget;
    }
  }, []);

  // 週の開始日と終了日を計算
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // イベントを取得（表示週の前後を含む）
  const timeMin = subWeeks(weekStart, 1).toISOString();
  const timeMax = addWeeks(weekEnd, 2).toISOString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['allEvents', timeMin, timeMax],
    queryFn: () => calendarService.getAllEvents(timeMin, timeMax),
    refetchInterval: 60000,
  });

  // カレンダー一覧を取得（イベント作成用にカレンダーIDが必要）
  const { data: calendarsData } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars(),
  });

  const writableCalendars = useMemo(() => {
    const cals = calendarsData?.calendars || [];
    return cals.filter((c: any) => c.sync_enabled && c.sync_direction !== 'readonly');
  }, [calendarsData]);

  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');

  // デフォルトカレンダーを設定
  useEffect(() => {
    if (writableCalendars.length > 0 && !selectedCalendarId) {
      setSelectedCalendarId(writableCalendars[0].id);
    }
  }, [writableCalendars, selectedCalendarId]);

  const events = data?.events || [];

  // イベント作成
  const createMutation = useMutation({
    mutationFn: (data: { calendarId: string; event: EventFormData }) =>
      calendarService.createEvent(data.calendarId, data.event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEvents'] });
      setModal(null);
    },
  });

  // イベント更新
  const updateMutation = useMutation({
    mutationFn: (data: { calendarId: string; eventId: string; updates: Partial<EventFormData> }) =>
      calendarService.updateEvent(data.calendarId, data.eventId, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEvents'] });
      setModal(null);
    },
  });

  // イベント削除
  const deleteMutation = useMutation({
    mutationFn: (data: { calendarId: string; eventId: string }) =>
      calendarService.deleteEvent(data.calendarId, data.eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEvents'] });
      setModal(null);
    },
  });

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
    const duration = Math.max(30, differenceInMinutes(end, start));

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

  // 時間グリッドのクリックでイベント作成
  const handleTimeSlotClick = useCallback((day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (writableCalendars.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromStart = (y / HOUR_HEIGHT) * 60;
    const hour = Math.floor(minutesFromStart / 60) + START_HOUR;
    const minutes = Math.floor(minutesFromStart / 30) * 30 - (Math.floor(minutesFromStart / 60) * 60);

    const startDate = new Date(day);
    startDate.setHours(hour, minutes < 0 ? 0 : minutes, 0, 0);
    const endDate = addHours(startDate, 1);

    const toLocalISO = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setFormData({
      title: '',
      start_at: toLocalISO(startDate),
      end_at: toLocalISO(endDate),
      location: '',
      description: '',
    });
    setModal({ mode: 'create', defaultDate: day, defaultHour: hour });
  }, [writableCalendars]);

  // イベントクリックで詳細/編集表示
  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const toLocalISO = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setFormData({
      title: event.title,
      start_at: toLocalISO(parseISO(event.start)),
      end_at: toLocalISO(parseISO(event.end)),
      location: event.location || '',
      description: event.description || '',
    });
    if (event.calendarId) {
      setSelectedCalendarId(event.calendarId);
    }
    setModal({ mode: 'view', event });
  }, []);

  // フォーム送信
  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (modal?.mode === 'create') {
      const calId = selectedCalendarId || writableCalendars[0]?.id;
      if (!calId) return;
      createMutation.mutate({
        calendarId: calId,
        event: {
          ...formData,
          start_at: new Date(formData.start_at).toISOString(),
          end_at: new Date(formData.end_at).toISOString(),
        },
      });
    } else if (modal?.mode === 'edit' && modal.event) {
      const calId = modal.event.calendarId;
      if (!calId || !modal.event.id) return;
      updateMutation.mutate({
        calendarId: calId,
        eventId: modal.event.id,
        updates: {
          title: formData.title,
          start_at: new Date(formData.start_at).toISOString(),
          end_at: new Date(formData.end_at).toISOString(),
          location: formData.location,
          description: formData.description,
        },
      });
    }
  };

  // イベント削除
  const handleDelete = () => {
    if (!modal?.event?.calendarId || !modal.event.id) return;
    if (!confirm('このイベントを削除しますか？')) return;
    deleteMutation.mutate({
      calendarId: modal.event.calendarId,
      eventId: modal.event.id,
    });
  };

  // 時間ラベル配列
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
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
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className="block px-1.5 py-0.5 text-[11px] rounded truncate text-white font-medium hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ backgroundColor: event.calendarColor || '#4285f4' }}
                        title={event.title}
                      >
                        {event.title}
                      </div>
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
        <div ref={scrollRef} className="flex overflow-y-auto relative" style={{ height: '700px' }}>
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
                className={`flex-1 border-l border-gray-100 relative ${isCurrentDay ? 'bg-blue-50/20' : ''} cursor-crosshair`}
                onClick={(e) => {
                  // クリック位置から対象要素がイベントでない場合のみ
                  if ((e.target as HTMLElement).closest('[data-event]')) return;
                  handleTimeSlotClick(day, e);
                }}
              >
                {/* 時間グリッド線 */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-gray-100"
                    style={{ height: HOUR_HEIGHT }}
                  >
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
                    <div
                      key={`${event.id}-${idx}`}
                      data-event="true"
                      onClick={(e) => handleEventClick(event, e)}
                      className="absolute left-0.5 right-0.5 rounded-md overflow-hidden cursor-pointer hover:brightness-90 transition-all shadow-sm border-l-2"
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
                        {height > 48 && event.calendarName && (
                          <div className="text-[9px] text-gray-400 truncate">
                            {event.calendarName}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* イベントがない場合 */}
      {events.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 font-medium">イベントがありません</p>
            <p className="text-sm text-gray-400 mt-1">同期ONのカレンダーのイベントが表示されます</p>
          </div>
        </div>
      )}

      {/* イベントモーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modal.mode === 'create' ? '新しいイベント' : modal.mode === 'edit' ? 'イベントを編集' : 'イベント詳細'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* モーダル本体 */}
            <div className="px-5 py-4 space-y-4">
              {/* 表示モード */}
              {modal.mode === 'view' && modal.event && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: modal.event.calendarColor || '#4285f4' }}></div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{modal.event.title}</h4>
                      <p className="text-sm text-gray-500">{modal.event.calendarName}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {modal.event.allDay
                        ? format(parseISO(modal.event.start), 'yyyy/MM/dd (E)', { locale: ja }) + ' - 終日'
                        : `${format(parseISO(modal.event.start), 'yyyy/MM/dd (E) HH:mm', { locale: ja })} - ${format(parseISO(modal.event.end), 'HH:mm', { locale: ja })}`
                      }
                    </div>
                    {modal.event.location && (
                      <div className="flex items-center gap-2 mt-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {modal.event.location}
                      </div>
                    )}
                    {modal.event.description && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                        {modal.event.description}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 作成/編集モード */}
              {(modal.mode === 'create' || modal.mode === 'edit') && (
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="タイトルを追加"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full text-lg font-medium border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 pb-2 outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">開始</label>
                      <input
                        type="datetime-local"
                        value={formData.start_at}
                        onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">終了</label>
                      <input
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {modal.mode === 'create' && writableCalendars.length > 1 && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">カレンダー</label>
                      <select
                        value={selectedCalendarId}
                        onChange={(e) => setSelectedCalendarId(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {writableCalendars.map((cal: any) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.name} ({cal.account_email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <input
                      type="text"
                      placeholder="場所を追加"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="説明を追加"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* モーダルフッター */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
              {modal.mode === 'view' && modal.event ? (
                <>
                  <div className="flex gap-2">
                    {modal.event.htmlLink && (
                      <a
                        href={modal.event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 hover:text-gray-800 underline"
                      >
                        Google Calendarで開く
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {modal.event.calendarId && (
                      <>
                        <button
                          onClick={handleDelete}
                          disabled={isMutating}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          削除
                        </button>
                        <button
                          onClick={() => setModal({ ...modal, mode: 'edit' })}
                          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          編集
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModal(null)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isMutating || !formData.title.trim()}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isMutating ? '保存中...' : modal.mode === 'create' ? '作成' : '保存'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
