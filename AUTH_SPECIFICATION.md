# 認証システム仕様書

## 📋 概要

CalendarSync OSは、**2つの認証方式**をサポートしています：

1. **従来のバックエンドOAuth認証**（推奨）
   - Google OAuth 2.0を直接実装
   - バックエンドでトークンを管理

2. **Supabase Auth統合**（オプション）
   - SupabaseのGoogle認証を使用
   - フロントエンドでSupabase Auth、バックエンドでセッション確立

---

## 🔐 認証方式1: 従来のバックエンドOAuth認証

### 認証フロー

```
1. ユーザーが「Googleでログイン」をクリック
   ↓
2. GET /api/auth/google
   - CSRF対策用のstateパラメータを生成（32バイトのランダム文字列）
   - stateをデータベース（oauth_statesテーブル）に保存
   - Google OAuth認証URLを生成してリダイレクト
   ↓
3. Google認証画面でユーザーが承認
   ↓
4. GET /api/auth/google/callback?code=xxx&state=xxx
   - stateパラメータを検証（データベースから取得して削除）
   - 認証コードからアクセストークン・リフレッシュトークンを取得
   - トークンを暗号化してデータベースに保存
   - セッションにaccountIdを保存
   - フロントエンドにリダイレクト
   ↓
5. フロントエンド: /auth/callback?success=true
   - GET /api/auth/me で認証状態を確認
   - 認証成功ならダッシュボードに遷移
```

### エンドポイント

#### `GET /api/auth/google`
- **目的**: Google OAuth認証URLを生成してリダイレクト
- **クエリパラメータ**:
  - `addAccount` (optional): `true`の場合、既存セッションを維持して新しいアカウントを追加
- **処理内容**:
  1. CSRF対策用の`state`パラメータを生成（32バイトのランダム文字列）
  2. `state`をデータベース（`oauth_states`テーブル）に保存
  3. Google OAuth認証URLを生成（スコープ含む）
  4. Google認証ページにリダイレクト

#### `GET /api/auth/google/callback`
- **目的**: OAuthコールバック処理
- **クエリパラメータ**:
  - `code`: Googleから返される認証コード
  - `state`: CSRF対策用のstateパラメータ
  - `error`: エラーが発生した場合
- **処理内容**:
  1. `state`パラメータを検証（データベースから取得して削除）
  2. 認証コードからアクセストークン・リフレッシュトークンを取得
  3. ユーザー情報を取得（メールアドレス）
  4. トークンを暗号化してデータベースに保存
  5. アカウントを作成または更新（upsert）
  6. セッションに`accountId`を保存
  7. フロントエンドにリダイレクト

#### `GET /api/auth/me`
- **目的**: 現在の認証状態を取得
- **認証**: セッション必須
- **レスポンス**:
  ```json
  {
    "id": "account-uuid",
    "email": "user@example.com",
    "provider": "google",
    "workspace_flag": false,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
  ```

#### `POST /api/auth/logout`
- **目的**: ログアウト
- **処理内容**: セッションを破棄

---

## 🔐 認証方式2: Supabase Auth統合

### 認証フロー

```
1. ユーザーが「Googleでログイン」をクリック
   ↓
2. フロントエンド: supabase.auth.signInWithOAuth()
   - SupabaseのGoogle認証を使用
   - リダイレクト先: /auth/callback
   ↓
3. Google認証画面でユーザーが承認
   ↓
4. フロントエンド: /auth/callback
   - Supabaseからaccess_tokenを取得
   - POST /api/auth/supabase-session にaccess_tokenを送信
   ↓
5. POST /api/auth/supabase-session
   - Supabase JWTを検証（SUPABASE_JWT_SECRETを使用）
   - アカウントを作成または更新
   - セッションにaccountIdを保存
   - フロントエンドに成功レスポンス
   ↓
6. フロントエンド: ダッシュボードに遷移
```

### エンドポイント

