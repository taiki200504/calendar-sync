# 🔐 認証の仕組み - 詳しい解説

## 📋 概要

このアプリケーションは**セッションベースの認証**を使用しています。
- **JWTトークンは使用しません**
- **セッションクッキー**で認証状態を管理
- **Redis**でセッションを永続化（Vercel Serverless Functions対応）

---

## 🔄 認証フローの全体像

```
ユーザー → ログインボタン → Google認証 → コールバック → セッション設定 → ダッシュボード
```

### ステップ1: ログイン開始

**フロントエンド** (`frontend/src/pages/Login.tsx`)
```typescript
// ユーザーが「Googleでログイン」をクリック
window.location.href = '/api/auth/google';
```

**バックエンド** (`backend/src/controllers/auth.controller.ts`)
```typescript
// 1. CSRF対策のためのstateパラメータを生成
const state = crypto.randomBytes(32).toString('hex');

// 2. セッションにstateを保存（Redisに保存される）
req.session.oauthState = state;

// 3. Google OAuth認証URLを生成
const authUrl = oauthService.getAuthUrl(state);

// 4. Googleにリダイレクト
res.redirect(authUrl);
```

**重要なポイント**:
- `state`パラメータは**CSRF攻撃を防ぐ**ためのもの
- セッションに保存されるので、後で検証できる

---

### ステップ2: Google認証

**ユーザーの操作**:
1. Googleの認証画面が表示される
2. アカウントを選択
3. 権限を承認

**Googleの処理**:
- ユーザーが認証を完了すると、以下のURLにリダイレクト：
  ```
  https://calendar-sync-os.vercel.app/api/auth/google/callback?code=認証コード&state=stateパラメータ
  ```

---

### ステップ3: コールバック処理

**バックエンド** (`backend/src/controllers/auth.controller.ts`)

```typescript
// 1. stateパラメータを検証（CSRF対策）
const sessionState = req.session.oauthState;
if (sessionState !== state) {
  return res.status(400).json({ error: 'Invalid state parameter' });
}

// 2. 認証コードからトークンを取得
const account = await oauthService.handleCallback(code);

// 3. セッションにアカウントIDを保存
req.session.accountId = account.id;

// 4. フロントエンドにリダイレクト
res.redirect(`${FRONTEND_URL}/auth/callback?success=true`);
```

**重要なポイント**:
- `state`パラメータが一致しないとエラー（セキュリティ対策）
- アカウント情報は**PostgreSQLデータベース**に保存
- Googleのアクセストークンは**暗号化**してデータベースに保存
- セッションには**アカウントIDのみ**を保存（トークンは保存しない）

---

### ステップ4: セッションクッキーの設定

**バックエンド** (`backend/src/index.ts`)

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET, // セッションを暗号化する鍵
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({ client: redisClient }), // Redisに保存
  cookie: {
    secure: true, // HTTPSのみ
    httpOnly: true, // JavaScriptからアクセス不可（XSS対策）
    sameSite: 'none', // クロスオリジン対応
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));
```

**セッションクッキー**:
- 名前: `connect.sid`
- 値: セッションID（暗号化された）
- 保存場所: **Redis**（Vercel Serverless Functions対応）

---

### ステップ5: 認証状態の確認

**フロントエンド** (`frontend/src/pages/AuthCallback.tsx`)

```typescript
// 1. セッションが確立されるまで少し待つ
await new Promise(resolve => setTimeout(resolve, 500));

// 2. /api/auth/meで認証状態を確認
const response = await api.get('/auth/me');

// 3. 認証成功ならダッシュボードに遷移
if (response.data) {
  setAuthenticated(true);
  navigate('/dashboard');
}
```

**バックエンド** (`backend/src/controllers/auth.controller.ts`)

```typescript
// セッションからアカウントIDを取得
const accountId = req.session.accountId;

if (!accountId) {
  return res.status(401).json({ error: 'Not authenticated' });
}

// データベースからアカウント情報を取得
const account = await accountModel.findById(accountId);

