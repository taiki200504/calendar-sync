# 🚀 デプロイ環境実装手順（日本語版）

## 📊 現状の確認

### ✅ 設定済み項目
- ✅ DATABASE_URL（Supabase接続文字列）
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ GOOGLE_REDIRECT_URI
- ✅ JWT_SECRET
- ✅ SESSION_SECRET
- ✅ ENCRYPTION_KEY

### ❌ 未設定項目（要対応）
- ❌ **REDIS_URL** - ジョブキュー用（必須）
- ❌ **FRONTEND_URL** - フロントエンドのURL（必須）

---

## 🎯 デプロイ方法の選択

このプロジェクトは2つのデプロイ方法をサポートしています：

### 方法1: Docker Compose（推奨・フルスタック）
- バックエンド、フロントエンド、データベース、RedisをすべてDockerで管理
- 本番環境での運用に適している
- 完全な制御が可能

### 方法2: Vercel（サーバーレス）
- フロントエンドとAPIをVercelにデプロイ
- サーバーレス環境での実行
- スケーラビリティが高い

---

## 📋 方法1: Docker Compose デプロイ手順

### ステップ1: 環境変数の最終確認と設定

`.env.production`ファイルを開いて、以下の2つの値を設定します：

```bash
# Redis URL（docker-composeのRedisを使用する場合）
REDIS_URL=redis://redis:6379

# または、外部のRedis（Upstash等）を使用する場合
# REDIS_URL=redis://default:[password]@[host]:[port]

# フロントエンドURL（実際のドメインに変更）
FRONTEND_URL=https://yourdomain.com
# または、ローカルでテストする場合
# FRONTEND_URL=http://localhost
```

**Redisの設定オプション：**

#### オプションA: Docker ComposeのRedisを使用（簡単）
```bash
REDIS_URL=redis://redis:6379
```

