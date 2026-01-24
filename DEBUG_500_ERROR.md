# 🔍 500エラーのデバッグ手順

## 🔴 現在の状況

- ✅ マイグレーションは成功（ローカル）
- ✅ `DATABASE_URL`環境変数は設定されている（Vercel）
- ✅ ビルドは成功
- ❌ 500エラーが発生

---

## 🔍 ステップ1: Vercelログを確認

### 方法A: Vercel CLIから確認（推奨）

```bash
# 最新のログをリアルタイムで確認
vercel logs --follow

# または、最新のデプロイメントのログを確認
vercel logs [deployment-url]
```

### 方法B: Vercel Dashboardから確認

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Deployments** タブを開く
4. 最新のデプロイメントをクリック
5. **Functions** タブを開く
6. `/api/index` をクリック
7. **View Function Logs** をクリック

---

## 🔍 ステップ2: ブラウザの開発者ツールで確認

1. ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
2. **F12** で開発者ツールを開く
3. **Network** タブを開く
4. エラーが発生しているリクエストをクリック
5. **Response** タブでエラーメッセージを確認

---

## 🔍 ステップ3: よくある原因と解決方法

### 原因1: DATABASE_URLの値が間違っている

**確認方法**:
```bash
# Vercel環境変数の値を確認（暗号化されているため、直接は見れません）
vercel env ls

# または、Vercel Dashboardで確認
```

**解決方法**:
1. Supabase Dashboardで正しいデータベースURLを取得
2. Vercel環境変数を更新
3. 再デプロイ

### 原因2: データベース接続タイムアウト

**確認方法**: Vercelログで `ETIMEDOUT` や `ECONNREFUSED` エラーを確認

**解決方法**:
1. Supabaseプロジェクトがアクティブか確認
2. ファイアウォール設定を確認
3. データベースURLの形式を確認

### 原因3: テーブルが存在しない

**確認方法**: Vercelログで `relation "oauth_states" does not exist` エラーを確認

**解決方法**:
1. Supabase SQL Editorでテーブルが存在するか確認
2. マイグレーションを再実行

### 原因4: 環境変数の再デプロイが必要

**確認方法**: 環境変数を最近追加/更新したが、再デプロイしていない

**解決方法**:
```bash
# 再デプロイを実行
git commit --allow-empty -m "Trigger redeploy"
git push
```

---

## 🔧 トラブルシューティング

### 1. データベース接続をテスト

Supabase SQL Editorで接続をテスト：

```sql
-- 接続テスト
SELECT version();

-- テーブルの存在確認
SELECT * FROM oauth_states LIMIT 1;
```

### 2. 環境変数の値を確認

`.env.production`ファイルの値と、Vercel環境変数の値が一致しているか確認：

```bash
# ローカルの値
cat .env.production | grep DATABASE_URL

# Vercelの値（暗号化されているため、直接は見れません）
vercel env ls | grep DATABASE_URL
```

### 3. ネットワーク接続を確認

VercelからSupabaseへの接続が可能か確認：

1. Supabase Dashboard → **Settings** → **Database**
2. **Connection pooling** が有効か確認
3. **Network restrictions** が設定されていないか確認

---

## 📝 ログから確認すべきエラーメッセージ

以下のようなエラーメッセージを探してください：

- `getaddrinfo ENOTFOUND` - DNS解決失敗
- `ETIMEDOUT` - 接続タイムアウト
- `ECONNREFUSED` - 接続拒否
- `password authentication failed` - 認証失敗
- `relation "oauth_states" does not exist` - テーブル不存在
- `ENCRYPTION_KEY` - 暗号化キー関連
- `Missing required` - 必須環境変数の欠如

---

## 🚀 次のステップ

1. **Vercelログを確認**して、具体的なエラーメッセージを取得
2. エラーメッセージに基づいて、上記の解決方法を試す
3. それでも解決しない場合は、エラーメッセージを共有してください

---

## 💡 ヒント

500エラーの原因を特定するには、**Vercelログが最も重要**です。ログには、具体的なエラーメッセージとスタックトレースが含まれています。
