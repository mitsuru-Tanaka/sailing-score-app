#!/bin/bash
# ローカルサーバー停止スクリプト

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.local_pids"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "ローカルサーバーを停止中..."

# PIDファイルから停止
if [ -f "$PID_FILE" ]; then
    read -r BACKEND_PID FRONTEND_PID < "$PID_FILE"
    for PID in $BACKEND_PID $FRONTEND_PID; do
        if kill "$PID" 2>/dev/null; then
            echo -e "${GREEN}  ✓ PID $PID を停止${NC}"
        fi
    done
    rm -f "$PID_FILE"
fi

# ポートで残存プロセスを念のため停止
for PORT in 8000 3000; do
    PIDS=$(lsof -ti tcp:"$PORT" 2>/dev/null)
    for PID in $PIDS; do
        kill "$PID" 2>/dev/null && echo -e "${GREEN}  ✓ ポート $PORT (PID $PID) を停止${NC}"
    done
done

echo "停止完了。"
