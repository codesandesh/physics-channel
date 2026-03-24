#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  assemble.sh  –  Final video assembly script
#  Called by n8n Stage 3 via:  docker exec ffmpeg-runner bash /ffmpeg/assemble.sh JOB_ID
#
#  Inputs (all in /ffmpeg/input/):
#    JOB_ID_animation.mp4   — Manim rendered animation (main screen)
#    JOB_ID_audio.mp3       — ElevenLabs narration audio
#    JOB_ID_avatar.mp4      — HeyGen avatar (picture-in-picture)
#    background_music.mp3   — Soft background music (place in /ffmpeg/config/)
#
#  Output:
#    /ffmpeg/output/JOB_ID_final.mp4  — 1920x1080 H264 with all layers mixed
# ════════════════════════════════════════════════════════════════

set -euo pipefail

JOB_ID="${1:-}"
if [ -z "$JOB_ID" ]; then
  echo "Usage: bash assemble.sh JOB_ID"
  exit 1
fi

ANIM_PATH="/ffmpeg/input/${JOB_ID}_animation.mp4"
AUDIO_PATH="/ffmpeg/input/${JOB_ID}_audio.mp3"
AVATAR_PATH="/ffmpeg/input/${JOB_ID}_avatar.mp4"
MUSIC_PATH="/ffmpeg/config/background_music.mp3"
OUTPUT_PATH="/ffmpeg/output/${JOB_ID}_final.mp4"

echo "════════════════════════════════════════════"
echo "  Assembling final video for job: $JOB_ID"
echo "════════════════════════════════════════════"

# Verify all required input files exist
for f in "$ANIM_PATH" "$AUDIO_PATH" "$AVATAR_PATH"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Required input file missing: $f"
    exit 1
  fi
done

# Background music is optional — use silence if missing
if [ ! -f "$MUSIC_PATH" ]; then
  echo "WARNING: background_music.mp3 not found — generating silence instead."
  ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 3600 /tmp/silence.mp3 -q:a 9 2>/dev/null
  MUSIC_PATH="/tmp/silence.mp3"
fi

echo "▶ Running FFmpeg final assembly..."
echo "    Animation : $ANIM_PATH"
echo "    Audio     : $AUDIO_PATH"
echo "    Avatar    : $AVATAR_PATH"
echo "    Music     : $MUSIC_PATH"
echo "    Output    : $OUTPUT_PATH"
echo ""

# ── FFmpeg command breakdown ──────────────────────────────────
#
#  Input 0: Manim animation (main full-screen video)
#  Input 1: ElevenLabs narration (replaces animation audio)
#  Input 2: HeyGen avatar (picture-in-picture overlay, bottom-right)
#  Input 3: Background music (looped, mixed at 15% volume)
#
#  Video filter chain:
#    1. Scale main video to exactly 1920x1080, add black bars if needed
#    2. Scale avatar to 320x180
#    3. Overlay avatar at bottom-right with 30px margin
#
#  Audio filter chain:
#    1. Narration at 100% volume
#    2. Background music looped and set to 15% volume
#    3. Mix both — narration runs the duration, music fades when narration ends
#
# ─────────────────────────────────────────────────────────────

ffmpeg -y \
  -i "$ANIM_PATH" \
  -i "$AUDIO_PATH" \
  -i "$AVATAR_PATH" \
  -i "$MUSIC_PATH" \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=decrease,
          pad=1920:1080:(ow-iw)/2:(oh-ih)/2,
          setsar=1,
          fps=30[mainv];
    [2:v]scale=320:180[pip];
    [mainv][pip]overlay=W-w-30:H-h-30[outv];
    [1:a]volume=1.0[narr];
    [3:a]volume=0.15,aloop=loop=-1:size=2e+09[bgm];
    [narr][bgm]amix=inputs=2:duration=first:dropout_transition=2[outa]
  " \
  -map "[outv]" \
  -map "[outa]" \
  -c:v libx264 \
  -preset medium \
  -crf 18 \
  -c:a aac \
  -b:a 192k \
  -movflags +faststart \
  -pix_fmt yuv420p \
  -r 30 \
  "$OUTPUT_PATH"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  SIZE=$(du -sh "$OUTPUT_PATH" | cut -f1)
  echo ""
  echo "════════════════════════════════════════════"
  echo "  SUCCESS: Final video assembled"
  echo "  Output : $OUTPUT_PATH"
  echo "  Size   : $SIZE"
  echo "  FFMPEG_SUCCESS:$OUTPUT_PATH"
  echo "════════════════════════════════════════════"
else
  echo ""
  echo "════════════════════════════════════════════"
  echo "  FFMPEG_FAILED: exit code $EXIT_CODE"
  echo "════════════════════════════════════════════"
  exit $EXIT_CODE
fi
