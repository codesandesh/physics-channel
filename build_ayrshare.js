const fs   = require('fs');
const http  = require('http');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMjZkZjc0OS1kNTU0LTQxOGItOWE3Yy0xZGE0ZTNjODQxMGEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2FlZjg0MTUtYjJhNi00MzY0LTg3NGYtY2IwNjI4OGRjZTdiIiwiaWF0IjoxNzgyNDY0NTY0LCJleHAiOjE3ODUwMjQwMDB9.aLIm5U-78W3iYN5DNc2aVFALLVMmv_f4orbtbicQEls';

function put(workflowId, payload, label, callback) {
  const body = Buffer.from(JSON.stringify(payload));
  const opts = {
    hostname: 'localhost', port: 5679,
    path: '/api/v1/workflows/' + workflowId,
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json', 'Content-Length': body.length }
  };
  const req = http.request(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { callback(null, JSON.parse(d)); } catch(e) { callback(e); } });
  });
  req.on('error', callback);
  req.write(body); req.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PHYSICS STAGE 3 — replace IG/TikTok Code nodes with single Ayrshare node
// ─────────────────────────────────────────────────────────────────────────────
const s3 = JSON.parse(fs.readFileSync('D:/tmp_stage3.json'));

// Remove old IG + TikTok nodes if they exist
s3.nodes = s3.nodes.filter(n => !['Upload to Instagram','Upload to TikTok'].includes(n.name));
delete s3.connections['Upload to Instagram'];
delete s3.connections['Upload to TikTok'];

// Remove those from Download from Drive connections
s3.connections['Download from Drive'].main[0] = s3.connections['Download from Drive'].main[0]
  .filter(c => !['Upload to Instagram','Upload to TikTok'].includes(c.node));

// Ayrshare POST code for Stage 3 (video)
const ayrshareVideoCode = [
  "const https = require('https');",
  "const data = $input.first().json;",
  "",
  "const apiKey = $env.AYRSHARE_API_KEY;",
  "if (!apiKey) throw new Error('AYRSHARE_API_KEY not set');",
  "",
  "const videoUrl = 'https://drive.google.com/uc?export=download&id=' + data.drive_file_id + '&confirm=t';",
  "const caption  = ((data.instagram_caption || data.title || data.topic || '') + '\\n\\n' + (data.generated_hashtags || '')).slice(0, 2190);",
  "",
  "const postBody = JSON.stringify({",
  "  post: caption,",
  "  platforms: ['instagram', 'tiktok'],",
  "  mediaUrls: [videoUrl],",
  "  instagramOptions: { reels: true },",
  "  socialAccounts: [",
  "    { platform: 'instagram', id: $env.AYRSHARE_IG_PROFILE_ID },",
  "    { platform: 'tiktok',    id: $env.AYRSHARE_TIKTOK_PROFILE_ID }",
  "  ]",
  "});",
  "",
  "const result = await new Promise((resolve, reject) => {",
  "  const buf = Buffer.from(postBody);",
  "  const req = https.request({",
  "    hostname: 'app.ayrshare.com',",
  "    path: '/api/post',",
  "    method: 'POST',",
  "    headers: {",
  "      'Authorization': 'Bearer ' + apiKey,",
  "      'Content-Type': 'application/json',",
  "      'Content-Length': buf.length",
  "    }",
  "  }, res => {",
  "    let d = ''; res.on('data', c => d += c);",
  "    res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('Non-JSON: ' + d.slice(0,200))); } });",
  "  });",
  "  req.on('error', reject);",
  "  req.write(buf); req.end();",
  "});",
  "",
  "console.log('Ayrshare result:', JSON.stringify(result).slice(0, 300));",
  "if (result.status === 'error') throw new Error('Ayrshare error: ' + (result.message || JSON.stringify(result)));",
  "",
  "return [{ json: { ...data, ayrshare_ig_url: result.postIds?.find(p=>p.platform==='instagram')?.postUrl || '', ayrshare_tiktok_url: result.postIds?.find(p=>p.platform==='tiktok')?.postUrl || '' } }];"
].join('\n');

s3.nodes.push({
  id: 's3-ayrshare-001',
  name: 'Post to Ayrshare (IG + TikTok)',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [4200, 500],
  parameters: { mode: 'runOnceForAllItems', jsCode: ayrshareVideoCode }
});

