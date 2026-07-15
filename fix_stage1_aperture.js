const fs = require('fs');
const w = JSON.parse(fs.readFileSync('workflows/psych-stage1-content-gen.json', 'utf8'));

// Sheet columns (0-indexed):
// A=0 Job ID, B=1 LIVE/Status, C=2 Topic, D=3 Core Question,
// E=4 Content Type, F=5 Depth Level, G=6 Key Reference, M=12 Hashtags

// ── Fix 1: Pick Approved Topic ────────────────────────────────────────────────
const pickNode = w.nodes.find(n => n.name === 'Pick Approved Topic');
pickNode.parameters.jsCode = `const res = $input.first().json;
const rows = res.values || [];
const pending = [];
for (let i = 0; i < rows.length; i++) {
  const status = (rows[i][1]||'').toString().trim();
  const topic  = (rows[i][2]||'').toString().trim();
  if (status === 'Approved' && topic) pending.push({ idx: i, row: rows[i] });
}
if (!pending.length) throw new Error('No Approved rows in Aperture Topics sheet (column B = Approved).');
const found = pending[Math.floor(Math.random() * pending.length)];
const sheetRow = found.idx + 2;
return [{ json: {
  job_id:        (found.row[0]||('APR-' + Date.now().toString().slice(-8))).toString().trim(),
  topic:         (found.row[2]||'').trim(),
  core_question: (found.row[3]||'').trim(),
  content_type:  (found.row[4]||'').trim(),
  depth_level:   (found.row[5]||'').trim(),
  philosopher:   (found.row[6]||'').trim(),
  hashtags:      (found.row[12]||'#philosophy #psychology #aperture').trim(),
  sheet_row:     sheetRow,
  source:        'google_sheet'
}}];`;

// ── Fix 2: Begin Processing ───────────────────────────────────────────────────
const beginNode = w.nodes.find(n => n.name === 'Set Job Config');
if (beginNode) {
  beginNode.parameters.jsCode = `const raw  = $input.first().json;
const body = (raw.body !== undefined) ? raw.body : raw;
let d = {};
try { d = $('Pick Approved Topic').first().json; } catch(e) {}
const jobId = body.job_id || d.job_id || ('APR-' + Date.now().toString().slice(-8));
const topic = body.topic || d.topic || '';
if (!topic) throw new Error('No topic provided.');
return [{ json: {
  job_id:        jobId,
  topic:         topic,
  philosopher:   body.philosopher   || d.philosopher   || '',
  core_question: body.core_question || d.core_question || '',
  content_type:  body.content_type  || d.content_type  || '',
  depth_level:   body.depth_level   || d.depth_level   || '',
  hashtags:      body.hashtags      || d.hashtags      || '#philosophy #psychology #aperture',
  sheet_row:     body.sheet_row     || d.sheet_row     || null,
  start_time:    Date.now()
}}];`;
}

// ── Fix 3: Generate with Claude ───────────────────────────────────────────────
const claudeNode = w.nodes.find(n => n.name === 'Generate Image Prompt & Caption');
if (claudeNode) {
  claudeNode.parameters.jsCode = `const https = require('https');
const data = $input.first().json;
const { topic, core_question, content_type, depth_level, philosopher } = data;
if (!topic) throw new Error('Missing topic');
const ANTHROPIC_KEY = $env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set.');

const nl = String.fromCharCode(10);
const prompt = 'You are the visual + copy director for Aperture, a philosophy / psychology / wisdom channel. Aperture posts single-image quote card videos: one real philosopher quote as a cinematic painting with the quote overlaid, plus a caption.' + nl + nl +
  'TOPIC: ' + topic + nl +
  'CORE QUESTION: ' + (core_question || topic) + nl +
  'KEY REFERENCE / PHILOSOPHER: ' + (philosopher || 'a relevant philosopher') + nl +
  'CONTENT TYPE: ' + (content_type || 'Existential') + nl +
  'DEPTH LEVEL: ' + (depth_level || 'Intermediate') + nl + nl +
  'STEP 1 — SELECT A REAL VERBATIM QUOTE from the Key Reference philosopher that directly addresses this topic. Must be 8-40 words, real and verifiable, deeply relevant.' + nl + nl +
  'STEP 2 — IMAGE PROMPT (semi-realistic cinematic oil painting, never photo/3D/cartoon): Ground in the philosopher actual historical/cultural setting. ONE human figure from behind or in profile, dramatic natural lighting, square 1:1 crop. End with: semi-realistic cinematic oil painting, visible brushwork, rich color grading, highly detailed, no text no watermark.' + nl + nl +
  'STEP 3 — CAPTION: 3-4 paragraphs. Hook first. Context about philosopher and why this quote matters. Connect to modern relatable moment. Close with a reflective question — no CTA no hashtags in body.' + nl + nl +
  'RETURN ONLY RAW JSON no markdown no fences:' + nl +
  '{"attribution":"philosopher name","quote":"exact verbatim real quote","image_prompt":"80-110 word painting prompt","caption":"3-4 paragraphs separated by \\n\\n","title":"SHORT PUNCHY TITLE CASE","hashtags":"#philosophy #aperture 6-10 tags"}';

const buf = Buffer.from(JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: 4000,
  messages: [{ role: 'user', content: prompt }]
}));

const response = await new Promise((resolve, reject) => {
  const req = https.request({
    hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json', 'Content-Length': buf.length }
  }, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { reject(new Error('Bad JSON: ' + Buffer.concat(chunks).toString().slice(0,200))); } });
  });
  req.on('error', reject); req.write(buf); req.end();
});

if (!response.content?.[0]?.text) throw new Error('Claude empty: ' + JSON.stringify(response).slice(0,200));
let raw = response.content[0].text.trim().replace(/^\`\`\`(?:json)?\\s*/i,'').replace(/\\s*\`\`\`\\s*$/i,'').trim();
let parsed;
try { parsed = JSON.parse(raw); } catch(e) {
  const s = raw.indexOf('{'), end = raw.lastIndexOf('}');
  parsed = JSON.parse(raw.slice(s, end + 1));
}
if (!parsed.quote || !parsed.image_prompt) throw new Error('Missing fields: ' + JSON.stringify(parsed).slice(0,200));

const NEGATIVE = 'text, watermark, signature, cartoon, anime, 3D render, CGI, photograph, photorealistic, frontal face, looking at camera';
console.log('Generated for', topic, '| quote:', parsed.quote.slice(0,60));

return [{ json: {
  ...data,
  attribution:     parsed.attribution || philosopher,
  quote:           parsed.quote,
  image_prompt:    parsed.image_prompt,
  negative_prompt: NEGATIVE,
  caption:         parsed.caption,
  title:           parsed.title || topic,
  hashtags:        parsed.hashtags || data.hashtags
}}];`;
}

fs.writeFileSync('workflows/psych-stage1-content-gen.json', JSON.stringify(w, null, 2));
console.log('Stage 1 fixed. Nodes updated:');
['Pick Approved Topic','Set Job Config','Generate Image Prompt & Caption'].forEach(n => {
  const found = w.nodes.find(x => x.name === n);
  console.log(found ? '  [OK]' : '  [MISSING]', n);
});
