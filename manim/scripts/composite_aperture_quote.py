import sys, os, json, subprocess, shutil, tempfile, requests
from PIL import Image, ImageDraw, ImageFont

FONT_CACHE = "/tmp/qpc_fonts"
os.makedirs(FONT_CACHE, exist_ok=True)

POPPINS = {
    "Bold":       "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf",
    "BoldItalic": "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-BoldItalic.ttf",
}

def get_font(variant, size):
    path = f"{FONT_CACHE}/Poppins-{variant}.ttf"
    if not os.path.exists(path):
        r = requests.get(POPPINS[variant], timeout=20)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return ImageFont.truetype(path, size)

def wrap_text_words(text, font, draw, max_w):
    """Return list[list[str]] — each inner list is the words for one line."""
    space_w = draw.textlength(" ", font=font)
    words = text.split()
    lines, cur_words, cur_w = [], [], 0.0
    for word in words:
        ww = draw.textlength(word, font=font)
        needed = ww if not cur_words else ww + space_w
        if cur_w + needed > max_w and cur_words:
            lines.append(cur_words[:])
            cur_words, cur_w = [word], ww
        else:
            cur_words.append(word)
            cur_w += needed
    if cur_words:
        lines.append(cur_words[:])
    return lines

def draw_line_words(draw, word_list, highlight_wi, font, y, canvas_w, stroke_w):
    """Draw one line with one word highlighted yellow, rest white."""
    space_w = draw.textlength(" ", font=font)
    total_w = sum(draw.textlength(w, font=font) for w in word_list)
    if len(word_list) > 1:
        total_w += space_w * (len(word_list) - 1)
    x = (canvas_w - total_w) / 2
    for i, word in enumerate(word_list):
        ww = draw.textlength(word, font=font)
        fill = (255, 220, 0) if i == highlight_wi else (255, 255, 255)
        draw.text((x, y), word, font=font, fill=fill,
                  stroke_width=stroke_w, stroke_fill=(0, 0, 0))
        x += ww + space_w

def draw_stroked_center(draw, text, font, y, canvas_w, stroke_w, fill=(255, 255, 255)):
    w = draw.textlength(text, font=font)
    x = (canvas_w - w) / 2
    draw.text((x, y), text, font=font, fill=fill,
              stroke_width=stroke_w, stroke_fill=(0, 0, 0))

# -- Config ------------------------------------------------------------------
arg = sys.argv[1]
cfg = json.load(open(arg)) if os.path.isfile(arg) else json.loads(arg)

bg_path     = cfg["bg_path"]
out_path    = cfg["output_path"]
quote       = cfg["quote"]
attribution = cfg["attribution"]
VIDEO_DUR   = int(cfg.get("video_dur", 15))
FPS         = int(cfg.get("fps", 30))

W, H  = 1080, 1920
SQ    = 1080
IMG_Y = (H - SQ) // 2   # = 420

QUOTE_SIZE   = 36
ATTR_SIZE    = 27
LINE_GAP     = int(QUOTE_SIZE * 1.35)
BLOCK_GAP    = 38
TEXT_PAD_X   = 120
STROKE_W     = 4

# -- Build base canvas -------------------------------------------------------
bg = Image.open(bg_path).convert("RGB").resize((SQ, SQ), Image.LANCZOS)
base_canvas = Image.new("RGB", (W, H), (0, 0, 0))
base_canvas.paste(bg, (0, IMG_Y))

# -- Load fonts + layout -----------------------------------------------------
f_quote = get_font("Bold", QUOTE_SIZE)
f_attr  = get_font("BoldItalic", ATTR_SIZE)
max_w   = W - TEXT_PAD_X * 2

_tmp_draw = ImageDraw.Draw(base_canvas.copy())
lines     = wrap_text_words(quote, f_quote, _tmp_draw, max_w)
del _tmp_draw

