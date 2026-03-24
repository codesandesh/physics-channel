# Physics Channel Pipeline — Complete Setup Guide
## From zero to fully automated YouTube publishing

---

## SECTION 1 — Server Setup (Ubuntu 22.04)

### 1.1 Install all dependencies

```bash
# Upload your physics-channel folder to the server, then:
cd physics-channel
chmod +x install.sh setup.sh health-check.sh
sudo bash install.sh
```

### 1.2 Place background music file

Download any royalty-free background music MP3 and name it `background_music.mp3`.
Place it at:

```
physics-channel/config/background_music.mp3
```

This file is mounted into the ffmpeg-runner container at `/ffmpeg/config/background_music.mp3`.
If missing, the assemble script substitutes silence automatically.

---

## SECTION 2 — Environment Variables

```bash
cp .env.example .env
nano .env
```

Fill in every value. The critical ones:

| Variable | Where to find it |
|---|---|
| `SERVER_BASE_URL` | Your server's public IP or domain |
| `N8N_WEBHOOK_BASE_URL` | Same IP/domain with `:5678` appended |
| `N8N_BASIC_AUTH_PASSWORD` | Choose a strong password |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Key |
| `ELEVENLABS_VOICE_ID` | elevenlabs.io → Voices → click a voice → copy ID |
| `HEYGEN_API_KEY` | app.heygen.com → Settings → API |
| `HEYGEN_AVATAR_ID` | app.heygen.com → Avatars → copy ID |
| `YOUTUBE_OAUTH_CLIENT_ID` | Google Cloud Console (see Section 3) |
| `YOUTUBE_OAUTH_CLIENT_SECRET` | Google Cloud Console (see Section 3) |
| `GOOGLE_DRIVE_FOLDER_ID` | From Drive folder URL: `.../folders/FOLDER_ID_HERE` |
| `APPS_SCRIPT_CALLBACK_URL` | Google Apps Script → Deploy → Web App URL |

---

## SECTION 3 — Google Cloud Console Setup

### 3.1 Create a project and enable APIs

1. Go to https://console.cloud.google.com/
2. Create a new project called `physics-channel`
3. Enable these APIs:
   - **YouTube Data API v3**
   - **Google Drive API**

### 3.2 Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Name: `physics-channel-n8n`
5. Authorized redirect URIs — add:
   ```
   http://YOUR_SERVER_IP:5678/rest/oauth2-credential/callback
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** into your `.env` file

### 3.3 Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. User type: **External** (unless you have Google Workspace)
3. Fill in app name and your email
4. Add scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/drive.file`
5. Add your own email as a test user
6. Save

---

## SECTION 4 — Start Docker Containers

```bash
sudo bash setup.sh
```

This builds all images and starts n8n, manim-runner, and ffmpeg-runner.

Verify everything is running:

```bash
bash health-check.sh
```

---

## SECTION 5 — n8n Credential Setup

Open n8n at `http://YOUR_SERVER_IP:5678`

### 5.1 Create Google Drive credential

1. In n8n: **Settings → Credentials → + Add Credential**
2. Search: **Google Drive OAuth2 API**
3. Enter your Client ID and Client Secret from Section 3
4. Click **Connect** — browser will open Google auth, approve it
5. Note the credential ID (visible in URL when editing it)

### 5.2 Create YouTube credential

1. In n8n: **Settings → Credentials → + Add Credential**
2. Search: **YouTube OAuth2 API**
3. Enter the same Client ID and Client Secret
4. Click **Connect** — browser will open YouTube auth, approve it
5. Note the credential ID

---

## SECTION 6 — Import Workflows into n8n

### 6.1 Import Stage 2 workflow

1. In n8n, click **Workflows → + Add Workflow**
2. Click the **⋮ menu → Import from file**
3. Select `workflows/stage2-manim-pipeline.json`
4. After import, click each node that shows a credential error (red border):
   - **Upload Animation to Drive** → select your Google Drive credential
   - **Make Animation Public** → select your Google Drive credential
5. **Save** the workflow
6. Click the toggle to **Activate** the workflow
7. Copy the webhook URL shown — it will be:
   ```
   http://YOUR_SERVER_IP:5678/webhook/stage2-manim
   ```

### 6.2 Import Stage 3 workflow

1. In n8n, click **Workflows → + Add Workflow**
2. Click **⋮ menu → Import from file**
3. Select `workflows/stage3-assembly-pipeline.json`
4. After import, fix credential bindings:
   - **Upload to YouTube** → select your YouTube credential
   - **Upload Final Video to Drive** → select your Google Drive credential
   - **Make Final Video Public** → select your Google Drive credential
5. **Save** and **Activate** the workflow
6. Copy the webhook URL:
   ```
   http://YOUR_SERVER_IP:5678/webhook/stage3-assemble
   ```

---

## SECTION 7 — Configure Google Apps Script

