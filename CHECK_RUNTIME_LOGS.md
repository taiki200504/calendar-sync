# 🔍 実行時ログの確認方法

## 📋 現在の状況

- ✅ ビルドは成功（提供されたログ）
- ❌ 500エラーが発生（実行時）

**重要**: ビルドログには実行時のエラーは含まれていません。実行時のログを確認する必要があります。

---

## 🔍 ステップ1: Vercel Function Logsを確認

### 方法A: Vercel Dashboardから確認（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクト「CalendarSync OS」を選択
3. **Deployments** タブを開く
4. 最新のデプロイメント（`00:49:44.618 Deployment completed`）をクリック
5. **Functions** タブを開く
6. `/api/index` または `/api/auth/google` をクリック
7. **View Function Logs** をクリック
8. エラーが発生した時刻のログを確認

### 方法B: Vercel CLIから確認

```bash
# 最新のログをリアルタイムで確認
vercel logs --follow

# または、特定のデプロイメントのログを確認
vercel logs [deployment-url]
```

---

## 🔍 ステップ2: ブラウザの開発者ツールで確認

1. ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
2. **F12** で開発者ツールを開く
3. **Network** タブを開く
4. 「Googleでログイン」をクリック
5. 500エラーが発生しているリクエストをクリック
6. **Response** タブでエラーメッセージを確認

エラーメッセージの例：
```json
{
  "error": "Database connection failed",
  "message": "...",
  "details": "..."
}
```

---

## 🔍 ステップ3: よくある原因をチェック

### 1. DATABASE_URLの値が正しいか確認

Vercel環境変数の値が、`.env.production`の値と一致しているか確認：

```bash
# ローカルの値
cat .env.production | grep DATABASE_URL

# Vercelの値（暗号化されているため、直接は見れませんが、設定されているか確認）
vercel env ls | grep DATABASE_URL
```

**注意**: Vercel環境変数は暗号化されているため、値そのものは見れません。設定されているかどうかのみ確認できます。

### 2. 環境変数の再デプロイが必要

環境変数を追加/更新した後、**必ず再デプロイ**が必要です。

```bash
# 再デプロイを実行
git commit --allow-empty -m "Trigger redeploy for environment variables"
git push
```

### 3. データベース接続をテスト

Supabase SQL Editorで接続をテスト：

```sql
-- 接続テスト
SELECT version();

-- テーブルの存在確認
SELECT * FROM oauth_states LIMIT 1;
```

---

## 🔧 トラブルシューティング

### エラー: "getaddrinfo ENOTFOUND"

**原因**: データベースのホスト名を解決できない

**解決方法**:
1. `DATABASE_URL`の形式が正しいか確認
2. Supabaseプロジェクトがアクティブか確認
3. 環境変数を再設定して再デプロイ

### エラー: "password authentication failed"

**原因**: データベースのパスワードが間違っている

**解決方法**:
1. Supabase Dashboardでパスワードを確認
2. `DATABASE_URL`のパスワード部分を更新
3. 再デプロイ

### エラー: "relation 'oauth_states' does not exist"

**原因**: テーブルが存在しない

**解決方法**:
1. Supabase SQL Editorでテーブルが存在するか確認
2. マイグレーションを再実行

---

## 📝 確認すべきログメッセージ

Vercel Function Logsで以下のようなエラーメッセージを探してください：

- `getaddrinfo ENOTFOUND` - DNS解決失敗
- `ETIMEDOUT` - 接続タイムアウト
- `ECONNREFUSED` - 接続拒否
- `password authentication failed` - 認証失敗
- `relation "oauth_states" does not exist` - テーブル不存在
- `ENCRYPTION_KEY` - 暗号化キー関連
- `Missing required` - 必須環境変数の欠如

---

## 🚀 次のステップ

1. **Vercel Function Logsを確認**して、具体的なエラーメッセージを取得
2. **ブラウザの開発者ツール**でエラーメッセージを確認
3. エラーメッセージに基づいて、上記の解決方法を試す
4. それでも解決しない場合は、エラーメッセージを共有してください

---

## 💡 ヒント

実行時のエラーを確認するには、**Vercel Function Logs**が最も重要です。ログには、具体的なエラーメッセージとスタックトレースが含まれています。
