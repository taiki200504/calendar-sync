# 🔧 "Invalid state parameter"エラーの根本的な修正

## 🔴 問題の根本原因

Googleからのリダイレクト時に、**セッションクッキーが送信されない**ことが原因でした。

### なぜセッションクッキーが送信されないのか？

1. **Googleが別のドメインからリダイレクト**
   - Google: `accounts.google.com`
   - アプリ: `calendar-sync-os.vercel.app`
   - ブラウザは、別のドメインからのリダイレクト時にセッションクッキーを送信しない

2. **セッションクッキーの制限**
   - `sameSite: 'none'`でも、Googleからのリダイレクト時には送信されない場合がある
   - セキュリティ上の理由で、ブラウザがクッキーをブロックする

---

## ✅ 解決策: データベースにstateを保存

セッションクッキーに依存せず、**データベースにstateを一時的に保存**する方法に変更しました。

### 実装内容

1. **`oauth_states`テーブルを作成**
   - `state`: stateパラメータ（主キー）
   - `created_at`: 作成日時
   - `expires_at`: 有効期限（10分後）
   - `add_account_mode`: アカウント追加モードかどうか
   - `original_account_id`: 既存のアカウントID（アカウント追加モード用）

2. **`oauthStateModel`を作成**
   - `create()`: stateをデータベースに保存
   - `findAndDelete()`: stateを取得して削除（ワンタイム使用）

3. **認証フローの変更**

   **以前（セッション使用）**:
   ```typescript
   req.session.oauthState = state;
   // Googleからのリダイレクト時にセッションクッキーが送信されない
   const sessionState = req.session.oauthState; // nullになる
   ```

   **現在（データベース使用）**:
   ```typescript
   await oauthStateModel.create({ state });
   // Googleからのリダイレクト時でも、stateはデータベースに保存されている
   const savedState = await oauthStateModel.findAndDelete(state); // 正常に取得できる
   ```

---

## 🔄 新しい認証フロー

### ステップ1: ログイン開始

```typescript
// 1. stateパラメータを生成
const state = crypto.randomBytes(32).toString('hex');

// 2. データベースに保存（10分間有効）
await oauthStateModel.create({
  state,
  addAccountMode: addAccount,
  originalAccountId: originalAccountId
});

// 3. Googleにリダイレクト
res.redirect(authUrl);
```

### ステップ2: Google認証

ユーザーがGoogleで認証を完了

### ステップ3: コールバック処理

```typescript
// 1. stateをデータベースから取得して削除（ワンタイム使用）
const savedState = await oauthStateModel.findAndDelete(state);

// 2. stateが存在しない場合はエラー
if (!savedState) {
  return res.status(400).json({ error: 'Invalid state parameter' });
}

// 3. 認証コードからトークンを取得
const account = await oauthService.handleCallback(code);

// 4. セッションにアカウントIDを保存
req.session.accountId = account.id;
```

---

## 🔒 セキュリティ対策

### 1. ワンタイム使用

- stateは取得時に削除される（`findAndDelete`）
- 同じstateを2回使用できない

### 2. 有効期限

- stateは10分後に自動的に期限切れ
- 期限切れのstateは削除される

### 3. CSRF対策

- stateパラメータはランダムな64文字の16進数
- データベースに保存されているstateと一致しないとエラー

---

## 📋 マイグレーションの実行

新しいテーブルを作成するために、マイグレーションを実行する必要があります：

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
./scripts/run-migration.sh up
```

または：

```bash
cd backend
npm run migrate:up
```

---

## ✅ メリット

1. **セッションクッキーに依存しない**
   - Googleからのリダイレクト時でも動作する
   - クロスオリジンリクエストでも問題ない

2. **確実な検証**
   - データベースに保存されているため、確実に検証できる
   - セッションが失われても問題ない

3. **セキュリティ**
   - ワンタイム使用（取得時に削除）
   - 有効期限（10分後）

---

## 🚀 デプロイ後の確認

1. **マイグレーションが実行されているか確認**
   ```sql
   SELECT * FROM oauth_states LIMIT 1;
   ```

2. **動作確認**
   - ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
   - 「Googleでログイン」をクリック
   - Google認証を完了
   - エラーが解消されているか確認

---

## 📝 まとめ

- ✅ **問題**: セッションクッキーがGoogleからのリダイレクト時に送信されない
- ✅ **解決策**: stateをデータベースに保存
- ✅ **メリット**: セッションに依存せず、確実に検証できる

この修正により、「Invalid state parameter」エラーが解消されるはずです。