// Wire: Download from Drive → Ayrshare (parallel with FB chain)
s3.connections['Download from Drive'].main[0].push(
  { node: 'Post to Ayrshare (IG + TikTok)', type: 'main', index: 0 }
);
// Ayrshare result feeds into Prep Update (so social URLs are captured)
s3.connections['Post to Ayrshare (IG + TikTok)'] = {
  main: [[{ node: 'Prep Update', type: 'main', index: 0 }]]
};

const s3Payload = { name: s3.name, nodes: s3.nodes, connections: s3.connections, settings: { executionOrder: s3.settings?.executionOrder || 'v1' } };

// ─────────────────────────────────────────────────────────────────────────────
// 2. QPC 2 — replace complex 6-node IG Reel branch with: FFmpeg → Drive upload → Ayrshare
// ─────────────────────────────────────────────────────────────────────────────
const qpc2 = JSON.parse(fs.readFileSync('D:/tmp_qpc2.json'));

// Remove old IG Reel nodes
const oldIgNodes = ['Create IG Reel Video','Get IG User ID','Create IG Reel Container','Upload Reel Video','Wait IG Processing','Publish IG Reel'];
qpc2.nodes = qpc2.nodes.filter(n => !oldIgNodes.includes(n.name));
oldIgNodes.forEach(n => delete qpc2.connections[n]);

// Remove old IG branch from Prepare Image Data
qpc2.connections['Prepare Image Data'].main[0] = qpc2.connections['Prepare Image Data'].main[0]
  .filter(c => !oldIgNodes.includes(c.node));

// New compact Ayrshare reel code for QPC2 (image → FFmpeg → Drive URL → Ayrshare)
const ayrshareReelCode = [
  "const { execSync } = require('child_process');",
  "const fs   = require('fs');",
  "const path = require('path');",
  "const https = require('https');",
  "",
  "const ts = Date.now();",
  "const imgBuf = await this.helpers.getBinaryDataBuffer($input.item, 'data');",
  "const imgPath_n8n    = `/data/ffmpeg/input/qpc_reel_${ts}.jpg`;",
  "const imgPath_ffmpeg = `/ffmpeg/input/qpc_reel_${ts}.jpg`;",
  "const outPath_n8n    = `/data/ffmpeg/output/qpc_reel_${ts}.mp4`;",
  "const outPath_ffmpeg = `/ffmpeg/output/qpc_reel_${ts}.mp4`;",
  "",
  "fs.writeFileSync(imgPath_n8n, imgBuf);",
  "",
  "// Pick random BGM",
  "const bgmDir = '/ffmpeg/config/bgm_aperture';",
  "const bgmRaw = execSync(`docker exec qpc_ffmpeg_runner bash -c \"ls ${bgmDir}/*.mp3 2>/dev/null\"`, { encoding: 'utf-8' }).trim();",
  "const bgmList = bgmRaw.split('\\n').filter(Boolean);",
  "if (!bgmList.length) throw new Error('No BGM files found');",
  "const bgm = bgmList[Math.floor(Math.random() * bgmList.length)];",
  "",
  "// FFmpeg: 20s reel 1080x1920",
  "const scale = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black';",
  "const ffCmd = `ffmpeg -y -loop 1 -i '${imgPath_ffmpeg}' -i '${bgm}' -c:v libx264 -t 20 -pix_fmt yuv420p -vf \"${scale}\" -c:a aac -b:a 128k -movflags +faststart '${outPath_ffmpeg}'`;",
  "execSync(`docker exec qpc_ffmpeg_runner bash -c ${JSON.stringify(ffCmd)}`, { timeout: 120000, encoding: 'utf-8' });",
  "try { fs.unlinkSync(imgPath_n8n); } catch(e) {}",
  "",
  "// Upload to Google Drive and make public",
  "const { google } = require('googleapis'); // note: may not be available — fallback to Drive v3 REST",
  "// Use Drive REST API via node https with service account or existing credential",
  "// For now: read file and POST to Ayrshare as local upload isn't supported — use Drive URL approach",
  "// The ffmpeg output is saved; Ayrshare needs a public URL.",
  "// We'll upload via n8n Google Drive credential in next node.",
  "",
  "return {",
  "  json: { ...$input.item.json, reelVideoPath: outPath_n8n, reelJobId: ts, bgmUsed: path.basename(bgm) }",
  "};"
].join('\n');

