# ⚡ Vercelデプロイ クイックスタート（日本語版）

## 🎯 現状からVercelデプロイまでの最短手順

### 📋 ステップ1: Upstash Redisのセットアップ（5分）

VercelではDocker ComposeのRedisは使えないため、**Upstash Redis**が必要です。

1. [Upstash](https://upstash.com/)でアカウント作成（無料）
2. 「Create Database」をクリック
3. 名前を入力して「Create」
4. 「Details」タブで接続情報を確認
5. **Redis URL**をコピー（形式: `redis://default:[password]@[host]:[port]`）

**例:**
```
redis://default:AbCdEf123456@redis-12345.upstash.io:6379
```

---

### 📋 ステップ2: Vercelプロジェクトの作成（5分）

#### 2-1. Vercelアカウントの作成

1. [Vercel](https://vercel.com/)にアクセス
2. GitHubアカウントでログイン（推奨）

#### 2-2. プロジェクトのインポート

1. Vercelダッシュボードで「New Project」をクリック
2. GitHubリポジトリを選択
3. プロジェクト設定：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`（ルート）
   - **Build Command**: `cd backend && npm run build && cd ../frontend && npm run build`
   - **Output Directory**: `frontend/dist`
4. 環境変数は後で設定するので、まず「Deploy」をクリック

---

### 📋 ステップ3: 環境変数の設定（10分）

デプロイが完了したら、Vercelダッシュボードで環境変数を設定します。

1. プロジェクトの「Settings」→「Environment Variables」を開く
2. 以下の環境変数を追加：

#### 必須環境変数一覧

| 変数名 | 値の取得元 |
|--------|-----------|
| `DATABASE_URL` | `.env.production`からコピー |
| `REDIS_URL` | Upstashから取得（ステップ1） |
| `GOOGLE_CLIENT_ID` | `.env.production`からコピー |
| `GOOGLE_CLIENT_SECRET` | `.env.production`からコピー |
| `GOOGLE_REDIRECT_URI` | **デプロイ後に更新**（Vercelドメイン） |
| `JWT_SECRET` | `.env.production`からコピー |
| `SESSION_SECRET` | `.env.production`からコピー |
| `ENCRYPTION_KEY` | `.env.production`からコピー |
| `FRONTEND_URL` | **デプロイ後に更新**（Vercelドメイン） |
| `NODE_ENV` | `production` |

#### 現在の`.env.production`からコピーできる値

```bash
# これらの値をVercelの環境変数に設定
DATABASE_URL=postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=5xrGIu5xXZ7MNMZynvXztnvoLzHdXtjqRLO6n261NQ
SESSION_SECRET=V1ZANSVW5m6Y7XARW/Y6jI6VYrXUYuoRaZ+mfO+8mt4
ENCRYPTION_KEY=d2136b55ca7405f7aee4dae10aa59be0
```

**重要**: 
- `REDIS_URL`はUpstashから取得した値を使用
- `GOOGLE_REDIRECT_URI`と`FRONTEND_URL`は、デプロイ後にVercelのドメインが確定してから更新

---

### 📋 ステップ4: デプロイ後の環境変数更新（5分）

デプロイが完了すると、Vercelが自動的にドメインを割り当てます（例: `your-project.vercel.app`）。

このドメインを使って、以下の環境変数を更新：

1. **`GOOGLE_REDIRECT_URI`**
   ```
   https://your-project.vercel.app/api/auth/google/callback
   ```

2. **`FRONTEND_URL`**
   ```
   https://your-project.vercel.app
   ```

3. 環境変数を更新した後、**再デプロイ**を実行

---

### 📋 ステップ5: Google OAuth設定の更新（5分）

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

### 📋 ステップ6: 動作確認（2分）

1. `https://your-project.vercel.app/health` にアクセス
   - 期待されるレスポンス: `{"status":"ok","timestamp":"..."}`

2. `https://your-project.vercel.app` にアクセス
   - 「Googleでログイン」をクリック
   - OAuth認証が正常に動作することを確認

---

## ✅ チェックリスト

- [ ] Upstash Redisを作成して接続URLを取得
- [ ] Vercelアカウントを作成
- [ ] GitHubリポジトリをVercelにインポート
- [ ] 初回デプロイを実行
- [ ] 環境変数を設定（`REDIS_URL`以外は`.env.production`からコピー）
- [ ] デプロイ後のドメインを確認
- [ ] `GOOGLE_REDIRECT_URI`と`FRONTEND_URL`を更新
- [ ] 再デプロイを実行
- [ ] Google Cloud ConsoleでリダイレクトURIを更新
- [ ] ヘルスチェックとOAuth認証をテスト

---

## 🆘 よくある問題

### Q: 環境変数を設定したのに読み込まれない

A: 環境変数を変更した後は**再デプロイ**が必要です。Vercelダッシュボードで「Deployments」タブから再デプロイを実行してください。

### Q: Redis接続エラーが発生する

A: `REDIS_URL`が正しく設定されているか確認してください。Upstashダッシュボードで接続情報を再確認してください。

### Q: OAuth認証が失敗する

A: 
- `GOOGLE_REDIRECT_URI`がVercelのドメインと一致しているか確認
- Google Cloud ConsoleでリダイレクトURIが登録されているか確認

---

## 📚 詳細情報

より詳細な情報が必要な場合は、以下を参照してください：

- [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) - 環境変数設定の詳細ガイド
- [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) - Vercelデプロイの詳細ガイド

---

**準備ができたら、ステップ1から始めてください！** 🚀
