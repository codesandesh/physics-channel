const fs = require('fs');

const wfPath = 'D:\\Quantum-physics-channel\\workflows\\fit_stage1_content_gen.json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

// ════════════════════════════════════════════════════════════════════════════
// FIX 1 — fit1-n9: Use ElevenLabs /with-timestamps for REAL word sync
// ════════════════════════════════════════════════════════════════════════════
const n9 = wf.nodes.find(n => n.id === 'fit1-n9');
n9.parameters.jsCode = `const fs           = require('fs');
const https        = require('https');
const { execSync } = require('child_process');

const jobData   = $input.first().json;
const jobId     = jobData.job_id;
const narration = (jobData.narration || '').substring(0, 3000);
const n8nIn     = '/data/ffmpeg/input';
if (!fs.existsSync(n8nIn)) fs.mkdirSync(n8nIn, { recursive: true });

const ELEVEN_API_KEY  = 'sk_2022a552bc24219053bf31a93d51c447ebc13439f561e104';
const ELEVEN_VOICE_ID = 'TVm8lq6qGcfDUgEiSSn5';
const ELEVEN_MODEL    = 'eleven_turbo_v2_5';

const audioPath = n8nIn + '/' + jobId + '_voice.mp3';
const contAudio = '/ffmpeg/input/' + jobId + '_voice.mp3';

// ── Call /with-timestamps endpoint — returns audio + real character timestamps ──
const payload = JSON.stringify({
  text: narration,
  model_id: ELEVEN_MODEL,
  voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true }
});

const response = await new Promise((resolve, reject) => {
  const chunks = [];
  const req = https.request({
    hostname: 'api.elevenlabs.io',
    path: '/v1/text-to-speech/' + ELEVEN_VOICE_ID + '/with-timestamps',
    method: 'POST',
    headers: {
      'xi-api-key':   ELEVEN_API_KEY,
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    if (res.statusCode !== 200) {
      let err = '';
      res.on('data', c => err += c);
      res.on('end', () => reject(new Error('ElevenLabs ' + res.statusCode + ': ' + err.slice(0,300))));
      return;
    }
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
  });
  req.on('error', reject);
  req.write(payload);
  req.end();
});

// ── Decode audio base64 → MP3 ─────────────────────────────────────────────────
const audioBuffer = Buffer.from(response.audio_base64, 'base64');
fs.writeFileSync(audioPath, audioBuffer);
console.log('ElevenLabs TTS done | ' + audioBuffer.length + ' bytes');

// ── Get exact audio duration via ffprobe ──────────────────────────────────────
const durOut = execSync(
  'docker exec qpc_ffmpeg_runner ffprobe -v quiet -show_entries format=duration -of csv=p=0 "' + contAudio + '"',
  { encoding: 'utf-8', timeout: 15000 }
).trim();
const audioDuration = parseFloat(durOut) || 28;

// ── Parse character timestamps → word timestamps ─────────────────────────────
const alignment = response.alignment || response.normalized_alignment || {};
const chars      = alignment.characters || [];
const startTimes = alignment.character_start_times_seconds || [];
const endTimes   = alignment.character_end_times_seconds   || [];

const wordTimings = [];

if (chars.length > 0) {
  // Build word timings from character alignment
  let wChars = [], wStart = null;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === ' ' || c === '\\n' || c === '\\t') {
      if (wChars.length > 0) {
        wordTimings.push({
          word:  wChars.join('').replace(/[.,!?;:]+$/, ''),
          start: +wStart.toFixed(3),
          end:   +endTimes[i-1].toFixed(3)
        });
        wChars = []; wStart = null;
      }
    } else {
      if (wChars.length === 0) wStart = startTimes[i];
      wChars.push(c);
    }
  }
  // Last word
  if (wChars.length > 0) {
    wordTimings.push({
      word:  wChars.join('').replace(/[.,!?;:]+$/, ''),
      start: +wStart.toFixed(3),
      end:   +endTimes[endTimes.length-1].toFixed(3)
    });
  }
  console.log('Real word timings: ' + wordTimings.length + ' words from ElevenLabs character alignment');
} else {
  // Fallback: estimate from WPM if alignment missing
  console.warn('No alignment in response — using WPM estimate');
  const words = narration.trim().split(/\\s+/);
  let cursor = 0.25;
  for (const w of words) {
    const dur = 0.38 * (0.8 + w.length * 0.04);
    wordTimings.push({ word: w.replace(/[.,!?;:]+$/, ''), start: +cursor.toFixed(3), end: +(cursor+dur).toFixed(3) });
    cursor += dur * 1.05;
  }
  // Scale to actual duration
  const rawEnd = wordTimings[wordTimings.length-1].end + 0.3;
  const scale  = (audioDuration - 0.3) / rawEnd;
  for (const wt of wordTimings) { wt.start = +(wt.start*scale).toFixed(3); wt.end = +(wt.end*scale).toFixed(3); }
}

console.log('Audio duration: ' + audioDuration.toFixed(2) + 's | Words: ' + wordTimings.length);
return [{ json: { ...jobData, audio_path: '/data/ffmpeg/input/' + jobId + '_voice.mp3', audio_duration: +audioDuration.toFixed(3), word_timings: wordTimings } }];`;

