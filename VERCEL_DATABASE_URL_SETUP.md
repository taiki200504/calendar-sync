# 🔧 Vercel環境変数 DATABASE_URL の設定

## ✅ 正しい理解

**はい、`DATABASE_URL`にはSupabaseのPostgreSQL接続文字列を設定します。**

---

## 📋 現在の状況

### ローカル環境（`.env.production`）

```bash
DATABASE_URL=postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
```

この値は正しいSupabaseの接続文字列です。

### Vercel環境変数

**重要**: ローカルの`.env.production`ファイルの値は、**自動的にVercelに反映されません**。

Vercel環境変数に**手動で設定する必要があります**。

---

## 🔍 ステップ1: Vercel環境変数を確認

### 方法A: Vercel CLIから確認

```bash
vercel env ls | grep DATABASE_URL
```

出力例：
```
DATABASE_URL Encrypted Production, Preview, Development 15h ago
```

**「Encrypted」と表示されれば設定されています。**

### 方法B: Vercel Dashboardから確認

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables** を開く
4. `DATABASE_URL` が存在するか確認

---

## 🔧 ステップ2: DATABASE_URLを設定（未設定の場合）

### 方法A: Vercel Dashboardから設定（推奨）

1. **Settings** → **Environment Variables**
2. **Add New** をクリック
3. 以下の情報を入力：
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres`
   - **Environment**: 
     - ✅ `Production`
     - ✅ `Preview`（オプション）
     - ✅ `Development`（オプション）
4. **Save** をクリック

### 方法B: Vercel CLIから設定

```bash
vercel env add DATABASE_URL production
```

プロンプトが表示されたら、以下を入力：
```
postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
```

---

## ⚠️ 重要な注意事項

### 1. ローカルとVercelは別々

- `.env.production`ファイルの値は、**ローカル環境でのみ使用**されます
- Vercel環境では、**Vercel環境変数**を使用します
- 両方を**同じ値に設定する必要があります**

### 2. パスワードの確認

`.env.production`のパスワード（`KFQa5GhThOkOeYkk`）が正しいか確認してください。

Supabase Dashboardで確認：
1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** を開く
4. **Database password** を確認

パスワードが間違っている場合：
1. **Reset database password** をクリック
2. 新しいパスワードを設定
3. `.env.production`とVercel環境変数の両方を更新

### 3. 環境変数の再デプロイが必要

環境変数を追加/更新した後、**必ず再デプロイ**が必要です。

```bash
# 再デプロイを実行
git commit --allow-empty -m "Trigger redeploy for DATABASE_URL"
git push
```

---

## 🔍 ステップ3: 設定の確認

### 1. 環境変数が設定されているか確認

```bash
vercel env ls | grep DATABASE_URL
```

### 2. デプロイ後にログを確認

```bash
vercel logs --follow
```

または、Vercel Dashboardの **Deployments** → **Functions** → **View Function Logs** から確認

### 3. 認証をテスト

1. ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
2. 「Googleでログイン」をクリック
3. エラーが解消されているか確認

---

## 📝 まとめ

- ✅ `DATABASE_URL`にはSupabaseの接続文字列を設定
- ✅ ローカルの`.env.production`とVercel環境変数の両方に設定が必要
- ✅ 環境変数更新後は再デプロイが必要
- ✅ パスワードが正しいか確認

---

## 🚀 次のステップ

1. Vercel環境変数に`DATABASE_URL`が設定されているか確認
2. 設定されていない場合は、上記の手順で設定
3. 再デプロイ
4. 認証をテスト
