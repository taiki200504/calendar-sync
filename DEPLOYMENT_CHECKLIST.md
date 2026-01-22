# デプロイチェックリスト

## ✅ 完了した項目

- [x] TypeScriptビルドエラーの修正
- [x] Dockerfileの作成（Backend、Frontend）
- [x] docker-compose.prod.ymlの作成
- [x] nginx.confの作成
- [x] .dockerignoreの作成
- [x] デプロイスクリプトの作成
- [x] 環境変数テンプレートの作成
- [x] デプロイドキュメントの作成

## 📋 デプロイ前の確認事項

### 1. 環境変数の設定

`.env.production`ファイルを作成し、以下の値を設定してください：

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
SESSION_SECRET=your-session-secret-key-min-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key

# Server
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Frontend
VITE_API_URL=/api
```

### 2. セキュリティキーの生成

```bash
# JWT_SECRETとSESSION_SECRETを生成
openssl rand -base64 32

# ENCRYPTION_KEYを生成（32文字の16進数）
openssl rand -hex 16
```

### 3. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. OAuth同意画面を設定
3. 認証情報を作成
4. 承認済みのリダイレクトURIに以下を追加：
   - `https://yourdomain.com/api/auth/google/callback`

### 4. データベースの準備

#### Supabaseを使用する場合（推奨）

1. Supabaseプロジェクトを作成
2. データベースURLを取得
3. マイグレーションを実行：
   ```bash
   cd backend
   npm run migrate:up
   ```

#### 自前のPostgreSQLを使用する場合

1. PostgreSQLサーバーをセットアップ
2. データベースを作成
3. マイグレーションを実行

### 5. Redisの準備

- **Upstash Redis**（サーバーレス、推奨）
- **Redis Cloud**
- **自前のRedisサーバー**

## 🚀 デプロイ手順

### 方法1: デプロイスクリプトを使用（推奨）

```bash
./scripts/deploy.sh production
```

### 方法2: 手動デプロイ

```bash
# ビルドと起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# マイグレーション
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up
```

## 🔍 デプロイ後の確認

1. **ヘルスチェック**
   ```bash
   curl http://localhost/health
   ```

2. **ログの確認**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

3. **OAuth認証の確認**
   - ブラウザで `https://yourdomain.com` にアクセス
   - Googleログインが動作することを確認

4. **データベースの確認**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run check-migration
   ```

## 📝 トラブルシューティング

### ポートが既に使用されている

`docker-compose.prod.yml`でポートを変更してください。

### データベース接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- SSL設定が正しいか確認（Supabaseの場合は必須）

### セッションが保持されない

- `SESSION_SECRET`が設定されているか確認
- クッキーの`sameSite`設定を確認

## 🔄 更新手順

1. 最新のコードを取得
   ```bash
   git pull origin main
   ```

2. イメージを再ビルド
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production build
   ```

3. サービスを再起動
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

4. マイグレーションを実行（必要に応じて）
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up
   ```
