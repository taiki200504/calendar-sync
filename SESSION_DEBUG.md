# セッション問題のデバッグ

## 🔴 現在のエラー

"Invalid state parameter"エラーが発生しています。

## 🔍 考えられる原因

### 1. セッションが保存されていない

Vercel Serverless Functionsでは、リダイレクトの前に明示的にセッションを保存する必要があります。

**修正済み**: `req.session.save()`を追加しました。

### 2. セッションクッキーが送信されていない

**確認項目**:
- `withCredentials: true`が設定されているか（フロントエンド）
- CORS設定で`credentials: true`が設定されているか（バックエンド）
- セッションクッキーの設定が正しいか

### 3. Redis接続の問題

**確認方法**:
```bash
# Vercelのログで確認
vercel logs [デプロイメントURL]

# ログに以下が表示されるか確認
# - "Redis Client Connected"
# - "Session store: Redis"
```

### 4. セッションクッキーの設定

**確認項目**:
- `sameSite: 'none'`（クロスオリジン対応）
- `secure: true`（HTTPS必須）
- `httpOnly: true`（XSS対策）

---

## 🛠️ デバッグ方法

### 1. セッション保存のログを確認

`/api/auth/google`エンドポイントで、セッション保存のログを確認：

```typescript
logger.info('Session saved', { state, sessionId: req.sessionID });
```

### 2. セッション読み取りのログを確認

`/api/auth/google/callback`エンドポイントで、セッション読み取りのログを確認：

```typescript
logger.info('Session state retrieved', { 
  sessionState, 
  receivedState: state,
  sessionId: req.sessionID 
});
```

### 3. ブラウザの開発者ツールで確認

1. **Application**タブ → **Cookies**
   - `connect.sid`クッキーが存在するか
   - ドメインが正しいか
   - `Secure`と`HttpOnly`が設定されているか

2. **Network**タブ
   - `/api/auth/google`リクエストで`Set-Cookie`ヘッダーが返されているか
   - `/api/auth/google/callback`リクエストで`Cookie`ヘッダーが送信されているか

---

## 🔧 追加の修正が必要な可能性

### セッション読み取り時のログ追加

`/api/auth/google/callback`で、セッションの状態を詳しくログ出力：

```typescript
logger.info('Session state check', {
  hasSession: !!req.session,
  sessionId: req.sessionID,
  oauthState: req.session.oauthState,
  receivedState: state,
  match: req.session.oauthState === state
});
```

これにより、セッションが正しく保存・読み取られているか確認できます。
