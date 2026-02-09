# プロジェクト状況レポート

生成日時: 2024年12月

## 📁 ディレクトリ構造

### Backend (`backend/src/`)

#### Controllers
✅ `controllers/account.controller.ts` - アカウントCRUD
✅ `controllers/auth.controller.ts` - OAuth認証（新）
⚠️ `controllers/authController.ts` - OAuth認証（旧、重複）
✅ `controllers/calendarController.ts` - カレンダーCRUD
✅ `controllers/conflict.controller.ts` - 競合解決
✅ `controllers/freebusy.controller.ts` - 空き時間検索
✅ `controllers/rules.controller.ts` - 除外ルール
✅ `controllers/syncController.ts` - 同期制御
✅ `controllers/webhook.controller.ts` - Webhook処理

#### Services
✅ `services/authService.ts` - 認証サービス（旧）
✅ `services/calendar.service.ts` - カレンダーサービス（新）
⚠️ `services/calendarService.ts` - カレンダーサービス（旧、重複）
✅ `services/calendarSyncService.ts` - カレンダー同期
✅ `services/conflict.service.ts` - 競合検出・解決
✅ `services/event-link.service.ts` - イベントリンク管理
✅ `services/freebusy.service.ts` - 空き時間検索
✅ `services/google-calendar.service.ts` - Google Calendar API統合
✅ `services/oauth.service.ts` - OAuth処理
✅ `services/propagation.service.ts` - イベント伝播
✅ `services/sync.service.ts` - 同期サービス（新）
⚠️ `services/syncService.ts` - 同期サービス（旧、重複）
✅ `services/syncWorkerService.ts` - ワーカーサービス
✅ `services/watch.service.ts` - Watch管理

#### Models
✅ `models/accountModel.ts` - アカウントモデル
✅ `models/calendarModel.ts` - カレンダーモデル
✅ `models/canonical-event.model.ts` - 正規化イベント（新）
⚠️ `models/canonicalEventModel.ts` - 正規化イベント（旧、重複）
✅ `models/event-link.model.ts` - イベントリンク（新）
⚠️ `models/eventLinkModel.ts` - イベントリンク（旧、重複）
✅ `models/exclusionRuleModel.ts` - 除外ルール
✅ `models/syncModel.ts` - 同期設定
✅ `models/watch.model.ts` - Watch管理

#### Workers & Queues
✅ `workers/sync.worker.ts` - 同期ワーカー（新）
⚠️ `workers/syncWorker.ts` - 同期ワーカー（旧、重複）
✅ `workers/calendarSyncWorker.ts` - カレンダー同期ワーカー
✅ `queues/sync.queue.ts` - 同期キュー（新）
⚠️ `queues/syncQueue.ts` - 同期キュー（旧、重複）
✅ `queues/calendarSyncQueue.ts` - カレンダー同期キュー

#### Jobs
✅ `jobs/syncScheduler.ts` - 同期スケジューラー
✅ `jobs/watch-renewal.job.ts` - Watch更新ジョブ

#### Middleware & Utils
✅ `middleware/auth.ts` - 認証ミドルウェア
✅ `middleware/errorHandler.ts` - エラーハンドリング
✅ `utils/database.ts` - DB接続
✅ `utils/event-hash.ts` - イベントハッシュ計算
✅ `utils/extended-properties.ts` - 拡張プロパティ管理

#### Core
✅ `index.ts` - エントリーポイント
✅ `types/index.ts` - 型定義

### Frontend (`frontend/src/`)

#### Pages
✅ `pages/Dashboard.tsx` - ダッシュボード（新）
⚠️ `pages/DashboardPage.tsx` - ダッシュボード（旧、重複）
✅ `pages/ConflictDetail.tsx` - 競合解決画面
✅ `pages/FindSlots.tsx` - 空き時間検索
✅ `pages/Login.tsx` - ログイン（新）
⚠️ `pages/LoginPage.tsx` - ログイン（旧、重複）
✅ `pages/AuthCallback.tsx` - OAuthコールバック
✅ `pages/CalendarsPage.tsx` - カレンダー一覧
✅ `pages/SyncPage.tsx` - 同期設定
✅ `pages/Rules.tsx` - ルール設定
✅ `pages/Rules/components/CalendarSettings.tsx` - カレンダー設定
✅ `pages/Rules/components/ExclusionRules.tsx` - 除外ルール
✅ `pages/components/SearchForm.tsx` - 検索フォーム
✅ `pages/components/SlotCard.tsx` - スロットカード
✅ `pages/components/SlotResults.tsx` - 検索結果

