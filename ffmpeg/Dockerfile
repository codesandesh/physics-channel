# ═══════════════════════════════════════════════════════════════
#  FFmpeg Runner  –  Ubuntu 22.04 + FFmpeg + download utilities
#  Used by n8n to download assets and assemble the final video.
# ═══════════════════════════════════════════════════════════════

FROM ubuntu:22.04

# Avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# ── 1. System packages ────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core video processor
    ffmpeg \
    # Download tools (used by n8n exec commands to fetch assets)
    curl \
    wget \
    # General utilities
    ca-certificates \
    bash \
    jq \
    bc \
    # Python 3 for any lightweight helper scripts
    python3 \
    python3-pip \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# ── 2. Python helpers ─────────────────────────────────────────
RUN pip3 install --no-cache-dir requests

# ── 3. Working directories ────────────────────────────────────
RUN mkdir -p /ffmpeg/input /ffmpeg/output /ffmpeg/uploads

# ── 4. Default working directory ─────────────────────────────
WORKDIR /ffmpeg

# Container is kept alive by docker-compose (command: tail -f /dev/null)
# n8n will exec commands like:
#   docker exec ffmpeg-runner ffmpeg -i /ffmpeg/input/manim.mp4 \
#       -i /ffmpeg/input/audio.mp3 -i /ffmpeg/input/avatar.mp4 \
#       -filter_complex "..." /ffmpeg/output/final.mp4
CMD ["tail", "-f", "/dev/null"]
