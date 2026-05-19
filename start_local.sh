#!/bin/bash
# =====================================================
# セーリング得点管理システム — ローカル起動スクリプト
# =====================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PID_FILE="$SCRIPT_DIR/.local_pids"

ORANGE='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${ORANGE}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${ORANGE}${BOLD}║   ⛵ セーリング得点管理  ローカルモード  ║${NC}"
echo -e "${ORANGE}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. PostgreSQL ──────────────────────────────────
echo -e "${BLUE}[1/4]${NC} PostgreSQL を確認中..."

if ! command -v psql &>/dev/null; then
    echo -e "${RED}ERROR: PostgreSQL がインストールされていません。${NC}"
    echo "  brew install postgresql@16 でインストールしてください。"
    exit 1
fi

if ! pg_isready -h localhost -q 2>/dev/null; then
    echo "  PostgreSQL を起動中..."
    brew services start postgresql@16
    for i in $(seq 1 10); do
        pg_isready -h localhost -q 2>/dev/null && break
        sleep 1
    done
fi

if ! pg_isready -h localhost -q 2>/dev/null; then
    echo -e "${RED}ERROR: PostgreSQL の起動に失敗しました。${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ PostgreSQL 起動済み${NC}"

# ── 2. DB 作成 ─────────────────────────────────────
createdb sailing_score_db 2>/dev/null \
    && echo -e "${GREEN}  ✓ DB 作成: sailing_score_db${NC}" \
    || echo -e "${GREEN}  ✓ DB 既存: sailing_score_db${NC}"

# ── 3. ローカルIP 取得 ─────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null \
        || ipconfig getifaddr en1 2>/dev/null \
        || ipconfig getifaddr en2 2>/dev/null \
        || echo "")

# ── 4. Backend 起動 ────────────────────────────────
echo -e "${BLUE}[2/4]${NC} Backend を起動中..."

export DATABASE_URL="postgresql://localhost/sailing_score_db"
export AUTH_ENABLED="False"
export ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001${LOCAL_IP:+,http://$LOCAL_IP:3000}"

cd "$BACKEND_DIR"

# 仮想環境があれば使う
if [ -d "$BACKEND_DIR/venv" ]; then
    source "$BACKEND_DIR/venv/bin/activate"
fi

uvicorn main:app --host 0.0.0.0 --port 8000 --reload \
    > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}  ✓ Backend: http://localhost:8000 (PID: $BACKEND_PID)${NC}"

# ── 5. Frontend 起動 ───────────────────────────────
echo -e "${BLUE}[3/4]${NC} Frontend を起動中..."

cd "$FRONTEND_DIR"

# .env.local を LAN IP で書き換え
API_URL="http://localhost:8000"
if [ -n "$LOCAL_IP" ]; then
    API_URL="http://$LOCAL_IP:8000"
fi

cat > "$FRONTEND_DIR/.env.local" <<ENVEOF
# ローカルモード設定（start_local.sh が自動生成）
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_MODE=local
NEXT_PUBLIC_SUPABASE_URL=http://localhost
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-dummy-key
ENVEOF

LOCAL_IP="$LOCAL_IP" npx next dev --hostname 0.0.0.0 --port 3000 \
    > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}  ✓ Frontend: http://localhost:3000 (PID: $FRONTEND_PID)${NC}"

# PID を保存（stop_local.sh 用）
echo "$BACKEND_PID $FRONTEND_PID" > "$PID_FILE"

# ── 6. 起動待機 ────────────────────────────────────
echo -e "${BLUE}[4/4]${NC} 起動を待機中..."
for i in $(seq 1 20); do
    sleep 1
    curl -s http://localhost:3000 > /dev/null 2>&1 && break
done

# ── 7. ブラウザを開く ──────────────────────────────
open http://localhost:3000 2>/dev/null || true

# ── 8. 情報表示 ────────────────────────────────────
echo ""
echo -e "${ORANGE}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${ORANGE}${BOLD}  ローカルモード 起動完了${NC}"
echo -e "${ORANGE}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "  このMac:      ${BOLD}http://localhost:3000${NC}"
if [ -n "$LOCAL_IP" ]; then
    echo -e "  同一ネット:   ${BOLD}http://$LOCAL_IP:3000${NC}"
    echo -e "  API:          http://$LOCAL_IP:8000"
fi
echo ""
echo -e "  ログ: tail -f $SCRIPT_DIR/backend.log"
echo -e "        tail -f $SCRIPT_DIR/frontend.log"
echo ""
echo -e "  停止: ${BOLD}./stop_local.sh${NC}  または  Ctrl+C"
echo -e "${ORANGE}${BOLD}══════════════════════════════════════════════${NC}"
echo ""

# ── 9. 終了ハンドラ ────────────────────────────────
cleanup() {
    echo ""
    echo "停止中..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    rm -f "$PID_FILE"
    echo "停止しました。"
}
trap cleanup EXIT INT TERM

# フォアグラウンドで待機（Ctrl+C まで）
wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
