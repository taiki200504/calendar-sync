#!/bin/bash

# デプロイスクリプト
# 使用方法: ./scripts/deploy.sh [environment]
# environment: production (デフォルト)

set -e

ENVIRONMENT=${1:-production}
ENV_FILE=".env.${ENVIRONMENT}"

echo "🚀 CalendarSync OS デプロイスクリプト"
echo "環境: ${ENVIRONMENT}"
echo ""

# 環境変数ファイルの確認
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ エラー: ${ENV_FILE} が見つかりません"
    echo "💡 ヒント: .env.production.example をコピーして ${ENV_FILE} を作成してください"
    exit 1
fi

echo "✅ 環境変数ファイルを確認: ${ENV_FILE}"

# Dockerの確認
if ! command -v docker &> /dev/null; then
    echo "❌ エラー: Dockerがインストールされていません"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ エラー: Docker Composeがインストールされていません"
    exit 1
fi

echo "✅ DockerとDocker Composeを確認"

# イメージをビルド
echo ""
echo "📦 Dockerイメージをビルド中..."
docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" build

# サービスを起動
echo ""
echo "🚀 サービスを起動中..."
docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d

# データベースマイグレーション
echo ""
echo "🗄️  データベースマイグレーションを実行中..."
sleep 10  # データベースとバックエンドが起動するまで待機
docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" exec -T backend npm run migrate:up || {
    echo "⚠️  マイグレーションでエラーが発生しました。手動で実行してください:"
    echo "   docker-compose -f docker-compose.prod.yml --env-file $ENV_FILE exec backend npm run migrate:up"
}

# ヘルスチェック
echo ""
echo "🏥 ヘルスチェック中..."
sleep 5
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ アプリケーションが正常に起動しました"
else
    echo "⚠️  ヘルスチェックに失敗しました。ログを確認してください:"
    echo "   docker-compose -f docker-compose.prod.yml --env-file $ENV_FILE logs"
fi

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "📊 ログを確認:"
echo "   docker-compose -f docker-compose.prod.yml --env-file $ENV_FILE logs -f"
echo ""
echo "🛑 停止:"
echo "   docker-compose -f docker-compose.prod.yml --env-file $ENV_FILE down"
