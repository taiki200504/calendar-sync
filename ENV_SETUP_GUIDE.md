# 環境変数設定ガイド

## ⚠️ 重要

`.env.production`ファイルには現在プレースホルダー値が設定されています。**実際の値に置き換える必要があります**。

## 📝 設定手順

### 1. データベースURL

#### Supabaseを使用する場合（推奨）

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. プロジェクト設定 > Database > Connection string から接続文字列を取得
3. `.env.production`の`DATABASE_URL`を更新：
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

#### 自前のPostgreSQLを使用する場合

```
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 2. Redis URL

#### Upstash Redisを使用する場合（推奨）

1. [Upstash](https://upstash.com/)でRedisデータベースを作成
2. REST URLを取得
3. `.env.production`の`REDIS_URL`を更新：
   ```
   REDIS_URL=redis://default:[password]@[host]:[port]
   ```

#### 自前のRedisを使用する場合

```
REDIS_URL=redis://host:6379
```

### 3. Google OAuth 2.0

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. APIとサービス > 認証情報 > OAuth 2.0 クライアント ID を作成
3. 承認済みのリダイレクトURIに以下を追加：
   - `https://yourdomain.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (開発用)
4. `.env.production`を更新：
   ```
   GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-actual-client-secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
   ```

### 4. セキュリティキー

以下のコマンドでセキュリティキーを生成してください：

```bash
# JWT_SECRETとSESSION_SECRET（32文字以上）
openssl rand -base64 32

# ENCRYPTION_KEY（32文字の16進数）
openssl rand -hex 16
```

生成した値を`.env.production`に設定：
```
JWT_SECRET=<生成した値>
SESSION_SECRET=<生成した値>
ENCRYPTION_KEY=<生成した値>
```

### 5. フロントエンドURL

実際のドメインに置き換えてください：
```
FRONTEND_URL=https://yourdomain.com
```

## ✅ 設定確認

環境変数が正しく設定されているか確認：

```bash
./scripts/check-env.sh
```

## 🚀 デプロイ

環境変数を設定したら、デプロイを実行：

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🔒 セキュリティ注意事項

- `.env.production`ファイルは**絶対にGitにコミットしないでください**
- 本番環境では、環境変数管理サービス（AWS Secrets Manager、HashiCorp Vaultなど）の使用を推奨します
- セキュリティキーは定期的にローテーションしてください
