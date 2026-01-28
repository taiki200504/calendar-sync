# 「Tenant or user not found」エラーの解消方法

このエラーは、Vercel で設定している **DATABASE_URL** のプーラー接続で、Supabase がプロジェクト（テナント）やユーザーを認識できていない場合に発生します。  
**リージョンが違う接続文字列**を使っているときによく出ます。

## 原因

- 手で組み立てた URL のリージョン（例: `aws-0-ap-northeast-1`）が、実際の Supabase プロジェクトのリージョンと一致していない。
- その結果、プーラーが「そのテナント／ユーザーはここにはいない」として接続を拒否し、「Tenant or user not found」になります。

## 対処手順（推奨）

**Supabase ダッシュボードに表示されている接続文字列をそのまま使う**のが確実です。

### 1. Supabase で接続文字列をコピー

1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. 対象プロジェクト（例: `tthmjkltvrwlxtqanydk`）を選択
3. 左メニュー **Project Settings**（歯車）→ **Database**
4. **Connection string** セクションで **URI** タブを選択
5. **Connection mode** で次のいずれかを選ぶ  
   - **Transaction**（サーバーレス推奨・ポート 6543）  
   - もしくは **Session**（別ホストのプーラー）
6. 表示された **接続文字列をそのままコピー**（パスワードは `[YOUR-PASSWORD]` のままの場合は、下で置き換え）
7. `[YOUR-PASSWORD]` があれば、**Database password** に表示されている実際のパスワードに置き換える  
   - 同じ Database ページで「Reset database password」でリセット・確認可能

これで、**正しいリージョン・ホスト・ユーザー名**が含まれた接続文字列が用意できます。

### 2. Vercel で DATABASE_URL を更新

1. [Vercel Dashboard](https://vercel.com/dashboard) → 対象プロジェクト
2. **Settings** → **Environment Variables**
3. **DATABASE_URL** を編集（または削除して新規作成）
4. **Value** に、手順 1 でコピーした接続文字列を貼り付け（パスワードは実値に置き換えたもの）
5. **Save** 後、**Production**（必要なら Preview / Development）にチェックが入っていることを確認
6. **Deployments** から **Redeploy** を実行して反映

### 3. 動作確認

再度 Google ログイン（`/api/auth/google`）を実行し、「Tenant or user not found」や「Failed to generate auth URL」が出ないか確認してください。

## リージョンの確認

- Supabase の **Project Settings** → **General** の **Region** で、プロジェクトのリージョン（例: Northeast Asia (Tokyo), East US (N. Virginia)）を確認できます。
- 接続文字列のホスト部分（例: `aws-0-ap-northeast-1.pooler.supabase.com`, `aws-0-us-east-1.pooler.supabase.com`）が、このリージョンと対応している必要があります。  
  **ダッシュボードの「Connection string」で表示される URL を使えば、自動で正しいリージョンになります。**

## まとめ

- **「Tenant or user not found」＝ プーラーがあなたのプロジェクトをその接続で見つけられていない状態**と考えてよいです。
- **対処**: Supabase の **Database → Connection string → URI → Transaction（または Session）** で表示される文字列をコピーし、パスワードだけ実値に置き換えて、Vercel の **DATABASE_URL** に設定し直してから再デプロイしてください。
