#!/bin/bash

# OAuth認証フローのテストスクリプト
# 
# 使用方法:
#   chmod +x scripts/test-oauth-flow.sh
#   ./scripts/test-oauth-flow.sh

BASE_URL="http://localhost:3000/api"
COOKIE_FILE="test-cookies.txt"

echo "=========================================="
echo "OAuth認証フローテスト"
echo "=========================================="
echo ""

# 1. OAuth認証URL取得
echo "1. OAuth認証URL取得..."
echo "GET ${BASE_URL}/auth/google"
echo ""

RESPONSE=$(curl -s -c ${COOKIE_FILE} -L -w "\nHTTP_CODE:%{http_code}" ${BASE_URL}/auth/google)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ OAuth認証URL取得成功 (HTTP $HTTP_CODE)"
  echo "リダイレクト先:"
  echo "$BODY" | grep -i "location:" || echo "Location header not found"
else
  echo "❌ エラー: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi

echo ""
echo "=========================================="
echo "次のステップ:"
echo "1. ブラウザで ${BASE_URL}/auth/google にアクセス"
echo "2. Googleアカウントでログイン"
echo "3. 認証後、セッションクッキーを確認"
echo "=========================================="

# クッキーファイルを削除
rm -f ${COOKIE_FILE}
