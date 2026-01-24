# 🚀 マイグレーション実行のクイックスタート

## ⚠️ よくある間違い

### ❌ 間違い1: 間違ったディレクトリから実行

```bash
# backendディレクトリにいる場合
cd backend
./scripts/run-migration.sh up  # ❌ エラー: スクリプトはプロジェクトルートにある
```

### ❌ 間違い2: SQLをターミナルで直接実行

```bash
SELECT * FROM oauth_states LIMIT 1;  # ❌ これはSQLコマンド、ターミナルでは実行できない
```

---

## ✅ 正しい手順

### 方法1: マイグレーションスクリプトを使用（推奨）

**プロジェクトルートから実行**してください：

```bash
# プロジェクトルートに移動（まだいない場合）
cd "/Users/taikimishima/Developer/CalendarSync OS"

# マイグレーションを実行
./scripts/run-migration.sh up
```

### 方法2: 直接npmコマンドを使用

```bash
# プロジェクトルートから
cd backend
npm run migrate:up
```

### 方法3: Supabase SQL Editorから実行（テーブルが既に存在する場合）

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **SQL Editor**を開く
4. 以下のSQLを実行：

```sql
-- テーブルが既に存在するか確認
SELECT * FROM oauth_states LIMIT 1;
```

**エラーが出ない場合**: テーブルは既に存在しています。マイグレーションは不要です。

**エラーが出る場合**: 以下のSQLを実行してテーブルを作成：

```sql
CREATE TABLE IF NOT EXISTS oauth_states (
  state VARCHAR(64) PRIMARY KEY NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  add_account_mode BOOLEAN DEFAULT FALSE,
  original_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
```

---

## 📋 現在の状況の確認

### ステップ1: 現在のディレクトリを確認

```bash
pwd
```

**プロジェクトルート**（`/Users/taikimishima/Developer/CalendarSync OS`）にいることを確認してください。

### ステップ2: マイグレーションを実行

```bash
# プロジェクトルートから
./scripts/run-migration.sh up
```

### ステップ3: 成功したか確認

以下のメッセージが表示されれば成功：

```
✅ マイグレーションが完了しました
```

---

## 🔧 トラブルシューティング

### エラー: "no such file or directory: ./scripts/run-migration.sh"

**原因**: プロジェクトルートにいない

**解決方法**:
```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
./scripts/run-migration.sh up
```

### エラー: "relation 'oauth_states' already exists"

**原因**: テーブルが既に存在する

**解決方法**: 
- マイグレーションファイルは修正済みなので、再度実行してください
- または、Supabase SQL Editorでテーブルが存在するか確認

### エラー: "DATABASE_URL is not set"

**原因**: 環境変数が設定されていない

**解決方法**:
```bash
# .env.productionファイルが存在することを確認
ls -la .env.production

# 存在しない場合は、.env.production.exampleをコピー
```

---

## 📝 まとめ

1. **プロジェクトルートに移動**: `cd "/Users/taikimishima/Developer/CalendarSync OS"`
2. **マイグレーションを実行**: `./scripts/run-migration.sh up`
3. **成功を確認**: "✅ マイグレーションが完了しました" が表示される

SQLコマンドは**Supabase SQL Editor**で実行してください。ターミナルでは実行できません。