In your Google Apps Script project, set these constants at the top of your script:

```javascript
const N8N_STAGE2_WEBHOOK = 'http://YOUR_SERVER_IP:5678/webhook/stage2-manim';
const N8N_STAGE3_WEBHOOK = 'http://YOUR_SERVER_IP:5678/webhook/stage3-assemble';
```

### 7.1 Stage 2 payload your Apps Script must send

```javascript
const stage2Payload = {
  job_id:               jobId,                    // e.g. "PHY-12345678"
  scenes: [
    {
      scene_number: 1,
      class_name:   "Scene01_Hook",               // must match Manim class name exactly
      code:         "from manim import *\n\nclass Scene01_Hook(Scene):\n    def construct(self):\n        ..."
    }
    // ... more scenes
  ],
  elevenlabs_audio_url: publicGDriveDownloadUrl,  // MP3 download URL
  heygen_avatar_url:    heygenVideoUrl,           // HeyGen video URL
  callback_url:         APPS_SCRIPT_WEB_APP_URL + '?action=manim_callback'
};

const options = {
  method: 'post',
  contentType: 'application/json',
  payload: JSON.stringify(stage2Payload),
  muteHttpExceptions: true
};
UrlFetchApp.fetch(N8N_STAGE2_WEBHOOK, options);
```

### 7.2 Stage 3 payload your Apps Script must send (on manim_callback)

```javascript
function handleManim_callback(params) {
  // params comes from the GET request n8n sends back
  const jobId         = params.job_id;
  const animationUrl  = params.manim_video_url;
  const renderTimeSec = params.render_time_seconds;

  // Save to your sheet, then send Stage 3:
  const stage3Payload = {
    job_id:               jobId,
    manim_video_url:      animationUrl,            // from manim_callback
    elevenlabs_audio_url: getAudioUrl(jobId),      // from your Asset Links tab
    heygen_avatar_url:    getAvatarUrl(jobId),     // from your Asset Links tab
    youtube_title:        getTitle(jobId),          // from your Scripts tab
    youtube_description:  getDescription(jobId),   // from your Scripts tab
    youtube_tags:         getTags(jobId),           // array of strings
    youtube_channel_id:   YOUTUBE_CHANNEL_ID,
    callback_url:         APPS_SCRIPT_WEB_APP_URL + '?action=publish_callback'
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(stage3Payload),
    muteHttpExceptions: true
  };
  UrlFetchApp.fetch(N8N_STAGE3_WEBHOOK, options);
}
```

### 7.3 Handle publish_callback (marks job LIVE)

```javascript
function handlePublish_callback(params) {
  const jobId      = params.job_id;
  const ytUrl      = params.youtube_url;
  const finalVideo = params.final_video_url;

  // Update Dashboard row:
  //   Status    → LIVE
  //   YouTube   → clickable hyperlink to ytUrl
  //   Final MP4 → finalVideo URL
  // Send yourself an email notification
  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    `✅ Video LIVE: ${getTitle(jobId)}`,
    `Your Physics Channel video is now live!\n\nYouTube: ${ytUrl}\nJob ID: ${jobId}`
  );
}
```

---

## SECTION 8 — Test the Full Pipeline

### 8.1 Test Stage 2 webhook manually

Send a test POST request using curl from your server:

```bash
curl -X POST http://localhost:5678/webhook/stage2-manim \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "PHY-TEST001",
    "scenes": [
      {
        "scene_number": 1,
        "class_name": "Scene01_Test",
        "code": "from manim import *\n\nclass Scene01_Test(Scene):\n    def construct(self):\n        circle = Circle(color=BLUE)\n        self.play(Create(circle))\n        self.wait(1)"
      }
    ],
    "elevenlabs_audio_url": "https://your-audio-url.mp3",
    "heygen_avatar_url": "https://your-avatar-url.mp4",
    "callback_url": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=manim_callback"
  }'
```

### 8.2 Monitor execution in n8n

1. Go to n8n → **Executions**
2. Watch the execution run in real time
3. Click any node to see its input/output data
4. If a node fails, click it to read the error message

### 8.3 Full end-to-end test

1. Open your Google Sheet
2. Add a row:
   - Topic: `Quantum Entanglement for Beginners`
   - Difficulty: `beginner`
   - Duration: `10`
   - Status: `PENDING`
3. Wait up to 5 minutes for the Apps Script trigger to fire
4. Watch the status column advance: `PENDING → STAGE1 → STAGE2 → STAGE3 → LIVE`
5. Check n8n Executions for both workflows
6. Final result: YouTube URL appears as a clickable hyperlink in your Dashboard

---

## SECTION 9 — Webhook URLs Reference