// Actually let's use a cleaner 3-node approach for QPC2:
// Node 1: Create IG Reel Video (Code - FFmpeg) — same as before
// Node 2: Upload Reel to Drive (Google Drive node) — gives us fileId
// Node 3: Post Reel to Ayrshare (Code - HTTP to Ayrshare with Drive URL)

const createReelCode = [
  "const { execSync } = require('child_process');",
  "const fs = require('fs');",
  "const path = require('path');",
  "",
  "const ts = Date.now();",
  "const imgBuf = await this.helpers.getBinaryDataBuffer($input.item, 'data');",
  "const imgPath_n8n    = `/data/ffmpeg/input/qpc_reel_${ts}.jpg`;",
  "const imgPath_ffmpeg = `/ffmpeg/input/qpc_reel_${ts}.jpg`;",
  "const outPath_n8n    = `/data/ffmpeg/output/qpc_reel_${ts}.mp4`;",
  "const outPath_ffmpeg = `/ffmpeg/output/qpc_reel_${ts}.mp4`;",
  "",
  "fs.writeFileSync(imgPath_n8n, imgBuf);",
  "",
  "const bgmDir = '/ffmpeg/config/bgm_aperture';",
  "const bgmRaw = execSync(`docker exec qpc_ffmpeg_runner bash -c \"ls ${bgmDir}/*.mp3 2>/dev/null\"`, { encoding: 'utf-8' }).trim();",
  "const bgmList = bgmRaw.split('\\n').filter(Boolean);",
  "if (!bgmList.length) throw new Error('No BGM files found at ' + bgmDir);",
  "const bgm = bgmList[Math.floor(Math.random() * bgmList.length)];",
  "",
  "const scale = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black';",
  "const ffCmd = `ffmpeg -y -loop 1 -i '${imgPath_ffmpeg}' -i '${bgm}' -c:v libx264 -t 20 -pix_fmt yuv420p -vf \"${scale}\" -c:a aac -b:a 128k -movflags +faststart '${outPath_ffmpeg}'`;",
  "execSync(`docker exec qpc_ffmpeg_runner bash -c ${JSON.stringify(ffCmd)}`, { timeout: 120000, encoding: 'utf-8' });",
  "try { fs.unlinkSync(imgPath_n8n); } catch(e) {}",
  "",
  "const buf = fs.readFileSync(outPath_n8n);",
  "const binary = await this.helpers.prepareBinaryData(buf, `qpc_reel_${ts}.mp4`, 'video/mp4');",
  "try { fs.unlinkSync(outPath_n8n); } catch(e) {}",
  "",
  "return { json: { ...$input.item.json, reelJobId: ts, bgmUsed: path.basename(bgm) }, binary: { data: binary } };"
].join('\n');

const postReelAyrshareCode = [
  "const https = require('https');",
  "const data  = $input.item.json;",
  "",
  "const apiKey   = $env.AYRSHARE_API_KEY;",
  "const driveId  = data.reel_drive_file_id;",
  "if (!apiKey)   throw new Error('AYRSHARE_API_KEY not set');",
  "if (!driveId)  throw new Error('reel_drive_file_id not found — Drive upload failed');",
  "",
  "const videoUrl = 'https://drive.google.com/uc?export=download&id=' + driveId + '&confirm=t';",
  "const caption  = ((data.instagram_caption || '') + '\\n\\n' + (data.tiktok_caption || '')).slice(0, 2190);",
  "",
  "const postBody = JSON.stringify({",
  "  post: caption,",
  "  platforms: ['instagram', 'tiktok'],",
  "  mediaUrls: [videoUrl],",
  "  instagramOptions: { reels: true },",
  "  socialAccounts: [",
  "    { platform: 'instagram', id: $env.AYRSHARE_IG_PROFILE_ID },",
  "    { platform: 'tiktok',    id: $env.AYRSHARE_TIKTOK_PROFILE_ID }",
  "  ]",
  "});",
  "",
  "const result = await new Promise((resolve, reject) => {",
  "  const buf = Buffer.from(postBody);",
  "  const req = https.request({ hostname: 'app.ayrshare.com', path: '/api/post', method: 'POST',",
  "    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Content-Length': buf.length }",
  "  }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d));}catch(e){reject(new Error('Non-JSON: '+d.slice(0,200)));} }); });",
  "  req.on('error', reject); req.write(buf); req.end();",
  "});",
  "",
  "console.log('Ayrshare reel result:', JSON.stringify(result).slice(0, 300));",
  "if (result.status === 'error') throw new Error('Ayrshare error: ' + (result.message || JSON.stringify(result)));",
  "",
  "return [{ json: { ...data, ayrshare_ig_url: result.postIds?.find(p=>p.platform==='instagram')?.postUrl || '', ayrshare_tiktok_url: result.postIds?.find(p=>p.platform==='tiktok')?.postUrl || '' } }];"
].join('\n');

