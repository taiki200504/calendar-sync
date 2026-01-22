# 🚀 Vercelデプロイ - クイックスタート

## ✅ 完了した設定

- ✅ `vercel.json` - Vercel設定ファイル
- ✅ `api/index.ts` - Serverless Functions（Backend API）
- ✅ `frontend/vercel.json` - Frontend設定
- ✅ `.vercelignore` - デプロイ除外ファイル

## 📋 デプロイ前の準備

### 1. 環境変数の設定

VercelダッシュボードまたはCLIで以下の環境変数を設定：

```bash
# 必須環境変数
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://default:password@host:port
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google/callback
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
SESSION_SECRET=your-session-secret-key-min-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key
FRONTEND_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### 2. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でOAuth 2.0 クライアント ID を作成
2. **承認済みのリダイレクトURI**に以下を追加：
   ```
   https://your-domain.vercel.app/api/auth/google/callback
   ```

## 🚀 デプロイ手順

### 方法1: Vercel CLI（推奨）

```bash
# 1. Vercel CLIをインストール
npm i -g vercel

# 2. ログイン
vercel login

# 3. プロジェクトをリンク
vercel link

# 4. 環境変数を設定（対話形式）
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_REDIRECT_URI
vercel env add JWT_SECRET
vercel env add SESSION_SECRET
vercel env add ENCRYPTION_KEY
vercel env add FRONTEND_URL

# 5. デプロイ
vercel --prod
```

### 方法2: GitHub連携（推奨）

1. GitHubリポジトリにプッシュ
2. [Vercelダッシュボード](https://vercel.com/dashboard)で「New Project」
3. GitHubリポジトリを選択
4. プロジェクト設定：
   - **Framework Preset**: Other
   - **Root Directory**: `./` (ルート)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
5. 環境変数を設定（Settings > Environment Variables）
6. 「Deploy」をクリック

### 方法3: Vercelダッシュボード

1. [Vercelダッシュボード](https://vercel.com/dashboard)で「New Project」
2. Gitリポジトリをインポート
3. 設定を完了してデプロイ

## 📝 重要な注意事項

### API URL設定

Frontendは自動的に`/api`を使用します（`VITE_API_URL`が未設定の場合）。
Vercel環境では、`/api/*`が自動的に`api/index.ts`にルーティングされます。

### セッション管理

Vercel Serverless Functionsでは、メモリベースのセッションストアは推奨されません。
本番環境では、外部ストア（Redis等）を使用することを強く推奨します。

### ワーカー処理

BullMQワーカーはVercel Serverless Functionsでは実行できません。
バックグラウンドジョブが必要な場合は、別のサービスを使用してください。

## 🔍 トラブルシューティング

### ビルドエラー

```bash
# ローカルでビルドをテスト
cd frontend
npm install
npm run build
```

### APIルートが404エラー

- `vercel.json`の`rewrites`設定を確認
- `/api/*`のパスが正しく`api/index.ts`にルーティングされているか確認

### 環境変数が読み込まれない

- Vercelダッシュボードで環境変数が正しく設定されているか確認
- 環境変数は**Production**、**Preview**、**Development**の各環境で設定が必要

## 📚 詳細情報

詳細な手順は `VERCEL_DEPLOY.md` を参照してください。
