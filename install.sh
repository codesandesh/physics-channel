#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  install.sh  –  Full system installer for Physics Channel Pipeline
#  Installs: Docker, Docker Compose, FFmpeg, Python 3.11,
#            Manim + all dependencies, and all required tools.
#
#  Run this FIRST on a brand new Ubuntu 22.04 server.
#  Usage:  chmod +x install.sh && sudo bash install.sh
# ════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "\n${CYAN}${BOLD}▶  $*${NC}"; }
success() { echo -e "${GREEN}✔  $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $*${NC}"; }
error()   { echo -e "${RED}✘  ERROR: $*${NC}"; exit 1; }
step()    { echo -e "${BOLD}   $*${NC}"; }

# ── Must run as root ──────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    error "Please run as root:  sudo bash install.sh"
fi

# ── Detect Ubuntu version ─────────────────────────────────────
if ! grep -qi "ubuntu" /etc/os-release 2>/dev/null; then
    warn "This script is written for Ubuntu 22.04. Detected a different OS — continuing anyway."
fi

UBUNTU_CODENAME=$(. /etc/os-release && echo "${UBUNTU_CODENAME:-jammy}")

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   Physics Channel Pipeline  –  Full System Installer       ${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "   Ubuntu codename detected: ${CYAN}${UBUNTU_CODENAME}${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"

# ════════════════════════════════════════════════════════════════
# STEP 1 – System update
# ════════════════════════════════════════════════════════════════
info "STEP 1/9 — Updating system packages"
apt-get update -y
apt-get upgrade -y
apt-get autoremove -y
success "System packages updated."

# ════════════════════════════════════════════════════════════════
# STEP 2 – Core utilities
# ════════════════════════════════════════════════════════════════
info "STEP 2/9 — Installing core utilities"
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    zip \
    jq \
    bc \
    nano \
    vim \
    htop \
    net-tools \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    build-essential \
    pkg-config \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev
success "Core utilities installed."

# ════════════════════════════════════════════════════════════════
# STEP 3 – Python 3.11
# ════════════════════════════════════════════════════════════════
info "STEP 3/9 — Installing Python 3.11"

# Add deadsnakes PPA for Python 3.11 on older Ubuntu versions
if ! python3.11 --version &>/dev/null 2>&1; then
    step "Adding deadsnakes PPA..."
    add-apt-repository ppa:deadsnakes/ppa -y
    apt-get update -y
fi

apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3.11-distutils \
    python3.11-venv \
    python3-pip \
    python3-dev

# Make python3.11 the default python3
update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 || true
update-alternatives --install /usr/bin/python  python  /usr/bin/python3.11 1 || true

# Upgrade pip
python3.11 -m pip install --upgrade pip setuptools wheel

PYTHON_VER=$(python3.11 --version)
success "Python installed: $PYTHON_VER"

# ════════════════════════════════════════════════════════════════
# STEP 4 – FFmpeg (host-level, separate from Docker container)
# ════════════════════════════════════════════════════════════════
info "STEP 4/9 — Installing FFmpeg"

apt-get install -y ffmpeg

FFMPEG_VER=$(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')
success "FFmpeg installed: $FFMPEG_VER"

# ════════════════════════════════════════════════════════════════
# STEP 5 – Manim system dependencies
# ════════════════════════════════════════════════════════════════
info "STEP 5/9 — Installing Manim system dependencies (Cairo, Pango, LaTeX)"

step "Installing Cairo..."
apt-get install -y \
    libcairo2 \
    libcairo2-dev

step "Installing Pango..."
apt-get install -y \
    libpango1.0-dev \
    libpangocairo-1.0-0 \
    libglib2.0-dev

step "Installing font and image libraries..."
apt-get install -y \
    fonts-liberation \
    fonts-dejavu \
    fontconfig \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev

step "Installing LaTeX (this may take several minutes — ~500 MB download)..."
apt-get install -y \
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-science \
    texlive-xetex \
    dvipng \
    dvisvgm

success "All Manim system dependencies installed."

# ════════════════════════════════════════════════════════════════
# STEP 6 – Manim Python package
# ════════════════════════════════════════════════════════════════
info "STEP 6/9 — Installing Manim and Python packages"

pip3 install --no-cache-dir \
    manim \
    numpy \
    scipy \
    matplotlib \
    Pillow \
    requests \
    pycairo \
    manimpango \
    opencv-python-headless \
    tqdm

MANIM_VER=$(python3 -c "import manim; print(manim.__version__)" 2>/dev/null || echo "unknown")
success "Manim installed: v$MANIM_VER"

# ════════════════════════════════════════════════════════════════
# STEP 7 – Docker Engine
# ════════════════════════════════════════════════════════════════
info "STEP 7/9 — Installing Docker Engine"

if docker --version &>/dev/null 2>&1; then
    DOCKER_EXISTING=$(docker --version)
    warn "Docker is already installed: $DOCKER_EXISTING — skipping install."
else
    step "Removing any old Docker packages..."
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    step "Adding Docker's official GPG key..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    step "Adding Docker apt repository..."
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        ${UBUNTU_CODENAME} stable" \
        | tee /etc/apt/sources.list.d/docker.list > /dev/null

    step "Installing Docker Engine..."
    apt-get update -y
    apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    step "Enabling Docker service..."
    systemctl enable docker
    systemctl start docker
fi

DOCKER_VER=$(docker --version)
success "Docker ready: $DOCKER_VER"

# ── Add current non-root user to docker group ─────────────────
REAL_USER="${SUDO_USER:-$USER}"
if [ "$REAL_USER" != "root" ]; then
    if ! groups "$REAL_USER" | grep -q docker; then
        usermod -aG docker "$REAL_USER"
        warn "Added $REAL_USER to the docker group."
        warn "You must LOG OUT and LOG BACK IN for this to take effect."
        warn "After re-login, run 'docker ps' without sudo to confirm."
    else
        success "$REAL_USER is already in the docker group."
    fi
fi

# ════════════════════════════════════════════════════════════════
# STEP 8 – Docker Compose (plugin v2)
# ════════════════════════════════════════════════════════════════
info "STEP 8/9 — Verifying Docker Compose v2"

if docker compose version &>/dev/null 2>&1; then
    COMPOSE_VER=$(docker compose version --short 2>/dev/null || docker compose version | head -1)
    success "Docker Compose ready: $COMPOSE_VER"
else
    step "Installing docker-compose-plugin..."
    apt-get install -y docker-compose-plugin
    success "Docker Compose installed."
fi

# ── Also install standalone docker-compose as fallback ────────
if ! command -v docker-compose &>/dev/null; then
    step "Installing standalone docker-compose as fallback..."
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    success "Standalone docker-compose installed."
fi

# ════════════════════════════════════════════════════════════════
# STEP 9 – Verify everything
# ════════════════════════════════════════════════════════════════
info "STEP 9/9 — Final verification of all installed tools"

echo ""
echo -e "${BOLD}  Tool                    Version${NC}"
echo -e "  ─────────────────────────────────────────────────────"

# Python
PY=$(python3 --version 2>&1);             printf "  %-24s %s\n" "Python"          "$PY"

# pip
PIP=$(pip3 --version 2>&1 | awk '{print $1" "$2}'); printf "  %-24s %s\n" "pip"   "$PIP"

# Manim
MAN=$(python3 -c "import manim; print('manim', manim.__version__)" 2>/dev/null || echo "manim NOT FOUND")
printf "  %-24s %s\n" "Manim" "$MAN"

# FFmpeg
FF=$(ffmpeg -version 2>&1 | head -1 | awk '{print "ffmpeg "$3}'); printf "  %-24s %s\n" "FFmpeg"          "$FF"

# Docker
DOC=$(docker --version 2>&1);            printf "  %-24s %s\n" "Docker"           "$DOC"

# Docker Compose
DCO=$(docker compose version 2>&1 | head -1); printf "  %-24s %s\n" "Docker Compose"   "$DCO"

# curl
CUR=$(curl --version 2>&1 | head -1);   printf "  %-24s %s\n" "curl"             "$CUR"

# jq
JQV=$(jq --version 2>&1);               printf "  %-24s %s\n" "jq"               "$JQV"

# LaTeX
TEX=$(latex --version 2>&1 | head -1);  printf "  %-24s %s\n" "LaTeX"            "$TEX"

echo ""

# ── Final summary ─────────────────────────────────────────────
SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}   All packages installed successfully!                     ${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Server IP:   ${BOLD}${SERVER_IP}${NC}"
echo ""
echo -e "  ${BOLD}What to do next:${NC}"
echo -e "  1.  ${YELLOW}Log out and back in${NC} so Docker group permissions take effect."
echo -e "  2.  Fill in your .env file:    ${BOLD}nano .env${NC}"
echo -e "  3.  Run the pipeline setup:    ${BOLD}sudo bash setup.sh${NC}"
echo -e "  4.  Check system health:       ${BOLD}bash health-check.sh${NC}"
echo ""
