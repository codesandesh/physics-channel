# ═══════════════════════════════════════════════════════════════
#  Manim Runner  –  Python 3.11 + Manim Community Edition
#  Installs every system dependency Manim needs so renders work
#  without missing-library errors.
# ═══════════════════════════════════════════════════════════════

FROM python:3.11-slim

# Avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# ── 1. System dependencies ────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools
    build-essential \
    pkg-config \
    # Cairo (Manim's 2-D drawing backend)
    libcairo2 \
    libcairo2-dev \
    # Pango (text layout / font rendering)
    libpango1.0-dev \
    libpangocairo-1.0-0 \
    # GLib / GObject (Cairo/Pango dependency)
    libglib2.0-dev \
    # FFmpeg (Manim calls it to encode MP4 output)
    ffmpeg \
    # LaTeX – required for Manim's Tex() and MathTex() objects
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-science \
    texlive-xetex \
    dvipng \
    dvisvgm \
    # Font support
    fonts-liberation \
    fonts-dejavu \
    fontconfig \
    # Python / pip tooling
    python3-dev \
    python3-pip \
    # Utilities used by n8n exec calls
    curl \
    wget \
    git \
    # Image libraries used by Manim (PIL/Pillow)
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    # Misc runtime deps
    libffi-dev \
    libssl-dev \
    libxml2-dev \
    libxslt1-dev \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# ── 2. Python dependencies ────────────────────────────────────
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Manim Community Edition + helpers used by generated scripts
RUN pip install --no-cache-dir \
    manim \
    numpy \
    scipy \
    matplotlib \
    Pillow \
    requests \
    pycairo \
    manimpango

# ── 3. Working directories ────────────────────────────────────
RUN mkdir -p /manim/scripts /manim/renders /manim/combined

# ── 4. Default working directory ─────────────────────────────
WORKDIR /manim/scripts

# Container is kept alive by docker-compose (command: tail -f /dev/null)
# n8n will exec commands like:
#   docker exec manim-runner manim -pql /manim/scripts/scene.py SceneName \
#       --output_file /manim/renders/scene.mp4
CMD ["tail", "-f", "/dev/null"]
