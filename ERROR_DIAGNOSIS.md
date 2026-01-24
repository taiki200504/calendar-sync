# エラー特定の手順

## 🔍 ステップ1: ブラウザのコンソールを確認

### 手順

1. **ブラウザでアプリにアクセス**
   - URL: `https://calendar-sync-os.vercel.app`
   - または最新のデプロイメントURL

2. **開発者ツールを開く**
   - Windows/Linux: `F12` または `Ctrl+Shift+I`
   - Mac: `Cmd+Option+I`

3. **Consoleタブを確認**
   - 赤いエラーメッセージを探す
   - エラーメッセージをコピー

4. **Networkタブを確認**
   - 失敗しているリクエスト（赤色）を探す
   - クリックして詳細を確認
   - Status Code、Response、Request Headersを確認

### 確認すべきエラー

- Reactエラー（#418, #423など）
- ネットワークエラー（404, 500など）
- 認証エラー（401, 403など）
- CORSエラー

---

## 🔍 ステップ2: Vercelのログを確認

### 方法1: Vercel CLIで確認

```bash
# 最新のデプロイメントURLを取得
vercel ls

# ログを確認（最新のデプロイメントURLを使用）
vercel logs https://calendar-sync-xxxxx.vercel.app
```

### 方法2: Vercelダッシュボードで確認

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択
3. 「Deployments」タブを開く
4. 最新のデプロイメントをクリック
5. 「Functions」タブでServerless Functionsのログを確認
6. 「Runtime Logs」タブで実行時ログを確認

### 確認すべきログ

- エラーメッセージ
- スタックトレース
- 環境変数の読み込みエラー
- データベース接続エラー
- Redis接続エラー

---

## 🔍 ステップ3: ヘルスチェックエンドポイントを確認

### `/api/health`エンドポイント

ブラウザまたはcurlで以下にアクセス：

```bash
# ブラウザでアクセス
https://calendar-sync-os.vercel.app/api/health

# またはcurlで確認
curl https://calendar-sync-os.vercel.app/api/health
```

### 確認すべき情報

- `status`: `ok`かどうか
- `database`: 接続状態
- `redis`: 接続状態
- `environment`: 環境変数の状態

---

## 🔍 ステップ4: 環境変数を確認

### Vercel CLIで確認

```bash
# 環境変数の一覧を確認
vercel env ls

# 特定の環境変数の値を確認（暗号化されているため表示されませんが、設定されているか確認可能）
vercel env ls | grep -E "DATABASE_URL|REDIS_URL|GOOGLE_CLIENT_ID|FRONTEND_URL"
```

### 環境変数の確認項目

- ✅ `DATABASE_URL` - 設定されているか
- ✅ `REDIS_URL` - 設定されているか
- ✅ `GOOGLE_CLIENT_ID` - 設定されているか
- ✅ `GOOGLE_CLIENT_SECRET` - 設定されているか
- ✅ `GOOGLE_REDIRECT_URI` - 設定されているか
- ✅ `FRONTEND_URL` - 設定されているか
- ✅ `SESSION_SECRET` - 設定されているか

---

## 🔍 ステップ5: 認証フローの確認

### 手順

1. **ログインページにアクセス**
   - `https://calendar-sync-os.vercel.app`

2. **「Googleでログイン」をクリック**

3. **開発者ツールで以下を確認**
   - Networkタブ: `/api/auth/google`へのリクエスト
   - リダイレクト先URL
   - エラーレスポンス

4. **Google認証後のコールバック**
   - `/auth/callback`へのリダイレクト
   - `/api/auth/me`へのリクエスト
   - エラーレスポンス

---

## 📋 エラー情報の収集

以下の情報を収集してください：

### 1. ブラウザのコンソールエラー

```
[エラーメッセージをコピー]
```

### 2. ネットワークエラー

- 失敗しているリクエストのURL
- Status Code
- Response Body
- Request Headers

### 3. Vercelのログ

- エラーメッセージ
- スタックトレース
- タイムスタンプ

### 4. 発生している操作

- どの操作でエラーが発生するか
- エラーが発生するタイミング
- 再現手順

---

## 🛠️ よくあるエラーと対処法

### エラー: "Invalid state parameter"

**原因**: セッションが正しく保存されていない

**確認方法**:
- Redis接続を確認
- セッションクッキーが送信されているか確認

### エラー: "Cannot find module"

**原因**: 依存関係が不足している

**確認方法**:
- `package.json`を確認
- Vercelのビルドログを確認

### エラー: "Database connection failed"

**原因**: データベース接続エラー

**確認方法**:
- `DATABASE_URL`を確認
- Supabaseの接続状態を確認

### エラー: "CORS error"

**原因**: CORS設定の問題

**確認方法**:
- `FRONTEND_URL`を確認
- CORS設定を確認

---

## 📝 次のステップ

エラー情報を収集したら、以下を共有してください：

1. **エラーメッセージ**（完全なテキスト）
2. **発生している操作**（何をしようとしたときか）
3. **ブラウザのコンソールログ**（可能であれば）
4. **ネットワークタブのエラー**（可能であれば）

これらの情報があれば、原因を特定して修正できます。
