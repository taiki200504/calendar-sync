import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccountList } from '../components/AccountList';
import { SyncStatus } from '../components/SyncStatus';
import { DashboardCalendarList } from '../components/DashboardCalendarList';
import { SyncConnections } from '../components/SyncConnections';
import { ConflictCards } from '../components/ConflictCards';
import { SyncLog } from '../components/SyncLog';
import { calendarService } from '../services/calendarService';
import { syncService } from '../services/syncService';

export function Dashboard() {
  const { data: calendarsData } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars(),
  });
  const hasAutoTriggered = useRef(false);

  useEffect(() => {
    if (hasAutoTriggered.current) return;
    const calendars = calendarsData?.calendars ?? [];
    const enabled = calendars.filter((c: { sync_enabled?: boolean }) => c.sync_enabled);
    if (enabled.length === 0) return;
    hasAutoTriggered.current = true;
    syncService.triggerSync().catch(() => {});
  }, [calendarsData?.calendars]);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">同期ダッシュボード</h1>
        <p className="mt-2 text-sm text-gray-600">
          カレンダーの同期状況を確認・管理できます
        </p>
      </div>

      <div className="space-y-6">
        {/* 同期ステータス */}
        <SyncStatus />

        {/* アカウント一覧 */}
        <AccountList />

        {/* カレンダー一覧（複数アカウント・複数カレンダー、Notion風） */}
        <DashboardCalendarList />

        {/* 同期接続（カレンダー単位で相互同期するペアを設定） */}
        <SyncConnections />

        {/* 競合予定 */}
        <ConflictCards />

        {/* 同期ログ */}
        <SyncLog />
      </div>
    </div>
  );
}
