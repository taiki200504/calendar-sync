# 重複コード・ドキュメント分析

## 🔴 重複している箇所

### 1. バックエンド認証サービス（重要）

#### 問題: 2つの認証サービスが並行して存在

**`backend/src/services/authService.ts`** (古い実装)
- `userModel`を使用（古いスキーマ）
- トークンの暗号化なし
- 使用箇所: 7ファイル
  - `watch.service.ts`
  - `freebusy.service.ts`
  - `calendarSyncService.ts`
  - `syncWorkerService.ts`
  - `google-calendar.service.ts`
  - `calendar.service.ts`
  - `calendarSyncWorker.ts`

**`backend/src/services/oauth.service.ts`** (新しい実装)
- `accountModel`を使用（新しいスキーマ）
- トークンの暗号化あり（AES-256-CBC）
- 自動リフレッシュ機能
- 同時実行制御
- 使用箇所: 1ファイル
  - `auth.controller.ts`

**問題点**:
- 古い`authService`が多くのサービスで使用されている
- 新しい`oauthService`は認証コントローラーのみで使用
- トークンの暗号化が不統一
- データモデルが混在（`userModel` vs `accountModel`）

**推奨対応**:
1. `authService.ts`を削除または非推奨化
2. すべてのサービスを`oauthService.getAuthenticatedClient()`に移行
3. `userModel`への依存を削除

---

### 2. フロントエンド認証フック

#### 問題: 2つの認証フックが存在

**`frontend/src/hooks/useAuth.ts`** (古い実装)
- `useState`ベース
- 使用箇所: **なし**（未使用）

**`frontend/src/hooks/useAuthStore.ts`** (新しい実装)
- Zustandベース
- 使用箇所: 3ファイル
  - `AuthCallback.tsx`
  - `ProtectedRoute.tsx`
  - `Layout.tsx`

**推奨対応**:
- `useAuth.ts`を削除（未使用のため）

---

### 3. 認証関連ドキュメント

#### 重複しているドキュメント

1. **`AUTH_EXPLANATION.md`**
   - 古い実装の説明（セッションにstateを保存）
   - 現在の実装と不一致

2. **`AUTH_SPECIFICATION.md`** (新規作成)
   - 現在の実装の仕様
   - 最新の情報

3. **`AUTH_FIX.md`**
   - 過去の修正内容
   - 履歴として保持

4. **`SUPABASE_AUTH_CLARIFICATION.md`**
   - Supabase認証の説明
   - 現在も有効

5. **`OAUTH_SCOPE_FIX.md`**
   - OAuthスコープの修正履歴
   - 履歴として保持

6. **`OAUTH_ERROR_FIX.md`**
   - OAuthエラーの修正履歴
   - 履歴として保持

7. **`OAUTH_ACCESS_DENIED_FIX.md`**
   - OAuthアクセス拒否の修正履歴
   - 履歴として保持

8. **`OAUTH_SETUP_GUIDE.md`**
   - OAuth設定ガイド
   - 現在も有効

9. **`QUICK_OAUTH_SETUP.md`**
   - クイックセットアップガイド
   - 現在も有効

10. **`SUPABASE_AUTH_GOOGLE_SETUP.md`**
    - Supabase認証のセットアップ
    - 現在も有効

**推奨対応**:
- `AUTH_EXPLANATION.md`を更新または削除（現在の実装と不一致）
- `AUTH_SPECIFICATION.md`をメインの仕様書として使用
- 修正履歴ドキュメントは`docs/history/`に移動を検討

---

## 📊 重複の影響

### コードの重複

1. **認証ロジックの不統一**
   - 古い`authService`は暗号化なし
   - 新しい`oauthService`は暗号化あり
   - セキュリティリスク

2. **データモデルの混在**
   - `userModel`（古い）と`accountModel`（新しい）が並行
   - データの不整合の可能性

3. **メンテナンス性の低下**
   - 2つの実装を維持する必要
   - バグ修正が2箇所に必要

### ドキュメントの重複

1. **情報の不一致**
   - 古いドキュメントが残っている
   - 現在の実装と説明が一致しない

2. **混乱の原因**
   - どのドキュメントが最新か不明確
   - 開発者が古い情報を参照する可能性

---

## ✅ 推奨される整理作業

### 優先度: 高

1. **`authService.ts`の置き換え**
   - すべてのサービスを`oauthService.getAuthenticatedClient()`に移行
   - `authService.ts`を削除
   - `userModel`への依存を削除

2. **`useAuth.ts`の削除**
   - 未使用のため削除

3. **`AUTH_EXPLANATION.md`の更新**
   - 現在の実装に合わせて更新
   - または`AUTH_SPECIFICATION.md`への参照に変更

### 優先度: 中

4. **ドキュメントの整理**
   - 修正履歴ドキュメントを`docs/history/`に移動
   - メインの仕様書を明確化

---

## 🔍 確認が必要な箇所

### `authService`を使用しているファイル

以下のファイルで`authService.getOAuth2Client()`を使用していますが、これは**暗号化されていないトークン**を期待しています：

1. `backend/src/services/watch.service.ts`
2. `backend/src/services/freebusy.service.ts`
3. `backend/src/services/calendarSyncService.ts`
4. `backend/src/services/syncWorkerService.ts`
5. `backend/src/services/google-calendar.service.ts`
6. `backend/src/services/calendar.service.ts`
7. `backend/src/workers/calendarSyncWorker.ts`

**問題**: これらのサービスは`accountModel`から暗号化されたトークンを取得していますが、`authService.getOAuth2Client()`は暗号化されていないトークンを期待しています。

**解決策**: すべてのサービスを`oauthService.getAuthenticatedClient(accountId)`に移行する必要があります。