// アカウント情報を返す（トークンは返さない）
return res.json({
  id: account.id,
  email: account.email,
  // ...
});
```

---

## 🔑 認証情報の保存場所

### 1. セッション情報（Redis）

**保存内容**:
- `oauthState`: CSRF対策用のstateパラメータ（一時的）
- `accountId`: 認証済みユーザーのアカウントID

**保存場所**: **Redis**（Upstash）
- Vercel Serverless Functionsでは、メモリに保存するとリクエスト間で失われる
- Redisに保存することで、複数のリクエスト間でセッションを共有

### 2. アカウント情報（PostgreSQL）

**保存内容**:
- アカウントID
- メールアドレス
- Googleのアクセストークン（**暗号化**して保存）
- Googleのリフレッシュトークン（**暗号化**して保存）

**保存場所**: **PostgreSQL**（Supabase）

### 3. セッションクッキー（ブラウザ）

**保存内容**:
- セッションID（`connect.sid`）

**保存場所**: ブラウザのクッキーストレージ

---

## 🔒 セキュリティ対策

### 1. CSRF対策

**stateパラメータ**を使用：
- ログイン開始時にランダムな`state`を生成
- セッションに保存
- Google認証後に`state`を検証
- 一致しない場合はエラー

### 2. XSS対策

**httpOnlyクッキー**を使用：
- JavaScriptからアクセスできない
- XSS攻撃でクッキーを盗まれることを防止

### 3. トークンの暗号化

**Googleのアクセストークン**を暗号化して保存：
- AES-256-CBCで暗号化
- `ENCRYPTION_KEY`（32文字）を使用
- データベースに保存されるのは暗号化されたトークン

### 4. HTTPS必須

**本番環境ではHTTPS必須**：
- `secure: true`でクッキーをHTTPSのみで送信
- 通信の盗聴を防止

---

## 📝 環境変数

### 必要な環境変数

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://calendar-sync-os.vercel.app/api/auth/google/callback

# セッション管理
SESSION_SECRET=32文字以上のランダム文字列

# 暗号化
ENCRYPTION_KEY=32文字の16進数

# Redis（セッションストア）
REDIS_URL=rediss://...

# フロントエンドURL
FRONTEND_URL=https://calendar-sync-os.vercel.app
```

### 環境変数の役割

| 変数名 | 役割 |
|--------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth認証で使用するクライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth認証で使用するシークレット |
| `GOOGLE_REDIRECT_URI` | Google認証後のコールバックURL |
| `SESSION_SECRET` | セッションクッキーを暗号化する鍵 |
| `ENCRYPTION_KEY` | Googleトークンを暗号化する鍵 |
| `REDIS_URL` | セッションを保存するRedisのURL |
| `FRONTEND_URL` | フロントエンドのURL（リダイレクト先） |

---

## 🔄 認証状態の維持

### リクエストごとの認証確認

**フロントエンド** (`frontend/src/services/api.ts`)

```typescript
const api = axios.create({
  baseURL: '/api',
  withCredentials: true // セッションクッキーを自動的に送信
});
```

**重要なポイント**:
- `withCredentials: true`でセッションクッキーが自動的に送信される
- すべてのAPIリクエストで認証状態が確認される

### 保護されたルート

**フロントエンド** (`frontend/src/components/ProtectedRoute.tsx`)

```typescript
// 認証が必要なページにアクセスする前に
// /api/auth/meで認証状態を確認
const response = await api.get('/auth/me');

if (!response.data) {
  // 認証されていない場合はログインページにリダイレクト
  return <Navigate to="/" replace />;
}
```

---

## 🚨 よくある問題と解決方法

### 問題1: "Invalid state parameter"

**原因**: セッションが正しく保存されていない

**解決方法**:
- Redis接続を確認
- セッション設定を確認

### 問題2: 認証後にログイン画面に戻る

**原因**: セッションクッキーが送信されていない

**解決方法**:
- `withCredentials: true`が設定されているか確認
- CORS設定で`credentials: true`が設定されているか確認

### 問題3: セッションが失われる

**原因**: Redis接続の問題

**解決方法**:
- `REDIS_URL`を確認
- Redis接続を確認

---

## 📊 認証フローの図解

```
┌─────────┐
│ ユーザー │
└────┬────┘
     │ 1. 「Googleでログイン」をクリック
     ▼
┌─────────────────┐
│ フロントエンド   │
│ /api/auth/google│
└────┬────────────┘
     │ 2. リクエスト
     ▼
┌─────────────────┐
│ バックエンド     │
│ - state生成      │
│ - セッション保存 │
│ - Google URL生成 │
└────┬────────────┘
     │ 3. リダイレクト
     ▼
┌─────────────────┐
│ Google認証画面  │
└────┬────────────┘
     │ 4. 認証完了
     ▼
┌─────────────────┐
│ バックエンド     │
│ /callback        │
│ - state検証      │
│ - トークン取得   │
│ - アカウント保存 │
│ - セッション設定 │
└────┬────────────┘
     │ 5. リダイレクト
     ▼
┌─────────────────┐
│ フロントエンド   │
│ /auth/callback  │
│ - /api/auth/me  │
│ - 認証確認      │
└────┬────────────┘
     │ 6. ダッシュボード
     ▼
┌─────────────────┐
│ ダッシュボード   │
└─────────────────┘
```

---

## ✅ まとめ

1. **セッションベースの認証**を使用
2. **Redis**でセッションを永続化
3. **セッションクッキー**で認証状態を維持
4. **Google OAuth 2.0**で認証
5. **トークンは暗号化**してデータベースに保存
6. **CSRF対策**としてstateパラメータを使用

この仕組みにより、安全で確実な認証が実現されています。
