const fs = require('fs');

const wfPath = 'D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly.json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
const n3 = wf.nodes.find(n => n.id === 'fit3-n3');
let code = n3.parameters.jsCode;

// ── 1. Add notification sound input right after bgm input check ──────────────
const oldAssetCheck = `console.log('Assets | logo:'+hasLogo+' | voice:'+!!narFile+' | bgm:'+hasBgm+' | ass:'+hasAss);`;
const newAssetCheck = `// Notification bell sound
const notifSndPath = '/ffmpeg/config/whatsapp_notify.mp3';
const hasNotifSnd  = run('docker exec qpc_ffmpeg_runner test -f "' + notifSndPath + '" && echo OK').includes('OK');
console.log('Assets | logo:'+hasLogo+' | voice:'+!!narFile+' | bgm:'+hasBgm+' | ass:'+hasAss+' | bell:'+hasNotifSnd);`;

if (!code.includes(oldAssetCheck)) { console.error('Asset check marker not found'); process.exit(1); }
code = code.replace(oldAssetCheck, newAssetCheck);

// ── 2. Add notifSnd to input list ─────────────────────────────────────────────
const oldInputList = `const inp   = ['-i "' + withTransitions + '"'];
const notifI = hasNotif ? inp.push('-i "' + notifBase + '"') - 1 : -1;
const narI   = narFile   ? inp.push('-i "' + narFile   + '"') - 1 : -1;
const bgmI   = hasBgm    ? inp.push('-i "' + bgmFile   + '"') - 1 : -1;`;

const newInputList = `const inp        = ['-i "' + withTransitions + '"'];
const notifI     = hasNotif    ? inp.push('-i "' + notifBase    + '"') - 1 : -1;
const narI       = narFile     ? inp.push('-i "' + narFile      + '"') - 1 : -1;
const bgmI       = hasBgm      ? inp.push('-i "' + bgmFile      + '"') - 1 : -1;
const notifSndI  = hasNotifSnd ? inp.push('-i "' + notifSndPath + '"') - 1 : -1;`;

if (!code.includes(oldInputList)) { console.error('Input list marker not found'); process.exit(1); }
code = code.replace(oldInputList, newInputList);

// ── 3. Replace audio mix section with bell sound mixed in ─────────────────────
const oldAudio = `// ─── Audio mix ────────────────────────────────────────────────────────────────
let afilters = '';
let amap     = '-an';
if (narFile && hasBgm) {
  afilters = ';['+narI+':a]volume=1.0[nar];['+bgmI+':a]volume=0.22[bgm];[nar][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]';
  amap = '-map "[aout]"';
} else if (narFile) {
  afilters = ';['+narI+':a]aformat=sample_fmts=fltp[aout]';
  amap = '-map "[aout]"';
} else if (hasBgm) {
  afilters = ';['+bgmI+':a]volume=0.85[aout]';
  amap = '-map "[aout]"';
}`;

const newAudio = `// ─── Audio mix (narration + BGM + notification bell) ─────────────────────────
let afilters = '';
let amap     = '-an';
const bellDelayMs = Math.round((popup.start_sec || 5) * 1000);

// Bell filter: delay to popup timestamp, volume boost
const bellF = hasNotifSnd
  ? '['+notifSndI+':a]adelay='+bellDelayMs+'|'+bellDelayMs+',volume=2.2,aformat=sample_fmts=fltp[bell];'
  : '';

if (narFile && hasBgm && hasNotifSnd) {
  afilters = ';'+bellF+'['+narI+':a]volume=1.0[nar];['+bgmI+':a]volume=0.22[bgm];[nar][bgm][bell]amix=inputs=3:duration=first:dropout_transition=2[aout]';
  amap = '-map "[aout]"';
} else if (narFile && hasBgm) {
  afilters = ';['+narI+':a]volume=1.0[nar];['+bgmI+':a]volume=0.22[bgm];[nar][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]';
  amap = '-map "[aout]"';
} else if (narFile && hasNotifSnd) {
  afilters = ';'+bellF+'['+narI+':a]volume=1.0[nar];[nar][bell]amix=inputs=2:duration=first:dropout_transition=2[aout]';
  amap = '-map "[aout]"';
} else if (narFile) {
  afilters = ';['+narI+':a]aformat=sample_fmts=fltp[aout]';
  amap = '-map "[aout]"';
} else if (hasBgm) {
  afilters = ';['+bgmI+':a]volume=0.85[aout]';
  amap = '-map "[aout]"';
}`;

if (!code.includes(oldAudio)) { console.error('Audio mix marker not found'); process.exit(1); }
code = code.replace(oldAudio, newAudio);

n3.parameters.jsCode = code;
fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('✓ Notification bell sound added to Stage 3 audio mix');

const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: { executionOrder: wf.settings?.executionOrder || 'v1' } };
fs.writeFileSync('D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly-payload.json', JSON.stringify(payload), 'utf8');
console.log('✓ Payload ready');
