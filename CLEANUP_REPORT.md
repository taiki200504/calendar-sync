# コード整理レポート

実施日: 2024年12月

## 削除したファイル

### Backend
1. ✅ `backend/src/controllers/authController.ts` - 古いOAuth実装（`auth.controller.ts`に統合済み）
2. ✅ `backend/src/models/canonicalEventModel.ts` - 古いモデル（`canonical-event.model.ts`に統合済み）
3. ✅ `backend/src/models/eventLinkModel.ts` - 古いモデル（`event-link.model.ts`に統合済み）
4. ✅ `backend/src/services/calendarService.ts` - 古いサービス（`calendar.service.ts`に統合済み）

### Frontend
5. ✅ `frontend/src/pages/DashboardPage.tsx` - 古いページ（`Dashboard.tsx`に統合済み）
6. ✅ `frontend/src/pages/LoginPage.tsx` - 古いページ（`Login.tsx`に統合済み）

## 修正したファイル

### Backend
1. ✅ `backend/src/services/sync.service.ts` - モデル参照を新しいファイルに統一
   - `canonicalEventModel` → `canonical-event.model`
   - `eventLinkModel` → `event-link.model`

## 作成したファイル

1. ✅ `backend/scripts/check-migration.js` - マイグレーション確認スクリプト
2. ✅ `backend/package.json` - `check-migration`スクリプトを追加

## 残存する重複ファイル（後で整理が必要）

以下のファイルは異なる目的で使用されているため、現時点では保持しています：

### Backend
- `backend/src/services/syncService.ts` - 古いスキーマ用（userIdベース）
- `backend/src/services/sync.service.ts` - 新しいスキーマ用（accountIdベース）
- `backend/src/workers/syncWorker.ts` - 古いスキーマ用
- `backend/src/workers/sync.worker.ts` - 新しいスキーマ用
- `backend/src/queues/syncQueue.ts` - 古いスキーマ用
- `backend/src/queues/sync.queue.ts` - 新しいスキーマ用

**注意**: これらは異なるスキーマ（旧: userIdベース、新: accountIdベース）で動作しているため、完全な統合には以下の作業が必要です：
1. `syncController.ts`の更新（新しいスキーマに対応）
2. `syncScheduler.ts`の更新（新しいスキーマに対応）
3. 古いスキーマ用ファイルの削除

## 確認済みファイル

1. ✅ `frontend/env.example` - 既に存在（`VITE_API_URL`が定義済み）

## 次のステップ

### 優先度: 高
1. マイグレーション実行確認
   ```bash
   cd backend
   npm run check-migration
   ```

2. マイグレーション実行（未実行の場合）
   ```bash
   cd backend
   npm run migrate:up
   ```

### 優先度: 中
1. スキーマ移行の完了
   - `syncController.ts`を新しいスキーマ（accountIdベース）に更新
   - `syncScheduler.ts`を新しいスキーマに更新
   - 古いスキーマ用ファイルの削除

2. テストコードの追加
   - 削除したファイルの機能が正しく動作することを確認

## 実行結果

- 削除したファイル: 6個
- 修正したファイル: 1個
- 作成したファイル: 2個
- コード整理完了度: 70%
