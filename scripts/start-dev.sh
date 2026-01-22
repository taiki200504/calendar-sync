#!/bin/bash

# CalendarSync OS 開発サーバー起動スクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 CalendarSync OS 開発サーバーを起動します..."
echo ""

# 既存のプロセスを停止
echo "📋 既存のプロセスを確認中..."
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# ポートをクリア
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Dockerコンテナの確認
echo "🐳 Dockerコンテナを確認中..."
if ! docker ps | grep -q "calendar-sync-postgres"; then
  echo "⚠️  PostgreSQLコンテナが起動していません。起動しますか？ (y/n)"
  read -r response
  if [[ "$response" =~ ^[Yy]$ ]]; then
    cd "$PROJECT_ROOT"
    docker-compose up -d
    echo "✅ Dockerコンテナを起動しました"
  fi
fi

if ! docker ps | grep -q "calendar-sync-redis"; then
  echo "⚠️  Redisコンテナが起動していません。起動しますか？ (y/n)"
  read -r response
  if [[ "$response" =~ ^[Yy]$ ]]; then
    cd "$PROJECT_ROOT"
    docker-compose up -d
    echo "✅ Dockerコンテナを起動しました"
  fi
fi

# Backendの起動
echo ""
echo "🔧 Backendサーバーを起動中..."
cd "$PROJECT_ROOT/backend"
npm run dev > /tmp/backend-dev.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Frontendの起動
echo "🎨 Frontendサーバーを起動中..."
cd "$PROJECT_ROOT/frontend"
npm run dev > /tmp/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# 起動確認
echo ""
echo "⏳ サーバーの起動を待機中..."
sleep 6

# ヘルスチェック
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Backend: http://localhost:3000"
else
  echo "❌ Backendの起動に失敗しました"
  echo "   ログを確認: tail -f /tmp/backend-dev.log"
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "✅ Frontend: http://localhost:5173"
else
  echo "❌ Frontendの起動に失敗しました"
  echo "   ログを確認: tail -f /tmp/frontend-dev.log"
fi

echo ""
echo "📝 ログの確認方法:"
echo "   Backend:  tail -f /tmp/backend-dev.log"
echo "   Frontend: tail -f /tmp/frontend-dev.log"
echo ""
echo "🛑 停止方法:"
echo "   pkill -f 'tsx watch' && pkill -f 'vite'"
echo ""
