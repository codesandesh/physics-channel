const fs = require('fs');
const https = require('https');

const ELEVEN_API_KEY = 'sk_2022a552bc24219053bf31a93d51c447ebc13439f561e104';
const ELEVEN_VOICE_ID = 'TVm8lq6qGcfDUgEiSSn5';
const ELEVEN_MODEL = 'eleven_turbo_v2_5';

const newJsCode = `const fs           = require('fs');
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

const audioPath   = n8nIn + '/' + jobId + '_voice.mp3';
const contAudio   = '/ffmpeg/input/' + jobId + '_voice.mp3';

// ── Call ElevenLabs TTS API ──────────────────────────────────────────────────
const payload = JSON.stringify({
  text: narration,
  model_id: ELEVEN_MODEL,
  voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true }
});

const audioBuffer = await new Promise((resolve, reject) => {
  const chunks = [];
  const req = https.request({
    hostname: 'api.elevenlabs.io',
    path: '/v1/text-to-speech/' + ELEVEN_VOICE_ID + '?output_format=mp3_44100_128',
    method: 'POST',
    headers: {
      'xi-api-key':   ELEVEN_API_KEY,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    if (res.statusCode !== 200) {
      let err = '';
      res.on('data', c => err += c);
      res.on('end', () => reject(new Error('ElevenLabs ' + res.statusCode + ': ' + err)));
      return;
    }
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks)));
  });
  req.on('error', reject);
  req.write(payload);
  req.end();
});

fs.writeFileSync(audioPath, audioBuffer);
console.log('ElevenLabs TTS done | ' + audioBuffer.length + ' bytes | voice: ' + ELEVEN_VOICE_ID);

// ── Get audio duration via ffprobe ───────────────────────────────────────────
const durOut = execSync(
  'docker exec qpc_ffmpeg_runner ffprobe -v quiet -show_entries format=duration -of csv=p=0 "' + contAudio + '"',
  { encoding: 'utf-8', timeout: 15000 }
).trim();
const audioDuration = parseFloat(durOut) || 30;

// ── Build word timings from narration text (ElevenLabs has no word timestamps on free tier) ──
const words = narration.trim().split(/\\s+/);
const avgWpm = 155;  // typical coach pace
const secPerWord = 60 / avgWpm;
const wordTimings = [];
let cursor = 0.25;  // small lead-in

for (const w of words) {
  const dur = secPerWord * (0.75 + w.length * 0.035);
  wordTimings.push({ word: w.replace(/[.,!?;:]+$/, ''), start: +cursor.toFixed(3), end: +(cursor+dur).toFixed(3) });
  cursor += dur * 1.05;  // 5% gap between words
}

// Scale timings to actual audio duration
const rawEnd   = wordTimings.length ? wordTimings[wordTimings.length-1].end + 0.3 : 30;
const scale    = (audioDuration - 0.3) / rawEnd;
for (const wt of wordTimings) { wt.start = +(wt.start * scale).toFixed(3); wt.end = +(wt.end * scale).toFixed(3); }

console.log('Word timings: ' + wordTimings.length + ' words | duration: ' + audioDuration.toFixed(2) + 's');

return [{ json: { ...jobData, audio_path: '/data/ffmpeg/input/' + jobId + '_voice.mp3', audio_duration: +audioDuration.toFixed(3), word_timings: wordTimings } }];`;

// ── Inject into workflow ──────────────────────────────────────────────────────
const wfPath = 'D:\\Quantum-physics-channel\\workflows\\fit_stage1_content_gen.json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const n9 = wf.nodes.find(n => n.id === 'fit1-n9');
if (!n9) { console.error('fit1-n9 not found'); process.exit(1); }
n9.parameters.jsCode = newJsCode;

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('✓ fit1-n9 updated to ElevenLabs TTS');

const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: { executionOrder: wf.settings?.executionOrder || 'v1' } };
fs.writeFileSync('D:\\Quantum-physics-channel\\workflows\\fit_stage1_content_gen-payload.json', JSON.stringify(payload), 'utf8');
console.log('✓ Payload ready');
