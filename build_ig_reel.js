const fs = require('fs');

const w = JSON.parse(fs.readFileSync('D:/tmp_qpc2.json'));

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
  "const bgmRaw = execSync(",
  "  `docker exec qpc_ffmpeg_runner bash -c \"ls ${bgmDir}/*.mp3 2>/dev/null\"`,",
  "  { encoding: 'utf-8' }",
  ").trim();",
  "const bgmList = bgmRaw.split('\\n').filter(Boolean);",
  "if (!bgmList.length) throw new Error('No BGM files found at ' + bgmDir);",
  "const bgm = bgmList[Math.floor(Math.random() * bgmList.length)];",
  "",
  "const scale = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black';",
  "const ffCmd = `ffmpeg -y -loop 1 -i '${imgPath_ffmpeg}' -i '${bgm}' -c:v libx264 -t 20 -pix_fmt yuv420p -vf \"${scale}\" -c:a aac -b:a 128k -movflags +faststart '${outPath_ffmpeg}'`;",
  "",
  "execSync(`docker exec qpc_ffmpeg_runner bash -c ${JSON.stringify(ffCmd)}`,",
  "  { timeout: 120000, encoding: 'utf-8' });",
  "",
  "try { fs.unlinkSync(imgPath_n8n); } catch(e) {}",
  "",
  "return {",
  "  json: {",
  "    ...$input.item.json,",
  "    reelVideoPath: outPath_n8n,",
  "    reelJobId: ts,",
  "    bgmUsed: path.basename(bgm)",
  "  }",
  "};"
].join('\n');

const uploadReelCode = [
  "const fs    = require('fs');",
  "const https = require('https');",
  "",
  "const reelPath  = $('Create IG Reel Video').item.json.reelVideoPath;",
  "const uploadUri = $('Create IG Reel Container').item.json.uri;",
  "const token     = $env.FB_PAGE_ACCESS_TOKEN;",
  "",
  "if (!fs.existsSync(reelPath)) throw new Error('Reel video not found: ' + reelPath);",
  "const videoBuf = fs.readFileSync(reelPath);",
  "const fileSize  = videoBuf.length;",
  "const url = new URL(uploadUri);",
  "",
  "const result = await new Promise((resolve, reject) => {",
  "  const req = https.request({",
  "    hostname: url.hostname,",
  "    path:     url.pathname + url.search,",
  "    method:   'POST',",
  "    headers: {",
  "      'Authorization':  `OAuth ${token}`,",
  "      'offset':         '0',",
  "      'file_size':      String(fileSize),",
  "      'Content-Type':   'video/mp4',",
  "      'Content-Length': fileSize",
  "    }",
  "  }, res => {",
  "    let d = '';",
  "    res.on('data', c => d += c);",
  "    res.on('end', () => resolve({ statusCode: res.statusCode, body: d }));",
  "  });",
  "  req.on('error', reject);",
  "  req.write(videoBuf);",
  "  req.end();",
  "});",
  "",
  "try { fs.unlinkSync(reelPath); } catch(e) {}",
  "if (result.statusCode >= 300) throw new Error(`Upload failed ${result.statusCode}: ${result.body}`);",
  "",
  "return {",
  "  json: {",
  "    ig_user_id:    $('Get IG User ID').item.json.instagram_business_account.id,",
  "    creation_id:   $('Create IG Reel Container').item.json.id,",
  "    upload_status: result.body",
  "  }",
  "};"
].join('\n');

const sleep45Code = "await new Promise(r => setTimeout(r, 45000));\nreturn $input.all();";

const newNodes = [
  {
    id: 'ig-reel-create-001',
    name: 'Create IG Reel Video',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [900, 520],
    parameters: { mode: 'runOnceForEachItem', jsCode: createReelCode }
  },
  {
    id: 'ig-reel-getuid-002',
    name: 'Get IG User ID',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.1,
    position: [1120, 520],
    parameters: {
      method: 'GET',
      url: '=https://graph.facebook.com/v20.0/{{ $env.FB_PAGE_ID }}',
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: 'fields',       value: 'instagram_business_account' },
          { name: 'access_token', value: '={{ $env.FB_PAGE_ACCESS_TOKEN }}' }
        ]
      },
      options: {}
    }
  },
  {
    id: 'ig-reel-container-003',
    name: 'Create IG Reel Container',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.1,
    position: [1340, 520],
    parameters: {
      method: 'POST',
      url: "={{ 'https://graph.facebook.com/v20.0/' + $json.instagram_business_account.id + '/media' }}",
      sendBody: true,
      contentType: 'form-urlencoded',
      bodyParameters: {
        parameters: [
          { name: 'media_type',    value: 'REELS' },
          { name: 'upload_type',   value: 'resumable' },
          { name: 'caption',       value: "={{ $('Create IG Reel Video').item.json.instagram_caption }}" },
          { name: 'share_to_feed', value: 'true' },
          { name: 'access_token',  value: '={{ $env.FB_PAGE_ACCESS_TOKEN }}' }
        ]
      },
      options: {}
    }
  },
  {
    id: 'ig-reel-upload-004',
    name: 'Upload Reel Video',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1560, 520],
    parameters: { mode: 'runOnceForEachItem', jsCode: uploadReelCode }
  },
  {
    id: 'ig-reel-sleep-005',
    name: 'Wait IG Processing',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1780, 520],
    parameters: { mode: 'runOnceForAllItems', jsCode: sleep45Code }
  },
  {
    id: 'ig-reel-publish-006',
    name: 'Publish IG Reel',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.1,
    position: [2000, 520],
    parameters: {
      method: 'POST',
      url: "={{ 'https://graph.facebook.com/v20.0/' + $json.ig_user_id + '/media_publish' }}",
      sendBody: true,
      contentType: 'form-urlencoded',
      bodyParameters: {
        parameters: [
          { name: 'creation_id',  value: '={{ $json.creation_id }}' },
          { name: 'access_token', value: '={{ $env.FB_PAGE_ACCESS_TOKEN }}' }
        ]
      },
      options: {}
    }
  }
];

w.nodes.push(...newNodes);

w.connections['Prepare Image Data'].main[0].push({
  node: 'Create IG Reel Video', type: 'main', index: 0
});

w.connections['Create IG Reel Video']     = { main: [[{ node: 'Get IG User ID',            type: 'main', index: 0 }]] };
w.connections['Get IG User ID']           = { main: [[{ node: 'Create IG Reel Container',  type: 'main', index: 0 }]] };
w.connections['Create IG Reel Container'] = { main: [[{ node: 'Upload Reel Video',          type: 'main', index: 0 }]] };
w.connections['Upload Reel Video']        = { main: [[{ node: 'Wait IG Processing',         type: 'main', index: 0 }]] };
w.connections['Wait IG Processing']       = { main: [[{ node: 'Publish IG Reel',            type: 'main', index: 0 }]] };
w.connections['Publish IG Reel']          = { main: [[{ node: 'Check Has Row',              type: 'main', index: 0 }]] };

const payload = {
  name: w.name,
  nodes: w.nodes,
  connections: w.connections,
  settings: { executionOrder: w.settings?.executionOrder || 'v1' }
};

fs.writeFileSync('D:/tmp_qpc2_ig_reel_payload.json', JSON.stringify(payload));
console.log('nodes total:', w.nodes.length);
console.log('new nodes:', newNodes.map(n => n.name).join(', '));
console.log('Prepare Image Data fans to:', w.connections['Prepare Image Data'].main[0].map(c=>c.node).join(', '));
