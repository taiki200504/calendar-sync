# 🔍 Supabaseプロジェクト設定の確認

## 📋 現在の設定

### プロジェクト情報

- **Project Ref**: `tthmjkltvrwlxtqanydk`
- **Database Host**: `db.tthmjkltvrwlxtqanydk.supabase.co`
- **Database Port**: `5432`
- **Database Name**: `postgres`
- **Database User**: `postgres`

### 接続文字列（`.env.production`）

```
DATABASE_URL=postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
```

---

## ✅ 確認項目

### 1. プロジェクトRefの確認

**現在の設定**: `tthmjkltvrwlxtqanydk`

**確認方法**:
1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **Settings** → **General** を開く
4. **Reference ID** を確認

**期待値**: `tthmjkltvrwlxtqanydk`

---

### 2. データベースパスワードの確認

**現在の設定**: `KFQa5GhThOkOeYkk`

**確認方法**:
1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** を開く
4. **Database password** を確認

**注意**: パスワードが一致しない場合：
1. **Reset database password** をクリック
2. 新しいパスワードを設定
3. `.env.production`とVercel環境変数の両方を更新

---

### 3. データベース接続のテスト

**確認方法**:

#### 方法A: Supabase SQL Editorから確認

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **SQL Editor** を開く
4. 以下のSQLを実行：

```sql
-- 接続テスト
SELECT version();

-- テーブルの存在確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- oauth_statesテーブルの確認
SELECT * FROM oauth_states LIMIT 1;
```

#### 方法B: ローカルから接続テスト

```bash
# .env.productionから環境変数を読み込む
export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)

# マイグレーションを実行して接続をテスト
cd backend
npm run migrate:up
```

---

### 4. Vercel環境変数の確認

**確認方法**:

```bash
# Vercel環境変数が設定されているか確認
vercel env ls | grep DATABASE_URL
```

**期待される出力**:
```
DATABASE_URL Encrypted Production, Preview, Development
```

**設定されていない場合**:
1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables** を開く
4. `DATABASE_URL`を追加（値は`.env.production`と同じ）
5. 再デプロイ

---

## 🔧 よくある問題と解決方法

### 問題1: プロジェクトRefが一致しない

**症状**: データベース接続エラー

**解決方法**:
1. Supabase Dashboardで正しいProject Refを確認
2. `.env.production`の`DATABASE_URL`を更新
3. Vercel環境変数も更新
4. 再デプロイ

### 問題2: パスワードが一致しない

**症状**: `password authentication failed`

**解決方法**:
1. Supabase Dashboardでパスワードを確認
2. パスワードをリセット（必要に応じて）
3. `.env.production`とVercel環境変数の両方を更新
4. 再デプロイ

### 問題3: プロジェクトが無効化されている

**症状**: `getaddrinfo ENOTFOUND`

**解決方法**:
1. Supabase Dashboardでプロジェクトがアクティブか確認
2. プロジェクトが一時停止されている場合は、再開
3. プロジェクトが削除されている場合は、新規作成

---

## 📝 チェックリスト

- [ ] プロジェクトRefが正しい（`tthmjkltvrwlxtqanydk`）
- [ ] データベースパスワードが正しい
- [ ] データベース接続が成功する
- [ ] `oauth_states`テーブルが存在する
- [ ] Vercel環境変数に`DATABASE_URL`が設定されている
- [ ] Vercel環境変数の値が正しい

---

## 🚀 次のステップ

1. Supabase Dashboardで上記の項目を確認
2. 不一致があれば修正
3. 認証を再度テスト

---

## 💡 MCPサーバーを使用する場合

MCPサーバーが正しく接続されていれば、以下のコマンドでプロジェクト情報を取得できます：

```bash
# MCPサーバー経由でプロジェクト情報を取得（将来の実装）
```

現在は、Supabase Dashboardから手動で確認する必要があります。
