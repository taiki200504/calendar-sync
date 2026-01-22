# OAuth スコープの問題と解決方法

## 🔴 問題

トークンは取得できているが、Google APIへのリクエストで401エラーが発生しています。

```
Request is missing required authentication credential
```

## 🔍 原因

**OAuth認証URLにユーザー情報取得のスコープが含まれていませんでした。**

現在のスコープ:
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.events.freebusy`

**不足していたスコープ:**
- `https://www.googleapis.com/auth/userinfo.email` - メールアドレス取得
- `https://www.googleapis.com/auth/userinfo.profile` - プロフィール情報取得

## ✅ 修正内容

`getAuthUrl()`メソッドに以下のスコープを追加しました：

```typescript
const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',      // 追加
  'https://www.googleapis.com/auth/userinfo.profile',    // 追加
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.freebusy'
];
```

## 🚀 解決方法

### 1. Backendサーバーを再起動（完了済み）

修正が反映されています。

### 2. 再度ログインを試す

**重要**: 既存のトークンには新しいスコープが含まれていないため、**再度ログインする必要があります**。

1. ブラウザで `http://localhost:5173` にアクセス
2. 「Googleでログイン」をクリック
3. Googleアカウントで認証
4. **スコープの承認画面が表示される**（新しいスコープが追加されているため）
5. すべてのスコープを承認
6. ダッシュボードが表示されれば成功

### 3. Google Cloud Consoleでの確認

OAuth同意画面で、以下のスコープが追加されていることを確認してください：

- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.events.freebusy`

**確認方法**:
1. Google Cloud Console → 「APIとサービス」→「OAuth同意画面」
2. 「スコープ」セクションを確認
3. 上記のスコープがすべて含まれていることを確認

---

## ⚠️ 重要な注意事項

### 既存のトークンは無効

既にログインしている場合でも、**新しいスコープを含むトークンを取得するために、再度ログインする必要があります**。

既存のトークンには`userinfo.email`と`userinfo.profile`のスコープが含まれていないため、ユーザー情報を取得できません。

### スコープの承認

再度ログインすると、Googleの承認画面で新しいスコープの承認を求められます。すべて承認してください。

---

## 📋 確認チェックリスト

- [x] OAuth認証URLに`userinfo.email`と`userinfo.profile`スコープを追加
- [x] Backendサーバーを再起動
- [ ] ブラウザで再度ログインを試す
- [ ] スコープの承認画面が表示されることを確認
- [ ] すべてのスコープを承認
- [ ] ダッシュボードが表示されることを確認

---

## 🔧 トラブルシューティング

### 問題1: スコープの承認画面が表示されない

**原因**: 既存のセッションやトークンが残っている

**解決方法**:
1. ブラウザのキャッシュとクッキーをクリア
2. シークレット/プライベートモードで再度試す
3. Googleアカウントからアプリのアクセス権限を削除してから再度試す

### 問題2: まだ401エラーが発生する

**確認事項**:
1. Backendサーバーが再起動されているか
2. 新しいスコープで再度ログインしているか
3. トークンのスコープに`userinfo.email`が含まれているか（ログで確認）

---

修正が完了しました。**再度ログインを試してください**。新しいスコープが含まれたトークンが取得され、ユーザー情報を取得できるようになります。
