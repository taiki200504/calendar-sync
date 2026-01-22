# デプロイクイックスタート

## 🚀 最短手順

### 1. 環境変数の設定

```bash
# テンプレートをコピー
cp .env.production.example .env.production

# 環境変数を編集
nano .env.production  # またはお好みのエディタ
```

### 2. セキュリティキーの生成

```bash
# JWT_SECRETとSESSION_SECRETを生成
openssl rand -base64 32

# ENCRYPTION_KEYを生成（32文字の16進数）
openssl rand -hex 16
```

生成された値を`.env.production`に設定してください。

### 3. デプロイ実行

```bash
# デプロイスクリプトを実行
./scripts/deploy.sh production
```

または手動で：

```bash
# ビルドと起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# マイグレーション
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up
```

### 4. 確認

```bash
# ヘルスチェック
curl http://localhost/health

# ログ確認
docker-compose -f docker-compose.prod.yml logs -f
```

## 📚 詳細な手順

詳細なデプロイ手順は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

## 🔧 トラブルシューティング

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :80
lsof -i :3000

# docker-compose.prod.ymlでポートを変更
```

### データベース接続エラー

```bash
# 接続を確認
docker-compose -f docker-compose.prod.yml exec backend npm run check-migration
```

### ログの確認

```bash
# すべてのログ
docker-compose -f docker-compose.prod.yml logs

# バックエンドのみ
docker-compose -f docker-compose.prod.yml logs backend

# フロントエンドのみ
docker-compose -f docker-compose.prod.yml logs frontend
```
