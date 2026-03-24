#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  health-check.sh  –  Physics Channel pipeline health monitor
#  Run any time to verify all containers and folders are healthy.
#  Usage:  chmod +x health-check.sh && ./health-check.sh
# ════════════════════════════════════════════════════════════════

set -uo pipefail

# ── Colour helpers ────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0

ok()   { echo -e "  ${GREEN}[  OK  ]${NC}  $*"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}[ FAIL ]${NC}  $*"; FAIL=$((FAIL + 1)); }
info() { echo -e "  ${CYAN}[ INFO ]${NC}  $*"; }

# ── Resolve script location ───────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   Physics Channel Pipeline  –  Health Check            ${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# ────────────────────────────────────────────────────────────────
# CHECK 1–3: Docker containers are running
# ────────────────────────────────────────────────────────────────
echo -e "${BOLD}Containers${NC}"

for SERVICE in n8n manim-runner ffmpeg-runner; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "$SERVICE" 2>/dev/null || echo "not_found")
    if [ "$STATUS" = "running" ]; then
        UPTIME=$(docker inspect --format='{{.State.StartedAt}}' "$SERVICE" 2>/dev/null | cut -c1-19 | tr 'T' ' ')
        ok "$SERVICE is running  (started: $UPTIME UTC)"
    elif [ "$STATUS" = "not_found" ]; then
        fail "$SERVICE container does not exist — run: docker compose up -d"
    else
        fail "$SERVICE is ${STATUS} — run: docker compose restart $SERVICE"
    fi
done

echo ""

# ────────────────────────────────────────────────────────────────
# CHECK 4: n8n HTTP endpoint responds
# ────────────────────────────────────────────────────────────────
echo -e "${BOLD}n8n HTTP Endpoint${NC}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:5678 2>/dev/null || echo "000")
if echo "$HTTP_CODE" | grep -qE "^(200|401|302)"; then
    ok "n8n responded with HTTP $HTTP_CODE on port 5678"
elif [ "$HTTP_CODE" = "000" ]; then
    fail "n8n is not reachable on port 5678 (connection refused or timeout)"
else
    fail "n8n returned unexpected HTTP $HTTP_CODE on port 5678"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# CHECK 5: n8n webhook endpoint responds
# ────────────────────────────────────────────────────────────────
echo -e "${BOLD}n8n Webhook Path${NC}"

WEBHOOK_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:5678/webhook-test/ 2>/dev/null || echo "000")
if echo "$WEBHOOK_CODE" | grep -qE "^(200|404|405)"; then
    ok "n8n webhook path reachable (HTTP $WEBHOOK_CODE)"
else
    fail "n8n webhook path not reachable (HTTP $WEBHOOK_CODE)"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# CHECK 6–11: Critical host folders exist and are writable
# ────────────────────────────────────────────────────────────────
echo -e "${BOLD}Host Directories${NC}"

declare -A DIR_LABELS=(
    ["n8n"]="n8n data dir"
    ["manim/scripts"]="Manim scripts dir"
    ["manim/renders"]="Manim renders dir"
    ["manim/combined"]="Manim combined dir"
    ["ffmpeg/input"]="FFmpeg input dir"
    ["ffmpeg/output"]="FFmpeg output dir"
    ["uploads"]="Uploads staging dir"
    ["logs"]="Logs dir"
)

for DIR in "${!DIR_LABELS[@]}"; do
    LABEL="${DIR_LABELS[$DIR]}"
    FULL_PATH="$SCRIPT_DIR/$DIR"
    if [ ! -d "$FULL_PATH" ]; then
        fail "$LABEL missing:  $FULL_PATH"
    elif [ ! -w "$FULL_PATH" ]; then
        fail "$LABEL not writable:  $FULL_PATH  (fix: chmod 777 $FULL_PATH)"
    else
        ok "$LABEL  →  $FULL_PATH"
    fi
done

echo ""

# ────────────────────────────────────────────────────────────────
# CHECK 12–14: Container-internal write test
# ────────────────────────────────────────────────────────────────
echo -e "${BOLD}Container Write Tests${NC}"

# manim-runner: can it write to /manim/scripts?
if docker exec manim-runner touch /manim/scripts/.healthcheck 2>/dev/null; then
    docker exec manim-runner rm -f /manim/scripts/.healthcheck 2>/dev/null
    ok "manim-runner can write to /manim/scripts"
else
    fail "manim-runner cannot write to /manim/scripts"
fi

# manim-runner: can it write to /manim/renders?
if docker exec manim-runner touch /manim/renders/.healthcheck 2>/dev/null; then
    docker exec manim-runner rm -f /manim/renders/.healthcheck 2>/dev/null
    ok "manim-runner can write to /manim/renders"
else
    fail "manim-runner cannot write to /manim/renders"
fi

# ffmpeg-runner: can it write to /ffmpeg/output?
if docker exec ffmpeg-runner touch /ffmpeg/output/.healthcheck 2>/dev/null; then
    docker exec ffmpeg-runner rm -f /ffmpeg/output/.healthcheck 2>/dev/null
    ok "ffmpeg-runner can write to /ffmpeg/output"
else
    fail "ffmpeg-runner cannot write to /ffmpeg/output"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# CHECK 15: Manim is importable inside the container
# ────────────────────────────────────────────────────────────────
echo -e "${BOLD}Manim Installation${NC}"

MANIM_VERSION=$(docker exec manim-runner python3 -c "import manim; print(manim.__version__)" 2>/dev/null || echo "FAILED")
if [ "$MANIM_VERSION" != "FAILED" ]; then
    ok "Manim v$MANIM_VERSION is installed and importable"
else
    fail "Manim import failed — check manim-runner build logs"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# CHECK 16: FFmpeg is callable inside the container
# ────────────────────────────────────────────────────────────────
echo -e "${BOLD}FFmpeg Installation${NC}"

FFMPEG_VERSION=$(docker exec ffmpeg-runner ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}' || echo "FAILED")
if [ "$FFMPEG_VERSION" != "FAILED" ] && [ -n "$FFMPEG_VERSION" ]; then
    ok "FFmpeg $FFMPEG_VERSION is installed inside ffmpeg-runner"
else
    fail "FFmpeg not found inside ffmpeg-runner — check build logs"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# CHECK 17: Docker network exists
# ────────────────────────────────────────────────────────────────
echo -e "${BOLD}Docker Network${NC}"

NETWORK_NAME=$(docker network ls --format '{{.Name}}' | grep -E "pipeline-network" || echo "")
if [ -n "$NETWORK_NAME" ]; then
    ok "pipeline-network exists"
else
    fail "pipeline-network not found — run: docker compose up -d"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then
    echo -e "${BOLD}${GREEN}  All $TOTAL checks passed. Pipeline is healthy.${NC}"
else
    echo -e "${BOLD}${RED}  $FAIL of $TOTAL checks FAILED. See details above.${NC}"
fi
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# Exit with non-zero code if any check failed (useful for monitoring scripts)
exit "$FAIL"