console.log('✓ fit1-n9 updated: ElevenLabs with-timestamps for real word sync');

// ════════════════════════════════════════════════════════════════════════════
// FIX 2 — fit1-n10: Adobe-quality captions — glow bloom on active word
// ════════════════════════════════════════════════════════════════════════════
const n10 = wf.nodes.find(n => n.id === 'fit1-n10');
n10.parameters.jsCode = `const fs      = require('fs');
const data    = $input.first().json;
const jobId   = data.job_id;
const timings = data.word_timings || [];
const hlWords = (data.highlight_keywords || []).map(w => w.toLowerCase().replace(/[^a-z]/g,''));
const n8nIn   = '/data/ffmpeg/input';

function toASS(sec) {
  if (!sec || isNaN(sec)) sec = 0;
  const h  = Math.floor(sec/3600);
  const m  = Math.floor((sec%3600)/60);
  const s  = Math.floor(sec%60);
  const cs = Math.round((sec%1)*100);
  return h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0');
}

// ── ASS Color helpers (ASS uses AABBGGRR hex format) ──────────────────────────
// Electric cobalt blue glow  #0044FF → BGR = FF4400
const GLOW_COLOR   = '&H00FF4400&';   // electric blue outline (glow)
const WHITE_ACTIVE = '&H00FFFFFF&';   // bright white — active word
const WHITE_DIM    = '&H99FFFFFF&';   // dimmed white — inactive words (99 = 60% alpha)
const SHADOW_COL   = '&HCC111111&';   // dark translucent shadow
// Keyword highlight: orange-yellow glow for power words
const KW_COLOR     = '&H0000CCFF&';   // orange glow (BGR: 00,CC,FF)
const KW_TEXT      = '&H00CCFFFF&';   // yellow text for keywords

// ── Build caption events: 3-word chunks, active word glows ───────────────────
const CHUNK = 3;
const lines = [];

for (let i = 0; i < timings.length; i += CHUNK) {
  const chunk = timings.slice(i, Math.min(i+CHUNK, timings.length));

  for (let j = 0; j < chunk.length; j++) {
    const wStart = chunk[j].start;
    const wEnd   = chunk[j].end;

    const parts = chunk.map((w, k) => {
      const word    = w.word;
      const isActive  = k === j;
      const isKw    = hlWords.some(h => word.toLowerCase().replace(/[^a-z]/g,'').includes(h));

      if (isKw && isActive) {
        // Active keyword: yellow text + orange glow + heavy blur
        return '{\\c'+KW_TEXT+'\\blur12\\bord6\\3c'+KW_COLOR+'\\shad3\\4c'+SHADOW_COL+'}' + word + '{\\r}';
      } else if (isActive) {
        // Active word: bright white + electric blue glow bloom
        return '{\\c'+WHITE_ACTIVE+'\\blur10\\bord5\\3c'+GLOW_COLOR+'\\shad3\\4c'+SHADOW_COL+'}' + word + '{\\r}';
      } else if (isKw) {
        // Inactive keyword: show in keyword color, dimmed glow
        return '{\\c'+KW_TEXT+'\\blur2\\bord2\\3c'+KW_COLOR+'\\alpha&H66&}' + word + '{\\r}';
      } else {
        // Inactive: dimmed, no glow
        return '{\\c'+WHITE_DIM+'\\blur0\\bord0\\shad0}' + word;
      }
    }).join(' ');

    // Slide-in animation: move from y+12 to final position over first 80ms
    const slideTag = (j === 0 && i === 0) ? '{\\move(540,1430,540,1418,0,80)}' : '';
    lines.push('Dialogue: 0,'+toASS(wStart)+','+toASS(wEnd)+',Caption,,0,0,0,,'+slideTag+parts);
  }
}

// ── ASS file with Anton-style bold font definition ─────────────────────────────
// WrapStyle=2 = no wrapping (each line exactly as written)
// Alignment=2 = bottom center
// BorderStyle=1 = outline+shadow (NOT box)
// Outline=5 = thick outline (blurred = glow effect)
// Shadow=3 = drop shadow depth
const assContent = [
  '[Script Info]',
  'Title: Fitness Anatomy Captions',
  'ScriptType: v4.00+',
  'WrapStyle: 2',
  'PlayResX: 1080',
  'PlayResY: 1920',
  'ScaledBorderAndShadow: yes',
  '',
  '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  // Anton-Regular, size 72, white text, electric blue outline, dark shadow, bold=-1, BorderStyle=1, Outline=5, Shadow=3, Align=2 (bottom center), MarginV=120
  'Style: Caption,Anton-Regular,72,&H00FFFFFF,&H000000FF,&H00FF4400,&HCC111111,-1,0,0,0,100,100,0,0,1,5,3,2,30,30,120,1',
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ...lines
].join('\\n');

const assPath = n8nIn + '/' + jobId + '_captions.ass';
fs.writeFileSync(assPath, assContent, 'utf8');
console.log('ASS captions: ' + lines.length + ' events | Anton-Regular 72px | glow: electric blue | keywords: ' + hlWords.join(','));

return [{ json: { ...data, ass_path: assPath } }];`;

