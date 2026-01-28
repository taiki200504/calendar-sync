# コードベース全体の問題分析

## 🔴 重大な問題（即座に対応が必要）

### 1. 存在しないテーブルへのアクセス: `sync_settings`と`sync_history`

**問題**: `syncModel.ts`が存在しないテーブルを使用しようとしている

**詳細**:
- マイグレーションファイル（`1769045371_initial_schema.js`）で`sync_settings`と`sync_history`テーブルが**削除**されている
- しかし、`syncModel.ts`はこれらのテーブルにクエリを実行しようとしている
- `syncWorkerService.ts`が`syncModel`を使用しているが、テーブルが存在しないため実行時にエラーが発生する

**影響を受けるファイル**:
- `backend/src/models/syncModel.ts` - すべてのメソッドが存在しないテーブルを使用
- `backend/src/services/syncWorkerService.ts` - `syncModel`を使用

**確認結果**:
- `syncController.ts`は`syncModel`を使用していない（直接`sync_log`テーブルにクエリ）
- `sync.worker.ts`は`syncService`を使用（新しい実装）
- `syncScheduler.ts`は`syncQueue`を使用（新しい実装）

**推奨対応**:
1. `syncModel.ts`と`syncWorkerService.ts`が使用されているか確認
2. 使用されていない場合は削除
3. 使用されている場合は、新しいスキーマ（`sync_log`テーブル）に移行

---

### 3. データモデルの不整合: `userId` vs `accountId`

**問題**: 古いスキーマ（`userId: number`）と新しいスキーマ（`accountId: string`）が混在

#### 影響を受けるファイル

**`backend/src/models/syncModel.ts`**
- `SyncSettings.userId: number` ← 古いスキーマ
- `SyncHistory.userId: number` ← 古いスキーマ
- すべてのメソッドが`userId: number`を使用

**`backend/src/services/syncWorkerService.ts`**
- `processSync(userId: number, ...)` ← 古いスキーマ
- `syncModel.createHistory({ userId, ... })` ← 古いスキーマ
- `syncModel.getSettings(userId)` ← 古いスキーマ

**`backend/src/controllers/account.controller.ts`**
- `const userId = (req as any).userId;` ← 古いスキーマ
- `accountModel.findByUserId(userId)` ← 古いスキーマ
- TODOコメントあり: 「認証システムを更新してaccountIdを設定するか、userIdとaccountIdの関連付けを実装」

**`backend/src/types/index.ts`**
- `SyncJobData.userId: number` ← 古いスキーマ

**問題点**:
- 新しいスキーマでは`accounts`テーブルに`user_id`カラムがない
- `sync_settings`と`sync_history`テーブルが`user_id`を使用している可能性
- 認証システムは`accountId: string`を使用しているが、同期システムは`userId: number`を使用

**推奨対応**:
1. `syncModel.ts`を`accountId: string`に移行
2. `syncWorkerService.ts`を`accountId: string`に移行
3. `account.controller.ts`を`accountId`ベースに修正
4. データベースマイグレーション: `sync_settings`と`sync_history`テーブルを`user_id`から`account_id`に変更

---

### 4. 未使用の古いモデル: `userModel.ts`

**問題**: `userModel.ts`が存在するが、使用されていない

**確認結果**:
- `grep`で`import.*userModel`を検索 → **0件**
- ファイルは存在するが、どこからもインポートされていない

**推奨対応**:
- `userModel.ts`を削除（未使用のため）

---

### 5. 型定義の不整合: `SyncJobData`

**問題**: `types/index.ts`の`SyncJobData`が古いスキーマを使用

```typescript
export interface SyncJobData {
  userId: number;  // ← 古いスキーマ
  calendarIds?: number[];
  manual?: boolean;
}
```

**推奨対応**:
- `accountId: string`に変更
- `calendarIds`を`string[]`に変更（UUIDを使用）

---

## ⚠️ 中程度の問題

### 6. `account.controller.ts`の不完全な実装

**問題**: `userId`を使用しているが、新しいスキーマでは`accountId`を使用すべき

```typescript
const userId = (req as any).userId;  // ← 型安全性なし
// TODO: 認証システムを更新してaccountIdを設定するか、userIdとaccountIdの関連付けを実装
const accounts = await accountModel.findByUserId(userId);
```

**問題点**:
- `(req as any).userId`は型安全でない
- `findByUserId`はすべてのアカウントを返す（実装が不完全）

**推奨対応**:
- `accountId`を使用するように修正
- `authenticateToken`ミドルウェアで`accountId`が設定されていることを確認

---

