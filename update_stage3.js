const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflows/seedancehighnice-stage3.json','utf8'));
const node = wf.nodes.find(n => n.id === 'shn3-n3');

const newCode = `// Stage 3 — voice-synced clip timing + 6 motion presets
const { execSync } = require('child_process');
const fs           = require('fs');

const data        = $input.first().json;
const jobId       = data.job_id;
const clips       = data.clip_paths || [];
const audioP      = data.audio_path;
const assP        = data.ass_path;
const audioDur    = data.audio_duration || 30;
const scenes      = data.scenes || [];
const wordTimings = data.word_timings || [];
const N           = clips.length;

if (N === 0) throw new Error('No clip_paths received');

const n8nIn  = '/data/ffmpeg/input';
const n8nOut = '/data/ffmpeg/output';
const contIn = '/ffmpeg/input';
const contOut= '/ffmpeg/output';

if (!fs.existsSync(n8nOut)) fs.mkdirSync(n8nOut, { recursive: true });

function run(cmd, ms, ignoreErr) {
  try { return execSync(cmd, { encoding: 'utf-8', timeout: ms || 120000 }); }
  catch(e) {
    const out = ((e.stdout||'') + (e.stderr||'')).toString();
    if (ignoreErr) { console.warn('WARN: ' + out.slice(-200)); return ''; }
    throw new Error(out.slice(-600));
  }
}

function toC(p) { return p.replace('/data/ffmpeg', '/ffmpeg'); }

// ── STEP 0: actual clip durations from word_timings ───────────────
function wc(text) { return (text||'').trim().split(/\\s+/).filter(w=>w.length>0).length; }

const clipDurs = [];
let wtIdx = 0, prevEnd = 0;

for (let i = 0; i < N; i++) {
  const seg      = scenes[i] ? (scenes[i].narration_segment || '') : '';
  const nWords   = wc(seg);
  const endIdx   = Math.min(wtIdx + nWords - 1, wordTimings.length - 1);
  const endSec   = wordTimings[endIdx] ? wordTimings[endIdx].end : audioDur;
  clipDurs.push(parseFloat(Math.max(endSec - prevEnd, 1.5).toFixed(3)));
  prevEnd = endSec;
  wtIdx  += nWords;
}
// last clip covers to end of audio
const used = clipDurs.slice(0,-1).reduce((a,b)=>a+b,0);
clipDurs[N-1] = parseFloat(Math.max(audioDur - used, 1.5).toFixed(3));

console.log('Scene durations: ' + clipDurs.map((d,i)=>'S'+(i+1)+':'+d+'s').join(' | '));
console.log('Total: ' + clipDurs.reduce((a,b)=>a+b,0).toFixed(2) + 's | Audio: ' + audioDur.toFixed(2) + 's');

// ── STEP 1+2: normalize + time-stretch + motion per clip ──────────
// Square (1080x1080) content centred in 1080x1920 with 420px black bars top/bottom
// Oversample to 1188x1188 for Ken Burns headroom (108px travel each axis)
function getCrop(preset, d) {
  const px = ['(1188-1080)/2*(1-t/'+d+'):(1188-1080)/2*(1-t/'+d+')',
               '(1188-1080)/2*t/'+d+':(1188-1080)/2*t/'+d,
               '(1188-1080)/2*(1-t/'+d+')+20*t/'+d+':(1188-1080)/2*(1-t/'+d+')',
               '(1188-1080)/2*t/'+d+':(1188-1080)/2*(1-t/'+d+')+20*t/'+d,
               '(1188-1080)/4*(1-t/'+d+'):(1188-1080)/2*(1-t/'+d+')',
               '(1188-1080)/2*(1-t/'+d+'):(1188-1080)/4*t/'+d];
  return px[preset % 6];
}

console.log('Processing ' + N + ' clips with time-stretch + square motion...');
const processed = [];

for (let i = 0; i < N; i++) {
  const src    = toC(clips[i]);
  const dst    = contIn + '/' + jobId + '_proc' + i + '.mp4';
  const dstH   = n8nIn  + '/' + jobId + '_proc' + i + '.mp4';
  const dur    = clipDurs[i];
  const d      = dur.toFixed(3);
  const ptsF   = (dur / 5.0).toFixed(6);
  const fadeO  = Math.max(dur - 0.25, 0.1).toFixed(3);
  const crop   = getCrop(i, d);
  // Fill 1188x1188 square (center-crop any aspect ratio), Ken Burns to 1080x1080,
  // then pad into 1080x1920 with 420px black top and bottom
  const vf     = 'setpts=' + ptsF + '*PTS,scale=1188:1188:force_original_aspect_ratio=increase:flags=lanczos,crop=1188:1188,crop=1080:1080:' + crop + ',pad=1080:1920:0:420:color=black,setsar=1,fps=24,fade=t=in:st=0:d=0.2,fade=t=out:st=' + fadeO + ':d=0.2';

  run('docker exec qpc_ffmpeg_runner ffmpeg -y -i "' + src + '" -vf "' + vf + '" -t ' + d + ' -c:v libx264 -crf 17 -preset fast -pix_fmt yuv420p -an "' + dst + '" && echo OK', 180000);
  processed.push({ n8n: dstH, cont: dst });
  console.log('  Clip ' + (i+1) + ': ' + d + 's | motion ' + (i%6) + ' | setpts=' + ptsF);
}

// ── STEP 3: concat ────────────────────────────────────────────────
console.log('Concatenating...');
let xfade;
if (N === 1) {
  xfade = processed[0];
} else {
  const cc = contIn + '/' + jobId + '_concat.mp4';
  const cn = n8nIn  + '/' + jobId + '_concat.mp4';
  run('docker exec qpc_ffmpeg_runner ffmpeg -y ' + processed.map(p=>'-i "'+p.cont+'"').join(' ') +
      ' -filter_complex "concat=n=' + N + ':v=1:a=0[vout]" -map "[vout]"' +
      ' -c:v libx264 -crf 17 -preset fast -pix_fmt yuv420p -an "' + cc + '" && echo CONCAT_OK', 300000);
  xfade = { n8n: cn, cont: cc };
  console.log('Concat: ' + clipDurs.reduce((a,b)=>a+b,0).toFixed(2) + 's');
}

// ── STEP 4: audio ─────────────────────────────────────────────────
const voiceC = toC(audioP);
const hasVoice = run('docker exec qpc_ffmpeg_runner test -f "' + voiceC + '" && echo OK', 10000, true).includes('OK');

let bgmFile = null;
for (const t of ['NatureAmbient','Odyssey','Arcane','Apprehension','Anamalie']) {
  const p = '/ffmpeg/config/bgm/' + t + '.mp3';
  if (run('docker exec qpc_ffmpeg_runner test -f "' + p + '" && echo OK', 5000, true).includes('OK')) { bgmFile = p; console.log('BGM: ' + t); break; }
}

let bgmT = null;
if (bgmFile) {
  const bd  = contIn + '/' + jobId + '_bgm.mp3';
  const fst = Math.max(0, audioDur - 1.5).toFixed(2);
  run('docker exec qpc_ffmpeg_runner ffmpeg -y -i "' + bgmFile + '" -t ' + audioDur.toFixed(2) + ' -af "afade=t=in:st=0:d=1.0,afade=t=out:st=' + fst + ':d=1.5,volume=0.12" -acodec libmp3lame -ab 128k "' + bd + '" && echo BGM_OK', 60000, true);
  bgmT = bd;
}

// ── STEP 5: captions ─────────────────────────────────────────────
const assC   = toC(assP);
const hasASS = run('docker exec qpc_ffmpeg_runner test -f "' + assC + '" && echo OK', 5000, true).includes('OK');
console.log('Captions: ' + (hasASS?'yes':'no'));

// ── STEP 6: final render ──────────────────────────────────────────
const inp = ['-i "' + xfade.cont + '"'];
if (hasVoice) inp.push('-i "' + voiceC + '"');
if (bgmT)     inp.push('-i "' + bgmT + '"');

const vIdx = hasVoice ? 1 : -1;
const bIdx = bgmT ? (hasVoice ? 2 : 1) : -1;

let vF = [], vL = '0:v', lb = 0;

if (hasASS) {
  vF.push('['+vL+"]subtitles=filename='"+assC+"'[vv"+lb+']');
  vL = 'vv'+lb; lb++;
}
const fst2 = Math.max(0, audioDur - 1.5).toFixed(2);
vF.push('['+vL+']fade=t=out:st='+fst2+':d=1.5:color=black[vfo'+lb+']');
vL = 'vfo'+lb; lb++;

const aft = Math.max(0, audioDur - 1.2).toFixed(2);
let aMap = '-an', aStr = '';
if (hasVoice && bgmT) {
  aStr = ';['+vIdx+':a]volume=0.75,afade=t=out:st='+aft+':d=1.2[nar];['+bIdx+':a]volume=1.0[bgm];[nar][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]';
  aMap = '-map "[aout]"';
} else if (hasVoice) {
  aStr = ';['+vIdx+':a]volume=0.75,afade=t=out:st='+aft+':d=1.2[aout]';
  aMap = '-map "[aout]"';
} else if (bgmT) {
  aStr = ';['+bIdx+':a]volume=1.0,afade=t=out:st='+aft+':d=1.2[aout]';
  aMap = '-map "[aout]"';
}

const ff    = vF.join(';') + aStr;
const fCont = contOut + '/' + jobId + '_final.mp4';
const fN8n  = n8nOut  + '/' + jobId + '_final.mp4';
const tSec  = Math.ceil(audioDur) + 1;

const fArg  = ff
  ? ' -filter_complex "' + ff + '" -map "[' + vL + ']" ' + aMap
  : ' -map "0:v" ' + aMap;

const cmd =
  'docker exec qpc_ffmpeg_runner ffmpeg -y ' + inp.join(' ') + fArg +
  ' -c:v libx264 -crf 17 -preset fast -pix_fmt yuv420p -movflags +faststart' +
  (aMap !== '-an' ? ' -c:a aac -b:a 192k' : '') +
  ' -t ' + tSec + ' "' + fCont + '" && echo FINAL_OK';

console.log('Final render...');
const out = run(cmd, 900000);
if (!out.includes('FINAL_OK')) throw new Error('Render failed: ' + out.slice(-500));
if (!fs.existsSync(fN8n)) throw new Error('File missing: ' + fN8n);

const mb  = (fs.statSync(fN8n).size / 1048576).toFixed(1);
const sec = Math.round((Date.now() - (data.start_time || Date.now())) / 1000);
console.log('Done: ' + mb + 'MB | ' + sec + 's | clips: ' + clipDurs.map(d=>d.toFixed(1)+'s').join('+'));

return [{ json: {
  ...data,
  final_video_path: fN8n,
  output_filename:  jobId + '_final.mp4',
  file_size_mb:     parseFloat(mb),
  render_time_sec:  sec,
  clips_used:       N,
  has_voice:        hasVoice,
  has_bgm:          !!bgmT,
  has_captions:     hasASS,
  clip_durations:   clipDurs
}}];`;

node.parameters.jsCode = newCode;
fs.writeFileSync('workflows/seedancehighnice-stage3.json', JSON.stringify(wf, null, 2));
console.log('Stage 3 updated. Node:', node.name);
