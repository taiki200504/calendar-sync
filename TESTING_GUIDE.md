# テストガイド

このドキュメントでは、CalendarSync OSの各機能のテスト方法を詳しく説明します。

## 目次

1. [OAuth認証テスト](#1-oauth認証テスト)
2. [アカウント・カレンダー管理テスト](#2-アカウントカレンダー管理テスト)
3. [FreeBusy検索テスト](#3-freebusy検索テスト)
4. [同期エンジンテスト](#4-同期エンジンテスト)
5. [データベース操作テスト](#5-データベース操作テスト)
6. [Postmanコレクション](#6-postmanコレクション)

---

## 1. OAuth認証テスト

### 実装状況
✅ **実装済み**
- `backend/src/controllers/auth.controller.ts` - OAuth認証コントローラー
- `backend/src/services/oauth.service.ts` - OAuthサービス
- セッション管理による認証状態管理

### 前提条件
- バックエンドサーバーが起動している（`npm run dev`）
- `.env`ファイルに以下が設定されている:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
  - `ENCRYPTION_KEY` (32文字)
  - `SESSION_SECRET`
- Google Cloud ConsoleでOAuth同意画面とクライアントIDが設定されている

### テスト手順

#### 1.1 OAuth認証URL取得テスト

**方法1: ブラウザでテスト**
```bash
# ブラウザで以下にアクセス
http://localhost:3000/api/auth/google
```

**方法2: cURLでテスト**
```bash
curl -v -L http://localhost:3000/api/auth/google \
  -c cookies.txt \
  -b cookies.txt
```

**期待される結果**:
- HTTP 302リダイレクトが返される
- `Location`ヘッダーにGoogle OAuth認証URLが含まれる
- URLに`state`パラメータが含まれる
- セッションクッキーが設定される

**検証コマンド**:
```bash
# リダイレクト先を確認
curl -v http://localhost:3000/api/auth/google 2>&1 | grep -i "location:"

# セッションクッキーを確認
curl -v http://localhost:3000/api/auth/google 2>&1 | grep -i "set-cookie"
```

#### 1.2 OAuthコールバック処理テスト

**前提**: 上記のテストで取得した認証コードが必要

**手動テスト手順**:
1. ブラウザで `http://localhost:3000/api/auth/google` にアクセス
2. Googleアカウントでログイン
3. 権限を承認
4. リダイレクト先（`/api/auth/google/callback?code=...&state=...`）が正常に処理されることを確認

**期待される結果**:
- フロントエンド（`http://localhost:5173/auth/callback?success=true`）にリダイレクトされる
- セッションに`accountId`が保存される
- `accounts`テーブルに新しいレコードが作成される（または既存レコードが更新される）
- トークンが暗号化されて保存される

**データベース確認**:
```sql
-- accountsテーブルを確認
SELECT id, email, provider, created_at FROM accounts ORDER BY created_at DESC LIMIT 5;

-- トークンが暗号化されていることを確認（暗号化された形式で保存されている）
SELECT id, email, 
       CASE WHEN oauth_access_token IS NOT NULL THEN '暗号化済み' ELSE 'NULL' END as token_status,
       oauth_expires_at
FROM accounts;
```

#### 1.3 認証状態確認テスト

**cURLコマンド**:
```bash
# セッションクッキーを使用して認証状態を確認
curl -X GET http://localhost:3000/api/auth/me \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -v
```

**期待される結果**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "provider": "google",
  "workspace_flag": false,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### 1.4 ログアウトテスト

**cURLコマンド**:
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -v
```

**期待される結果**:
- HTTP 200 OK
- セッションが破棄される
- 再度`/api/auth/me`にアクセスすると401エラーが返される

### トラブルシューティング

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| `redirect_uri_mismatch` | Google Cloud ConsoleのリダイレクトURIと`.env`の設定が不一致 | Google Cloud Consoleで`http://localhost:3000/api/auth/google/callback`を追加 |
| `Missing required OAuth environment variables` | 環境変数が未設定 | `.env`ファイルを確認し、必要な環境変数を設定 |
| `ENCRYPTION_KEY must be exactly 32 characters` | 暗号化キーが32文字ではない | `node scripts/generate-env-keys.js`で生成 |
| `Invalid state parameter` | CSRF対策のstateパラメータが一致しない | セッションが正しく保存されているか確認 |

---

## 2. アカウント・カレンダー管理テスト

### 実装状況
✅ **実装済み**
- `backend/src/controllers/account.controller.ts` - アカウント管理
- `backend/src/controllers/calendarController.ts` - カレンダー管理
- `backend/src/models/accountModel.ts` - アカウントモデル
- `backend/src/models/calendarModel.ts` - カレンダーモデル

### 前提条件
- OAuth認証が完了している（セッションが有効）
- データベースにアカウントが存在する

### テスト手順

#### 2.1 アカウント一覧取得テスト

**cURLコマンド**:
```bash
# セッションクッキーが必要（OAuth認証後）
curl -X GET http://localhost:3000/api/accounts \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -v
```

**期待される結果**:
```json
{
  "accounts": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "provider": "google",
      "workspace_flag": false,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 2.2 カレンダー一覧取得テスト

**cURLコマンド**:
```bash
curl -X GET http://localhost:3000/api/calendars \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -v
```

**期待される結果**:
```json
{
  "calendars": [
    {
      "id": "uuid",
      "account_email": "user@example.com",
      "name": "カレンダー名",
      "sync_enabled": true,
      "privacy_mode": "detail"
    }
  ]
}
```

#### 2.3 カレンダー設定更新テスト

**cURLコマンド**:
```bash
# カレンダーIDを取得してから実行
CALENDAR_ID="your-calendar-uuid"

curl -X PATCH http://localhost:3000/api/calendars/${CALENDAR_ID} \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sync_enabled": false,
    "sync_direction": "readonly",
    "privacy_mode": "busy-only"
  }' \
  -v
```

**期待される結果**:
```json
{
  "message": "Calendar settings updated successfully",
  "calendar": {
    "id": "uuid",
    "account_id": "uuid",
    "name": "カレンダー名",
    "sync_enabled": false,
    "privacy_mode": "busy-only",
    "sync_direction": "readonly"
  }
}
```

**データベース確認**:
```sql
SELECT id, name, sync_enabled, sync_direction, privacy_mode 
FROM calendars 
WHERE id = 'your-calendar-uuid';
```

#### 2.4 カレンダー同期テスト（Google Calendar APIから取得）

**cURLコマンド**:
```bash
# アカウントIDを取得してから実行
ACCOUNT_ID="your-account-uuid"

curl -X POST http://localhost:3000/api/calendars/${ACCOUNT_ID}/sync \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -v
```

**期待される結果**:
```json
{
  "message": "Calendars synced successfully",
  "calendars": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "name": "カレンダー名",
      "sync_enabled": true,
      "privacy_mode": "detail"
    }
  ]
}
```

### トラブルシューティング

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| `401 Unauthorized` | セッションが無効 | OAuth認証を再実行 |
| `Calendar not found` | カレンダーIDが存在しない | 正しいカレンダーIDを確認 |
| `Account not found` | アカウントIDが存在しない | 正しいアカウントIDを確認 |

---

## 3. FreeBusy検索テスト

### 実装状況
✅ **実装済み**
- `backend/src/controllers/freebusy.controller.ts` - FreeBusy検索コントローラー
- `backend/src/services/freebusy.service.ts` - FreeBusy検索サービス

### 前提条件
- OAuth認証が完了している
- 複数のアカウントが登録されている
- 各アカウントにカレンダーが存在する

### テスト手順

#### 3.1 正常系テスト

**cURLコマンド**:
```bash
curl -X POST http://localhost:3000/api/freebusy/search \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "accountIds": ["account-uuid-1", "account-uuid-2"],
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-01-20T23:59:59Z",
    "duration": 60,
    "workingHours": {
      "start": 9,
      "end": 18
    },
    "buffer": 15,
    "travelTime": 30,
    "preferredDays": [1, 2, 3, 4, 5]
  }' \
  -v
```

**期待される結果**:
```json
{
  "slots": [
    {
      "start": "2024-01-15T09:00:00Z",
      "end": "2024-01-15T10:00:00Z",
      "score": 85,
      "reason": "営業時間内、希望曜日"
    },
    {
      "start": "2024-01-15T10:30:00Z",
      "end": "2024-01-15T11:30:00Z",
      "score": 80,
      "reason": "営業時間内"
    }
  ]
}
```

#### 3.2 異常系テスト

**テストケース1: accountIdsが空**
```bash
curl -X POST http://localhost:3000/api/freebusy/search \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "accountIds": [],
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-01-20T23:59:59Z",
    "duration": 60
  }' \
  -v
```

**期待される結果**: HTTP 400
```json
{
  "error": "accountIds is required and must be a non-empty array"
}
```

**テストケース2: startDate/endDateが未指定**
```bash
curl -X POST http://localhost:3000/api/freebusy/search \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "accountIds": ["account-uuid-1"],
    "duration": 60
  }' \
  -v
