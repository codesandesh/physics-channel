const fs = require('fs');
const http = require('http');

const w = JSON.parse(fs.readFileSync('D:/tmp_stage3.json'));

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMjZkZjc0OS1kNTU0LTQxOGItOWE3Yy0xZGE0ZTNjODQxMGEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2FlZjg0MTUtYjJhNi00MzY0LTg3NGYtY2IwNjI4OGRjZTdiIiwiaWF0IjoxNzgyNDY0NTY0LCJleHAiOjE3ODUwMjQwMDB9.aLIm5U-78W3iYN5DNc2aVFALLVMmv_f4orbtbicQEls';

// ─── IG Code (adapted from Aperture, uses drive_file_id) ──────────────────────
const igCode = [
  "const https = require('https');",
  "const data = $input.first().json;",
  "",
  "function call(method, path, body) {",
  "  return new Promise((resolve, reject) => {",
  "    const buf = body ? Buffer.from(body) : null;",
  "    const opts = { hostname: 'graph.facebook.com', path, method, headers: {} };",
  "    if (buf) { opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'; opts.headers['Content-Length'] = buf.length; }",
  "    const req = https.request(opts, (res) => {",
  "      const chunks = [];",
  "      res.on('data', c => chunks.push(c));",
  "      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { reject(new Error('Non-JSON from IG: ' + Buffer.concat(chunks).toString().slice(0,200))); } });",
  "    });",
  "    req.on('error', reject);",
  "    if (buf) req.write(buf);",
  "    req.end();",
  "  });",
  "}",
  "",
  "try {",
  "  const igUserId = $env.INSTAGRAM_BUSINESS_ACCOUNT_ID;",
  "  const token    = $env.FB_PAGE_ACCESS_TOKEN;",
  "  if (!igUserId || !token) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID / FB_PAGE_ACCESS_TOKEN not set');",
  "",
  "  const videoUrl = 'https://drive.google.com/uc?export=download&id=' + data.drive_file_id + '&confirm=t';",
  "  const caption  = ((data.instagram_caption || data.title || data.topic || '') + '\\n\\n' + (data.generated_hashtags || '')).slice(0, 2190);",
  "",
  "  const createBody = 'media_type=REELS&video_url=' + encodeURIComponent(videoUrl) +",
  "    '&caption=' + encodeURIComponent(caption) + '&access_token=' + encodeURIComponent(token);",
  "  const create = await call('POST', '/v20.0/' + igUserId + '/media', createBody);",
  "  if (!create.id) throw new Error('IG container create failed: ' + JSON.stringify(create).slice(0,300));",
  "",
  "  let status = 'IN_PROGRESS', tries = 0;",
  "  while (status === 'IN_PROGRESS' && tries < 20) {",
  "    await new Promise(r => setTimeout(r, 5000));",
  "    const check = await call('GET', '/v20.0/' + create.id + '?fields=status_code&access_token=' + encodeURIComponent(token), null);",
  "    status = check.status_code || 'ERROR';",
  "    tries++;",
  "  }",
  "  if (status !== 'FINISHED') throw new Error('IG container never finished: ' + status);",
  "",
  "  const publishBody = 'creation_id=' + create.id + '&access_token=' + encodeURIComponent(token);",
  "  const publish = await call('POST', '/v20.0/' + igUserId + '/media_publish', publishBody);",
  "  if (!publish.id) throw new Error('IG publish failed: ' + JSON.stringify(publish).slice(0,300));",
  "",
  "  const perm = await call('GET', '/v20.0/' + publish.id + '?fields=permalink&access_token=' + encodeURIComponent(token), null);",
  "  console.log('Instagram Reels OK -> ' + publish.id);",
  "  return [{ json: { platform: 'instagram', success: true, url: perm.permalink || ('https://www.instagram.com/reel/' + publish.id) } }];",
  "} catch(e) {",
  "  console.error('Instagram upload failed: ' + e.message);",
  "  return [{ json: { platform: 'instagram', success: false, error: e.message } }];",
  "}"
].join('\n');