### 7. `syncWorkerService.ts`の未実装機能

**問題**: 同期機能が未実装のままエラーを返す

```typescript
if (settings.bidirectional) {
  throw new Error('Bidirectional sync is not yet implemented');
} else {
  throw new Error('One-way sync is not yet implemented');
}
```

**問題点**:
- すべての同期処理がエラーを返す
- このサービスが実際に使用されているか不明

**推奨対応**:
- 実装するか、使用されていない場合は削除

---

### 8. エラーハンドリングの不統一

**問題**: `catch (error: any)`が複数箇所で使用されている

**影響を受けるファイル**:
- `account.controller.ts`
- `syncController.ts`
- `syncWorkerService.ts`
- その他多数

**推奨対応**:
- `catch (error: unknown)`に統一
- 型ガードを使用

---

## 📝 軽微な問題

### 9. 型アサーションの使用

**問題**: `as`キーワードによる型アサーションが複数箇所で使用

**例**:
- `syncController.ts:79`: `(countResult.rows[0] as { total: string })`
- `syncController.ts:206`: `(r: any)`
- `syncModel.ts:35`: `result.rows[0] as SyncSettings`

**推奨対応**:
- 型ガードを使用して型安全性を向上

---

### 10. `console.log`の残存

**問題**: 一部のファイルで`console.log`が使用されている

**影響を受けるファイル**:
- `account.controller.ts`
- `syncController.ts`
- `syncWorkerService.ts`

**推奨対応**:
- `logger`に置き換え

---

## 🔍 確認が必要な箇所

### 11. データベーススキーマの確認

**確認が必要**:
- `sync_settings`テーブルが`user_id`カラムを使用しているか
- `sync_history`テーブルが`user_id`カラムを使用しているか
- マイグレーションファイルで`user_id`が定義されているか

**推奨対応**:
- マイグレーションファイルを確認
- 必要に応じて`user_id`から`account_id`へのマイグレーションを作成

---

## 📊 重複ファイル（PROJECT_STATUS.mdより）

### バックエンド

- ⚠️ `controllers/authController.ts` - 存在しない（既に削除済み？）
- ⚠️ `services/calendarService.ts` - 存在しない（既に削除済み？）
- ⚠️ `services/syncService.ts` - 存在しない（既に削除済み？）
- ⚠️ `models/canonicalEventModel.ts` - 存在しない（既に削除済み？）
- ⚠️ `models/eventLinkModel.ts` - 存在しない（既に削除済み？）

### フロントエンド

- ✅ `services/calendarService.ts` - 存在（フロントエンド用、問題なし）
- ✅ `services/syncService.ts` - 存在（フロントエンド用、問題なし）

---

## 🎯 優先度別の対応計画

### [高] 即座に対応すべき項目

1. **`syncModel.ts`と`syncWorkerService.ts`の削除または修正**
   - 存在しないテーブル（`sync_settings`、`sync_history`）を使用している
   - 使用されていない場合は削除
   - 推定工数: 1-2時間

2. **`syncModel.ts`と`syncWorkerService.ts`を`accountId`ベースに移行**（使用されている場合）
   - 推定工数: 8-12時間
   - 影響: 同期機能が正常に動作しない可能性

3. **`account.controller.ts`を`accountId`ベースに修正**
   - 推定工数: 2-4時間
   - 影響: アカウント一覧が正しく動作しない可能性

4. **`userModel.ts`を削除**
   - 推定工数: 5分
   - 影響: なし（未使用）

5. **`types/index.ts`の`SyncJobData`を修正**
   - 推定工数: 30分
   - 影響: 型の不整合

### [中] 短期（1-2週間）で対応すべき項目

6. **エラーハンドリングの統一**
   - 推定工数: 4-6時間

7. **`console.log`を`logger`に置き換え**
   - 推定工数: 2-3時間

8. **型アサーションの改善**
   - 推定工数: 4-6時間

### [低] 中期（1-2ヶ月）で対応すべき項目

9. **`syncWorkerService.ts`の実装または削除**（使用されている場合）
   - 推定工数: 未定（実装する場合）

---

## 📋 チェックリスト

- [ ] `syncModel.ts`と`syncWorkerService.ts`が使用されているか確認
- [ ] 使用されていない場合は削除
- [ ] 使用されている場合は、新しいスキーマ（`sync_log`）に移行
- [ ] `account.controller.ts`を`accountId`ベースに修正
- [ ] `types/index.ts`の`SyncJobData`を修正
- [ ] `userModel.ts`を削除
- [ ] エラーハンドリングを統一
- [ ] `console.log`を`logger`に置き換え