```

**期待される結果**: HTTP 400
```json
{
  "error": "startDate and endDate are required"
}
```

**テストケース3: durationが不正**
```bash
curl -X POST http://localhost:3000/api/freebusy/search \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "accountIds": ["account-uuid-1"],
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-01-20T23:59:59Z",
    "duration": -10
  }' \
  -v
```

**期待される結果**: HTTP 400
```json
{
  "error": "duration is required and must be a positive number"
}
```

**テストケース4: startDateがendDateより後**
```bash
curl -X POST http://localhost:3000/api/freebusy/search \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "accountIds": ["account-uuid-1"],
    "startDate": "2024-01-20T00:00:00Z",
    "endDate": "2024-01-15T23:59:59Z",
    "duration": 60
  }' \
  -v
```

**期待される結果**: HTTP 400
```json
{
  "error": "startDate must be before endDate"
}
```

### トラブルシューティング

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| `No valid calendars found` | アカウントにカレンダーが存在しない | カレンダー同期を実行 |
| `User not found` | 認証情報が無効 | OAuth認証を再実行 |
| `Failed to search free slots` | Google Calendar APIエラー | トークンの有効性を確認 |

---

## 4. 同期エンジンテスト

### 実装状況
✅ **実装済み**
- `backend/src/services/sync.service.ts` - 同期サービス
- `backend/src/services/google-calendar.service.ts` - Google Calendar API統合
- `backend/src/utils/event-hash.ts` - イベントハッシュ計算

### 前提条件
- データベースにカレンダーが存在する
- カレンダーに有効なOAuthトークンが設定されている
- Google Calendar APIが有効になっている

### テスト手順

#### 4.1 syncCalendar()関数の単体テスト

**テストスクリプト**: `backend/tests/services/sync.service.test.ts`

```typescript
import { syncService } from '../../src/services/sync.service';
import { calendarModel } from '../../src/models/calendarModel';

