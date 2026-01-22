# OAuth認証エラーの修正

## 🔴 発生していたエラー

```
Authentication error: Request is missing required authentication credential. 
Expected OAuth 2 access token, login cookie or other valid authentication credential.
```

このエラーは、Google APIのユーザー情報取得時に発生していました。

---

## 🔍 原因

`oauth2.userinfo.get()`を呼び出す際に、OAuth2Clientインスタンスにトークンが正しく設定されていない可能性がありました。

`this.oauth2Client.setCredentials(tokens)`を呼び出した後、同じインスタンスを使用してユーザー情報を取得しようとしていましたが、トークンの設定が正しく反映されていない可能性がありました。

---

## ✅ 修正内容

### `backend/src/services/oauth.service.ts`

ユーザー情報取得時に、**新しいOAuth2Clientインスタンスを作成**して、トークンを明示的に設定するように変更しました。

**修正前**:
```typescript
this.oauth2Client.setCredentials(tokens);
const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
const { data } = await oauth2.userinfo.get();
```

**修正後**:
```typescript
// 新しいOAuth2Clientインスタンスを作成してトークンを設定
const userInfoClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
);

userInfoClient.setCredentials({
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  expiry_date: tokens.expiry_date
});

const oauth2 = google.oauth2({ version: 'v2', auth: userInfoClient });
const { data } = await oauth2.userinfo.get();
```

### 追加した改善

1. **詳細なログ出力**
   - OAuthコールバック処理の各ステップでログを出力
   - エラー発生時に詳細な情報を記録

2. **エラーハンドリングの改善**
   - Google APIの認証エラーを適切に処理
   - より詳細なエラーメッセージを提供

---

## 🚀 動作確認

### 1. Backendサーバーが起動していることを確認

```bash
curl http://localhost:3000/health
```

### 2. ブラウザでログインを試す

1. ブラウザで `http://localhost:5173` にアクセス
2. 「Googleでログイン」をクリック
3. Googleアカウントで認証
4. ダッシュボードが表示されれば成功

### 3. ログを確認

```bash
# Backendログ
tail -f /tmp/backend-dev.log

# 以下のようなログが表示されれば正常:
# 🔄 Processing OAuth callback with code...
# 🔄 Exchanging authorization code for tokens...
# ✅ Access token obtained
# 🔄 Fetching user info...
# ✅ User info obtained: [email]
# ✅ Account created/updated: [accountId]
```

---

## 📋 修正完了チェックリスト

- [x] OAuthサービスの修正（新しいOAuth2Clientインスタンスを作成）
- [x] 詳細なログ出力を追加
- [x] エラーハンドリングの改善
- [x] Backendサーバーを再起動
- [ ] ブラウザでログインをテスト
- [ ] ダッシュボードが表示されることを確認

---

## 🔧 トラブルシューティング

### 問題1: まだ同じエラーが発生する

**確認事項**:
- Backendサーバーが再起動されているか
- OAuth認証情報が正しく設定されているか（`node scripts/validate-oauth.js`）
- テストユーザーが追加されているか（`OAUTH_ACCESS_DENIED_FIX.md`参照）

### 問題2: ログにエラーが表示される

**確認方法**:
```bash
tail -50 /tmp/backend-dev.log | grep -E "Error|error|Failed"
```

エラーの詳細を確認して、必要に応じて追加の修正を行います。

---

## 📚 関連ドキュメント

- `OAUTH_SETUP_GUIDE.md` - OAuth設定の詳細ガイド
- `OAUTH_ACCESS_DENIED_FIX.md` - access_deniedエラーの解決方法
- `AUTH_FIX.md` - 認証方式の修正内容

---

修正が完了しました。再度ログインを試してください！
