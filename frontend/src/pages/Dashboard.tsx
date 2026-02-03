import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountList } from '../components/AccountList';
import { SyncStatus } from '../components/SyncStatus';
import { DashboardCalendarList } from '../components/DashboardCalendarList';
import { SyncConnections } from '../components/SyncConnections';
import { SyncLog } from '../components/SyncLog';
import { calendarService } from '../services/calendarService';
import { syncService } from '../services/syncService';
import { accountService, Account } from '../services/accountService';
import { toast } from '../components/Toast';

type SetupStep = 'account' | 'calendars' | 'connections' | 'done';

export function Dashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'calendars' | 'connections' | 'logs'>('overview');

  const { data: calendarsData, isLoading: calendarsLoading } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarService.getCalendars(),
  });
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountService.getAccounts(),
  });
  const hasAutoTriggered = useRef(false);

  // 同期トリガー
  const syncMutation = useMutation({
    mutationFn: () => syncService.triggerSync(),
    onSuccess: (data: { calendarsSynced?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
      toast.success(`同期が完了しました（${data?.calendarsSynced || 0}件）`);
    },
    onError: (error: Error) => {
      toast.error(`同期に失敗しました: ${error.message}`);
    },
  });

  useEffect(() => {
    if (hasAutoTriggered.current) return;
    const calendars = calendarsData?.calendars ?? [];
    const enabled = calendars.filter((c: { sync_enabled?: boolean }) => c.sync_enabled);
    if (enabled.length === 0) return;
    hasAutoTriggered.current = true;
    syncService.triggerSync().catch(() => {});
  }, [calendarsData?.calendars]);

  const calendars = calendarsData?.calendars ?? [];
  const accounts: Account[] = accountsData ?? [];
  const enabledCalendars = calendars.filter((c: { sync_enabled?: boolean }) => c.sync_enabled);

  // セットアップステップの判定
  const getSetupStep = (): SetupStep => {
    if (accounts.length === 0) return 'account';
    if (calendars.length === 0) return 'calendars';
    if (enabledCalendars.length === 0) return 'connections';
    return 'done';
  };
  const setupStep = getSetupStep();

  const isLoading = calendarsLoading || accountsLoading;

  // 初期セットアップ中の表示
  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // セットアップが完了していない場合のウィザード表示
  if (setupStep !== 'done') {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ようこそ！</h1>
          <p className="mt-2 text-gray-600">
            カレンダー同期を始めるためのセットアップを行いましょう
          </p>
        </div>

        {/* セットアップステップインジケーター */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl">
            {[
              { key: 'account', label: 'アカウント連携', num: 1 },
              { key: 'calendars', label: 'カレンダー取得', num: 2 },
              { key: 'connections', label: '同期設定', num: 3 },
            ].map((step, idx) => {
              const isActive = setupStep === step.key;
              const isComplete =
                (step.key === 'account' && accounts.length > 0) ||
                (step.key === 'calendars' && calendars.length > 0) ||
                (step.key === 'connections' && enabledCalendars.length > 0);
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isComplete ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'bg-blue-500 border-blue-500 text-white' :
                    'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {isComplete ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step.num}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                  {idx < 2 && (
                    <div className={`w-12 h-0.5 mx-4 ${isComplete ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* セットアップ内容 */}
        {setupStep === 'account' && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Googleアカウントを連携</h2>
              <p className="mt-2 text-gray-600">
                カレンダーを同期するGoogleアカウントを連携してください
              </p>
            </div>
            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-medium">Googleアカウントを連携</span>
            </a>
            <p className="mt-4 text-xs text-center text-gray-500">
              カレンダーの読み取り・書き込み権限が必要です
            </p>
          </div>
        )}

        {setupStep === 'calendars' && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">カレンダーを取得中...</h2>
              <p className="mt-2 text-gray-600">
                Googleカレンダーの一覧を取得しています。しばらくお待ちください。
              </p>
            </div>
            <div className="flex justify-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
            <p className="mt-4 text-sm text-center text-gray-500">
              取得に失敗した場合は、再度ログインしてください
            </p>
          </div>
        )}

        {setupStep === 'connections' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">カレンダーを有効化</h2>
                <p className="mt-2 text-gray-600">
                  同期したいカレンダーをONにしてください
                </p>
              </div>
            </div>
            <DashboardCalendarList />
            {enabledCalendars.length > 0 && (
              <div className="text-center">
                <button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {syncMutation.isPending ? '同期中...' : '同期を開始する'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 通常のダッシュボード表示
  return (
    <div className="px-4 py-6 sm:px-0">
      {/* ヘッダー */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-600">
            {accounts.length}アカウント・{enabledCalendars.length}カレンダーを同期中
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {syncMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                同期中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                今すぐ同期
              </>
            )}
          </button>
          <a
            href="/api/auth/google"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            アカウント追加
          </a>
        </div>
      </div>

      {/* 同期ステータス */}
      <SyncStatus />

      {/* タブナビゲーション */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { key: 'overview', label: '概要' },
            { key: 'calendars', label: 'カレンダー' },
            { key: 'connections', label: '同期接続' },
            { key: 'logs', label: 'ログ' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="mt-6 space-y-6">
        {activeTab === 'overview' && (
          <>
            <AccountList />
            <DashboardCalendarList />
          </>
        )}
        {activeTab === 'calendars' && <DashboardCalendarList />}
        {activeTab === 'connections' && <SyncConnections />}
        {activeTab === 'logs' && <SyncLog />}
      </div>
    </div>
  );
}