| Webhook | URL | Who calls it |
|---|---|---|
| Stage 2 | `http://YOUR_IP:5678/webhook/stage2-manim` | Google Apps Script (after ElevenLabs + HeyGen complete) |
| Stage 3 | `http://YOUR_IP:5678/webhook/stage3-assemble` | Google Apps Script (after receiving manim_callback) |

| Callback | URL | Who calls it |
|---|---|---|
| manim_callback | Your Apps Script Web App URL + `?action=manim_callback` | n8n Stage 2 (after Manim + Drive upload) |
| publish_callback | Your Apps Script Web App URL + `?action=publish_callback` | n8n Stage 3 (after YouTube upload) |

---

## SECTION 10 — Environment Variable Diagram

```
Google Sheet
     │  PENDING row
     ▼
Apps Script (5-min trigger)
     │  Claude API → script + Manim code
     │  ElevenLabs → audio MP3 → Google Drive
     │  HeyGen → avatar MP4
     │
     ▼  POST { job_id, scenes[], elevenlabs_audio_url, heygen_avatar_url, callback_url }
n8n Stage 2 Webhook  (port 5678, path /webhook/stage2-manim)
     │  Writes .py files → manim/scripts/
     │  docker exec manim-runner → renders each scene MP4
     │  docker exec manim-runner → FFmpeg concat → combined animation
     │  Upload animation → Google Drive (public)
     │
     ▼  GET callback_url?job_id=&manim_video_url=&render_time_seconds=
Apps Script (manim_callback)
     │  Saves URLs to Asset Links tab
     │  Updates status to STAGE3
     │
     ▼  POST { job_id, manim_video_url, elevenlabs_audio_url, heygen_avatar_url, youtube_* }
n8n Stage 3 Webhook  (port 5678, path /webhook/stage3-assemble)
     │  docker exec ffmpeg-runner → downloads all 3 assets
     │  docker exec ffmpeg-runner → FFmpeg assemble (1080p, PiP overlay, audio mix)
     │  Upload final video → YouTube (public, category Education)
     │  Upload final video → Google Drive (backup)
     │
     ▼  GET callback_url?job_id=&youtube_url=&final_video_url=
Apps Script (publish_callback)
     │  Status → LIVE
     │  YouTube URL → clickable hyperlink in Dashboard
     └  Email notification sent
```

---

## SECTION 11 — Troubleshooting

### n8n can't run docker exec commands
```bash
# Check docker socket is mounted
docker exec n8n ls /var/run/docker.sock

# Check node user has docker group access
docker exec n8n id
# Should show: groups=...,999(docker),...

# If GID mismatch, check host docker GID:
stat -c '%g' /var/run/docker.sock
# Update n8n/Dockerfile: RUN addgroup -g HOST_GID docker
# Then rebuild: docker compose build n8n && docker compose up -d n8n
```

### Manim render fails
```bash
# Test Manim manually
docker exec manim-runner bash -c "
cat > /tmp/test_scene.py << 'EOF'
from manim import *
class TestScene(Scene):
    def construct(self):
        self.play(Create(Circle()))
        self.wait(1)
EOF
manim -qm /tmp/test_scene.py TestScene 2>&1"
```

### FFmpeg command fails
```bash
# Test FFmpeg in the container
docker exec ffmpeg-runner ffmpeg -version

# Test the assemble script manually
docker exec ffmpeg-runner bash /ffmpeg/assemble.sh PHY-TEST001
```

### n8n Stage 2 loop not collecting all scenes
- Check that `Parse Render Result` node name in the `Collect Scene Paths` Code node matches exactly
- In n8n Code node: `$('Parse Render Result').all()` — node name is case-sensitive
- Verify in n8n by clicking the node and checking its displayed name

### YouTube upload fails with auth error
- Re-authorize the YouTube OAuth2 credential in n8n Settings → Credentials
- Ensure the OAuth consent screen has your email as a test user
- Verify the redirect URI in Google Cloud Console exactly matches `http://YOUR_IP:5678/rest/oauth2-credential/callback`

### Google Drive permission error when making file public
- Ensure Drive API is enabled in Google Cloud Console
- Ensure the OAuth2 scope includes `https://www.googleapis.com/auth/drive`

---

## SECTION 12 — Expected Timing

| Stage | Task | Typical Duration |
|---|---|---|
| Apps Script Stage 1 | Claude script generation | 30–60 sec |
| Apps Script Stage 1 | ElevenLabs audio generation | 30–90 sec |
| Apps Script Stage 1 | HeyGen avatar generation | 3–8 min |
| n8n Stage 2 | Manim rendering (per scene, 1080p) | 1–3 min |
| n8n Stage 2 | FFmpeg concat + Drive upload | 30–60 sec |
| n8n Stage 3 | Asset downloads | 30–60 sec |
| n8n Stage 3 | FFmpeg final assembly | 1–3 min |
| n8n Stage 3 | YouTube upload | 1–5 min |
| **Total** | **From PENDING to LIVE** | **~15–20 min** |
