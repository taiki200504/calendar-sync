#!/bin/bash

# 環境変数チェックスクリプト

ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE が見つかりません"
  echo "📝 .env.production.example をコピーして作成してください:"
  echo "   cp .env.production.example .env.production"
  exit 1
fi

echo "✅ $ENV_FILE が見つかりました"
echo ""
echo "📋 必須環境変数の確認:"
echo ""

REQUIRED_VARS=(
  "DATABASE_URL"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "GOOGLE_REDIRECT_URI"
  "JWT_SECRET"
  "SESSION_SECRET"
  "ENCRYPTION_KEY"
  "FRONTEND_URL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "^${var}=" "$ENV_FILE"; then
    value=$(grep "^${var}=" "$ENV_FILE" | cut -d '=' -f2-)
    if [ -z "$value" ] || [ "$value" = "" ]; then
      echo "⚠️  $var: 設定されていますが値が空です"
      MISSING_VARS+=("$var")
    else
      # 値の一部をマスク
      masked_value="${value:0:10}..."
      echo "✅ $var: 設定済み ($masked_value)"
    fi
  else
    echo "❌ $var: 未設定"
    MISSING_VARS+=("$var")
  fi
done

echo ""

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "✅ すべての必須環境変数が設定されています"
  exit 0
else
  echo "❌ 以下の環境変数が未設定または空です:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "📝 .env.production を編集して、これらの値を設定してください"
  exit 1
fi
