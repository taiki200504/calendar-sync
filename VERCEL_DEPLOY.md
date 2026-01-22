# 🚀 Vercelデプロイガイド

## 📋 概要

このプロジェクトをVercelにデプロイする手順です。

**構成:**
- **Frontend**: Vercelに直接デプロイ（Vite/React）
- **Backend**: Vercel Serverless Functions（`api/`ディレクトリ）

## ✅ 前提条件

1. [Vercelアカウント](https://vercel.com/)を作成
2. [Vercel CLI](https://vercel.com/docs/cli)をインストール（オプション）
3. 以下の外部サービスを用意：
   - **PostgreSQL**: Supabase（推奨）または自前のPostgreSQL
   - **Redis**: Upstash（推奨）または自前のRedis

## 🔧 セットアップ手順

### 1. 依存関係のインストール

```bash
# ルートディレクトリ
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. 環境変数の設定

Vercelダッシュボードで環境変数を設定するか、`vercel env`コマンドを使用します。

**必須環境変数:**

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://default:password@host:port

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google/callback

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
SESSION_SECRET=your-session-secret-key-min-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key

# Frontend URL
FRONTEND_URL=https://your-domain.vercel.app

# Node Environment
NODE_ENV=production
```

**Vercel CLIで設定:**

```bash
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_REDIRECT_URI
vercel env add JWT_SECRET
vercel env add SESSION_SECRET
vercel env add ENCRYPTION_KEY
vercel env add FRONTEND_URL
```

### 3. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. OAuth 2.0 クライアント ID を作成
3. **承認済みのリダイレクトURI**に以下を追加：
   ```
   https://your-domain.vercel.app/api/auth/google/callback
   ```

### 4. デプロイ

#### 方法A: Vercel CLI（推奨）

```bash
# Vercelにログイン
vercel login

# プロジェクトをリンク
vercel link

# デプロイ
vercel --prod
```

#### 方法B: GitHub連携（推奨）

1. GitHubリポジトリにプッシュ
2. [Vercelダッシュボード](https://vercel.com/dashboard)で「New Project」をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定：
   - **Framework Preset**: Vite
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 環境変数を設定
6. 「Deploy」をクリック

#### 方法C: Vercelダッシュボード

1. [Vercelダッシュボード](https://vercel.com/dashboard)で「New Project」をクリック
2. Gitリポジトリをインポートまたは手動でアップロード
3. 設定を完了してデプロイ

## 📁 プロジェクト構造

```
.
├── api/
│   └── index.ts          # Vercel Serverless Functions (Backend API)
├── backend/              # Backendソースコード
├── frontend/             # Frontendソースコード
├── vercel.json           # Vercel設定ファイル
└── package.json          # ルートpackage.json
```

## 🔍 トラブルシューティング

### 環境変数が読み込まれない

- Vercelダッシュボードで環境変数が正しく設定されているか確認
- 環境変数は**Production**、**Preview**、**Development**の各環境で設定が必要

### APIルートが404エラー

- `vercel.json`の`routes`設定を確認
- `/api/*`のパスが正しく`api/index.ts`にルーティングされているか確認

### セッションが保持されない

- Vercel Serverless Functionsでは、メモリベースのセッションストアは推奨されません
- 本番環境では外部ストア（Redis等）を使用してください
- `sameSite: 'none'`と`secure: true`が設定されているか確認

### ビルドエラー

```bash
# ローカルでビルドをテスト
cd frontend
npm run build

# Backendのビルドをテスト
cd ../backend
npm run build
```

### データベース接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- Supabaseを使用する場合は、SSL接続が必要です（既に設定済み）

## 📝 注意事項

### Serverless Functionsの制限

1. **実行時間**: 最大60秒（Proプランは300秒）
2. **メモリ**: 最大1024MB
3. **コールドスタート**: 初回リクエストは遅くなる可能性があります

### ワーカー処理

- BullMQワーカーはVercel Serverless Functionsでは実行できません
- バックグラウンドジョブが必要な場合は、別のサービス（Vercel Cron Jobs、外部ワーカーサービス）を使用してください

### セッションストア

- 本番環境では、メモリベースのセッションストアではなく、外部ストア（Redis等）を使用することを強く推奨します

## 🔄 更新手順

```bash
# コードを更新
git add .
git commit -m "Update"
git push

# Vercelが自動的にデプロイします（GitHub連携の場合）
# または手動でデプロイ
vercel --prod
```

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
