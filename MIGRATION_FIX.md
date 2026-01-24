# 🔧 マイグレーションエラーの修正

## 🔴 エラー内容

```
error: relation "oauth_states" already exists
```

このエラーは、`oauth_states`テーブルが既に存在する場合に発生します。

---

## ✅ 解決方法

### 方法1: マイグレーションを再実行（推奨）

マイグレーションファイルを修正したので、再度実行してください：

```bash
./scripts/run-migration.sh up
```

今回の修正で、`CREATE TABLE IF NOT EXISTS`を使用するようになったため、テーブルが既に存在してもエラーになりません。

### 方法2: 既存のテーブルを確認

テーブルが既に存在するか確認：

```sql
-- Supabase SQL Editorで実行
SELECT * FROM oauth_states LIMIT 1;
```

エラーが出なければ、テーブルは正常に存在しています。

### 方法3: テーブルを削除して再作成（必要な場合のみ）

**注意**: この方法は、既存のデータを削除します。通常は不要です。

```sql
-- Supabase SQL Editorで実行
DROP TABLE IF EXISTS oauth_states CASCADE;
```

その後、マイグレーションを再実行：

```bash
./scripts/run-migration.sh up
```

---

## 📝 確認事項

マイグレーションが成功したか確認：

```sql
-- Supabase SQL Editorで実行
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'oauth_states'
ORDER BY ordinal_position;
```

以下のカラムが表示されれば成功：
- `state` (varchar)
- `created_at` (timestamp)
- `expires_at` (timestamp)
- `add_account_mode` (boolean)
- `original_account_id` (uuid)

---

## 🚀 次のステップ

1. マイグレーションを再実行（方法1）
2. テーブルが正常に作成されたか確認
3. 認証を再度試す

---

## 💡 補足

`CREATE TABLE IF NOT EXISTS`を使用することで、テーブルが既に存在する場合でもエラーにならず、安全にマイグレーションを実行できます。