describe('syncCalendar', () => {
  it('should sync calendar events successfully', async () => {
    // テスト用カレンダーIDを取得
    const calendars = await calendarModel.findAll();
    const testCalendar = calendars[0];
    
    if (!testCalendar) {
      throw new Error('No calendar found for testing');
    }

    // 同期実行
    await syncService.syncCalendar(testCalendar.id);

    // カレンダーのlast_sync_cursorが更新されていることを確認
    const updated = await calendarModel.findById(testCalendar.id);
    expect(updated?.last_sync_cursor).toBeDefined();
    expect(updated?.last_sync_cursor).not.toBe(testCalendar.last_sync_cursor);
  });

  it('should skip disabled calendars', async () => {
    // sync_enabled=falseのカレンダーはスキップされることを確認
  });
});
```

**実行方法**:
```bash
cd backend
npm test -- sync.service.test.ts
```

#### 4.2 Hash計算の正確性テスト

**テストスクリプト**: `backend/tests/utils/event-hash.test.ts`

```typescript
import { computeEventHash } from '../../src/utils/event-hash';

describe('computeEventHash', () => {
  it('should generate consistent hash for same event', () => {
    const event = {
      title: 'Test Event',
      start_at: '2024-01-15T10:00:00Z',
      end_at: '2024-01-15T11:00:00Z',
      location: 'Tokyo',
      description: 'Test description'
    };

    const hash1 = computeEventHash(event);
    const hash2 = computeEventHash(event);

    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different events', () => {
    const event1 = {
      title: 'Event 1',
      start_at: '2024-01-15T10:00:00Z',
      end_at: '2024-01-15T11:00:00Z'
    };

    const event2 = {
      title: 'Event 2',
      start_at: '2024-01-15T10:00:00Z',
      end_at: '2024-01-15T11:00:00Z'
    };

    const hash1 = computeEventHash(event1);
    const hash2 = computeEventHash(event2);

    expect(hash1).not.toBe(hash2);
  });

  it('should handle null/undefined values correctly', () => {
    const event = {
      title: 'Test',
      start_at: '2024-01-15T10:00:00Z',
      end_at: '2024-01-15T11:00:00Z',
      location: null,
      description: undefined
    };

    const hash = computeEventHash(event);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });
});
```

**実行方法**:
```bash
cd backend
npm test -- event-hash.test.ts
```

#### 4.3 統合テスト（手動）

**cURLコマンド**:
```bash
# カレンダー同期を手動実行（実装されている場合）
CALENDAR_ID="your-calendar-uuid"

curl -X POST http://localhost:3000/api/sync/manual \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "calendarIds": ["'${CALENDAR_ID}'"]
  }' \
  -v
```

**データベース確認**:
```sql
-- 同期後のイベントを確認
SELECT 
  ce.id,
  ce.title,
  ce.start_at,
  ce.end_at,
  COUNT(el.id) as link_count
FROM canonical_events ce
LEFT JOIN event_links el ON el.canonical_event_id = ce.id
GROUP BY ce.id
ORDER BY ce.created_at DESC
LIMIT 10;

