import { AccountList } from '../components/AccountList';
import { SyncStatus } from '../components/SyncStatus';
import { DashboardCalendarList } from '../components/DashboardCalendarList';
import { ConflictCards } from '../components/ConflictCards';
import { SyncLog } from '../components/SyncLog';

export function Dashboard() {
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

        {/* 競合予定 */}
        <ConflictCards />

        {/* 同期ログ */}
        <SyncLog />
      </div>
    </div>
  );
}
