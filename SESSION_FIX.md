# セッション認証の問題と解決方法

## 🔴 問題

OAuth認証は成功しているが、フロントエンドでログイン画面に戻ってしまう。

ログでは以下が確認できています：
- ✅ トークン取得: 成功
- ✅ ユーザー情報取得: 成功
- ✅ アカウント作成/更新: 成功
- ✅ セッション設定: 成功

しかし、`/api/auth/me`エンドポイントでセッションが確認できない可能性があります。

---

## 🔍 原因

1. **セッションクッキーがクロスオリジンで送信されていない**
   - `sameSite`設定が不足している可能性
   - クッキーのドメイン設定の問題

2. **セッションがリダイレクト後に失われている**
   - OAuthコールバック後のリダイレクトでセッションが失われる可能性

3. **タイミングの問題**
   - セッションが設定される前に`/api/auth/me`が呼び出されている可能性

---

## ✅ 修正内容

### 1. セッション設定の改善

`backend/src/index.ts`でセッション設定を改善：

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || '...',
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid', // セッションクッキー名を明示的に設定
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // クロスオリジン対応
    domain: undefined // 開発環境ではドメインを指定しない
  }
}));
```

### 2. `/api/auth/me`エンドポイントにログを追加

セッションの状態を確認できるようにログを追加しました。

### 3. `AuthCallback.tsx`の改善

- セッション確立を待つための遅延を追加
- より詳細なエラーログを追加

---

## 🚀 動作確認

### 1. ブラウザの開発者ツールで確認

1. ブラウザで `http://localhost:5173` にアクセス
2. 開発者ツール（F12）を開く
3. 「Application」タブ → 「Cookies」→ `http://localhost:3000`
4. `connect.sid`というクッキーが設定されているか確認

### 2. ネットワークタブで確認

1. 「Network」タブを開く
2. ログインを試す
3. `/api/auth/me`リクエストを確認
4. 「Request Headers」で`Cookie`ヘッダーが送信されているか確認

### 3. ログの確認

```bash
tail -f /tmp/backend-dev.log | grep -E "auth/me|Session|accountId"
```

以下のようなログが表示されれば正常：
- `GET /api/auth/me called`
- `hasSession: true`
- `accountId: [uuid]`
- `User info returned`

---

## 🔧 トラブルシューティング

### 問題1: セッションクッキーが設定されない

**確認事項**:
- Backendサーバーが再起動されているか
- CORS設定で`credentials: true`が設定されているか
- セッション設定で`sameSite`が正しく設定されているか

### 問題2: セッションクッキーが送信されない

**確認事項**:
- Frontendの`api.ts`で`withCredentials: true`が設定されているか
- ブラウザの開発者ツールでクッキーが設定されているか
- ネットワークタブで`Cookie`ヘッダーが送信されているか

### 問題3: セッションが失われる

**確認事項**:
- リダイレクト後にセッションが保持されているか
- セッションの有効期限が切れていないか
- ブラウザの設定でクッキーがブロックされていないか

---

## 📋 確認チェックリスト

- [x] セッション設定を改善（`sameSite`を追加）
- [x] `/api/auth/me`にログを追加
- [x] `AuthCallback.tsx`のエラーハンドリングを改善
- [x] Backendサーバーを再起動
- [x] Frontendサーバーを再起動
- [ ] ブラウザでログインを試す
- [ ] セッションクッキーが設定されているか確認
- [ ] `/api/auth/me`が正常に動作するか確認
- [ ] ダッシュボードが表示されるか確認

---

## 💡 デバッグ方法

### ブラウザのコンソールで確認

```javascript
// ブラウザのコンソールで実行
fetch('http://localhost:3000/api/auth/me', {
  credentials: 'include'
}).then(r => r.json()).then(console.log).catch(console.error);
```

これで、セッションが正しく設定されているか確認できます。

---

修正が完了しました。再度ログインを試してください。ブラウザの開発者ツールでセッションクッキーとネットワークリクエストを確認してください。
