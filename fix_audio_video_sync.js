const fs = require('fs');

// ════════════════════════════════════════════════════════
// FIX 1 — Stage 1: Remove CTA narration, reduce word count
// ════════════════════════════════════════════════════════
const wf1Path = 'D:\\Quantum-physics-channel\\workflows\\fit_stage1_content_gen.json';
const wf1 = JSON.parse(fs.readFileSync(wf1Path, 'utf8'));
const n6 = wf1.nodes.find(n => n.id === 'fit1-n6');

let promptCode = n6.parameters.jsCode;

// Fix narration word count: 65-80 → 50-60
promptCode = promptCode.replace(
  'Total words across all 6 scenes combined: 65-80 words maximum.',
  'Total words across all 6 scenes combined: 50-60 words MAXIMUM. This is critical — ElevenLabs audio must fit within 28 seconds of video. Each scene gets ~8-10 words maximum.'
);

// Fix scene 6 — remove verbal CTA requirement
promptCode = promptCode.replace(
  `SCENE 6 — CTA [TYPE B — Exercise Demo]:\nNarration: Powerful closing motivation ending WORD-FOR-WORD with: "\${cta_message || 'Follow for daily workout tips'}"\nSeedance prompt must show: White glossy ceramic mannequin in the TRIUMPHANT FINAL POSITION of the completed exercise — full body wide shot. Complete equipment setup visible. FITONOMY black mat. Neutral grey studio. Blue neon muscle glow, green floor ring under feet. Strong, powerful, motivating composition.`,
  `SCENE 6 — CLOSE [TYPE B — Exercise Demo]:\nNarration (6-10 words MAX): Short powerful closing command. NO verbal CTA — do NOT say "follow", "subscribe", "link in bio", or any call-to-action phrase. The popup notification handles CTA. End on a motivating command word like "Now go build it." or "Every rep counts." or "Train hard. Stay consistent."\nSeedance prompt must show: White glossy ceramic mannequin in the TRIUMPHANT FINAL POSITION of the completed exercise — full body wide shot. Complete equipment setup visible. FITONOMY black mat. Neutral grey studio. Blue neon muscle glow, green floor ring under feet. Strong, powerful, motivating composition.`
);

// Remove the old CTA rule from narration rules
promptCode = promptCode.replace(
  `Scene 6 final words MUST match exactly: "\${cta_message || 'Follow for daily workout tips'}"\nNever use first person (I / we / my / our).`,
  `Scene 6: Short motivating close only (6-10 words). NEVER include follow/subscribe/CTA verbally.\nNever use first person (I / we / my / our).`
);

n6.parameters.jsCode = promptCode;
fs.writeFileSync(wf1Path, JSON.stringify(wf1, null, 2), 'utf8');

const payload1 = { name: wf1.name, nodes: wf1.nodes, connections: wf1.connections, settings: { executionOrder: wf1.settings?.executionOrder || 'v1' } };
fs.writeFileSync('D:\\Quantum-physics-channel\\workflows\\fit_stage1_content_gen-payload.json', JSON.stringify(payload1), 'utf8');
console.log('✓ Stage 1: CTA removed from narration, word cap set to 50-60');

// ════════════════════════════════════════════════════════
// FIX 2 — Stage 3: Trim audio to exact video duration
// ════════════════════════════════════════════════════════
const wf3Path = 'D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly.json';
const wf3 = JSON.parse(fs.readFileSync(wf3Path, 'utf8'));
const n3 = wf3.nodes.find(n => n.id === 'fit3-n3');

let code3 = n3.parameters.jsCode;

// Fix the final render duration — currently uses audio_duration + 2 which overruns video
// Replace the dur calculation and final render command
code3 = code3.replace(
  `const fullFilter = (vf + afilters).replace(/^;/, "");\nconst dur        = data.audio_duration ? Math.ceil(data.audio_duration) + 2 : 32;`,
  `const fullFilter = (vf + afilters).replace(/^;/, "");

// ── Calculate exact video duration (clips with xfade overlaps) ────────────────
const CLIP_DUR_S = 5.0;
const FADE_DUR_S = 0.4;
const videoDur   = N * CLIP_DUR_S - Math.max(0, N-1) * FADE_DUR_S;  // e.g. 6×5 - 5×0.4 = 28s
// Cap audio at video duration — prevent black tail at end
const audioCap   = data.audio_duration ? Math.min(data.audio_duration, videoDur) : videoDur;
const dur        = Math.ceil(videoDur) + 1;  // +1s buffer for smooth fade-out
console.log('Video dur: ' + videoDur.toFixed(1) + 's | Audio dur: ' + (data.audio_duration||0).toFixed(1) + 's | Capped to: ' + audioCap.toFixed(1) + 's');`
);

// Add audio trim filter to cap narration at audioCap
// Replace narration volume filter to add atrim
code3 = code3.replace(
  `const bellF = hasNotifSnd
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
}`,
  `const bellF = hasNotifSnd
  ? '['+notifSndI+':a]adelay='+bellDelayMs+'|'+bellDelayMs+',volume=2.2,aformat=sample_fmts=fltp[bell];'
  : '';

// Narration trimmed to exact video duration + 0.5s fade-out
const narTrim = 'atrim=0:' + audioCap.toFixed(3) + ',afade=t=out:st=' + Math.max(0,(audioCap-0.6)).toFixed(3) + ':d=0.6,volume=1.0';
const narF    = narFile ? '['+narI+':a]'+narTrim+'[nar];' : '';

if (narFile && hasBgm && hasNotifSnd) {
  afilters = ';'+narF+bellF+'[bgm_raw]'+('['+bgmI+':a]')+';[bgm_raw]atrim=0:'+dur+',volume=0.22[bgm];[nar][bgm][bell]amix=inputs=3:duration=first:dropout_transition=2[aout]';
  amap = '-map "[aout]"';
} else if (narFile && hasBgm) {
  afilters = ';'+narF+'['+bgmI+':a]atrim=0:'+dur+',volume=0.22[bgm];[nar][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]';
  amap = '-map "[aout]"';
} else if (narFile && hasNotifSnd) {
  afilters = ';'+narF+bellF+'[nar][bell]amix=inputs=2:duration=first:dropout_transition=2[aout]';
  amap = '-map "[aout]"';
} else if (narFile) {
  afilters = ';'+narF+'[nar]aformat=sample_fmts=fltp[aout]';
  amap = '-map "[aout]"';
} else if (hasBgm) {
  afilters = ';['+bgmI+':a]atrim=0:'+dur+',volume=0.85[aout]';
  amap = '-map "[aout]"';
}`
);

n3.parameters.jsCode = code3;
fs.writeFileSync(wf3Path, JSON.stringify(wf3, null, 2), 'utf8');

const payload3 = { name: wf3.name, nodes: wf3.nodes, connections: wf3.connections, settings: { executionOrder: wf3.settings?.executionOrder || 'v1' } };
fs.writeFileSync('D:\\Quantum-physics-channel\\workflows\\fit_stage3_assembly-payload.json', JSON.stringify(payload3), 'utf8');
console.log('✓ Stage 3: Audio hard-trimmed to video duration (28s for 6 clips)');