#### `POST /api/auth/supabase-session`
- **目的**: Supabase Authでサインインした後、サーバーセッションを確立
- **リクエストボディ**:
  ```json
  {
    "access_token": "supabase-jwt-token"
  }
  ```
- **処理内容**:
  1. Supabase JWTを検証（`SUPABASE_JWT_SECRET`を使用）
  2. JWTから`sub`（Supabase User ID）と`email`を取得
  3. アカウントを検索または作成
  4. セッションに`accountId`を保存
  5. 成功レスポンスを返す

---

## 🗄️ データベーススキーマ

### `accounts` テーブル

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'google',
  supabase_user_id VARCHAR(255) NULL,  -- Supabase Auth用
  oauth_access_token TEXT NULL,         -- 暗号化済み
  oauth_refresh_token TEXT NULL,        -- 暗号化済み
  oauth_expires_at TIMESTAMP NULL,
  workspace_flag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**重要**:
- `oauth_access_token`と`oauth_refresh_token`は**暗号化**して保存
- 暗号化方式: AES-256-CBC
- 暗号化キー: `ENCRYPTION_KEY`（32文字）

### `oauth_states` テーブル

```sql
CREATE TABLE oauth_states (
  state VARCHAR(64) PRIMARY KEY,
  add_account_mode BOOLEAN NOT NULL DEFAULT false,
  original_account_id UUID NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**目的**: CSRF対策用のstateパラメータを一時保存
- ワンタイム使用（使用後は削除）
- セッションクッキーに依存しない（Vercel Serverless Functions対応）

---

## 🔒 セッション管理

### セッションストア: Redis（Upstash）

**設定** (`backend/src/index.ts`):

```typescript
const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid',
  proxy: true,  // Vercel用
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS必須
    httpOnly: true,  // XSS対策
    maxAge: 24 * 60 * 60 * 1000,  // 24時間
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // クロスオリジン対応
    domain: undefined
  }
};
```

### セッションデータ構造

```typescript
interface SessionData {
  oauthState?: string;        // CSRF対策用（一時的）
  accountId?: string;         // 認証済みユーザーのアカウントID
  addAccountMode?: boolean;    // アカウント追加モード
  originalAccountId?: string;   // アカウント追加時の元のアカウントID
}
```

**保存場所**:
- **Redis**（Upstash）: セッションデータ
- **ブラウザ**: セッションクッキー（`connect.sid`）

---

## 🔐 認証ミドルウェア

### `authenticateToken` ミドルウェア

```typescript
export const authenticateToken = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const accountId = req.session.accountId;
  
  if (!accountId) {
    return next(new AuthenticationError('Not authenticated'));
  }
  
  (req as AuthRequest).accountId = accountId;
  next();
};
```

**使用方法**:
```typescript
router.get('/protected', authenticateToken, (req, res) => {
  const accountId = (req as AuthRequest).accountId;
  // accountIdを使用して処理
});
```

---

## 🔑 OAuth トークン管理

### トークンの暗号化

**暗号化方式**: AES-256-CBC

```typescript
// 暗号化
private encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// 復号化
private decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### トークンのリフレッシュ

**自動リフレッシュ機能** (`getAuthenticatedClient`):

```typescript
async getAuthenticatedClient(accountId: string): Promise<OAuth2Client> {
  const account = await accountModel.findById(accountId);
  
  // トークンが期限切れかチェック（5分のマージン）
  const needsRefresh = !expiresAt || 
    (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000);
  
  if (needsRefresh) {
    await this.refreshToken(accountId);  // 自動リフレッシュ
  }
  
  // 復号化してOAuth2Clientを返す
  return client;
}
```

**同時実行制御**:
- 同じアカウントの同時リフレッシュを防止
- `refreshTokenLocks` Mapを使用

### リフレッシュトークンの取得

**重要**: 初回認証時にリフレッシュトークンが取得できない場合があります。

**取得を確実にする設定**:
```typescript
return this.oauth2Client.generateAuthUrl({
  access_type: 'offline',  // リフレッシュトークンを取得
  scope: scopes,
  prompt: 'consent',       // 常に同意画面を表示
  state: state
});
```

