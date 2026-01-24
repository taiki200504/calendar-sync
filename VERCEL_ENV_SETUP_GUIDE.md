# 🔧 Vercel環境変数の設定ガイド

## 🔴 現在のエラー

```
Database connection failed: getaddrinfo ENOTFOUND db.tthmjkltvrwlxtqanydk.supabase.co
```

このエラーは、Vercel環境変数の`DATABASE_URL`が設定されていないか、正しく設定されていないことを示しています。

---

## ✅ 解決方法

### ステップ1: Vercel環境変数を確認

#### 方法A: Vercel Dashboardから確認（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクト「CalendarSync OS」を選択
3. **Settings** → **Environment Variables** を開く
4. `DATABASE_URL` が存在するか確認

#### 方法B: Vercel CLIから確認

```bash
vercel env ls
```

`DATABASE_URL` が表示されない場合、設定されていません。

---

### ステップ2: DATABASE_URLを設定

#### 方法A: Vercel Dashboardから設定（推奨）

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

#### 方法B: Vercel CLIから設定

```bash
# Production環境に設定
vercel env add DATABASE_URL production

# プロンプトが表示されたら、以下を入力：
postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
```

**注意**: パスワード部分（`KFQa5GhThOkOeYkk`）は、実際のSupabaseパスワードに置き換えてください。

---

### ステップ3: 環境変数の取得方法

SupabaseのデータベースURLを取得する方法：

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションで **URI** をコピー
5. パスワードを実際のパスワードに置き換える

形式：
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

### ステップ4: 再デプロイ（重要）

環境変数を追加/更新した後、**必ず再デプロイ**が必要です。

#### 方法A: Git pushで自動デプロイ（推奨）

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
git commit --allow-empty -m "Trigger redeploy for DATABASE_URL"
git push
```

#### 方法B: Vercel Dashboardから再デプロイ

1. **Deployments** タブを開く
2. 最新のデプロイメントの **...** メニューをクリック
3. **Redeploy** を選択

#### 方法C: Vercel CLIから再デプロイ

```bash
vercel --prod
```

---

## 🔍 確認方法

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

## ⚠️ 注意事項

### パスワードの確認

`.env.production`ファイルのパスワードが正しいか確認してください：

```bash
cat .env.production | grep DATABASE_URL
```

Supabase Dashboardでパスワードを確認：
1. **Settings** → **Database** → **Database password**
2. パスワードをリセットする場合は、**Reset database password** をクリック

### 環境変数のスコープ

環境変数は、以下のスコープで設定できます：
- **Production**: 本番環境のみ
- **Preview**: プレビュー環境（ブランチデプロイ）
- **Development**: ローカル開発環境（`vercel dev`）

**推奨**: すべての環境で同じ値を設定するか、少なくとも **Production** には必ず設定してください。

---

## 🔧 トラブルシューティング

### エラー: "DATABASE_URL is not set"

**原因**: 環境変数が設定されていない

**解決方法**: ステップ2を実行してください

### エラー: "getaddrinfo ENOTFOUND"

**原因**: 
1. 環境変数が設定されていない
2. 環境変数の値が間違っている
3. 再デプロイしていない

**解決方法**:
1. 環境変数が正しく設定されているか確認
2. 再デプロイを実行
3. Supabaseプロジェクトがアクティブか確認

### エラー: "password authentication failed"

**原因**: データベースのパスワードが間違っている

**解決方法**:
1. Supabase Dashboardでパスワードを確認
2. `DATABASE_URL`のパスワード部分を更新
3. 再デプロイ

---

## 📝 チェックリスト

- [ ] Vercel Dashboardで`DATABASE_URL`が設定されている
- [ ] `DATABASE_URL`の形式が正しい（`postgresql://...`）
- [ ] パスワードが正しい
- [ ] 環境変数更新後に再デプロイした
- [ ] マイグレーションが実行されている（`oauth_states`テーブルが存在する）

---

## 🚀 次のステップ

1. Vercel環境変数に`DATABASE_URL`を設定
2. 再デプロイ
3. 認証をテスト

環境変数を設定して再デプロイ後、エラーが解消されるか確認してください。
