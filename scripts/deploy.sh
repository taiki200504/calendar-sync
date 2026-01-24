#!/bin/bash

# CalendarSync OS デプロイスクリプト
# このスクリプトは、git pushとvercel deployの重複を防ぎます

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 CalendarSync OS デプロイスクリプト${NC}"
echo "=================================="
echo ""

# 引数の確認
DEPLOY_METHOD=${1:-"auto"}

case $DEPLOY_METHOD in
  "git")
    echo -e "${YELLOW}📤 Git pushのみ（Vercelが自動デプロイ）${NC}"
    echo ""
    echo "変更をコミットしてプッシュします..."
    git add -A
    read -p "コミットメッセージを入力してください: " commit_message
    if [ -z "$commit_message" ]; then
      commit_message="Update: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    git commit -m "$commit_message"
    git push
    echo ""
    echo -e "${GREEN}✅ Git push完了。Vercelが自動的にデプロイを開始します。${NC}"
    echo ""
    echo "デプロイ状況を確認:"
    echo "  https://vercel.com/dashboard"
    ;;
  
  "vercel")
    echo -e "${YELLOW}🚀 Vercel CLI経由で直接デプロイ${NC}"
    echo ""
    echo "⚠️  注意: Git pushは行いません。"
    echo ""
    read -p "続行しますか？ (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
      echo "デプロイをキャンセルしました。"
      exit 0
    fi
    vercel --prod --yes
    echo ""
    echo -e "${GREEN}✅ Vercelデプロイ完了${NC}"
    ;;
  
  "auto"|*)
    echo -e "${YELLOW}🔄 自動モード（推奨）${NC}"
    echo ""
    echo "1. 変更をコミットしてプッシュ"
    echo "2. Vercelが自動的にデプロイを開始"
    echo ""
    echo -e "${RED}⚠️  重要: Git push後、vercel --prod を手動で実行しないでください！${NC}"
    echo "   Git pushだけでVercelが自動的にデプロイします。"
    echo ""
    read -p "コミットメッセージを入力してください: " commit_message
    if [ -z "$commit_message" ]; then
      commit_message="Update: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    git add -A
    git commit -m "$commit_message"
    git push
    echo ""
    echo -e "${GREEN}✅ Git push完了。Vercelが自動的にデプロイを開始します。${NC}"
    echo ""
    echo "デプロイ状況を確認:"
    echo "  https://vercel.com/dashboard"
    echo ""
    echo -e "${YELLOW}📌 注意事項:${NC}"
    echo "  - Git pushだけで自動的にデプロイされます"
    echo "  - vercel --prod を手動で実行すると重複デプロイになります"
    echo "  - デプロイ状況はVercelダッシュボードで確認できます"
    ;;
esac

echo ""
echo -e "${GREEN}✨ 完了${NC}"
