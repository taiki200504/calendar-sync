# データベース接続エラーの修正

## 🔴 発生していたエラー

```
SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

このエラーは、PostgreSQL接続時のパスワードが正しく設定されていない、または`DATABASE_URL`にプレースホルダーが残っている場合に発生します。

---

## 🔍 原因

`DATABASE_URL`に以下のプレースホルダーが残っている可能性があります：
- `[project-ref]`
- `[password]`

または、接続文字列の形式が正しくない可能性があります。

---

## ✅ 解決方法

### 方法1: ローカルPostgreSQLを使用（推奨・開発環境）

Docker ComposeでPostgreSQLが起動している場合、以下のように設定してください：

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar_sync
```

### 方法2: Supabaseを使用する場合

`backend/.env`ファイルで、`[project-ref]`と`[password]`を実際の値に置き換えてください：

```env
# 直接接続
DATABASE_URL=postgresql://postgres:実際のパスワード@db.実際のプロジェクトID.supabase.co:5432/postgres

# またはプーラー接続（推奨）
DATABASE_URL=postgresql://postgres.実際のプロジェクトID:実際のパスワード@aws-0-リージョン.pooler.supabase.com:6543/postgres
```

---

## 🔧 修正内容

1. **データベース接続の検証を追加**
   - `DATABASE_URL`が設定されているか確認
   - プレースホルダーが残っていないか確認
   - エラーメッセージを改善

2. **エラーハンドリングの改善**
   - より詳細なエラーメッセージを表示

---

## 📋 確認手順

### 1. DATABASE_URLの確認

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS/backend"
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');"
```

### 2. プレースホルダーの確認

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS/backend"
node -e "require('dotenv').config(); const url = process.env.DATABASE_URL || ''; if (url.includes('[project-ref]') || url.includes('[password]')) { console.log('❌ Placeholder found in DATABASE_URL'); } else { console.log('✅ No placeholder found'); }"
```

### 3. ローカルPostgreSQLへの接続確認

```bash
docker exec calendar-sync-postgres psql -U postgres -d calendar_sync -c "SELECT 1;"
```

---

## 🚀 推奨設定（開発環境）

開発環境では、ローカルのPostgreSQLを使用することを推奨します：

```env
# backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar_sync
```

この設定で、Docker Composeで起動しているPostgreSQLに接続できます。

---

## ⚠️ 重要な注意事項

1. **`.env`ファイルは`.gitignore`に含まれていることを確認**
2. **プレースホルダーを実際の値に置き換える**
3. **パスワードに特殊文字が含まれる場合は、URLエンコードが必要な場合があります**

---

## 🔄 修正後の確認

1. `backend/.env`ファイルで`DATABASE_URL`を正しく設定
2. Backendサーバーを再起動
3. ログインを再度試す

修正が完了したら、再度ログインを試してください！
