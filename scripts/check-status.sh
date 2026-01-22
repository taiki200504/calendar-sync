#!/bin/bash

# CalendarSync OS サーバーステータス確認スクリプト

echo "📊 CalendarSync OS サーバーステータス"
echo "=================================="
echo ""

# Backendの確認
if lsof -ti:3000 > /dev/null 2>&1; then
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend: 実行中 (http://localhost:3000)"
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
  else
    echo "⚠️  Backend: ポート3000は使用中ですが、応答しません"
  fi
else
  echo "❌ Backend: 停止中"
fi

echo ""

# Frontendの確認
if lsof -ti:5173 > /dev/null 2>&1; then
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend: 実行中 (http://localhost:5173)"
  else
    echo "⚠️  Frontend: ポート5173は使用中ですが、応答しません"
  fi
else
  echo "❌ Frontend: 停止中"
fi

echo ""

# Dockerコンテナの確認
echo "🐳 Dockerコンテナ:"
if docker ps | grep -q "calendar-sync-postgres"; then
  echo "   ✅ PostgreSQL: 実行中"
else
  echo "   ❌ PostgreSQL: 停止中"
fi

if docker ps | grep -q "calendar-sync-redis"; then
  echo "   ✅ Redis: 実行中"
else
  echo "   ❌ Redis: 停止中"
fi

echo ""

# 実行中のプロセス
echo "🔄 実行中のプロセス:"
PROCESSES=$(ps aux | grep -E "tsx|vite" | grep -v grep | wc -l | tr -d ' ')
echo "   $PROCESSES 個のプロセスが実行中"
