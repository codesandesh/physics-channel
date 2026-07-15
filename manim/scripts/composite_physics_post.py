import sys, os, json, math, requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_CACHE = "/tmp/qpc_fonts"
os.makedirs(FONT_CACHE, exist_ok=True)

POPPINS = {
    "Bold":      "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf",
    "ExtraBold": "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-ExtraBold.ttf",
    "SemiBold":  "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf",
    "Medium":    "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Medium.ttf",
}

def get_font(variant, size):
    path = f"{FONT_CACHE}/Poppins-{variant}.ttf"
    if not os.path.exists(path):
        r = requests.get(POPPINS[variant], timeout=20)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return ImageFont.truetype(path, size)

def draw_atom(draw, cx, cy, r=14, color=(255, 255, 255)):
    nr = 3
    draw.ellipse([cx - nr, cy - nr, cx + nr, cy + nr], fill=color)
    for deg in [0, 60, 120]:
        rad = math.radians(deg)
        pts = []
        for t in range(361):
            tr = math.radians(t)
            xl = r * math.cos(tr)
            yl = r * 0.38 * math.sin(tr)
            xr = xl * math.cos(rad) - yl * math.sin(rad)
            yr = xl * math.sin(rad) + yl * math.cos(rad)
            pts.append((cx + xr, cy + yr))
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i + 1]], fill=color, width=1)

def line_pixel_width(words, font, draw, space_w):
    total = 0
    for i, w in enumerate(words):
        total += draw.textlength(w, font=font)
        if i < len(words) - 1:
            total += space_w
    return total

def draw_colored_line(draw, words, highlight_set, font, y, canvas_w,
                      normal_color=(255, 255, 255),
                      highlight_color=(0, 207, 255)):
    space_w = draw.textlength(" ", font=font)
    total_w = line_pixel_width(words, font, draw, space_w)
    x = (canvas_w - total_w) / 2
    for i, word in enumerate(words):
        clean = word.strip(".,!?\"'():-").upper()
        color = highlight_color if clean in highlight_set else normal_color
        draw.text((x, y), word, font=font, fill=color)
        x += draw.textlength(word, font=font)
        if i < len(words) - 1:
            x += space_w

# -- Config -----------------------------------------------------------
arg = sys.argv[1]
cfg = json.load(open(arg)) if os.path.isfile(arg) else json.loads(arg)
bg_path    = cfg["bg_path"]
ref_path   = cfg.get("ref_path", "")
out_path   = cfg["output_path"]
headline   = cfg["headline"]

# Flatten multi-word highlight phrases into individual words so each
# word in the headline can be matched independently (e.g. "Quantum Realm"
# adds both "QUANTUM" and "REALM" to the set).
STRIP_CHARS = ".,!?\"'():-"
highlight_set = set()
for phrase in cfg.get("highlights", []):
    for tok in phrase.strip().upper().split():
        w = tok.strip(STRIP_CHARS)
        if w:
            highlight_set.add(w)

W, H       = 1080, 1350
TEXT_PAD_X = 55
FONT_SIZE  = 43
LINE_H     = int(FONT_SIZE * 1.35)
LOGO_SIZE  = 30
GRADIENT_H = 480

# -- Canvas -----------------------------------------------------------
canvas = Image.new("RGB", (W, H), (0, 0, 0))
bg = Image.open(bg_path).convert("RGB").resize((W, H), Image.LANCZOS)
canvas.paste(bg, (0, 0))

# -- Dark gradient overlay (bottom) -----------------------------------
gradient = Image.new("RGBA", (W, GRADIENT_H), (0, 0, 0, 0))
for y in range(GRADIENT_H):
    alpha = int(180 * (y / GRADIENT_H) ** 2.0)
    for x in range(W):
        gradient.putpixel((x, y), (0, 0, 0, alpha))
canvas_rgba = canvas.convert("RGBA")
canvas_rgba.paste(gradient, (0, H - GRADIENT_H), gradient)
canvas = canvas_rgba.convert("RGB")

draw = ImageDraw.Draw(canvas)

