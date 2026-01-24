# ⚠️ データベースマイグレーションが必要です

## 🔴 現在のエラー

「Invalid state parameter」エラーが発生している場合、**`oauth_states`テーブルがデータベースに存在しない**可能性が高いです。

## ✅ 解決方法

### ステップ1: マイグレーションを実行

以下のコマンドを実行して、`oauth_states`テーブルを作成してください：

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
./scripts/run-migration.sh up
```

または、直接実行：

```bash
cd backend
npm run migrate:up
```

### ステップ2: マイグレーションの確認

マイグレーションが正常に実行されたか確認：

```bash
# SupabaseのSQL Editorで実行
SELECT * FROM oauth_states LIMIT 1;
```

エラーが出ない場合は、テーブルが正常に作成されています。

### ステップ3: 再度認証を試す

1. ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
2. 「Googleでログイン」をクリック
3. Google認証を完了
4. エラーが解消されているか確認

---

## 📋 マイグレーションファイル

以下のマイグレーションファイルが実行されます：

- `backend/migrations/1769246000_add_oauth_states.js`

このマイグレーションは、`oauth_states`テーブルを作成します：
- `state`: stateパラメータ（主キー）
- `created_at`: 作成日時
- `expires_at`: 有効期限（10分後）
- `add_account_mode`: アカウント追加モードかどうか
- `original_account_id`: 既存のアカウントID（アカウント追加モード用）

---

## 🔧 トラブルシューティング

### エラー: "DATABASE_URL is not set"

環境変数が設定されていない可能性があります。

```bash
# .env.productionファイルを確認
cat .env.production | grep DATABASE_URL

# または、Vercelの環境変数を確認
vercel env ls | grep DATABASE_URL
```

### エラー: "connect EHOSTUNREACH"

データベース接続に失敗しています。以下を確認してください：

1. `DATABASE_URL`が正しく設定されているか
2. Supabaseのデータベースが稼働しているか
3. ファイアウォール設定が正しいか

---

## 📝 まとめ

- ✅ **問題**: `oauth_states`テーブルが存在しない
- ✅ **解決策**: マイグレーションを実行
- ✅ **コマンド**: `cd backend && npm run migrate:up`

マイグレーションを実行した後、再度認証を試してください。
