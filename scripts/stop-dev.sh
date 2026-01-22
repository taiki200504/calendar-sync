#!/bin/bash

# CalendarSync OS 開発サーバー停止スクリプト

echo "🛑 CalendarSync OS 開発サーバーを停止します..."

# プロセスを停止
pkill -f "tsx watch src/index.ts" 2>/dev/null && echo "✅ Backendを停止しました" || echo "⚠️  Backendプロセスが見つかりませんでした"
pkill -f "vite" 2>/dev/null && echo "✅ Frontendを停止しました" || echo "⚠️  Frontendプロセスが見つかりませんでした"

# ポートをクリア
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

sleep 1

echo "✅ 全てのプロセスを停止しました"