# -- Circular reference photo ? top right ----------------------------
if ref_path and os.path.exists(ref_path):
    try:
        D      = 180
        BORDER = 5
        bd     = D + BORDER * 2
        cx_r   = W - 30 - D // 2 - BORDER
        cy_r   = 30 + D // 2 + BORDER
        ref = Image.open(ref_path).convert("RGB").resize((D, D), Image.LANCZOS)
        bc  = Image.new("RGB", (bd, bd), (255, 255, 255))
        bm  = Image.new("L",   (bd, bd), 0)
        ImageDraw.Draw(bm).ellipse([0, 0, bd - 1, bd - 1], fill=255)
        canvas.paste(bc, (cx_r - bd // 2, cy_r - bd // 2), bm)
        pm  = Image.new("L", (D, D), 0)
        ImageDraw.Draw(pm).ellipse([0, 0, D - 1, D - 1], fill=255)
        canvas.paste(ref, (cx_r - D // 2, cy_r - D // 2), pm)
        draw = ImageDraw.Draw(canvas)
    except Exception as e:
        # Reference photo was corrupt/invalid (e.g. a blocked-hotlink HTML
        # page saved with a .jpg extension) — skip it, don't crash the post.
        print(f"WARNING: skipping invalid reference photo ({ref_path}): {e}")

# -- Word-wrap headline -----------------------------------------------
f_bold  = get_font("Bold", FONT_SIZE)
space_w = draw.textlength(" ", font=f_bold)
max_w   = W - TEXT_PAD_X * 2

words_all = headline.split()
lines, cur_words, cur_w = [], [], 0.0
for word in words_all:
    ww     = draw.textlength(word, font=f_bold)
    needed = ww if not cur_words else ww + space_w
    if cur_w + needed > max_w and cur_words:
        lines.append(cur_words)
        cur_words, cur_w = [word], ww
    else:
        cur_words.append(word)
        cur_w += needed
if cur_words:
    lines.append(cur_words)

# -- Position text block inside gradient ------------------------------
total_text_h = len(lines) * LINE_H
logo_reserve = 90
gradient_start = H - GRADIENT_H
text_area_h    = GRADIENT_H - logo_reserve - 30
text_y = gradient_start + max(30, (text_area_h - total_text_h) // 2)

# -- Semi-transparent strip behind text block -------------------------
STRIP_ALPHA = 160   # ~63% opacity — image shows through, text stays readable
STRIP_PAD_Y = 32
FADE_PX     = 45    # gradient fade at top/bottom edge of strip

strip_top    = max(0, int(text_y - STRIP_PAD_Y))
strip_bottom = min(H, int(text_y + total_text_h + STRIP_PAD_Y))
strip_h      = strip_bottom - strip_top

strip_img = Image.new("RGBA", (W, strip_h), (0, 0, 0, 0))
sd = ImageDraw.Draw(strip_img)
for row in range(strip_h):
    if row < FADE_PX:
        a = int(STRIP_ALPHA * row / FADE_PX)
    elif row > strip_h - FADE_PX:
        a = int(STRIP_ALPHA * (strip_h - row) / FADE_PX)
    else:
        a = STRIP_ALPHA
    sd.line([(0, row), (W - 1, row)], fill=(0, 0, 0, a))

canvas_rgba = canvas.convert("RGBA")
canvas_rgba.alpha_composite(strip_img, (0, strip_top))
canvas = canvas_rgba.convert("RGB")
draw = ImageDraw.Draw(canvas)

for i, line_words in enumerate(lines):
    draw_colored_line(draw, line_words, highlight_set, f_bold,
                      text_y + i * LINE_H, W)

# -- Branding bottom-centre -------------------------------------------
LOGO_PATH = "/manim/scripts/schrodingers_cat_logo.png"
GAP       = 8
LOGO_Y    = H - 55

div_w = 280
draw.line([(W // 2 - div_w // 2, LOGO_Y - 12),
           (W // 2 + div_w // 2, LOGO_Y - 12)],
          fill=(80, 80, 80), width=1)

if os.path.exists(LOGO_PATH):
    logo_img  = Image.open(LOGO_PATH).convert("RGBA").resize(
        (LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)
    logo_mask = Image.new("L", (LOGO_SIZE, LOGO_SIZE), 0)
    ImageDraw.Draw(logo_mask).ellipse([0, 0, LOGO_SIZE - 1, LOGO_SIZE - 1], fill=255)
    BORDER = 3
    bd = LOGO_SIZE + BORDER * 2
    border_circ = Image.new("RGB", (bd, bd), (255, 255, 255))
    border_mask = Image.new("L",   (bd, bd), 0)
    ImageDraw.Draw(border_mask).ellipse([0, 0, bd - 1, bd - 1], fill=255)
    f_logo  = get_font("ExtraBold", 17)
    brand_w = "SCHRODINGER'S "
    brand_o = "CAT"
    ww      = draw.textlength(brand_w + brand_o, font=f_logo)
    total_w = bd + GAP + ww
    start_x = (W - total_w) // 2
    lx = int(start_x)
    ly = int(LOGO_Y + (LOGO_SIZE - bd) // 2)
    canvas.paste(border_circ, (lx, ly), border_mask)
    logo_rgb = Image.new("RGB", (LOGO_SIZE, LOGO_SIZE), (0, 0, 0))
    logo_rgb.paste(logo_img, mask=logo_img.split()[3] if logo_img.mode == "RGBA" else None)
    canvas.paste(logo_rgb, (lx + BORDER, ly + BORDER), logo_mask)
    tx = int(start_x + bd + GAP)
    ty = int(LOGO_Y + (LOGO_SIZE - 17) // 2 + 1)
    draw.text((tx, ty), brand_w, font=f_logo, fill=(255, 255, 255))
    draw.text((int(tx + draw.textlength(brand_w, font=f_logo)), ty),
              brand_o, font=f_logo, fill=(255, 165, 0))
else:
    f_logo  = get_font("ExtraBold", 17)
    brand_w = "SCHRODINGER'S "
    brand_o = "CAT"
    full_w  = draw.textlength(brand_w + brand_o, font=f_logo)
    tx = int((W - full_w) // 2)
    ty = int(LOGO_Y + 8)
    draw.text((tx, ty), brand_w, font=f_logo, fill=(255, 255, 255))
    draw.text((int(tx + draw.textlength(brand_w, font=f_logo)), ty),
              brand_o, font=f_logo, fill=(255, 165, 0))

canvas.save(out_path, "PNG")
print(f"OK:{out_path}")