#### オプションB: Upstash Redisを使用（推奨・本番環境）
1. [Upstash](https://upstash.com/)でアカウント作成
2. Redis Databaseを作成
3. REST URLをコピー
4. `.env.production`に設定：
   ```
   REDIS_URL=redis://default:[password]@[host]:[port]
   ```

### ステップ2: 環境変数の検証

```bash
# 環境変数が正しく設定されているか確認
./scripts/check-env.sh
```

すべての必須環境変数が設定されていることを確認してください。

### ステップ3: Google OAuth設定の確認

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」を開く
4. OAuth 2.0 クライアントIDを確認
5. **承認済みのリダイレクトURI**に以下が追加されているか確認：
   ```
   https://yourdomain.com/api/auth/google/callback
   ```
   （`yourdomain.com`は実際のドメインに置き換え）

### ステップ4: デプロイ実行

#### 方法A: デプロイスクリプトを使用（推奨）

```bash
# デプロイスクリプトを実行
./scripts/deploy.sh production
```

このスクリプトは以下を自動実行します：
- Dockerイメージのビルド
- コンテナの起動
- データベースマイグレーション
- ヘルスチェック

#### 方法B: 手動デプロイ

```bash
# 1. 既存のコンテナを停止（実行中の場合）
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# 2. イメージをビルド
docker-compose -f docker-compose.prod.yml --env-file .env.production build

# 3. サービスを起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 4. データベースマイグレーション（バックエンドが起動するまで10秒待機）
sleep 10
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migrate:up
```

### ステップ5: デプロイ後の確認

#### 5-1. コンテナの状態確認

```bash
# すべてのコンテナが起動しているか確認
docker-compose -f docker-compose.prod.yml --env-file .env.production ps
```

すべてのコンテナが`Up`状態であることを確認してください。

#### 5-2. ヘルスチェック

```bash
# ヘルスチェックエンドポイントにアクセス
curl http://localhost/health
```

期待されるレスポンス：
```json
{
  "status": "ok",
  "timestamp": "2026-01-24T..."
}
```

#### 5-3. ログの確認

```bash
# すべてのログを確認
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f

# バックエンドのログのみ
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f backend

# フロントエンドのログのみ
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f frontend
```

エラーがないか確認してください。

#### 5-4. OAuth認証のテスト

1. ブラウザで `http://localhost` または `https://yourdomain.com` にアクセス
2. 「Googleでログイン」をクリック
3. Google認証が正常に動作することを確認

#### 5-5. データベース接続の確認

```bash
# マイグレーション状態を確認
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run check-migration
```

---

## 📋 方法2: Vercel デプロイ手順

### ステップ1: Vercelアカウントの準備

1. [Vercel](https://vercel.com/)でアカウント作成
2. [Vercel CLI](https://vercel.com/docs/cli)をインストール（オプション）

```bash
npm install -g vercel
```

### ステップ2: 外部サービスの準備

#### PostgreSQL（Supabase推奨）
- 既に`.env.production`に設定済み

#### Redis（Upstash推奨）
1. [Upstash](https://upstash.com/)でアカウント作成
2. Redis Databaseを作成
3. REST URLを取得

### ステップ3: Vercel環境変数の設定

VercelダッシュボードまたはCLIで環境変数を設定：

```bash
# Vercel CLIで設定
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_REDIRECT_URI
vercel env add JWT_SECRET
vercel env add SESSION_SECRET
vercel env add ENCRYPTION_KEY
vercel env add FRONTEND_URL
vercel env add NODE_ENV production
```

**重要**: `GOOGLE_REDIRECT_URI`はVercelのドメインに合わせて設定：
```
https://your-project.vercel.app/api/auth/google/callback
```

### ステップ4: Google OAuth設定の更新

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. OAuth 2.0 クライアントIDを編集
3. **承認済みのリダイレクトURI**に以下を追加：
   ```
   https://your-project.vercel.app/api/auth/google/callback
   ```

### ステップ5: デプロイ

#### 方法A: Vercel CLI

```bash
# Vercelにログイン
vercel login

# プロジェクトをリンク
vercel link

# 本番環境にデプロイ
vercel --prod
```

#### 方法B: GitHub連携（推奨）

1. GitHubリポジトリにコードをプッシュ
2. [Vercelダッシュボード](https://vercel.com/dashboard)で「New Project」をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定：
   - **Framework Preset**: Vite
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 環境変数を設定（ステップ3で設定したもの）
6. 「Deploy」をクリック

### ステップ6: デプロイ後の確認

1. Vercelダッシュボードでデプロイ状態を確認
2. デプロイされたURLにアクセス
3. OAuth認証をテスト
4. ログを確認（Vercelダッシュボードの「Functions」タブ）

---

## 🔧 トラブルシューティング

### 問題1: コンテナが起動しない

**確認事項：**
```bash
# ログを確認
docker-compose -f docker-compose.prod.yml --env-file .env.production logs backend

# 環境変数が正しく設定されているか確認
./scripts/check-env.sh
```

**よくある原因：**
- 環境変数にプレースホルダーが残っている
- データベース接続エラー
- ポートが既に使用されている

### 問題2: データベース接続エラー

**確認事項：**
```bash
# DATABASE_URLが正しく設定されているか確認
grep DATABASE_URL .env.production

# Supabaseを使用する場合、SSL接続が必要
# 接続文字列に`?sslmode=require`が含まれているか確認
```

### 問題3: OAuth認証が失敗する

**確認事項：**
1. `GOOGLE_REDIRECT_URI`が正しく設定されているか
2. Google Cloud ConsoleでリダイレクトURIが登録されているか
3. `GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が正しいか

### 問題4: セッションが保持されない

**確認事項：**
- `SESSION_SECRET`が設定されているか
- クッキーの`sameSite`設定を確認
- HTTPSが有効になっているか（本番環境）

---

## 📝 よく使うコマンド

### Docker Compose

```bash
# ログ確認
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f

# コンテナの状態確認
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# コンテナを再起動
docker-compose -f docker-compose.prod.yml --env-file .env.production restart backend

# コンテナを停止
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# コンテナを停止してボリュームも削除（データも削除される）
docker-compose -f docker-compose.prod.yml --env-file .env.production down -v

# バックエンドコンテナ内でコマンド実行
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migrate:up
```

### 環境変数チェック

```bash
# 必須環境変数の確認
./scripts/check-env.sh
```

---

## 🔄 更新手順

### Docker Composeの場合

```bash
# 1. 最新のコードを取得
git pull origin main

# 2. イメージを再ビルド
docker-compose -f docker-compose.prod.yml --env-file .env.production build

# 3. サービスを再起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 4. マイグレーションを実行（必要に応じて）
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migrate:up
```

### Vercelの場合

```bash
# コードを更新してプッシュ
git add .
git commit -m "Update"
git push

# Vercelが自動的にデプロイします（GitHub連携の場合）
# または手動でデプロイ
vercel --prod
```

---

## ✅ デプロイチェックリスト

デプロイ前に以下を確認してください：

- [ ] `.env.production`のすべての環境変数が設定されている
- [ ] `REDIS_URL`が設定されている
- [ ] `FRONTEND_URL`が実際のドメインに設定されている
- [ ] Google OAuthのリダイレクトURIが正しく設定されている
- [ ] データベース接続が正常に動作する
- [ ] すべてのコンテナが正常に起動する
- [ ] ヘルスチェックが成功する
- [ ] OAuth認証が正常に動作する
- [ ] ログにエラーがない

---

## 📚 参考ドキュメント

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 詳細なデプロイガイド
- [DEPLOY_STATUS.md](./DEPLOY_STATUS.md) - 現在のデプロイ準備状況
- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - 環境変数設定ガイド
- [OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md) - OAuth設定ガイド
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - クイックデプロイガイド

---

## 🎉 デプロイ完了後

デプロイが完了したら、以下を確認してください：

1. **アプリケーションの動作確認**
   - フロントエンドが正常に表示される
   - Googleログインが動作する
   - カレンダー同期が動作する

2. **パフォーマンスの監視**
   - ログを定期的に確認
   - エラーがないか監視
   - データベース接続が安定しているか確認

3. **セキュリティの確認**
   - HTTPSが有効になっている
   - セッションクッキーが適切に設定されている
   - 環境変数が漏洩していない

---

**質問や問題が発生した場合は、ログを確認してトラブルシューティングセクションを参照してください。**
