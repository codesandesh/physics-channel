const fs   = require('fs');
const path = require('path');
const https = require('https');

// Parse .env
const env = {};
fs.readFileSync('D:/Quantum-physics-channel/.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#\s][^=]*)=(.*)$/);
  if (m && m[2].trim()) env[m[1].trim()] = m[2].trim();
});

const VIDEO_PATH = 'C:/Users/deshp/Downloads/238_final.mp4';

const CAPTION = `Everything you are made of comes down to two fundamental building blocks: quarks and leptons. These tiny particles are so small that billions of them could fit on the head of a pin, yet they hold the secrets to understanding the entire universe. Without quarks, we would have no atoms, no molecules, and no life as we know it.

Why should you care about particles you cannot see? Because understanding quarks and leptons is how scientists unlock the mysteries of matter itself. From the energy in the sun to the structure of your DNA, these fundamental particles are the foundation of everything that exists. When we study them, we are literally studying the building blocks of reality.

The truly mind bending part is that physicists have discovered six types of quarks and six types of leptons, each with their own unique properties and behaviors. Together, they form what we call the Standard Model of particle physics, one of the greatest scientific achievements in human history. We live in a universe made entirely of these invisible puzzle pieces.`;

// Build multipart/form-data body
function multipart(fields, files) {
  const boundary = 'PhysicsBoundary' + Date.now();
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  for (const [k, { name, buf, mime }] of Object.entries(files)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"; filename="${name}"\r\nContent-Type: ${mime}\r\n\r\n`));
    parts.push(buf);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(parts) };
}

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        console.log(`  HTTP ${res.statusCode}`);
        try { resolve(JSON.parse(text)); }
        catch { resolve(text); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function uploadToFacebook(videoBuf, videoName) {
  console.log('\n--- Facebook Page Upload (Schrodingers Cat) ---');
  const { boundary, body } = multipart(
    { description: CAPTION, access_token: env.FB_PAGE_ACCESS_TOKEN },
    { source: { name: videoName, buf: videoBuf, mime: 'video/mp4' } }
  );
  const result = await request({
    hostname: 'graph-video.facebook.com',
    path: `/v20.0/${env.FB_PAGE_ID}/videos`,
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    }
  }, body);
  if (result.id) {
    console.log(`  Facebook OK — video id: ${result.id}`);
    console.log(`  URL: https://www.facebook.com/${env.FB_PAGE_ID}/videos/${result.id}`);
  } else {
    console.error('  Facebook FAILED:', JSON.stringify(result).slice(0, 400));
    console.error('  NOTE: FB token data access expires ~Jul 3 2026. If expired, refresh in FB Developer Console.');
  }
  return result;
}

async function uploadMediaToAyrshare(videoBuf, videoName) {
  console.log('\n--- Ayrshare Media Upload ---');
  const { boundary, body } = multipart(
    {},
    { file: { name: videoName, buf: videoBuf, mime: 'video/mp4' } }
  );
  const result = await request({
    hostname: 'app.ayrshare.com',
    path: '/api/media/upload',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.AYRSHARE_API_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    }
  }, body);
  console.log('  Ayrshare media result:', JSON.stringify(result).slice(0, 300));
  return result;
}

async function postToAyrshare(mediaUrl) {
  console.log('\n--- Ayrshare Post (Physics IG + TikTok) ---');
  const payload = Buffer.from(JSON.stringify({
    post: CAPTION,
    platforms: ['instagram', 'tiktok'],
    mediaUrls: [mediaUrl],
    instagramOptions: { reels: true },
    socialAccounts: [
      { platform: 'instagram', id: env.AYRSHARE_PHYSICS_IG_PROFILE_ID },
      { platform: 'tiktok',    id: env.AYRSHARE_PHYSICS_TIKTOK_PROFILE_ID }
    ]
  }));
  const result = await request({
    hostname: 'app.ayrshare.com',
    path: '/api/post',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.AYRSHARE_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  }, payload);
  console.log('  Ayrshare post result:', JSON.stringify(result).slice(0, 500));
  if (result.postIds) {
    result.postIds.forEach(p => {
      if (p.status === 'success') console.log(`  ${p.platform} OK — ${p.postUrl || p.id}`);
      else console.error(`  ${p.platform} FAILED:`, JSON.stringify(p).slice(0, 200));
    });
  }
  return result;
}

async function main() {
  const videoBuf = fs.readFileSync(VIDEO_PATH);
  const videoName = path.basename(VIDEO_PATH);
  console.log(`Loaded: ${videoName} (${(videoBuf.length / 1024 / 1024).toFixed(1)} MB)`);

  await uploadToFacebook(videoBuf, videoName);

  console.log('\nDone.');
}

main().catch(err => console.error('Fatal:', err.message));