-- カレンダーの同期カーソルを確認
SELECT id, name, last_sync_cursor 
FROM calendars 
WHERE sync_enabled = true;
```

### トラブルシューティング

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| `Calendar not found` | カレンダーIDが存在しない | 正しいカレンダーIDを確認 |
| `Account OAuth token not found` | トークンが設定されていない | OAuth認証を再実行 |
| `Rate limit exceeded` | Google Calendar APIのレート制限 | リトライ間隔を調整 |

---

## 5. データベース操作テスト

### 実装状況
✅ **実装済み**
- 各モデル（accounts, calendars, canonical_events, event_links等）のCRUD操作

### テスト手順

#### 5.1 サンプルデータ投入スクリプト

**スクリプト**: `backend/scripts/seed-test-data.ts`

```typescript
import { db } from '../src/utils/database';
import { accountModel } from '../src/models/accountModel';
import { calendarModel } from '../src/models/calendarModel';

async function seedTestData() {
  try {
    // テスト用アカウントを作成
    const account = await accountModel.create({
      email: 'test@example.com',
      provider: 'google',
      workspace_flag: false
    });
    console.log('Created test account:', account.id);

    // テスト用カレンダーを作成
    const calendar = await calendarModel.create({
      account_id: account.id,
      gcal_calendar_id: 'test-calendar-id',
      name: 'Test Calendar',
      sync_enabled: true,
      sync_direction: 'bidirectional',
      privacy_mode: 'detail'
    });
    console.log('Created test calendar:', calendar.id);

    console.log('Test data seeded successfully');
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  }
}

seedTestData();
```

**実行方法**:
```bash
cd backend
npx tsx scripts/seed-test-data.ts
```

#### 5.2 各モデルのCRUD操作テスト

**テストスクリプト**: `backend/tests/models/accountModel.test.ts`

```typescript
import { accountModel } from '../../src/models/accountModel';

describe('AccountModel', () => {
  let testAccountId: string;

  it('should create an account', async () => {
    const account = await accountModel.create({
      email: 'test-create@example.com',
      provider: 'google'
    });
    testAccountId = account.id;
    expect(account.id).toBeDefined();
    expect(account.email).toBe('test-create@example.com');
  });

  it('should find account by id', async () => {
    const account = await accountModel.findById(testAccountId);
    expect(account).toBeDefined();
    expect(account?.email).toBe('test-create@example.com');
  });

  it('should find account by email', async () => {
    const account = await accountModel.findByEmail('test-create@example.com');
    expect(account).toBeDefined();
    expect(account?.id).toBe(testAccountId);
  });

  it('should update account', async () => {
    const updated = await accountModel.update(testAccountId, {
      workspace_flag: true
    });
    expect(updated.workspace_flag).toBe(true);
  });

  it('should delete account', async () => {
    await accountModel.delete(testAccountId);
    const deleted = await accountModel.findById(testAccountId);
    expect(deleted).toBeNull();
  });
});
```

**実行方法**:
```bash
cd backend
npm test -- accountModel.test.ts
```

### データベースクエリ例

```sql
-- アカウント一覧
SELECT id, email, provider, created_at FROM accounts;

-- カレンダー一覧（アカウント情報付き）
SELECT 
  c.id,
  c.name,
  a.email as account_email,
  c.sync_enabled,
  c.sync_direction,
  c.privacy_mode
FROM calendars c
JOIN accounts a ON c.account_id = a.id;

-- 正規化イベントとリンク数
SELECT 
  ce.id,
  ce.title,
  ce.start_at,
  ce.end_at,
  COUNT(el.id) as link_count
FROM canonical_events ce
LEFT JOIN event_links el ON el.canonical_event_id = ce.id
GROUP BY ce.id
ORDER BY ce.created_at DESC
LIMIT 20;

-- 同期ログ
SELECT 
  id,
  timestamp,
  operation,
  result,
  error
FROM sync_log
ORDER BY timestamp DESC
LIMIT 50;
```

---

## 6. Postmanコレクション

Postmanコレクションファイルを作成しました: `backend/tests/postman/CalendarSync-OS.postman_collection.json`

### インポート方法
1. Postmanを開く
2. 「Import」をクリック
3. `CalendarSync-OS.postman_collection.json`を選択
4. 環境変数を設定:
   - `base_url`: `http://localhost:3000/api`
   - `session_cookie`: OAuth認証後に取得したセッションクッキー

### 主要なリクエスト
- OAuth認証フロー
- アカウント管理
- カレンダー管理
- FreeBusy検索
- 同期操作

---

## テスト実行チェックリスト

- [ ] 環境変数が正しく設定されている
- [ ] データベースが起動している
- [ ] Redisが起動している（同期機能の場合）
- [ ] バックエンドサーバーが起動している
- [ ] Google Cloud ConsoleでOAuth設定が完了している
- [ ] テスト用アカウントが作成されている
- [ ] テスト用カレンダーが作成されている

---

## 参考リンク

- [Jest ドキュメント](https://jestjs.io/docs/getting-started)
- [Postman ドキュメント](https://learning.postman.com/docs/)
- [cURL ドキュメント](https://curl.se/docs/)
