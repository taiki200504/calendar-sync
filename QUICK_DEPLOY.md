# クイックデプロイガイド

## ⚠️ 重要: 環境変数の設定

`.env.production`ファイルの**プレースホルダー値を実際の値に置き換える必要があります**。

## 🚀 デプロイ手順

### 1. 環境変数を設定

`.env.production`ファイルを編集して、実際の値を設定してください。

詳細は `ENV_SETUP_GUIDE.md` を参照してください。

### 2. デプロイスクリプトを使用（推奨）

```bash
./scripts/deploy.sh production
```

### 3. 手動デプロイ

```bash
# コンテナを停止（既に実行中の場合）
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# ビルドと起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# マイグレーション実行（バックエンドが起動するまで少し待ってから）
sleep 10
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migrate:up
```

## 🔍 トラブルシューティング

### 環境変数が読み込まれない

**重要**: `docker-compose`コマンドを実行する際は、必ず`--env-file .env.production`オプションを指定してください。

```bash
# ❌ 間違い（環境変数が読み込まれない）
docker-compose -f docker-compose.prod.yml up -d

# ✅ 正しい（環境変数が読み込まれる）
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### コンテナが再起動を繰り返す

1. 環境変数が正しく設定されているか確認：
   ```bash
   ./scripts/check-env.sh
   ```

2. バックエンドのログを確認：
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production logs backend
   ```

3. プレースホルダー値が残っていないか確認：
   ```bash
   grep -E "your-|\[" .env.production
   ```

### マイグレーションエラー

コンテナが起動するまで待ってから実行してください：

```bash
# コンテナの状態を確認
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# バックエンドが起動していることを確認してから
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migrate:up
```

## 📝 よく使うコマンド

```bash
# ログ確認
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f

# バックエンドのログのみ
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f backend

# コンテナの状態確認
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# コンテナを再起動
docker-compose -f docker-compose.prod.yml --env-file .env.production restart backend

# コンテナを停止
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# コンテナを停止してボリュームも削除
docker-compose -f docker-compose.prod.yml --env-file .env.production down -v
```
