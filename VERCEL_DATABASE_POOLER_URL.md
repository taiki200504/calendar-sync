# Vercel 用 DATABASE_URL（Transaction Pooler 形式）

プロジェクトID: **tthmjkltvrwlxtqanydk**

## 1. 現状確認（済）

- `vercel env ls production` で **DATABASE_URL** は設定済み（Encrypted）。
- 現在の値は直接接続（`db.tthmjkltvrwlxtqanydk.supabase.co:5432`）のため、Vercel から ENOTFOUND が発生している可能性が高いです。

## 2. 正しい URL 形式（Transaction Pooler / 別ホストのプーラー）

**サーバーレス向け**で、ホストを `aws-0-[region].pooler.supabase.com` にした場合の形式です。

### テンプレート（プレースホルダーあり）

```
postgres://postgres.tthmjkltvrwlxtqanydk:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

- **[YOUR-PASSWORD]** … Supabase の Database パスワード（Project Settings → Database で確認・リセット可能）
- **[region]** … リージョン名。Supabase Dashboard の **Project Settings → General** で表示（例: `ap-northeast-1` = Tokyo, `us-east-1` = N. Virginia）

### 例（パスワード・リージョン込み）

- 東京リージョン（ap-northeast-1）の例:  
  `postgres://postgres.tthmjkltvrwlxtqanydk:あなたのパスワード@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`

- パスワードに `@` や `#` などが含まれる場合は、その部分を [URL エンコード](https://en.wikipedia.org/wiki/Percent-encoding) してください（例: `@` → `%40`）。

## 3. Supabase で接続文字列を確認する方法

1. [Supabase Dashboard](https://supabase.com/dashboard) → 対象プロジェクト
2. 左メニュー **Project Settings**（歯車）→ **Database**
3. **Connection string** で **URI** を選択
4. **Transaction**（または **Session**）を選択し、表示された URL をコピー
5. 必要に応じて、上記のクエリパラメータ（`?pgbouncer=true&connection_limit=1`）を付与

これで、Vercel の `DATABASE_URL` に設定する値が揃います。