#### Components
✅ `components/Layout.tsx` - レイアウト
✅ `components/ProtectedRoute.tsx` - 認証保護ルート
✅ `components/AccountList.tsx` - アカウント一覧
✅ `components/ConflictCards.tsx` - 競合カード
✅ `components/ConflictDiff.tsx` - 競合差分表示
✅ `components/ManualMergeModal.tsx` - 手動マージモーダル
✅ `components/SyncLog.tsx` - 同期ログ
✅ `components/SyncStatus.tsx` - 同期ステータス

#### Services
✅ `services/api.ts` - APIクライアント
✅ `services/accountService.ts` - アカウントAPI
✅ `services/authService.ts` - 認証API
✅ `services/calendarService.ts` - カレンダーAPI
✅ `services/conflictService.ts` - 競合API
✅ `services/syncService.ts` - 同期API

#### Hooks & Utils
✅ `hooks/useAuth.ts` - 認証フック
✅ `hooks/useAuthStore.ts` - 認証ストア（Zustand）
✅ `utils/index.ts` - ユーティリティ

#### Core
✅ `App.tsx` - アプリケーションルート
✅ `main.tsx` - エントリーポイント
✅ `types/index.ts` - 型定義

## 📦 依存関係

### Backend (`backend/package.json`)

#### Dependencies
✅ `express` (^4.18.2) - Webフレームワーク
✅ `googleapis` (^129.0.0) - Google API
✅ `pg` (^8.11.3) - PostgreSQL
✅ `ioredis` (^5.3.2) - Redis
✅ `bullmq` (^5.3.0) - ジョブキュー
✅ `jsonwebtoken` (^9.0.2) - JWT
✅ `express-session` (^1.18.2) - セッション管理
✅ `cors` (^2.8.5) - CORS
✅ `helmet` (^7.1.0) - セキュリティ
✅ `dotenv` (^16.3.1) - 環境変数
✅ `node-pg-migrate` (^6.2.2) - マイグレーション
✅ `node-cron` (^3.0.3) - Cronジョブ
✅ `uuid` (^13.0.0) - UUID生成
✅ `zod` (^3.22.4) - バリデーション
✅ `bcrypt` (^5.1.1) - パスワードハッシュ
✅ `express-rate-limit` (^7.1.5) - レート制限

#### DevDependencies
✅ `typescript` (^5.3.3)
✅ `tsx` (^4.7.0) - TypeScript実行
✅ `@types/*` - 型定義
✅ `jest` (^29.7.0) - テストフレームワーク
✅ `ts-jest` (^29.1.1) - Jest TypeScript統合

### Frontend (`frontend/package.json`)

#### Dependencies
✅ `react` (^18.2.0)
✅ `react-dom` (^18.2.0)
✅ `react-router-dom` (^6.21.1) - ルーティング
✅ `@tanstack/react-query` (^5.17.9) - データフェッチング
✅ `axios` (^1.6.2) - HTTPクライアント
✅ `zustand` (^4.4.7) - 状態管理
✅ `date-fns` (^3.0.6) - 日付処理

#### DevDependencies
✅ `vite` (^5.0.8) - ビルドツール
✅ `typescript` (^5.3.3)
✅ `tailwindcss` (^3.4.0) - CSSフレームワーク
✅ `@types/react` (^18.2.45)
✅ `eslint` (^8.56.0) - リンター

## 🗄️ データベース

### マイグレーション
✅ `migrations/1769045371_initial_schema.js` - 初期スキーマ

### テーブル一覧（マイグレーション定義より）

1. ✅ `accounts` - アカウント情報（OAuthトークン含む）
2. ✅ `calendars` - カレンダー情報
3. ✅ `canonical_events` - 正規化イベント
4. ✅ `event_links` - イベントリンク（Canonical ↔ Google Calendar）
5. ✅ `sync_ops` - 同期操作
6. ✅ `sync_log` - 同期ログ
7. ✅ `watch_channels` - Google Calendar Watch管理

### マイグレーション確認方法

```bash
cd backend
npm run migrate:up
```

### テーブル存在確認SQL

```sql
-- すべてのテーブルを確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 各テーブルの行数を確認
SELECT 
  'accounts' as table_name, COUNT(*) as row_count FROM accounts
UNION ALL
SELECT 'calendars', COUNT(*) FROM calendars
UNION ALL
SELECT 'canonical_events', COUNT(*) FROM canonical_events
UNION ALL
SELECT 'event_links', COUNT(*) FROM event_links
UNION ALL
SELECT 'sync_ops', COUNT(*) FROM sync_ops
UNION ALL
SELECT 'sync_log', COUNT(*) FROM sync_log
UNION ALL
SELECT 'watch_channels', COUNT(*) FROM watch_channels;
```