all_word_positions = [(li, wi) for li, wl in enumerate(lines) for wi in range(len(wl))]
n_words = len(all_word_positions)

quote_block_h = len(lines) * LINE_GAP
attr_text     = f"- {attribution} -"
text_y        = IMG_Y + int(SQ * 0.09)
attr_y        = text_y + quote_block_h + BLOCK_GAP

# -- Word timing -------------------------------------------------------------
HIGHLIGHT_START = 1.5
HIGHLIGHT_END   = VIDEO_DUR - 2.0
hl_duration     = HIGHLIGHT_END - HIGHLIGHT_START
sec_per_word    = hl_duration / n_words if n_words > 0 else 1.0

print(f"Quote: {n_words} words | {sec_per_word:.2f}s/word | {VIDEO_DUR}s video @ {FPS}fps")

# -- Pre-render unique PIL images (one per word + one all-white) -------------
def render_state(current_global_word):
    """Return PIL Image for one animation state."""
    frame = base_canvas.copy()
    draw  = ImageDraw.Draw(frame)
    word_counter = 0
    for li, word_list in enumerate(lines):
        y = text_y + li * LINE_GAP
        hl_in_line = -1
        for wi in range(len(word_list)):
            if word_counter == current_global_word:
                hl_in_line = wi
            word_counter += 1
        draw_line_words(draw, word_list, hl_in_line, f_quote, y, W, STROKE_W)
    draw_stroked_center(draw, attr_text, f_attr, attr_y, W, max(1, STROKE_W - 1))
    return frame

print("Pre-rendering unique frames...")
tmp_dir = tempfile.mkdtemp(prefix="apr_frames_")
try:
    state_pngs = {}
    for s in [-1] + list(range(n_words)):
        img = render_state(s)
        png_path = os.path.join(tmp_dir, f"state_{s + 2}.png")  # +2 keeps names positive
        img.save(png_path, "PNG", compress_level=1)
        state_pngs[s] = png_path
    print(f"Saved {len(state_pngs)} unique state PNGs to {tmp_dir}")

    # -- Build ffmpeg concat script ------------------------------------------
    # Segments: [all-white for HIGHLIGHT_START], [word0 .. wordN-1 each sec_per_word],
    #           [all-white for remainder]
    concat_path = os.path.join(tmp_dir, "concat.txt")
    segments = []
    segments.append((-1, HIGHLIGHT_START))
    for i in range(n_words):
        segments.append((i, sec_per_word))
    used = HIGHLIGHT_START + sec_per_word * n_words
    remainder = VIDEO_DUR - used
    if remainder > 0.01:
        segments.append((-1, remainder))

    with open(concat_path, "w") as f:
        for state, dur in segments:
            f.write(f"file '{state_pngs[state]}'\n")
            f.write(f"duration {dur:.6f}\n")
        # Repeat last file (required by concat demuxer to flush final frame)
        f.write(f"file '{state_pngs[segments[-1][0]]}'\n")

    # -- Encode with ffmpeg via concat demuxer (no stdin pipe) ---------------
    # Write to /tmp first (native Linux fs) to avoid Windows bind-mount
    # finalisation errors, then move to the shared volume path.
    tmp_out = os.path.join(tmp_dir, "out.mp4")
    ffmpeg_cmd = [
        "ffmpeg", "-y", "-nostdin",
        "-f", "concat", "-safe", "0", "-i", concat_path,
        "-vf", f"fps={FPS}",
        "-c:v", "libx264", "-crf", "18", "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-t", str(VIDEO_DUR),
        tmp_out
    ]
    print("Encoding video with ffmpeg concat demuxer...")
    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg concat failed (exit {result.returncode}):\n"
            + result.stderr[-800:]
        )

    # Move from /tmp to final shared-volume path
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    shutil.move(tmp_out, out_path)

finally:
    shutil.rmtree(tmp_dir, ignore_errors=True)

print(f"OK:{out_path}")