// Get existing Drive credential from QPC2
const existingDriveNode = qpc2.nodes.find(n => n.type === 'n8n-nodes-base.googleDrive');
const driveCred = existingDriveNode?.credentials || {};
const driveFolderId = '={{ $env.GOOGLE_DRIVE_FOLDER_ID_IMAGES }}';

qpc2.nodes.push(
  {
    id: 'qpc2-reel-create-v2',
    name: 'Create IG Reel Video',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [900, 520],
    parameters: { mode: 'runOnceForEachItem', jsCode: createReelCode }
  },
  {
    id: 'qpc2-reel-drive-v2',
    name: 'Upload Reel to Drive',
    type: 'n8n-nodes-base.googleDrive',
    typeVersion: 3,
    position: [1120, 520],
    credentials: driveCred,
    parameters: {
      operation: 'upload',
      name: "={{ 'qpc_reel_' + $json.reelJobId + '.mp4' }}",
      driveId: { __rl: true, value: 'My Drive', mode: 'list' },
      folderId: { __rl: true, value: driveFolderId, mode: 'id' },
      inputDataFieldName: 'data',
      options: { mimeType: 'video/mp4' }
    }
  },
  {
    id: 'qpc2-reel-ayrshare-v2',
    name: 'Post Reel to Ayrshare',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1340, 520],
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: postReelAyrshareCode.replace('data.reel_drive_file_id', "data.id || $('Upload Reel to Drive').item.json.id")
    }
  }
);

// Wire QPC2 IG Reel branch: Prepare Image Data → Create → Drive → Ayrshare → Check Has Row
qpc2.connections['Prepare Image Data'].main[0].push(
  { node: 'Create IG Reel Video', type: 'main', index: 0 }
);
qpc2.connections['Create IG Reel Video'] = { main: [[{ node: 'Upload Reel to Drive', type: 'main', index: 0 }]] };
qpc2.connections['Upload Reel to Drive'] = { main: [[{ node: 'Post Reel to Ayrshare', type: 'main', index: 0 }]] };
qpc2.connections['Post Reel to Ayrshare'] = { main: [[{ node: 'Check Has Row', type: 'main', index: 0 }]] };

const qpc2Payload = { name: qpc2.name, nodes: qpc2.nodes, connections: qpc2.connections, settings: { executionOrder: qpc2.settings?.executionOrder || 'v1' } };

// ─── Import both ──────────────────────────────────────────────────────────────
let done = 0;
function finish(label, err, j) {
  if (err) { console.error(label, 'HTTP error:', err.message); return; }
  if (j.message) { console.log(label, 'ERROR:', j.message); return; }
  const names = j.nodes.map(n => n.name);
  console.log('\n' + label + ' | active=' + j.active + ' | nodes=' + j.nodes.length);
  const check = label.includes('Stage 3')
    ? ['Post to Ayrshare (IG + TikTok)']
    : ['Create IG Reel Video', 'Upload Reel to Drive', 'Post Reel to Ayrshare'];
  check.forEach(n => console.log(names.includes(n) ? '  [OK] ' + n : '  [MISSING] ' + n));
  const file = label.includes('Stage 3') ? 'workflows/stage3-assembly-pipeline.json' : 'workflows/qpc_2_social_poster.json';
  fs.writeFileSync(file, JSON.stringify(j, null, 2));
  console.log('  Saved', file);
  if (++done === 2) console.log('\nAll done.');
}

put('Enqcg4qT5c2yNAe8', s3Payload,   'Physics Stage 3', (e, j) => finish('Physics Stage 3', e, j));
put('sMzXt7yCpNB7c520', qpc2Payload, 'QPC2',             (e, j) => finish('QPC2', e, j));
