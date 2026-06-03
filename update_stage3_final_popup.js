const fs = require('fs');

const wfPath = 'D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly.json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
const n3 = wf.nodes.find(n => n.id === 'fit3-n3');
let code = n3.parameters.jsCode;

// ── 1. Replace the notification PNG generation block ─────────────────────────
// Find: "// ─── STEP 1: Create iOS-style notification PNG" ... up to "const hasNotif ="
const step1Start = code.indexOf('// ─── STEP 1: Create iOS-style notification PNG');
const step1End   = code.indexOf('const hasNotif = run(');
if (step1Start === -1 || step1End === -1) {
  console.error('Step 1 markers not found'); process.exit(1);
}

const newStep1 = `// ─── STEP 1: Create iOS-style notification PNG (WhatsApp Messages style) ────
const overlayDir  = '/ffmpeg/config/overlay';
const notifBase   = overlayDir + '/ios_notification_bg.png';
const notifExists = run('docker exec qpc_ffmpeg_runner test -f "' + notifBase + '" && echo OK').includes('OK');

if (!notifExists) {
  run('docker exec qpc_ffmpeg_runner mkdir -p "' + overlayDir + '"');

  // Install Pillow if missing
  run('docker exec qpc_ffmpeg_runner pip install pillow --quiet 2>&1', 30000);

  // Write the notification card Python script
  const pyPath = n8nIn + '/_mknotif_final.py';
  const pyScript = \`import os, math
os.makedirs('/ffmpeg/config/overlay', exist_ok=True)
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W=1040; TITLE_H=44; CONTENT_H=82; TOTAL_H=TITLE_H+CONTENT_H; R=18
SHADOW_BLUR=11; PAD=20
ICON_SZ=22; ICON_X=14; ICON_Y=(TITLE_H-ICON_SZ)//2

# Draw Messages icon at 4x then downsample (smooth antialiasing)
SZ4=ICON_SZ*4
big=Image.new('RGBA',(SZ4,SZ4),(0,0,0,0))
bd=ImageDraw.Draw(big)
bd.rounded_rectangle([0,0,SZ4-1,SZ4-1],radius=SZ4//4,fill=(52,199,89,255))
pad1=SZ4//8
bd.ellipse([pad1,pad1,SZ4-pad1-1,SZ4-pad1-6],fill=(255,255,255,255))
tail=[(pad1+2,SZ4-pad1-8),(pad1+2,SZ4-pad1+6),(pad1+SZ4//6,SZ4-pad1-14)]
bd.polygon(tail,fill=(255,255,255,255))
icon=big.resize((ICON_SZ,ICON_SZ),Image.LANCZOS)

# Shadow
full_w=W+PAD*2; full_h=TOTAL_H+PAD*2+10
shadow=Image.new('RGBA',(full_w,full_h),(0,0,0,0))
ImageDraw.Draw(shadow).rounded_rectangle([PAD,PAD+8,PAD+W-1,PAD+TOTAL_H+8-1],radius=R,fill=(0,0,0,72))
shadow=shadow.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))

# Card
card=Image.new('RGBA',(W,TOTAL_H),(0,0,0,0))
mask=Image.new('L',(W,TOTAL_H),0)
ImageDraw.Draw(mask).rounded_rectangle([0,0,W-1,TOTAL_H-1],radius=R,fill=255)
card.paste(Image.new('RGBA',(W,TITLE_H),(255,255,255,250)),(0,0))
ImageDraw.Draw(card).rectangle([0,TITLE_H,W,TITLE_H+1],fill=(208,208,212,255))
card.paste(Image.new('RGBA',(W,CONTENT_H),(230,230,234,250)),(0,TITLE_H+1))
card.putalpha(mask)

# Light sweep (per-pixel, no putalpha)
sweep=Image.new('RGBA',(W,TITLE_H),(0,0,0,0))
sp=sweep.load()
for y in range(TITLE_H):
  for x in range(W):
    dv=(x*0.75+y*0.25)/(W*0.75+TITLE_H*0.25)
    if 0.06<dv<0.30:
      t=(dv-0.06)/0.24
      sp[x,y]=(255,255,255,int(18*math.sin(math.pi*t)))
tc=card.crop((0,0,W,TITLE_H))
card.paste(Image.alpha_composite(tc,sweep),(0,0))
card.paste(icon,(ICON_X,ICON_Y),icon)

result=shadow.copy()
result.paste(card,(PAD,PAD),card)
result.save('/ffmpeg/config/overlay/ios_notification_bg.png','PNG')
print('NOTIF_OK')
\`;
  fs.writeFileSync(pyPath, pyScript);
  const pyRes = run('docker exec qpc_ffmpeg_runner python3 "' + pyPath.replace('/data/ffmpeg','/ffmpeg') + '"', 30000);
  console.log('Notification card:', pyRes.trim());
}

`;

code = code.slice(0, step1Start) + newStep1 + code.slice(step1End);

// ── 2. Replace the popup text overlay section ────────────────────────────────
const popupStart = code.indexOf('// ─── POPUP NOTIFICATION');
const popupEnd   = code.indexOf('// ─── MUSCLE LABELS');
if (popupStart === -1 || popupEnd === -1) {
  console.error('Popup markers not found'); process.exit(1);
}