**警告**: リフレッシュトークンが取得できなかった場合、ログに警告を出力します。

---

## 🛡️ セキュリティ対策

### 1. CSRF対策

**stateパラメータ**を使用:
- OAuth認証開始時にランダムな`state`を生成（32バイト）
- データベースに保存（セッションクッキーに依存しない）
- コールバック時に`state`を検証
- 使用後は削除（ワンタイム使用）

### 2. XSS対策

**httpOnlyクッキー**を使用:
- JavaScriptからアクセス不可
- XSS攻撃でクッキーを盗まれることを防止

### 3. トークンの暗号化

**Googleのアクセストークン・リフレッシュトークン**を暗号化:
- AES-256-CBCで暗号化
- `ENCRYPTION_KEY`（32文字）を使用
- データベースに保存されるのは暗号化されたトークンのみ

### 4. セッションクッキーの設定

- `secure: true`（本番環境）: HTTPS必須
- `httpOnly: true`: JavaScriptからアクセス不可
- `sameSite: 'none'`（本番環境）: クロスオリジン対応
- `maxAge: 24時間`: セッションの有効期限

---

## 📡 Google OAuth スコープ

```typescript
const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',      // メールアドレス取得
  'https://www.googleapis.com/auth/userinfo.profile',    // プロフィール情報取得
  'https://www.googleapis.com/auth/calendar.events',       // カレンダーイベント操作
  'https://www.googleapis.com/auth/calendar.events.freebusy'  // 空き時間検索
];
```

---

## 🔄 エラーハンドリング

### 401エラー時の自動再認証

**フロントエンド** (`frontend/src/services/api.ts`):

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // OAuth認証ページへリダイレクト
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      window.location.href = `${API_BASE_URL}/auth/google`;
    }
    return Promise.reject(error);
  }
);
```

### トークンリフレッシュ失敗時の処理

- リフレッシュトークンが無効または期限切れの場合、`AuthenticationError`をスロー
- フロントエンドで401エラーを検知し、自動的に再認証にリダイレクト

---

## 🔧 環境変数

### バックエンド

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google/callback

# セッション
SESSION_SECRET=your-session-secret-key

# トークン暗号化
ENCRYPTION_KEY=32-character-encryption-key

# Supabase Auth（オプション）
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Redis（セッションストア）
REDIS_URL=rediss://default:password@host:6379
```

### フロントエンド

```env
# API URL
VITE_API_URL=/api

# Supabase Auth（オプション）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 📝 アカウント追加機能

### 複数アカウントの追加

**使用方法**:
```
GET /api/auth/google?addAccount=true
```

**処理フロー**:
1. 既存のセッション（`accountId`）を保持
2. 新しいGoogleアカウントで認証
3. 新しいアカウントをデータベースに保存
4. 元のセッション（`originalAccountId`）を維持

**用途**: 複数のGoogleカレンダーを同期する場合

---

## 🚨 注意事項

### 1. リフレッシュトークンの取得

- 初回認証時にリフレッシュトークンが取得できない場合があります
- 取得できなかった場合、アクセストークン期限切れ時に再認証が必要です
- ログに警告が出力されます

### 2. Vercel Serverless Functions

- セッションはRedisに保存（メモリに保存すると失われる）
- セッション保存は明示的に`req.session.save()`を呼び出す必要があります

### 3. クロスオリジン対応

- 本番環境では`sameSite: 'none'`と`secure: true`を設定
- セッションクッキーが正しく送信されるように設定

---

## 📚 関連ドキュメント

- `AUTH_EXPLANATION.md`: 認証システムの詳細説明
- `SESSION_FIX.md`: セッション問題のトラブルシューティング
- `OAUTH_SCOPE_FIX.md`: OAuthスコープの問題と解決方法
- `TENANT_NOT_FOUND_FIX.md`: データベース接続エラーの解決方法
