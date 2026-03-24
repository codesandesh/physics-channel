#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  setup.sh  –  One-time bootstrap for the Physics Channel pipeline
#  Run this ONCE on a fresh Ubuntu 22.04 server after cloning the repo.
#  Usage:  chmod +x setup.sh && sudo ./setup.sh
# ════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'   # No Color

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Resolve script location ───────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   Physics Channel Pipeline  –  Bootstrap Setup         ${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: Verify Docker is installed ───────────────────────
info "Checking Docker installation..."
if ! command -v docker &>/dev/null; then
    warn "Docker not found. Installing Docker Engine..."
    apt-get update -qq
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" \
      | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    success "Docker installed."
else
    success "Docker is already installed ($(docker --version))."
fi

# ── Step 2: Verify Docker Compose (v2 plugin) ────────────────
info "Checking Docker Compose..."
if ! docker compose version &>/dev/null; then
    warn "Docker Compose plugin not found. Installing..."
    apt-get install -y docker-compose-plugin
fi
success "Docker Compose ready ($(docker compose version --short))."

# ── Step 3: Create directory structure ───────────────────────
info "Creating pipeline directory structure..."

declare -a DIRS=(
    "n8n"
    "manim/scripts"
    "manim/renders"
    "manim/combined"
    "ffmpeg/input"
    "ffmpeg/output"
    "uploads"
    "logs"
    "config"
)

for dir in "${DIRS[@]}"; do
    mkdir -p "$SCRIPT_DIR/$dir"
done
success "All directories created."

# ── Step 4: Set permissions ───────────────────────────────────
info "Setting folder permissions (777 so Docker can read/write)..."

chmod -R 777 \
    "$SCRIPT_DIR/n8n" \
    "$SCRIPT_DIR/manim" \
    "$SCRIPT_DIR/ffmpeg" \
    "$SCRIPT_DIR/uploads" \
    "$SCRIPT_DIR/logs" \
    "$SCRIPT_DIR/config"

# n8n writes as uid 1000 inside the container
chown -R 1000:1000 "$SCRIPT_DIR/n8n" 2>/dev/null || true

success "Permissions set."

# ── Step 5: Copy .env if not present ─────────────────────────
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        warn ".env was not found — copied from .env.example."
        warn "IMPORTANT: Open .env now and fill in your real API keys before continuing."
        warn "File location: $SCRIPT_DIR/.env"
        echo ""
        read -rp "Press ENTER once you have saved your .env file to continue, or Ctrl+C to exit: "
    else
        error ".env.example not found. Cannot continue."
    fi
else
    success ".env file already exists."
fi

# ── Step 6: Validate required .env variables ─────────────────
info "Validating critical .env variables..."
set -a; source "$SCRIPT_DIR/.env"; set +a

REQUIRED_VARS=(
    "N8N_BASIC_AUTH_USER"
    "N8N_BASIC_AUTH_PASSWORD"
    "N8N_WEBHOOK_BASE_URL"
    "SERVER_BASE_URL"
)
MISSING=0
for var in "${REQUIRED_VARS[@]}"; do
    value="${!var:-}"
    if [ -z "$value" ] || [[ "$value" == *"YOUR_SERVER"* ]] || [[ "$value" == *"CHANGE_ME"* ]]; then
        warn "Variable $var is not set or still has placeholder value."
        MISSING=1
    fi
done
if [ "$MISSING" -eq 1 ]; then
    warn "Some variables still have placeholder values. The system will start,"
    warn "but webhooks and external integrations will NOT work until you fix them."
fi

# ── Step 7: Pull base images ──────────────────────────────────
info "Pulling n8n base image (this may take a few minutes)..."
docker pull n8nio/n8n:latest
success "n8n image pulled."

# ── Step 8: Build custom images ──────────────────────────────
info "Building manim-runner image (this may take 5–15 minutes due to LaTeX)..."
docker compose build manim-runner
success "manim-runner image built."

info "Building ffmpeg-runner image..."
docker compose build ffmpeg-runner
success "ffmpeg-runner image built."

# ── Step 9: Start all containers ─────────────────────────────
info "Starting all containers in detached mode..."
docker compose up -d
success "All containers started."

# ── Step 10: Wait for n8n to be ready ────────────────────────
info "Waiting for n8n to become ready (up to 60 seconds)..."
ATTEMPTS=0
until curl -s -o /dev/null -w "%{http_code}" http://localhost:5678 | grep -qE "200|401"; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge 30 ]; then
        warn "n8n did not respond within 60 seconds. Check logs: docker compose logs n8n"
        break
    fi
    sleep 2
done
if [ "$ATTEMPTS" -lt 30 ]; then
    success "n8n is responding."
fi

# ── Done ──────────────────────────────────────────────────────
SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}   Setup complete!                                      ${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  n8n is running at:  ${BOLD}http://${SERVER_IP}:5678${NC}"
echo -e "  Username:           ${BOLD}${N8N_BASIC_AUTH_USER}${NC}"
echo -e "  Password:           ${BOLD}(from your .env file)${NC}"
echo ""
echo -e "  Container status:"
docker compose ps
echo ""
echo -e "  Next steps:"
echo -e "  1. Open http://${SERVER_IP}:5678 in your browser"
echo -e "  2. Log in and import your n8n workflow JSON"
echo -e "  3. Verify webhooks are reachable from Google Apps Script"
echo -e "  4. Run ./health-check.sh any time to verify the system"
echo ""
