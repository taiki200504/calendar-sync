# デプロイガイド

このドキュメントでは、CalendarSync OSを本番環境にデプロイする手順を説明します。

## 📋 前提条件

- Docker と Docker Compose がインストールされていること
- PostgreSQL データベース（Supabase、AWS RDS、または自前のPostgreSQL）
- Redis（オプション、ジョブキュー用）
- Google OAuth 2.0 認証情報

## 🚀 デプロイ方法

### 方法1: Docker Compose（推奨）

#### 1. 環境変数の設定

`.env.production`ファイルを作成し、以下の環境変数を設定します：

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id
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

#### 2. セキュリティキーの生成

```bash
# JWT_SECRETとSESSION_SECRETを生成
openssl rand -base64 32

# ENCRYPTION_KEYを生成（32文字）
openssl rand -hex 16
```

#### 3. Docker Composeで起動

```bash
# 環境変数を読み込んで起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# ログを確認
docker-compose -f docker-compose.prod.yml logs -f
```

#### 4. データベースマイグレーション

```bash
# バックエンドコンテナ内でマイグレーションを実行
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up
```

### 方法2: 個別デプロイ（Vercel、Railway、Herokuなど）

#### Backend（Railway、Heroku、Renderなど）

1. **環境変数の設定**
   - 上記の`.env.production`の内容をプラットフォームの環境変数設定に追加

2. **ビルドコマンド**
   ```bash
   cd backend && npm ci && npm run build
   ```

3. **起動コマンド**
   ```bash
   cd backend && npm start
   ```

4. **マイグレーション**
   ```bash
   cd backend && npm run migrate:up
   ```

#### Frontend（Vercel、Netlifyなど）

1. **環境変数の設定**
   ```
   VITE_API_URL=https://your-backend-domain.com/api
   ```

2. **ビルドコマンド**
   ```bash
   cd frontend && npm ci && npm run build
   ```

3. **出力ディレクトリ**
   ```
   frontend/dist
   ```

## 🔧 本番環境の設定

### Google OAuth 2.0設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. OAuth同意画面を設定
3. 認証情報を作成
4. 承認済みのリダイレクトURIに以下を追加：
   - `https://yourdomain.com/api/auth/google/callback`

### データベース設定

#### Supabaseを使用する場合

1. Supabaseプロジェクトを作成
2. データベースURLを取得
3. `DATABASE_URL`環境変数に設定

```bash
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

#### 自前のPostgreSQLを使用する場合

1. PostgreSQLサーバーをセットアップ
2. データベースを作成
3. `DATABASE_URL`環境変数に設定

### Redis設定

Redisはジョブキュー（BullMQ）で使用されます。オプションですが、推奨されます。

- **Upstash Redis**（サーバーレス、推奨）
- **Redis Cloud**
- **自前のRedisサーバー**

### セッションストア

本番環境では、セッションをRedisに保存することを推奨します。

`backend/src/index.ts`で`connect-redis`を使用するように設定：

```typescript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ... その他の設定
}));
```

## 🔒 セキュリティチェックリスト

- [ ] すべての環境変数が設定されている
- [ ] `JWT_SECRET`と`SESSION_SECRET`が強力なランダム文字列である
- [ ] `ENCRYPTION_KEY`が32文字である
- [ ] HTTPSが有効になっている
- [ ] CORS設定が適切である
- [ ] セッションクッキーが`Secure`と`HttpOnly`に設定されている
- [ ] データベース接続がSSLを使用している（本番環境）

## 📊 ヘルスチェック

アプリケーションのヘルスチェックエンドポイント：

```
GET /health
```

レスポンス：
```json
{
  "status": "ok",
  "timestamp": "2026-01-22T14:00:00.000Z"
}
```

## 🐛 トラブルシューティング

### データベース接続エラー

```bash
# 接続を確認
docker-compose -f docker-compose.prod.yml exec backend npm run check-migration
```

### マイグレーションエラー

```bash
# マイグレーション状態を確認
docker-compose -f docker-compose.prod.yml exec backend npm run check-migration

# マイグレーションを実行
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up
```

### ログの確認

```bash
# すべてのログ
docker-compose -f docker-compose.prod.yml logs -f

# バックエンドのみ
docker-compose -f docker-compose.prod.yml logs -f backend

# フロントエンドのみ
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## 📝 デプロイ後の確認事項

1. **ヘルスチェック**
   ```bash
   curl https://yourdomain.com/health
   ```

2. **OAuth認証**
   - ログインページにアクセス
   - Google認証が正常に動作することを確認

3. **データベース**
   - アカウントが正常に作成されることを確認
   - カレンダー同期が動作することを確認

4. **ログ**
   - エラーログがないことを確認
   - 正常に動作していることを確認

## 🔄 更新手順

1. 最新のコードを取得
   ```bash
   git pull origin main
   ```

2. イメージを再ビルド
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

3. サービスを再起動
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. マイグレーションを実行（必要に応じて）
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up
   ```

## 📚 参考リンク

- [Docker Compose公式ドキュメント](https://docs.docker.com/compose/)
- [Google OAuth 2.0設定ガイド](./OAUTH_SETUP_GUIDE.md)
- [環境変数設定ガイド](./ENV_SETUP.md)
