import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService, Account } from '../services/accountService';
import { calendarService } from '../services/calendarService';
import { syncService } from '../services/syncService';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export function AccountList() {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => accountService.getAccounts(),
  });

  /** 指定アカウントのカレンダーを Google から取得（アカウントごと） */
  const syncCalendarsMutation = useMutation({
    mutationFn: (accountId: string) => calendarService.syncCalendarsForAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  /** 全アカウントのイベント同期をトリガー */
  const syncMutation = useMutation({
    mutationFn: () => syncService.triggerSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });

  const handleSyncCalendars = (accountId: string) => {
    syncCalendarsMutation.mutate(accountId);
  };

  const handleSyncAll = () => {
    if (window.confirm('全カレンダーのイベント同期を実行しますか？')) {
      syncMutation.mutate();
    }
  };

  const handleDelete = (id: string, email: string) => {
    if (window.confirm(`アカウント「${email}」を削除しますか？`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">読み込み中...</div>;
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500 text-center">アカウントが登録されていません</p>
      </div>
    );
  }

  const handleAddAccount = () => {
    // 既にログインしている状態で新しいアカウントを追加
    window.location.href = '/api/auth/google?addAccount=true';
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">アカウント一覧</h2>
        <button
          onClick={handleAddAccount}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          + アカウントを追加
        </button>
      </div>
      <ul className="divide-y divide-gray-200">
        {accounts.map((account) => (
          <li key={account.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {account.email.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{account.email}</p>
                  <p className="text-xs text-gray-500">
                    {account.last_synced_at
                      ? `${formatDistanceToNow(new Date(account.last_synced_at), {
                          addSuffix: true,
                          locale: ja,
                        })}に同期`
                      : '未同期'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSyncCalendars(account.id)}
                  disabled={syncCalendarsMutation.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Google からカレンダー一覧を取得"
                >
                  {syncCalendarsMutation.isPending ? '取得中...' : 'カレンダーを取得'}
                </button>
                <button
                  onClick={handleSyncAll}
                  disabled={syncMutation.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="全カレンダーのイベントを同期"
                >
                  {syncMutation.isPending ? '同期中...' : '今すぐ同期'}
                </button>
                <button
                  onClick={() => handleDelete(account.id, account.email)}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  削除
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
