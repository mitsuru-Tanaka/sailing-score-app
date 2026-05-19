#!/bin/bash
# Supabase → ローカル 同期スクリプト

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env.sync"

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${YELLOW}${BOLD}Supabase → ローカル 同期${NC}"
echo ""

# .env.sync の確認
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: $ENV_FILE が見つかりません。${NC}"
    echo "  backend/.env.sync を作成して SUPABASE_DB_URL を設定してください。"
    exit 1
fi

# 環境変数を読み込む
set -a
source "$ENV_FILE"
set +a

if [ -z "$SUPABASE_DB_URL" ] || [[ "$SUPABASE_DB_URL" == *"[password]"* ]]; then
    echo -e "${RED}ERROR: SUPABASE_DB_URL が正しく設定されていません。${NC}"
    echo "  backend/.env.sync を編集して実際の接続URLを設定してください。"
    exit 1
fi

echo -e "  転送元: ${BOLD}Supabase${NC}"
echo -e "  転送先: ${BOLD}ローカル${NC} (sailing_score_db)"
echo ""
echo -e "${YELLOW}警告: 同じIDのローカルデータはSupabaseの内容で上書きされます。${NC}"
echo ""
read -r -p "本当に同期しますか？ [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[yY]$ ]]; then
    echo "キャンセルしました。"
    exit 0
fi

echo ""

# PostgreSQL が起動していなければ起動
if ! pg_isready -h localhost -q 2>/dev/null; then
    echo "PostgreSQL を起動中..."
    brew services start postgresql@16
    sleep 3
fi

# DBがなければ作成
createdb sailing_score_db 2>/dev/null || true

# 仮想環境があれば使う
if [ -d "$BACKEND_DIR/venv" ]; then
    source "$BACKEND_DIR/venv/bin/activate"
fi

python3 "$BACKEND_DIR/sync.py" from_cloud

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}${BOLD}同期完了: Supabase → ローカル${NC}"
else
    echo ""
    echo -e "${RED}同期に失敗しました（終了コード: $EXIT_CODE）${NC}"
fi
exit $EXIT_CODE
