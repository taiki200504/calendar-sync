#!/bin/bash

# CalendarSync OS API テスト用 cURL コマンド集
# 
# 使用方法:
#   1. 環境変数を設定
#   2. 必要なコマンドを実行
#
# 環境変数:
#   BASE_URL: APIのベースURL (デフォルト: http://localhost:3000/api)
#   SESSION_COOKIE: セッションクッキー (OAuth認証後に取得)

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
SESSION_COOKIE="${SESSION_COOKIE:-connect.sid=YOUR_SESSION_ID}"

echo "=========================================="
echo "CalendarSync OS API テストコマンド集"
echo "=========================================="
echo "BASE_URL: $BASE_URL"
echo ""

# ==========================================
# 1. OAuth認証
# ==========================================
echo "1. OAuth認証"
echo "----------------------------------------"

echo "# OAuth認証URL取得（リダイレクト）"
echo "curl -v -L $BASE_URL/auth/google -c cookies.txt -b cookies.txt"
echo ""

echo "# 認証状態確認"
echo "curl -X GET $BASE_URL/auth/me \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

echo "# ログアウト"
echo "curl -X POST $BASE_URL/auth/logout \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

# ==========================================
# 2. アカウント管理
# ==========================================
echo "2. アカウント管理"
echo "----------------------------------------"

echo "# アカウント一覧取得"
echo "curl -X GET $BASE_URL/accounts \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

echo "# アカウント削除"
echo "curl -X DELETE $BASE_URL/accounts/ACCOUNT_UUID \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

# ==========================================
# 3. カレンダー管理
# ==========================================
echo "3. カレンダー管理"
echo "----------------------------------------"

echo "# カレンダー一覧取得"
echo "curl -X GET $BASE_URL/calendars \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

echo "# カレンダー設定更新"
echo "curl -X PATCH $BASE_URL/calendars/CALENDAR_UUID \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"sync_enabled\": true,"
echo "    \"sync_direction\": \"bidirectional\","
echo "    \"privacy_mode\": \"detail\""
echo "  }'"
echo ""

echo "# カレンダー同期（Google Calendar APIから取得）"
echo "curl -X POST $BASE_URL/calendars/ACCOUNT_UUID/sync \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

# ==========================================
# 4. FreeBusy検索
# ==========================================
echo "4. FreeBusy検索"
echo "----------------------------------------"

echo "# 空き時間検索（正常系）"
echo "curl -X POST $BASE_URL/freebusy/search \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"accountIds\": [\"ACCOUNT_UUID_1\", \"ACCOUNT_UUID_2\"],"
echo "    \"startDate\": \"2024-01-15T00:00:00Z\","
echo "    \"endDate\": \"2024-01-20T23:59:59Z\","
echo "    \"duration\": 60,"
echo "    \"workingHours\": {"
echo "      \"start\": 9,"
echo "      \"end\": 18"
echo "    },"
echo "    \"buffer\": 15,"
echo "    \"travelTime\": 30,"
echo "    \"preferredDays\": [1, 2, 3, 4, 5]"
echo "  }'"
echo ""

echo "# 空き時間検索（異常系: accountIdsが空）"
echo "curl -X POST $BASE_URL/freebusy/search \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"accountIds\": [],"
echo "    \"startDate\": \"2024-01-15T00:00:00Z\","
echo "    \"endDate\": \"2024-01-20T23:59:59Z\","
echo "    \"duration\": 60"
echo "  }'"
echo ""

echo "# 空き時間検索（異常系: startDate/endDateが未指定）"
echo "curl -X POST $BASE_URL/freebusy/search \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"accountIds\": [\"ACCOUNT_UUID_1\"],"
echo "    \"duration\": 60"
echo "  }'"
echo ""

# ==========================================
# 5. 除外ルール管理
# ==========================================
echo "5. 除外ルール管理"
echo "----------------------------------------"

echo "# 除外ルール一覧取得"
echo "curl -X GET $BASE_URL/rules/exclusions \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

echo "# 除外ルール作成"
echo "curl -X POST $BASE_URL/rules/exclusions \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"condition_type\": \"title_contains\","
echo "    \"value\": \"会議\""
echo "  }'"
echo ""

echo "# 除外ルール削除"
echo "curl -X DELETE $BASE_URL/rules/exclusions/RULE_UUID \\"
echo "  -H 'Cookie: $SESSION_COOKIE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""

echo "=========================================="
echo "使用方法:"
echo "1. 環境変数を設定:"
echo "   export BASE_URL=http://localhost:3000/api"
echo "   export SESSION_COOKIE='connect.sid=YOUR_SESSION_ID'"
echo ""
echo "2. このスクリプトを実行してコマンドを表示:"
echo "   bash tests/curl-commands.sh"
echo ""
echo "3. 必要なコマンドをコピーして実行"
echo "=========================================="
