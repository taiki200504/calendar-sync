# 🚀 Vercel環境変数設定ステップバイステップガイド

## 📋 重要な違い

Vercelでデプロイする場合、`.env.production`ファイルは**直接使用されません**。
代わりに、**VercelダッシュボードまたはCLI**で環境変数を設定する必要があります。

---

## 🔴 ステップ1: Upstash Redisのセットアップ（必須）

VercelではDocker ComposeのRedisは使えないため、**Upstash Redis**を使用する必要があります。

### 手順：

#### 1-1. Upstashアカウントの作成

1. ブラウザで [https://upstash.com/](https://upstash.com/) にアクセス
2. 「Sign Up」または「Get Started」をクリック
3. アカウントを作成（GitHubアカウントでログインも可能）

#### 1-2. Redis Databaseの作成

1. Upstashダッシュボードにログイン
2. 「Create Database」ボタンをクリック
3. 以下の設定を入力：
   - **Name**: `calendar-sync-redis`（任意の名前）
   - **Type**: `Regional`（デフォルト）
   - **Region**: 最寄りのリージョンを選択（例: `ap-northeast-1`）
4. 「Create」ボタンをクリック

#### 1-3. 接続情報の取得

1. 作成したRedis Databaseをクリック
2. 「Details」タブまたは「Connect」タブを開く
3. 以下の情報を確認：
   - **Endpoint**（ホスト名、例: `redis-12345.upstash.io`）
   - **Port**（通常は6379）
   - **Password**（パスワード）

#### 1-4. Redis URLの形式

取得した情報を使って、以下の形式でRedis URLを作成します：

```
redis://default:[password]@[host]:[port]
```

**例:**
```
redis://default:AbCdEf123456@redis-12345.upstash.io:6379
```

**重要**: このRedis URLは、次のステップでVercelの環境変数として設定します。

---

## 🌐 ステップ2: Vercelプロジェクトの準備

### 2-1. Vercelアカウントの作成

1. [Vercel](https://vercel.com/)にアクセス
2. アカウントを作成（GitHubアカウントでログイン推奨）

### 2-2. Vercel CLIのインストール（オプション）

CLIを使う場合は、以下のコマンドでインストール：

```bash
npm install -g vercel
```

---

## 🔧 ステップ3: Vercel環境変数の設定

環境変数は、**Vercelダッシュボード**または**Vercel CLI**で設定できます。

### 方法A: Vercelダッシュボードで設定（推奨・簡単）

#### 3-1. プロジェクトを作成または選択

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. 「New Project」をクリック（新規の場合）
3. GitHubリポジトリを選択してインポート
4. プロジェクト設定：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`（ルートディレクトリ）
   - **Build Command**: `cd backend && npm run build && cd ../frontend && npm run build`
   - **Output Directory**: `frontend/dist`
5. 環境変数を設定する前に「Deploy」をクリック（後で設定できます）

#### 3-2. 環境変数を設定

1. プロジェクトのダッシュボードを開く
2. 「Settings」タブをクリック
3. 「Environment Variables」をクリック
4. 以下の環境変数を1つずつ追加：

| 変数名 | 値の例 | 説明 |
|--------|--------|------|
| `DATABASE_URL` | `postgresql://postgres:...@db.xxx.supabase.co:5432/postgres` | Supabaseの接続文字列（`.env.production`からコピー） |
| `REDIS_URL` | `redis://default:password@redis-xxx.upstash.io:6379` | Upstash Redisの接続URL（ステップ1で取得） |
| `GOOGLE_CLIENT_ID` | `your-google-client-id.apps.googleusercontent.com` | Google OAuth Client ID（`.env.production`からコピー） |
| `GOOGLE_CLIENT_SECRET` | `your-google-client-secret` | Google OAuth Client Secret（`.env.production`からコピー） |
| `GOOGLE_REDIRECT_URI` | `https://your-project.vercel.app/api/auth/google/callback` | **重要**: Vercelのドメインに合わせる |
| `JWT_SECRET` | `5xrGIu5xXZ7MNMZynvXztnvoLzHdXtjqRLO6n261NQ` | JWT署名用の秘密鍵（`.env.production`からコピー） |
| `SESSION_SECRET` | `V1ZANSVW5m6Y7XARW/Y6jI6VYrXUYuoRaZ+mfO+8mt4` | セッション用の秘密鍵（`.env.production`からコピー） |
| `ENCRYPTION_KEY` | `d2136b55ca7405f7aee4dae10aa59be0` | 暗号化キー（`.env.production`からコピー） |
| `FRONTEND_URL` | `https://your-project.vercel.app` | **重要**: Vercelのドメインに合わせる |
| `NODE_ENV` | `production` | 本番環境 |

**重要ポイント:**

1. **`GOOGLE_REDIRECT_URI`と`FRONTEND_URL`は、Vercelのドメインに合わせる必要があります**
   - デプロイ後にVercelが自動的に割り当てるドメイン（例: `your-project.vercel.app`）
   - または、カスタムドメインを設定した場合はそのドメイン

2. **環境変数は3つの環境（Production、Preview、Development）で設定できます**
   - すべての環境で同じ値を使う場合は、各環境にチェックを入れて設定

3. **`GOOGLE_REDIRECT_URI`の設定例:**
   ```
   https://your-project.vercel.app/api/auth/google/callback
   ```

4. **`FRONTEND_URL`の設定例:**
   ```
   https://your-project.vercel.app
   ```

---

### 方法B: Vercel CLIで設定

#### 3-1. Vercelにログイン

```bash
vercel login
```

#### 3-2. プロジェクトをリンク

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
vercel link
```

#### 3-3. 環境変数を設定

以下のコマンドを1つずつ実行して、値を入力します：

```bash
# データベースURL
vercel env add DATABASE_URL
# 値: postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres

# Redis URL（Upstashから取得した値）
vercel env add REDIS_URL
# 値: redis://default:[password]@[host]:[port]

# Google OAuth
vercel env add GOOGLE_CLIENT_ID
# 値: your-google-client-id.apps.googleusercontent.com

vercel env add GOOGLE_CLIENT_SECRET
# 値: your-google-client-secret

vercel env add GOOGLE_REDIRECT_URI
# 値: https://your-project.vercel.app/api/auth/google/callback（デプロイ後に更新）

# セキュリティキー
vercel env add JWT_SECRET
# 値: 5xrGIu5xXZ7MNMZynvXztnvoLzHdXtjqRLO6n261NQ

vercel env add SESSION_SECRET
# 値: V1ZANSVW5m6Y7XARW/Y6jI6VYrXUYuoRaZ+mfO+8mt4

vercel env add ENCRYPTION_KEY
# 値: d2136b55ca7405f7aee4dae10aa59be0

# フロントエンドURL
vercel env add FRONTEND_URL
# 値: https://your-project.vercel.app（デプロイ後に更新）

# Node環境
vercel env add NODE_ENV production
```

**注意**: `GOOGLE_REDIRECT_URI`と`FRONTEND_URL`は、最初のデプロイ後にVercelのドメインが確定してから更新する必要があります。

---

## 🚀 ステップ4: 初回デプロイ

### 4-1. デプロイの実行

#### 方法A: Vercel CLI

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
vercel --prod
```

#### 方法B: GitHub連携（推奨）

1. コードをGitHubにプッシュ
2. Vercelダッシュボードで「New Project」
3. GitHubリポジトリを選択
4. 設定を完了してデプロイ

### 4-2. デプロイ後のドメイン確認

デプロイが完了すると、Vercelが自動的にドメインを割り当てます（例: `your-project.vercel.app`）。

このドメインを確認して、次のステップで環境変数を更新します。

---

## 🔄 ステップ5: 環境変数の更新（デプロイ後）

デプロイが完了してドメインが確定したら、以下の環境変数を更新します：

### 更新が必要な環境変数

1. **`GOOGLE_REDIRECT_URI`**
   - 更新前: `https://your-project.vercel.app/api/auth/google/callback`
   - 更新後: 実際のVercelドメインに合わせる

2. **`FRONTEND_URL`**
   - 更新前: `https://your-project.vercel.app`
   - 更新後: 実際のVercelドメインに合わせる

### 更新方法

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Environment Variables」を開く
3. 該当する環境変数を編集
4. 新しい値を入力して保存
5. **再デプロイ**を実行（環境変数を変更した場合は再デプロイが必要）

---

## 🔐 ステップ6: Google OAuth設定の更新

Vercelのドメインが確定したら、Google Cloud Consoleの設定も更新します。

### 手順：

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」を開く
4. OAuth 2.0 クライアントIDをクリック
5. 「承認済みのリダイレクトURI」に以下を追加：
   ```
   https://your-project.vercel.app/api/auth/google/callback
   ```
   （実際のVercelドメインに置き換え）
6. 「保存」をクリック

---

## ✅ ステップ7: 動作確認

### 7-1. ヘルスチェック

ブラウザまたはcurlで以下にアクセス：

```
https://your-project.vercel.app/health
```

期待されるレスポンス：
```json
{"status":"ok","timestamp":"..."}
```

### 7-2. OAuth認証のテスト

1. `https://your-project.vercel.app` にアクセス
2. 「Googleでログイン」をクリック
3. Google認証が正常に動作することを確認

### 7-3. ログの確認

Vercelダッシュボードの「Functions」タブで、APIのログを確認できます。

---

## 📝 現在の`.env.production`からの値のコピー

以下の値は、現在の`.env.production`ファイルからコピーできます：

```bash
# これらの値をVercelの環境変数に設定
DATABASE_URL=postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=5xrGIu5xXZ7MNMZynvXztnvoLzHdXtjqRLO6n261NQ
SESSION_SECRET=V1ZANSVW5m6Y7XARW/Y6jI6VYrXUYuoRaZ+mfO+8mt4
ENCRYPTION_KEY=d2136b55ca7405f7aee4dae10aa59be0
```

**注意**: `REDIS_URL`はUpstashから取得した値を使用してください。

---

## 🆘 トラブルシューティング

### エラー: 環境変数が読み込まれない

- Vercelダッシュボードで環境変数が正しく設定されているか確認
- 環境変数は**Production**、**Preview**、**Development**の各環境で設定が必要
- 環境変数を変更した後は**再デプロイ**が必要

### エラー: Redis接続エラー

- `REDIS_URL`が正しく設定されているか確認
- Upstash Redisの接続情報が正しいか確認
- UpstashダッシュボードでRedis Databaseが起動しているか確認

### エラー: OAuth認証エラー

- `GOOGLE_REDIRECT_URI`がVercelのドメインと一致しているか確認
- Google Cloud ConsoleでリダイレクトURIが登録されているか確認
- `FRONTEND_URL`と`GOOGLE_REDIRECT_URI`のドメインが一致しているか確認

### エラー: ビルドエラー

```bash
# ローカルでビルドをテスト
cd backend && npm run build
cd ../frontend && npm run build
```

---

## 📚 参考ドキュメント

- [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) - Vercelデプロイの詳細ガイド
- [VERCEL_QUICK_START.md](./VERCEL_QUICK_START.md) - Vercelクイックスタート

---

**準備ができたら、ステップ1から順番に進めてください！** 🚀
