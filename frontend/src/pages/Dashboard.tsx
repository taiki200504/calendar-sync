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
import { accountService } from '../services/accountService';

export function Dashboard() {
  const { data: calendarsData } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars(),
  });
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountService.getAccounts(),
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

  const calendars = calendarsData?.calendars ?? [];
  const accounts = accountsData ?? [];
  const showConnectBanner = calendars.length === 0 && accounts.length > 0;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">同期ダッシュボード</h1>
        <p className="mt-2 text-sm text-gray-600">
          カレンダーの同期状況を確認・管理できます
        </p>
      </div>

      {showConnectBanner && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <h3 className="font-semibold">カレンダーを表示するには</h3>
          <p className="mt-1 text-sm">
            いまのログインだけでは Google カレンダー用の連携がされていません。下のボタンか「アカウント一覧」の
            <strong>「+ アカウントを追加」</strong>から、<strong>同じ Google アカウント</strong>で連携してください。連携後、カレンダーが自動で取得され、同期も実行されます（削除は不要です）。
          </p>
          <a
            href="/api/auth/google"
            className="mt-3 inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            Googleカレンダーを連携
          </a>
        </div>
      )}

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