## 🔐 環境変数

### Backend (`backend/env.example`)

✅ `DATABASE_URL` - PostgreSQL接続文字列
✅ `REDIS_URL` - Redis接続文字列
✅ `GOOGLE_CLIENT_ID` - Google OAuth Client ID
✅ `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
✅ `GOOGLE_REDIRECT_URI` - OAuthリダイレクトURI
✅ `JWT_SECRET` - JWT署名用秘密鍵
✅ `SESSION_SECRET` - セッション秘密鍵
✅ `ENCRYPTION_KEY` - 暗号化キー（32文字）
✅ `PORT` - サーバーポート（デフォルト: 3000）
✅ `NODE_ENV` - 環境（development/production）
✅ `FRONTEND_URL` - フロントエンドURL

### Frontend (`env.example`)

⚠️ フロントエンド用の`.env.example`が未確認
推奨環境変数:
- `VITE_API_URL` - バックエンドAPI URL

## 🎯 現在のフェーズ

### Phase 0: プロジェクトセットアップ ✅ 100%
- ✅ プロジェクト構造作成
- ✅ TypeScript設定
- ✅ 依存関係インストール
- ✅ 環境変数設定

### Phase 1: MVP（OAuth + FreeBusy検索） ✅ 95%
- ✅ Google OAuth 2.0実装
- ✅ アカウント管理（accountsテーブル）
- ✅ FreeBusy API統合
- ✅ 空き時間検索UI実装
- ⚠️ 一部の古いファイルが残存（重複）

### Phase 2: 片方向同期 ✅ 100%
- ✅ カレンダー同期サービス実装
- ✅ イベント取得・作成・更新
- ✅ Canonical Eventモデル
- ✅ Event Linkモデル
- ✅ 同期ワーカー実装
- ⚠️ 一部の古いファイルが残存（重複）

### Phase 3: 双方向同期 ✅ 100%
- ✅ 競合検出機能
- ✅ 競合解決UI
- ✅ イベント伝播サービス
- ✅ Watch管理（Google Calendar Push通知）
- ✅ 除外ルール機能
- ⚠️ 一部の古いファイルが残存（重複）

## ⚠️ 次に対応すべき課題

### [優先度: 高] スキーマ移行の完了
 - 旧スキーマ用の `userModel.ts` は削除済み
 - 新スキーマ（accountsテーブル）への移行は完了

### [優先度: 高] データベース
1. **マイグレーション実行確認**
   ```bash
   cd backend
   npm run migrate:up
   ```

2. **テーブル存在確認**
   - 上記SQLクエリで確認

### [優先度: 中] 環境変数
1. **フロントエンド`.env.example`作成**
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

2. **環境変数の検証**
   - 本番環境用の環境変数設定ガイド作成

### [優先度: 中] テスト
1. **ユニットテストの追加**
   - Services層のテスト
   - Models層のテスト

2. **統合テストの追加**
   - APIエンドポイントのテスト
   - 同期フローのテスト

### [優先度: 低] ドキュメント
1. **APIドキュメント**
   - OpenAPI/Swagger仕様の作成

2. **アーキテクチャドキュメント**
   - データフロー図
   - 同期アルゴリズムの説明

## 📊 実装完了度サマリー

| カテゴリ | 完了度 | 備考 |
|---------|--------|------|
| プロジェクトセットアップ | 100% | ✅ |
| OAuth認証 | 95% | 重複ファイルあり |
| FreeBusy検索 | 95% | ✅ |
| カレンダー管理 | 90% | 重複ファイルあり |
| 片方向同期 | 100% | ✅ |
| 双方向同期 | 100% | ✅ |
| 競合解決 | 95% | ✅ |
| UI実装 | 90% | 重複ページあり |
| **全体** | **95%** | **統合テスト/ドキュメントが必要** |

## 🔍 推奨アクション

1. **即座に対応**
   - マイグレーション実行確認

2. **短期対応（1週間以内）**
   - フロントエンド`.env.example`作成
   - データベーステーブル存在確認

3. **中期対応（1ヶ月以内）**
   - テストコード追加
   - APIドキュメント作成

4. **長期対応（3ヶ月以内）**
   - パフォーマンス最適化
   - エラーハンドリング強化
   - 監視・ロギング実装
