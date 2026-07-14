const fs   = require('fs');
const http = require('http');

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMjZkZjc0OS1kNTU0LTQxOGItOWE3Yy0xZGE0ZTNjODQxMGEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2FlZjg0MTUtYjJhNi00MzY0LTg3NGYtY2IwNjI4OGRjZTdiIiwiaWF0IjoxNzgyNDY0NTY0LCJleHAiOjE3ODUwMjQwMDB9.aLIm5U-78W3iYN5DNc2aVFALLVMmv_f4orbtbicQEls';

const w = JSON.parse(fs.readFileSync('workflows/psych-stage3-social-publish.json'));

// ── 1. Facebook Reels — switch to FB_APERTURE_* vars ─────────────────────────
const fbNode = w.nodes.find(n => n.name === 'Upload to Facebook Reels');
fbNode.parameters.jsCode = fbNode.parameters.jsCode
  .replace(
    /const pageId = \$env\.FB_PAGE_ID \|\| \$env\.FACEBOOK_PAGE_ID;/,
    'const pageId = $env.FB_APERTURE_PAGE_ID;'
  )
  .replace(
    /const token = \$env\.FB_PAGE_ACCESS_TOKEN \|\| \$env\.FACEBOOK_PAGE_ACCESS_TOKEN;/,
    'const token = $env.FB_APERTURE_PAGE_ACCESS_TOKEN;'
  )
  .replace(
    /if \(!pageId \|\| !token\) throw new Error\('FB_PAGE_ID \/ FB_PAGE_ACCESS_TOKEN not set'\);/,
    "if (!pageId || !token) throw new Error('FB_APERTURE_PAGE_ID / FB_APERTURE_PAGE_ACCESS_TOKEN not set');"
  );

// ── 2. Instagram — Ayrshare with APERTURE IG profile ─────────────────────────
const igCode = `const https = require('https');
const data = $('Download Video for Publishing').first().json;

const apiKey     = $env.AYRSHARE_API_KEY;
const profileKey = $env.AYRSHARE_APERTURE_IG_PROFILE_ID;
if (!apiKey)     throw new Error('AYRSHARE_API_KEY not set');
if (!profileKey) throw new Error('AYRSHARE_APERTURE_IG_PROFILE_ID not set');

const videoUrl = data.drive_video_url;
const caption  = ((data.title || data.topic || '') + '\\n\\n' + (data.hashtags || '')).slice(0, 2190);

const payload = Buffer.from(JSON.stringify({
  post: caption,
  platforms: ['instagram'],
  mediaUrls: [videoUrl],
  instagramOptions: { reels: true },
  profileKey
}));

const result = await new Promise((resolve, reject) => {
  const req = https.request({
    hostname: 'app.ayrshare.com', path: '/api/post', method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Content-Length': payload.length }
  }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d));}catch(e){reject(new Error('Non-JSON: '+d.slice(0,200)));} }); });
  req.on('error', reject); req.write(payload); req.end();
});

console.log('Ayrshare IG result:', JSON.stringify(result).slice(0, 300));
if (result.status === 'error') throw new Error('Ayrshare IG error: ' + (result.message || JSON.stringify(result)));
const postUrl = result.postIds?.find(p=>p.platform==='instagram')?.postUrl || '';
console.log('Instagram OK ->', postUrl);
return [{ json: { platform: 'instagram', success: true, url: postUrl } }];`;

// ── 3. TikTok — Ayrshare with APERTURE TikTok profile ────────────────────────
const ttCode = `const https = require('https');
const data = $('Download Video for Publishing').first().json;

const apiKey     = $env.AYRSHARE_API_KEY;
const profileKey = $env.AYRSHARE_APERTURE_TIKTOK_PROFILE_ID;
if (!apiKey)     throw new Error('AYRSHARE_API_KEY not set');
if (!profileKey) throw new Error('AYRSHARE_APERTURE_TIKTOK_PROFILE_ID not set');

const videoUrl = data.drive_video_url;
const caption  = ((data.title || data.topic || '') + '\\n\\n' + (data.hashtags || '')).slice(0, 2190);

const payload = Buffer.from(JSON.stringify({
  post: caption,
  platforms: ['tiktok'],
  mediaUrls: [videoUrl],
  profileKey
}));

const result = await new Promise((resolve, reject) => {
  const req = https.request({
    hostname: 'app.ayrshare.com', path: '/api/post', method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Content-Length': payload.length }
  }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d));}catch(e){reject(new Error('Non-JSON: '+d.slice(0,200)));} }); });
  req.on('error', reject); req.write(payload); req.end();
});

console.log('Ayrshare TikTok result:', JSON.stringify(result).slice(0, 300));
if (result.status === 'error') throw new Error('Ayrshare TikTok error: ' + (result.message || JSON.stringify(result)));
const postUrl = result.postIds?.find(p=>p.platform==='tiktok')?.postUrl || '';
console.log('TikTok OK ->', postUrl);
return [{ json: { platform: 'tiktok', success: true, url: postUrl } }];`;

