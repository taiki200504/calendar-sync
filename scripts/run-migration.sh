#!/bin/bash

# データベースマイグレーション実行スクリプト
# 使用方法: ./scripts/run-migration.sh [up|down]

set -e

MIGRATION_COMMAND=${1:-up}

# .env.productionファイルから環境変数を読み込む
if [ -f ".env.production" ]; then
    echo "📄 .env.productionファイルから環境変数を読み込み中..."
    export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)
else
    echo "⚠️  .env.productionファイルが見つかりません"
    echo "💡 環境変数を手動で設定してください:"
    echo "   export DATABASE_URL='your-database-url'"
    exit 1
fi

# DATABASE_URLが設定されているか確認
if [ -z "$DATABASE_URL" ]; then
    echo "❌ エラー: DATABASE_URLが設定されていません"
    echo "💡 .env.productionファイルにDATABASE_URLを設定してください"
    exit 1
fi

echo "✅ DATABASE_URLが設定されています"
echo "🔗 接続先: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')" # パスワードを隠す

# backendディレクトリに移動
cd backend

# マイグレーションを実行
if [ "$MIGRATION_COMMAND" = "up" ]; then
    echo "🚀 マイグレーションを実行中..."
    npm run migrate:up
elif [ "$MIGRATION_COMMAND" = "down" ]; then
    echo "⬇️  マイグレーションをロールバック中..."
    npm run migrate:down
else
    echo "❌ エラー: 無効なコマンドです。'up' または 'down' を指定してください"
    exit 1
fi

echo "✅ マイグレーションが完了しました"
