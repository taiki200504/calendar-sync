# 500 エラー解消 — ステップバイステップ

「Failed to load resource: the server responded with a status of 500」が出たとき、次の手順で**どのAPIが失敗しているか**を特定し、原因に応じて修正してください。

---

## ステップ1: どのリクエストが 500 を返しているか特定する

1. ブラウザで **開発者ツール** を開く（F12 または 右クリック → 検証）。
2. **Network（ネットワーク）** タブを開く。
3. ページを再読み込みするか、エラーが出る操作をもう一度行う。
4. 一覧で **Status が 500** の行を探す（赤や 500 と表示されているもの）。
5. その行をクリックして、右側の **Headers** で **Request URL** を確認する。  
   例: `https://calendar-sync-os.vercel.app/api/sync/status`
6. **Response（レスポンス）** タブを開き、JSON の中に **`path`** や **`error`** があればメモする。  
   （サーバー側の変更後は `path` に失敗したAPIのパスが含まれます。）

**補足:** フロントの変更後は、500 が発生したときに **Console（コンソール）** に  
`[500] Failed request: /api/xxx ...` のように表示されます。ここから失敗した API のパスも確認できます。

**メモするもの**
- 500 になっている **Request URL**（例: `/api/sync/status`）
- レスポンス本文の **`error`** や **`message`**（あれば）

---

## ステップ2: よくある原因と対処

500 の多くは次のいずれかです。**ステップ1で分かった API の種類**と、**表示されているエラーメッセージ**に合わせて確認してください。

### 2a. データベース接続（DATABASE_URL）

**当てはまりそうな場合**
- 500 になる API が `/api/auth/me`・`/api/accounts`・`/api/calendars`・`/api/sync/status` など、DB を使うもの
- レスポンスに `Database error`・`ENOTFOUND`・`connection` などのキーワードが出ている

**やること**

1. **Vercel の環境変数を確認**
   - Vercel ダッシュボード → 対象プロジェクト → **Settings** → **Environment Variables**
   - **DATABASE_URL** が **Production** に設定されているか確認

2. **Supabase の接続文字列を使う（Vercel から接続する場合）**
   - Supabase ダッシュボード → **Project Settings** → **Database**
   - **Connection string** で **URI** を選び、**Transaction** または **Session** モードの接続文字列をコピー
   - ポートは **6543**（プーラー）を使う（5432 は Vercel からつながらないことが多い）
   - 例:  
     `postgres://postgres.xxxx:パスワード@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`
   - この値を Vercel の **DATABASE_URL** に設定（既存があれば上書き）

3. **.env.production を直している場合**
   - ルートの `.env.production` に **DATABASE_URL が複数行** 書かれていると、**最後の行だけ** が使われます。
   - 使いたい接続先の **1行だけ** にし、不要な行は削除する。

4. 設定を変えたら **再デプロイ** する（Vercel なら **Deployments** から Redeploy）。

---

### 2b. マイグレーション未実行（テーブル・カラムがない）

**当てはまりそうな場合**
- レスポンスに `does not exist`・`column "xxx" does not exist`・`migration` などと出ている
- 例: `column "supabase_user_id" does not exist` → 下記「supabase_user_id がない場合」を実行

**やること**

1. **ローカルでマイグレーションを実行（本番 DB に反映したい場合）**
   - 本番の **DATABASE_URL** を環境変数に設定してから実行する。
   ```bash
   cd backend
   # 例: .env.production の DATABASE_URL を 1 行だけにしたうえで
   export $(grep -v '^#' ../.env.production | xargs)   # 要調整: 複数 DATABASE_URL があると上書きされるので、使う1行だけにすること
   npm run migrate:up
   ```
   または、Supabase の **SQL Editor** で下記の SQL を実行する方法でもよい（後述）。

2. **`column "supabase_user_id" does not exist` の場合**
   - **方法A（推奨）** Supabase ダッシュボード → **SQL Editor** で次を実行:
   ```sql
   ALTER TABLE accounts ADD COLUMN IF NOT EXISTS supabase_user_id text;
   CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_supabase_user_id ON accounts (supabase_user_id) WHERE supabase_user_id IS NOT NULL;
   ```
   - **方法B** ローカルで本番 DB に向けてマイグレーション:
   ```bash
   cd backend
   DATABASE_URL="ここに本番の接続文字列を1行で" npm run migrate:up
   ```

