# 🔧 データベース接続エラーの修正方法

## 🔴 エラー内容

```
{"error": "Failed to generate auth URL", "message": "getaddrinfo ENOTFOUND db.tthmjkltvrwlxtqanydk.supabase.co"}
```

このエラーは、Vercel環境からSupabaseデータベースのホスト名を解決できない（DNS lookup失敗）ことを示しています。

---

## ✅ 解決方法

### ステップ1: Vercel環境変数を確認

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables** を開く
4. `DATABASE_URL` が設定されているか確認

### ステップ2: DATABASE_URLの形式を確認

正しい形式：

```
postgresql://postgres:パスワード@db.プロジェクトID.supabase.co:5432/postgres
```

例：

```
postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
```

### ステップ3: DATABASE_URLを設定/更新

#### 方法A: Vercel CLIから設定

```bash
vercel env add DATABASE_URL production
# プロンプトが表示されたら、データベースURLを入力
```

#### 方法B: Vercel Dashboardから設定

1. **Settings** → **Environment Variables**
2. **Add New** をクリック
3. **Key**: `DATABASE_URL`
4. **Value**: SupabaseのデータベースURL
5. **Environment**: `Production`（必要に応じて `Preview` と `Development` も）
6. **Save** をクリック

### ステップ4: SupabaseのデータベースURLを取得

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションで **URI** をコピー
5. パスワードを実際のパスワードに置き換える

### ステップ5: 環境変数の再デプロイ

環境変数を追加/更新した後、**再デプロイが必要**です：

```bash
# 方法1: Git pushで自動デプロイ
git commit --allow-empty -m "Trigger redeploy for DATABASE_URL"
git push

# 方法2: Vercel CLIから再デプロイ
vercel --prod
```

または、Vercel Dashboardから：
1. **Deployments** タブを開く
2. 最新のデプロイメントの **...** メニューをクリック
3. **Redeploy** を選択

---

## 🔍 トラブルシューティング

### エラー: "DATABASE_URL is not set"

Vercel環境変数に `DATABASE_URL` が設定されていません。

**解決方法**: 上記のステップ3を実行してください。

### エラー: "getaddrinfo ENOTFOUND"

データベースのホスト名を解決できません。

**考えられる原因**:
1. `DATABASE_URL` の形式が間違っている
2. Supabaseプロジェクトが削除または無効化されている
3. ネットワーク接続の問題（可能性は低い）

**解決方法**:
1. `DATABASE_URL` の形式を確認（ステップ2を参照）
2. Supabaseプロジェクトがアクティブか確認
3. Supabase Dashboardでデータベース接続をテスト

### エラー: "password authentication failed"

データベースのパスワードが間違っています。

**解決方法**:
1. Supabase Dashboardでパスワードを確認
2. `DATABASE_URL` のパスワード部分を更新
3. 再デプロイ

---

## 📝 確認事項

- [ ] `DATABASE_URL` がVercel環境変数に設定されている
- [ ] `DATABASE_URL` の形式が正しい（`postgresql://...`）
- [ ] Supabaseプロジェクトがアクティブである
- [ ] 環境変数更新後に再デプロイした
- [ ] マイグレーションが実行されている（`oauth_states`テーブルが存在する）

---

## 🚀 次のステップ

1. 環境変数を設定
2. 再デプロイ
3. マイグレーションを実行（`MIGRATION_INSTRUCTIONS.md` を参照）
4. 認証を再度試す

---

## 📚 参考

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Database Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
