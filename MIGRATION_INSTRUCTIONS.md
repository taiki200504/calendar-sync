# 🚀 マイグレーション実行手順

## ⚠️ 重要

「Invalid state parameter」エラーを解消するには、**`oauth_states`テーブルを作成する必要があります**。

---

## 方法1: Supabase SQL Editorから実行（推奨・最も簡単）

### ステップ1: Supabaseにアクセス

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック

### ステップ2: SQLを実行

1. 「New query」をクリック
2. 以下のSQLをコピー＆ペースト：

```sql
-- oauth_states テーブルを作成
CREATE TABLE IF NOT EXISTS oauth_states (
  state VARCHAR(64) PRIMARY KEY NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  add_account_mode BOOLEAN DEFAULT FALSE,
  original_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);

-- 期限切れのstateを自動削除するためのインデックス
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
```

3. 「Run」ボタンをクリック
4. 「Success. No rows returned」と表示されれば成功

### ステップ3: 確認

以下のクエリでテーブルが作成されたか確認：

```sql
SELECT * FROM oauth_states LIMIT 1;
```

エラーが出なければ成功です。

---

## 方法2: ローカルから実行

### 前提条件

- `.env.production`ファイルに`DATABASE_URL`が設定されている
- ローカルからSupabaseに接続できる（ファイアウォール設定が正しい）

### ステップ1: 環境変数を設定

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)
```

### ステップ2: マイグレーションを実行

```bash
./scripts/run-migration.sh up
```

または：

```bash
cd backend
npm run migrate:up
```

---

## 方法3: Vercel環境変数を使用してローカルから実行

### ステップ1: Vercel環境変数を取得

```bash
vercel env pull .env.local
```

### ステップ2: 環境変数を設定

```bash
export $(cat .env.local | grep DATABASE_URL | xargs)
```

### ステップ3: マイグレーションを実行

```bash
cd backend
npm run migrate:up
```

---

## ✅ マイグレーション後の確認

1. **テーブルの存在確認**
   ```sql
   SELECT * FROM oauth_states LIMIT 1;
   ```

2. **認証のテスト**
   - ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
   - 「Googleでログイン」をクリック
   - Google認証を完了
   - エラーが解消されているか確認

---

## 🔧 トラブルシューティング

### エラー: "relation 'accounts' does not exist"

`accounts`テーブルが存在しない場合、先に初期マイグレーションを実行してください：

```bash
cd backend
npm run migrate:up
```

### エラー: "permission denied"

SupabaseのSQL Editorで実行する場合は、管理者権限が必要です。プロジェクトのオーナーでログインしていることを確認してください。

### エラー: "connect EHOSTUNREACH"

ローカルからSupabaseに接続できない場合：
- **方法1（Supabase SQL Editor）を使用してください**（最も簡単）

---

## 📝 まとめ

- ✅ **推奨方法**: Supabase SQL Editorから直接SQLを実行
- ✅ **代替方法**: ローカルからマイグレーションを実行
- ✅ **確認**: テーブルが作成されたか確認してから認証をテスト

マイグレーションを実行した後、再度認証を試してください。