// ── 4. LinkedIn — Ayrshare with APERTURE LinkedIn profile ────────────────────
const liCode = `const https = require('https');
const data = $('Download Video for Publishing').first().json;

const apiKey     = $env.AYRSHARE_API_KEY;
const profileKey = $env.AYRSHARE_APERTURE_LINKEDIN_PROFILE_ID;
if (!apiKey)     throw new Error('AYRSHARE_API_KEY not set');
if (!profileKey) throw new Error('AYRSHARE_APERTURE_LINKEDIN_PROFILE_ID not set');

const videoUrl = data.drive_video_url;
const caption  = ((data.title || data.topic || '') + '\\n\\n' + (data.hashtags || '')).slice(0, 2190);

const payload = Buffer.from(JSON.stringify({
  post: caption,
  platforms: ['linkedin'],
  mediaUrls: [videoUrl],
  profileKey
}));

const result = await new Promise((resolve, reject) => {
  const req = https.request({
    hostname: 'app.ayrshare.com', path: '/api/post', method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Content-Length': payload.length }
  }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d));}catch(e){reject(new Error('Non-JSON: '+d.slice(0,200)));} }); });
  req.on('error', reject); req.write(payload); req.end();
});

console.log('Ayrshare LinkedIn result:', JSON.stringify(result).slice(0, 300));
if (result.status === 'error') throw new Error('Ayrshare LinkedIn error: ' + (result.message || JSON.stringify(result)));
const postUrl = result.postIds?.find(p=>p.platform==='linkedin')?.postUrl || '';
console.log('LinkedIn OK ->', postUrl);
return [{ json: { platform: 'linkedin', success: true, url: postUrl } }];`;

// Apply new code to existing nodes
w.nodes.find(n => n.name === 'Upload to Instagram').parameters.jsCode = igCode;
w.nodes.find(n => n.name === 'Upload to TikTok').parameters.jsCode     = ttCode;
w.nodes.find(n => n.name === 'Upload to LinkedIn').parameters.jsCode   = liCode;

// ── PUT to n8n ────────────────────────────────────────────────────────────────
// Get workflow ID
const wfListPath = 'C:UsersdeshpAppDataLocalTempwf_list.json';
let workflowId = 'psych-stage3-social-publish'; // fallback — check actual ID
try {
  const list = JSON.parse(fs.readFileSync(wfListPath));
  const found = (list.data || list).find(x => x.name && x.name.toLowerCase().includes('psych') && x.name.toLowerCase().includes('stage') && x.name.toLowerCase().includes('3'));
  if (found) { workflowId = found.id; console.log('Found workflow ID:', workflowId, '->', found.name); }
} catch(e) { console.log('wf_list not readable, using stored ID'); }

const payload = {
  name: w.name,
  nodes: w.nodes,
  connections: w.connections,
  settings: { executionOrder: w.settings?.executionOrder || 'v1' }
};

const body = Buffer.from(JSON.stringify(payload));
const req = http.request({
  hostname: 'localhost', port: 5679,
  path: '/api/v1/workflows/' + workflowId,
  method: 'PUT',
  headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json', 'Content-Length': body.length }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(d);
      if (j.message) { console.error('n8n ERROR:', j.message); return; }
      console.log('\nPsych Stage 3 updated | active=', j.active, '| nodes=', j.nodes.length);
      ['Upload to Facebook Reels','Upload to Instagram','Upload to TikTok','Upload to LinkedIn'].forEach(name => {
        const found = j.nodes.find(n=>n.name===name);
        console.log(found ? '  [OK]' : '  [MISSING]', name);
      });
      fs.writeFileSync('workflows/psych-stage3-social-publish.json', JSON.stringify(j, null, 2));
      console.log('Saved workflows/psych-stage3-social-publish.json');
    } catch(e) { console.error('Parse error:', e.message, d.slice(0,200)); }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(body); req.end();
