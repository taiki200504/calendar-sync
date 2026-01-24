# ⚡ クイックスタート：デプロイ手順

## 🎯 現状からデプロイまでの最短手順

### 📋 ステップ1: 不足している環境変数を設定

`.env.production`ファイルを開いて、以下の2つの値を設定してください：

#### 1. REDIS_URL の設定

**オプションA: Docker ComposeのRedisを使用（簡単・推奨）**

```bash
REDIS_URL=redis://redis:6379
```

**オプションB: Upstash Redisを使用（本番環境推奨）**

1. [Upstash](https://upstash.com/)でアカウント作成（無料枠あり）
2. 「Create Database」をクリック
3. Redis Databaseを作成
4. 「REST URL」または「Redis URL」をコピー
5. `.env.production`に設定：
   ```
   REDIS_URL=redis://default:[password]@[host]:[port]
   ```

#### 2. FRONTEND_URL の設定

実際のドメインに変更してください：

```bash
# 本番環境の場合
FRONTEND_URL=https://calendarsync.com

# または、ローカルでテストする場合
FRONTEND_URL=http://localhost
```

**注意**: `GOOGLE_REDIRECT_URI`も同じドメインに合わせて設定してください：
```bash
GOOGLE_REDIRECT_URI=https://calendarsync.com/api/auth/google/callback
```

---

### 📋 ステップ2: 環境変数の確認

```bash
# 必須環境変数がすべて設定されているか確認
./scripts/check-env.sh
```

すべての項目が ✅ になっていることを確認してください。

---

### 📋 ステップ3: Google OAuth設定の確認

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」を開く
4. OAuth 2.0 クライアントIDを確認
5. **承認済みのリダイレクトURI**に以下が追加されているか確認：
   ```
   https://calendarsync.com/api/auth/google/callback
   ```
   （実際のドメインに置き換えてください）

---

### 📋 ステップ4: デプロイ実行

```bash
# デプロイスクリプトを実行（推奨）
./scripts/deploy.sh production
```

または、手動で実行：

```bash
# 1. イメージをビルド
docker-compose -f docker-compose.prod.yml --env-file .env.production build

# 2. サービスを起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 3. データベースマイグレーション（10秒待機後）
sleep 10
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migrate:up
```

---

### 📋 ステップ5: 動作確認

#### 5-1. コンテナの状態確認

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production ps
```

すべてのコンテナが `Up` 状態であることを確認。

#### 5-2. ヘルスチェック

```bash
curl http://localhost/health
```

期待されるレスポンス：
```json
{"status":"ok","timestamp":"..."}
```

#### 5-3. ブラウザで確認

1. `http://localhost` または実際のドメインにアクセス
2. 「Googleでログイン」をクリック
3. 認証が正常に動作することを確認

---

## 🔧 トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker-compose -f docker-compose.prod.yml --env-file .env.production logs backend

# 環境変数を再確認
./scripts/check-env.sh
```

### データベース接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- Supabaseを使用する場合、SSL接続が必要（既に設定済み）

### OAuth認証エラー

- `GOOGLE_REDIRECT_URI`がGoogle Cloud Consoleに登録されているか確認
- `FRONTEND_URL`と`GOOGLE_REDIRECT_URI`のドメインが一致しているか確認

---

## 📝 よく使うコマンド

```bash
# ログ確認
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f

# コンテナを再起動
docker-compose -f docker-compose.prod.yml --env-file .env.production restart backend

# コンテナを停止
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# 環境変数チェック
./scripts/check-env.sh
```

---

## ✅ チェックリスト

デプロイ前に確認：

- [ ] `REDIS_URL`が設定されている
- [ ] `FRONTEND_URL`が実際のドメインに設定されている
- [ ] `GOOGLE_REDIRECT_URI`が`FRONTEND_URL`と一致している
- [ ] Google Cloud ConsoleでリダイレクトURIが登録されている
- [ ] `./scripts/check-env.sh`ですべての環境変数が ✅ になっている

---

## 📚 詳細情報

より詳細な情報が必要な場合は、以下を参照してください：

- [DEPLOYMENT_STEPS_JA.md](./DEPLOYMENT_STEPS_JA.md) - 詳細なデプロイ手順
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 英語版デプロイガイド
- [DEPLOY_STATUS.md](./DEPLOY_STATUS.md) - 現在のデプロイ準備状況

---

**準備ができたら、ステップ4から始めてください！** 🚀