// Final coordinates (verified from preview):
// Image placed at y=20 in video | card starts at video y=40 | image is 1080×176
// MESSAGES: x=64  y=52
// now:      x=1008 y=52
// App name: x=34  y=95   (bold, double-draw)
// Message:  x=34  y=131
const newPopup = `// ─── POPUP NOTIFICATION — iOS Messages style, full width, slide-in ──────────
const popupStart = popup.start_sec || 5;
const popupEnd   = popup.end_sec   || 9;

function ffText(s) {
  return (s||'').replace(/[\\\\':]/g,'').replace(/[^\\x20-\\x7E]/g,'').slice(0,52);
}
const pApp = ffText(popup.app_name || 'FitChannel');
const pMsg = ffText(popup.message  || 'Get the full program');
const en   = "between(t," + popupStart + "," + popupEnd + ")";

// Slide in from y=-10 → y=20 over 0.35s (image placed at y=20 final)
const animY =
  "if(between(t," + popupStart + "," + (popupStart+0.35).toFixed(2) + ")," +
    "20-30*(1-((t-" + popupStart + ")/0.35))," +
  "20)";

if (hasNotif) {
  // Scale PNG to 1080×176, overlay full-width at x=0 with slide animation
  vf += ';['+notifI+':v]scale=1080:176,format=rgba[notif]';
  vf += ';['+cur+'][notif]overlay=x=0:y=\\''+animY+'\\''+
        ':format=auto:enable=\\''+en+'\\'[vb'+lbl+']';
  cur='vb'+lbl; lbl++;

  // Title bar text — Liberation Sans style (ffmpeg default closest match)
  vf += ';['+cur+"]drawtext=text='MESSAGES':fontcolor=0x646468:fontsize=20:x=64:y=52:enable='"+en+"'[vb"+lbl+']';
  cur='vb'+lbl; lbl++;
  vf += ';['+cur+"]drawtext=text='now':fontcolor=0x9B9BA0:fontsize=20:x=1008:y=52:enable='"+en+"'[vb"+lbl+']';
  cur='vb'+lbl; lbl++;

  // App name bold (double-draw 1px offset for bold effect)
  vf += ';['+cur+"]drawtext=text='"+pApp+"':fontfile=/data/ffmpeg/config/fonts/LiberationSans-Bold.ttf:fontcolor=0x0F0F0F:fontsize=27:x=34:y=95:enable='"+en+"'[vb"+lbl+']';
  cur='vb'+lbl; lbl++;
  vf += ';['+cur+"]drawtext=text='"+pApp+"':fontfile=/data/ffmpeg/config/fonts/LiberationSans-Bold.ttf:fontcolor=0x0F0F0F:fontsize=27:x=35:y=95:enable='"+en+"'[vb"+lbl+']';
  cur='vb'+lbl; lbl++;

  // Message text
  vf += ';['+cur+"]drawtext=text='"+pMsg+"':fontcolor=0x4B4B50:fontsize=24:x=34:y=131:enable='"+en+"'[vb"+lbl+']';
  cur='vb'+lbl; lbl++;

} else {
  // Fallback drawbox
  vf += ';['+cur+']drawbox=x=20:y=40:w=1040:h=44:color=0xFFFFFF@0.97:t=fill:enable=\\''+en+'\\'[vb'+lbl+']'; cur='vb'+lbl; lbl++;
  vf += ';['+cur+']drawbox=x=20:y=84:w=1040:h=82:color=0xE6E6EA@0.97:t=fill:enable=\\''+en+'\\'[vb'+lbl+']'; cur='vb'+lbl; lbl++;
  vf += ';['+cur+']drawbox=x=34:y=51:w=22:h=22:color=0x34C759@1:t=fill:enable=\\''+en+'\\'[vb'+lbl+']'; cur='vb'+lbl; lbl++;
  vf += ';['+cur+"]drawtext=text='MESSAGES':fontcolor=0x646468:fontsize=20:x=64:y=52:enable='"+en+"'[vb"+lbl+']'; cur='vb'+lbl; lbl++;
  vf += ';['+cur+"]drawtext=text='now':fontcolor=0x9B9BA0:fontsize=20:x=1008:y=52:enable='"+en+"'[vb"+lbl+']'; cur='vb'+lbl; lbl++;
  vf += ';['+cur+"]drawtext=text='"+pApp+"':fontcolor=0x0F0F0F:fontsize=27:x=34:y=95:enable='"+en+"'[vb"+lbl+']'; cur='vb'+lbl; lbl++;
  vf += ';['+cur+"]drawtext=text='"+pMsg+"':fontcolor=0x4B4B50:fontsize=24:x=34:y=131:enable='"+en+"'[vb"+lbl+']'; cur='vb'+lbl; lbl++;
}

`;

code = code.slice(0, popupStart) + newPopup + code.slice(popupEnd);
n3.parameters.jsCode = code;

// Also copy Liberation Sans font to config/fonts for FFmpeg drawtext
const { execSync } = require('child_process');
try {
  execSync('docker exec qpc_ffmpeg_runner bash -c "mkdir -p /ffmpeg/config/fonts && cp /usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf /ffmpeg/config/fonts/ && cp /usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf /ffmpeg/config/fonts/ && echo FONTS_OK"', { encoding: 'utf-8' });
  console.log('✓ Fonts copied to /ffmpeg/config/fonts/');
} catch(e) { console.warn('Font copy:', e.message); }

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('✓ fit3-n3 updated with final popup');

const payload = {
  name: wf.name, nodes: wf.nodes,
  connections: wf.connections,
  settings: { executionOrder: wf.settings?.executionOrder || 'v1' }
};
fs.writeFileSync(
  'D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly-payload.json',
  JSON.stringify(payload), 'utf8'
);
console.log('✓ Payload ready');