3. 実行後、もう一度該当 API を叩いて 500 が消えるか確認する。

---

### 2c. Redis（セッション・キャッシュ）

**当てはまりそうな場合**
- 認証まわり（`/api/auth/me`・`/api/auth/google` など）で 500 になる
- レスポンスに Redis やセッションに関するメッセージが出ている

**やること**

1. **REDIS_URL の確認**
   - Vercel の **Environment Variables** で **REDIS_URL** が設定されているか確認。
   - Upstash などを使っている場合、`rediss://`（s が2つ）で始まる URL になっているか確認。

2. **Redis が必須でない構成なら**
   - コード上、Redis がなくてもメモリストアにフォールバックするようになっていれば、REDIS_URL を外すと Redis 起因の 500 は消えることがある（セッションはメモリのみになるため、複数インスタンスでは注意）。

---

### 2d. 認証まわり（/api/auth/me が 500）

**当てはまりそうな場合**
- ステップ1で **Request URL** が `/api/auth/me` と分かった

**やること**

1. **DB 接続とテーブル**
   - 上記 **2a（DATABASE_URL）** と **2b（マイグレーション）** を先に確認する。  
     `accounts` テーブルが存在し、DATABASE_URL で正しく接続できている必要がある。

2. **セッション**
   - ログイン直後か、別タブで開いたかで挙動が変わる場合、**Cookie** が送られているか **Network** の **Request Headers** で確認する。
   - **SESSION_SECRET** が Vercel の環境変数に設定されているか確認する。

3. **サーバーログ**
   - Vercel の **Functions** のログ、または **Logs** で `GET /api/auth/me` のときに出ているエラー内容を確認する。  
     `Failed to get current user` の前後に DB エラーやスタックトレースが出ていれば、そのメッセージに沿って 2a / 2b を再度確認する。

---

## ステップ3: サーバーログで詳細を確認する（Vercel の場合）

1. Vercel ダッシュボード → 対象プロジェクト → **Logs** または **Deployments** → 該当デプロイ → **Functions**。
2. 500 が発生した時刻あたりのログを開く。
3. エラーメッセージやスタックトレースから、  
   - **DATABASE** → 2a / 2b  
   - **Redis / session** → 2c  
   - **auth / account** → 2d  
   のどれに当てはまるか判断する。

---

## ステップ4: 修正後の確認

1. **ブラウザのキャッシュを無効にする** か、**シークレットウィンドウ** で開き直す。
2. 再度ログインまたは該当画面を開き、**Network** で同じ API が **200** になっているか確認する。
3. まだ 500 の場合は、**ステップ1** で再度「どの URL が 500 か」と「レスポンスの `error` / `path`」を確認し、**ステップ2** の該当項目と **ステップ3** のログを再度見直す。

---

## チェックリスト（本番で 500 が出るとき）

- [ ] **ステップ1** で 500 の **Request URL** を特定した
- [ ] **DATABASE_URL** が Vercel に設定され、Supabase の **プーラー（port 6543）** の URI になっている
- [ ] **.env.production** に DATABASE_URL が複数行ない（1行だけにした）
- [ ] **マイグレーション** を実行し、必要なテーブルが存在する
- [ ] **REDIS_URL**（使う場合）が正しく設定されている
- [ ] **SESSION_SECRET** が設定されている
- [ ] 環境変数変更後に **再デプロイ** した
- [ ] **Vercel のログ** でエラー内容を確認した

---

## まとめ

1. **どの API が 500 か** を Network の Request URL とレスポンスの `path` で特定する。  
2. 多くの 500 は **DATABASE_URL** と **マイグレーション** で解消するので、そこを最初に確認する。  
3. 認証まわりなら **セッション・Redis・accounts テーブル** を確認する。  
4. 変更後は必ず **再デプロイ** し、再度リクエストして 200 になるか確認する。

まだ 500 が続く場合は、**ステップ1でメモした Request URL** と **Response の JSON（またはエラーメッセージ）**、**Vercel ログの該当部分** を共有してもらえれば、原因をさらに絞り込めます。