console.log('✓ fit1-n10 updated: Adobe-quality captions with glow bloom');

// ════════════════════════════════════════════════════════════════════════════
// FIX 3 — Stage 3: Add Anton fontsdir to subtitle filter
// ════════════════════════════════════════════════════════════════════════════
const wf3Path = 'D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly.json';
const wf3 = JSON.parse(fs.readFileSync(wf3Path, 'utf8'));
const n3  = wf3.nodes.find(n => n.id === 'fit3-n3');

// Update subtitle filter to include Anton font directory
n3.parameters.jsCode = n3.parameters.jsCode.replace(
  `vf += ";["+cur+"]subtitles=filename='"+assFile+"'[outv]";`,
  `vf += ";["+cur+"]subtitles=filename='"+assFile+"':fontsdir='/ffmpeg/config/fonts'[outv]";`
);

fs.writeFileSync(wfPath,  JSON.stringify(wf,  null, 2), 'utf8');
fs.writeFileSync(wf3Path, JSON.stringify(wf3, null, 2), 'utf8');

// Build payloads
const p1 = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: { executionOrder: wf.settings?.executionOrder||'v1' } };
const p3 = { name: wf3.name, nodes: wf3.nodes, connections: wf3.connections, settings: { executionOrder: wf3.settings?.executionOrder||'v1' } };
fs.writeFileSync('D:\\Quantum-physics-channel\\workflows\\fit_stage1_content_gen-payload.json', JSON.stringify(p1), 'utf8');
fs.writeFileSync('D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly-payload.json',    JSON.stringify(p3), 'utf8');
console.log('✓ Stage 3: Anton fontsdir added to subtitle filter');
console.log('✓ All payloads ready');