// ─── TikTok Code (adapted from Aperture, uses drive_file_id) ─────────────────
const tiktokCode = [
  "const https = require('https');",
  "const data = $input.first().json;",
  "",
  "function call(path, body, token) {",
  "  return new Promise((resolve, reject) => {",
  "    const buf = Buffer.from(JSON.stringify(body));",
  "    const req = https.request({ hostname: 'open.tiktokapis.com', path, method: 'POST', headers: {",
  "      'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json; charset=UTF-8', 'Content-Length': buf.length",
  "    }}, (res) => {",
  "      const chunks = [];",
  "      res.on('data', c => chunks.push(c));",
  "      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { reject(new Error('Non-JSON from TikTok')); } });",
  "    });",
  "    req.on('error', reject);",
  "    req.write(buf);",
  "    req.end();",
  "  });",
  "}",
  "",
  "try {",
  "  const token = $env.TIKTOK_ACCESS_TOKEN;",
  "  if (!token) throw new Error('TIKTOK_ACCESS_TOKEN not set');",
  "  const privacyLevel = $env.TIKTOK_APP_AUDITED === 'true' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY';",
  "  const videoUrl = 'https://drive.google.com/uc?export=download&id=' + data.drive_file_id + '&confirm=t';",
  "",
  "  const init = await call('/v2/post/publish/video/init/', {",
  "    post_info: { title: (data.title || data.topic || 'Quantum Physics').slice(0, 150), privacy_level: privacyLevel, disable_duet: false, disable_comment: false, disable_stitch: false },",
  "    source_info: { source: 'PULL_FROM_URL', video_url: videoUrl }",
  "  }, token);",
  "",
  "  const publishId = init.data && init.data.publish_id;",
  "  if (!publishId) throw new Error('TikTok init failed: ' + JSON.stringify(init).slice(0,300));",
  "",
  "  let status = 'PROCESSING_UPLOAD', tries = 0;",
  "  while ((status === 'PROCESSING_UPLOAD' || status === 'PROCESSING_DOWNLOAD') && tries < 20) {",
  "    await new Promise(r => setTimeout(r, 5000));",
  "    const check = await call('/v2/post/publish/status/fetch/', { publish_id: publishId }, token);",
  "    status = (check.data && check.data.status) || 'FAILED';",
  "    tries++;",
  "  }",
  "  if (status !== 'PUBLISH_COMPLETE') throw new Error('TikTok never completed: ' + status + (privacyLevel === 'SELF_ONLY' ? ' (app unaudited -> posted as private draft)' : ''));",
  "",
  "  console.log('TikTok OK -> ' + publishId);",
  "  return [{ json: { platform: 'tiktok', success: true, publish_id: publishId } }];",
  "} catch(e) {",
  "  console.error('TikTok upload failed: ' + e.message);",
  "  return [{ json: { platform: 'tiktok', success: false, error: e.message } }];",
  "}"
].join('\n');

// ─── Add new nodes ────────────────────────────────────────────────────────────
const newNodes = [
  {
    id: 's3-ig-upload-001',
    name: 'Upload to Instagram',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [4200, 500],
    parameters: { mode: 'runOnceForAllItems', jsCode: igCode }
  },
  {
    id: 's3-tt-upload-002',
    name: 'Upload to TikTok',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [4200, 700],
    parameters: { mode: 'runOnceForAllItems', jsCode: tiktokCode }
  }
];

w.nodes.push(...newNodes);

// Branch from "Download from Drive" → IG + TikTok in parallel with existing FB chain
w.connections['Download from Drive'].main[0].push(
  { node: 'Upload to Instagram', type: 'main', index: 0 },
  { node: 'Upload to TikTok',    type: 'main', index: 0 }
);

// IG and TikTok are terminal (no further connections — sheet updates handled by existing chain)
w.connections['Upload to Instagram'] = { main: [[]] };
w.connections['Upload to TikTok']    = { main: [[]] };

const payload = {
  name: w.name,
  nodes: w.nodes,
  connections: w.connections,
  settings: { executionOrder: w.settings?.executionOrder || 'v1' }
};

// PUT to n8n
const body = Buffer.from(JSON.stringify(payload));
const opts = {
  hostname: 'localhost', port: 5679,
  path: '/api/v1/workflows/Enqcg4qT5c2yNAe8',
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': body.length
  }
};

const req = http.request(opts, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    if (j.message) { console.log('ERROR:', j.message); return; }
    const names = j.nodes.map(n => n.name);
    console.log('Physics Stage 3 | active=', j.active, '| nodes=', j.nodes.length);
    ['Upload to Instagram','Upload to TikTok'].forEach(n =>
      console.log(names.includes(n) ? '  [OK]' : '  [MISSING]', n)
    );
    console.log('Download from Drive fans to:', j.connections['Download from Drive'].main[0].map(c=>c.node).join(', '));
    // Save local copy
    fs.writeFileSync('workflows/stage3-assembly-pipeline.json', JSON.stringify(j, null, 2));
    console.log('Saved workflows/stage3-assembly-pipeline.json');
  });
});
req.on('error', e => console.error(e));
req.write(body);
req.end();
