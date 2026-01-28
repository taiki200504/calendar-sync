# Vercel で「getaddrinfo ENOTFOUND db.xxx.supabase.co」を解消する

Vercel から直接 DB ホスト（`db.xxx.supabase.co:5432`）に接続できない場合、**Supabase のコネクションプーラー**を使うと解消することがあります。

## 一番簡単なやり方（既存の URL を1箇所変えるだけ）

今の `DATABASE_URL` が次のような形式の場合：

`postgresql://postgres:パスワード@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres`

**Vercel の環境変数で、末尾の `:5432` を `:6543` に変更**して保存し、再デプロイしてください。

- 変更後: `postgresql://postgres:パスワード@db.tthmjkltvrwlxtqanydk.supabase.co:6543/postgres`

これが「Transaction モード」のプーラー接続です。多くの場合、これだけで ENOTFOUND が解消します。

---

## やること（2ステップ・詳細）

1. **Supabase で「トランザクションモード」の接続文字列をコピーする**
2. **Vercel の `DATABASE_URL` をその文字列に更新し、再デプロイする**

---

## ステップ1: Supabase で接続文字列を取得

1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. 対象プロジェクト（例: `tthmjkltvrwlxtqanydk`）を選択
3. 左メニュー **Project Settings**（歯車アイコン）→ **Database**
4. **Connection string** のところで **「URI」** タブを選ぶ
5. **Connection mode** で **「Transaction」** を選択（サーバーレス向け）
6. 表示される URL をコピーする  
   - 形式の例: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:6543/postgres`  
   - **ポートが 6543** になっていることを確認
7. `[YOUR-PASSWORD]` を実際のデータベースパスワードに置き換える  
   - パスワードは同じ Database ページの **Database password** で確認・リセット可能

**Transaction モードを推奨する理由**  
- Vercel のようなサーバーレス環境向け  
- 同じホスト（`db.xxx.supabase.co`）でも **6543** はプーラー経由になり、接続が安定しやすい  
- 直接接続（5432）で DNS エラーになる場合でも、こちらで通ることがある  

まだ ENOTFOUND が出る場合は、**Session モード**の URL を試す（ホストが `aws-0-xx.pooler.supabase.com` になる別経路）。

---

## ステップ2: Vercel で DATABASE_URL を更新

1. [Vercel Dashboard](https://vercel.com/dashboard) → 対象プロジェクトを開く
2. **Settings** → **Environment Variables**
3. **DATABASE_URL** を探す  
   - なければ **Add New** で Key を `DATABASE_URL` にする
4. **Value** に、ステップ1でコピーした **Transaction モードの接続文字列**を貼り付ける  
   - 例: `postgresql://postgres:実際のパスワード@db.tthmjkltvrwlxtqanydk.supabase.co:6543/postgres`
5. **Save** する
6. **Production / Preview / Development** のうち、必要な環境にチェックが入っているか確認
7. 再デプロイする  
   - **Deployments** タブ → 最新のデプロイの **⋯** → **Redeploy**  
   - または `git commit` して push してデプロイ

---

## 確認

- 再度 Google ログインを試し、500 ではなく正常にリダイレクトされるか確認する
- Vercel の **Functions** のログで、「Database connection failed」や「ENOTFOUND」が出ていないか確認する

---

## まだ ENOTFOUND になる場合（Session モード）

Transaction モード（ポート 6543）でも同じホストで ENOTFOUND が出る場合は、**Session モード**の接続文字列（別ホストのプーラー）を試してください。

1. Supabase → **Project Settings** → **Database** → Connection string
2. **Connection mode** で「Session」を選択
3. 表示される URL をコピー  
   - 形式の例: `postgres://postgres.プロジェクトID:パスワード@aws-0-リージョン.pooler.supabase.com:5432/postgres`  
   - ユーザー名は **postgres.プロジェクトID**（例: `postgres.tthmjkltvrwlxtqanydk`）
4. この URL を Vercel の **DATABASE_URL** に設定して保存し、再度デプロイする

---

## 補足

- **Supabase プロジェクトが一時停止していないか**  
  Dashboard でプロジェクトが **Active** か確認し、止まっていれば **Resume** する
- **.env.production**  
  ローカルや他の環境で同じ接続にする場合は、同じプーラー URL を `.env.production` の `DATABASE_URL` にも書いて構いません

この手順で、Vercel 上の DB 接続エラーが解消することが多いです。まだエラーが出る場合は、Vercel のログの全文と、使用している接続文字列（パスワード以外）を共有してもらえると次の原因を絞り込みやすいです。
