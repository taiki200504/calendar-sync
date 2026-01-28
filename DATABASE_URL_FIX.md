# DATABASE_URL 修正手順

## 問題
「Tenant or user not found」エラーが発生しています。これは、Vercelで設定しているDATABASE_URLのリージョンがSupabaseプロジェクトと一致していない可能性があります。

## 解決方法

### 方法1: Supabaseダッシュボードから正しい接続文字列を取得（推奨）

1. **Supabaseダッシュボードを開く**
   - https://supabase.com/dashboard
   - プロジェクト `tthmjkltvrwlxtqanydk` を選択

2. **接続文字列を取得**
   - 左メニュー **Project Settings**（歯車アイコン）→ **Database**
   - **Connection string** セクションで **URI** タブを選択
   - **Connection mode** で **Transaction** を選択（サーバーレス推奨）
   - 表示された接続文字列をコピー
     - 形式例: `postgresql://postgres:[YOUR-PASSWORD]@db.tthmjkltvrwlxtqanydk.supabase.co:6543/postgres`
   - `[YOUR-PASSWORD]` を実際のパスワード（`KFQa5GhThOkOeYkk`）に置き換える

3. **Vercelで環境変数を更新**
   - https://vercel.com/dashboard → プロジェクトを選択
   - **Settings** → **Environment Variables**
   - **DATABASE_URL** を編集
   - **Value** に、手順2で取得した接続文字列を貼り付け
   - **Save** をクリック

4. **再デプロイ**
   - **Deployments** タブ → 最新のデプロイの **⋯** → **Redeploy**

### 方法2: 同じホストでポートを6543に変更（簡単な方法）

現在の接続文字列:
```
postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
```

これを以下に変更:
```
postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:6543/postgres
```

**Vercelでの設定手順:**
1. Vercel Dashboard → Settings → Environment Variables
2. DATABASE_URL を編集
3. ポート番号を `:5432` から `:6543` に変更
4. Save → Redeploy

### 方法3: Sessionモードのプーラー接続を使用（方法1・2で解決しない場合）

1. Supabase Dashboard → Project Settings → Database
2. Connection string → URI → **Session** を選択
3. 表示された接続文字列をコピー
   - 形式例: `postgres://postgres.tthmjkltvrwlxtqanydk:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres`
4. パスワードを実際の値に置き換え
5. VercelのDATABASE_URLに設定して再デプロイ

## リージョンの確認

Supabaseプロジェクトのリージョンを確認:
- Project Settings → General → **Region**
- 例: Northeast Asia (Tokyo) = `ap-northeast-1`
- 例: East US (N. Virginia) = `us-east-1`

接続文字列のホスト部分がこのリージョンと一致している必要があります。

## 注意事項

- `.env.production` ファイルはローカル用です
- **Vercelの環境変数も必ず更新してください**
- パスワードに特殊文字（`@`, `#`, `%` など）が含まれる場合は、URLエンコードが必要です

## 確認

修正後、以下を確認:
- Googleログイン（`/api/auth/google`）が正常に動作するか
- VercelのFunctionsログで「Tenant or user not found」エラーが出ていないか
