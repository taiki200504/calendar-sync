# 認証エラーの修正

## 🔴 発生していたエラー

```
Authentication error: Request is missing required authentication credential. 
Expected OAuth 2 access token, login cookie or other valid authentication credential.
```

## 🔍 原因

Backendは**セッションベースの認証**を使用していますが、Frontendは**JWTトークン（Bearer token）**を使用しようとしていました。

- **Backend**: `req.session.accountId`でセッションを確認
- **Frontend**: `localStorage`からトークンを取得して`Authorization: Bearer`ヘッダーを送信

この不一致により、認証が失敗していました。

---

## ✅ 修正内容

### 1. `frontend/src/services/api.ts`

- `withCredentials: true`を追加して、セッションクッキーを自動的に送信
- JWTトークン関連のインターセプターを削除

```typescript
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // セッション認証のためにクッキーを送信
});
```

### 2. `frontend/src/pages/AuthCallback.tsx`

- セッションベースの認証に対応
- エラーハンドリングを改善

### 3. `frontend/src/hooks/useAuth.ts`

- `localStorage`からトークンを取得する処理を削除
- `credentials: 'include'`を使用してセッションクッキーを送信

### 4. `frontend/src/services/authService.ts`

- トークン関連の処理を削除
- セッションベースの認証に統一

---

## 🚀 動作確認

### 1. Frontendサーバーを再起動

```bash
# Frontendプロセスを停止
pkill -f "vite"

# Frontendを再起動
cd "/Users/taikimishima/Developer/CalendarSync OS/frontend"
npm run dev
```

### 2. ブラウザでテスト

1. ブラウザで `http://localhost:5173` にアクセス
2. 「Googleでログイン」をクリック
3. Googleアカウントで認証
4. ダッシュボードが表示されれば成功

### 3. 開発者ツールで確認

ブラウザの開発者ツール（F12）で以下を確認：

- **Application** → **Cookies** → `http://localhost:3000`
  - `connect.sid`というセッションクッキーが設定されていることを確認

- **Network**タブ
  - `/api/auth/me`リクエストで`Cookie`ヘッダーが送信されていることを確認

---

## 📋 認証フロー

### セッションベース認証の流れ

1. **ログイン開始**
   - ユーザーが「Googleでログイン」をクリック
   - Frontend: `window.location.href = '/api/auth/google'`
   - Backend: Google OAuth認証URLにリダイレクト

2. **OAuth認証**
   - ユーザーがGoogleアカウントで認証
   - Googleが`/api/auth/google/callback`にリダイレクト

3. **セッション設定**
   - Backend: OAuth認証コードからトークンを取得
   - Backend: アカウント情報をDBに保存
   - Backend: `req.session.accountId`を設定
   - Backend: セッションクッキーを送信

4. **認証確認**
   - Frontend: `/api/auth/me`を呼び出し
   - Backend: `req.session.accountId`を確認
   - Backend: アカウント情報を返す
   - Frontend: ダッシュボードに遷移

---

## ⚠️ 注意事項

### CORS設定

BackendのCORS設定で`credentials: true`が設定されていることを確認：

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true // 重要！
}));
```

### セッション設定

Backendのセッション設定を確認：

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || '...',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

---

## 🔧 トラブルシューティング

### 問題1: セッションクッキーが送信されない

**確認事項**:
- `withCredentials: true`が設定されているか
- CORS設定で`credentials: true`が設定されているか
- ブラウザの開発者ツールでクッキーが設定されているか

### 問題2: 401エラーが続く

**確認事項**:
- Backendサーバーが起動しているか
- セッションが正しく設定されているか（`req.session.accountId`が存在するか）
- セッションクッキーの有効期限が切れていないか

### 問題3: ログアウト後もセッションが残る

**確認事項**:
- `/api/auth/logout`エンドポイントが正しく呼び出されているか
- セッションが破棄されているか

---

## ✅ 修正完了チェックリスト

- [x] `api.ts`に`withCredentials: true`を追加
- [x] JWTトークン関連の処理を削除
- [x] `AuthCallback.tsx`をセッションベース認証に対応
- [x] `useAuth.ts`をセッションベース認証に対応
- [x] `authService.ts`をセッションベース認証に対応
- [ ] Frontendサーバーを再起動
- [ ] ブラウザでログインをテスト
- [ ] セッションクッキーが設定されていることを確認

---

## 📚 関連ドキュメント

- `OAUTH_SETUP_GUIDE.md` - OAuth設定の詳細ガイド
- `OAUTH_ACCESS_DENIED_FIX.md` - access_deniedエラーの解決方法

---

修正が完了したら、Frontendサーバーを再起動して、再度ログインを試してください！
