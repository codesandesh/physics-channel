// ============================================================
//  PHYSICS YOUTUBE CHANNEL — APPS SCRIPT
//
//  Architecture: ALL API calls run on your server via n8n.
//  This script ONLY: detects PENDING jobs, fires n8n Stage 1,
//  receives status callbacks, and updates the sheet.
//
//  No API keys stored here. Credentials live in server .env.
//
//  HOW TO USE:
//  1. Paste this into Extensions → Apps Script
//  2. Run setupEntireSheet() once to build all 6 tabs
//  3. Fill in CONFIG below (only 3 values needed)
//  4. Deploy as Web App → copy URL into CONFIG.WEBAPP_URL
//  5. Re-save and re-deploy (new version)
// ============================================================


// ============================================================
//  SECTION 1 — CONFIG  (only 3 values — NO API keys here)
// ============================================================

const CONFIG = {
  // Your n8n server Stage 1 webhook URL
  // Format: http://YOUR_SERVER_IP:5678/webhook/stage1-generate
  N8N_STAGE1_WEBHOOK: "http://YOUR_SERVER_IP:5678/webhook/stage1-generate",

  // This script's own Web App URL.
  // Leave blank until after your first Deploy → New Deployment.
  // Then paste the URL here and re-deploy as a new version.
  WEBAPP_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",

  // Email address for "video is LIVE" notification
  NOTIFY_EMAIL: "you@example.com",
};


// ============================================================
//  SECTION 2 — SHEET & COLUMN CONSTANTS
// ============================================================

const SHEETS = {
  DASHBOARD : "🎬 Dashboard",
  SCRIPTS   : "📝 Scripts",
  SCENES    : "🎭 Scenes",
  MANIM     : "🐍 Manim Code",
  ASSETS    : "🔗 Asset Links",
  LOGS      : "📋 Logs",
};

const DASH_COL = {
  JOB_ID        : 1,
  TOPIC         : 2,
  DIFFICULTY    : 3,
  DURATION_MIN  : 4,
  STATUS        : 5,
  STAGE1_STATUS : 6,
  STAGE2_STATUS : 7,
  STAGE3_STATUS : 8,
  YOUTUBE_URL   : 9,
  ELEVENLABS_URL: 10,
  HEYGEN_URL    : 11,
  MANIM_URL     : 12,
  CREATED_AT    : 13,
  COMPLETED_AT  : 14,
  NOTES         : 15,
};

const SCRIPT_COL = {
  JOB_ID          : 1,
  TOPIC           : 2,
  FULL_SCRIPT     : 3,
  HEYGEN_SCRIPT   : 4,
  VIDEO_TITLE     : 5,
  DESCRIPTION     : 6,
  TAGS            : 7,
  THUMBNAIL_PROMPT: 8,
  TOTAL_SCENES    : 9,
  WORD_COUNT      : 10,
  CREATED_AT      : 11,
};

const SCENE_COL = {
  JOB_ID        : 1,
  SCENE_NUMBER  : 2,
  SCENE_NAME    : 3,
  TIME_START    : 4,
  TIME_END      : 5,
  DURATION_SEC  : 6,
  NARRATION_TEXT: 7,
  VISUAL_DESC   : 8,
  MANIM_CLASS   : 9,
  STATUS        : 10,
};

const MANIM_COL = {
  JOB_ID       : 1,
  SCENE_NUMBER : 2,
  CLASS_NAME   : 3,
  PYTHON_CODE  : 4,
  RENDER_STATUS: 5,
  OUTPUT_FILE  : 6,
  RENDER_TIME_S: 7,
};

const ASSET_COL = {
  JOB_ID      : 1,
  ASSET_TYPE  : 2,
  FILE_NAME   : 3,
  PUBLIC_URL  : 4,
  FILE_SIZE_MB: 5,
  DURATION_SEC: 6,
  CREATED_AT  : 7,
  STATUS      : 8,
  NOTES       : 9,
};


// ============================================================
//  SECTION 3 — MASTER SETUP: BUILD THE ENTIRE SHEET
// ============================================================

function setupEntireSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("ERROR: No active spreadsheet found.");
    return;
  }

  Logger.log("Setting up Physics Channel Dashboard...");

  let tempSheet = ss.getSheetByName("__temp__");
  if (!tempSheet) tempSheet = ss.insertSheet("__temp__");
  SpreadsheetApp.flush();

  _setupDashboardSheet(ss);  SpreadsheetApp.flush();
  _setupScriptsSheet(ss);    SpreadsheetApp.flush();
  _setupScenesSheet(ss);     SpreadsheetApp.flush();
  _setupManimSheet(ss);      SpreadsheetApp.flush();
  _setupAssetsSheet(ss);     SpreadsheetApp.flush();
  _setupLogsSheet(ss);       SpreadsheetApp.flush();

  const temp = ss.getSheetByName("__temp__");
  if (temp) ss.deleteSheet(temp);

  ss.setActiveSheet(ss.getSheetByName(SHEETS.DASHBOARD));
  _setupTriggers();

  SpreadsheetApp.getUi().alert(
    "✅ Setup Complete!\n\n" +
    "Your Physics Channel Dashboard is ready.\n\n" +
    "Next steps:\n" +
    "1. Fill in CONFIG.N8N_STAGE1_WEBHOOK with your server IP\n" +
    "2. Deploy this script as a Web App (Deploy → New Deployment)\n" +
    "3. Copy the Web App URL into CONFIG.WEBAPP_URL\n" +
    "4. Save and re-deploy (new version)\n" +
    "5. Type a physics topic in column B of the Dashboard\n" +
    "6. Set difficulty in C and duration in D\n" +
    "7. Pipeline fires automatically within 5 minutes!\n\n" +
    "All API credentials are read from your server .env file. 🚀"
  );
}


// ============================================================
//  SECTION 4 — TAB SETUP FUNCTIONS
// ============================================================

function _setupDashboardSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.DASHBOARD);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(SHEETS.DASHBOARD, 0);

  sheet.getRange("A1:O1")
    .merge()
    .setValue("🎬 PHYSICS YOUTUBE CHANNEL — AUTOMATED PIPELINE DASHBOARD")
    .setBackground("#1a1a2e")
    .setFontColor("#e2e2ff")
    .setFontSize(14)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 42);

  sheet.getRange("A2:O2")
    .merge()
    .setValue("👉  Type your physics topic in column B  →  Set difficulty in C  →  Set duration in D  →  Pipeline runs automatically!")
    .setBackground("#16213e")
    .setFontColor("#a0a8d0")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 28);

  const headers = [
    "Job ID", "Topic", "Difficulty", "Duration\n(min)",
    "Overall\nStatus", "Stage 1\nScript", "Stage 2\nRender",
    "Stage 3\nPublish", "YouTube URL",
    "ElevenLabs\nAudio URL", "HeyGen\nAvatar URL",
    "Manim\nVideo URL", "Created At", "Completed At", "Notes"
  ];

  sheet.getRange(3, 1, 1, headers.length)
    .setValues([headers])
    .setBackground("#0f3460")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(3, 48);

  const colWidths = [80, 220, 100, 70, 100, 90, 90, 90, 200, 180, 160, 160, 140, 140, 200];
  colWidths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  const sampleRow = [
    "—", "e.g. Quantum Entanglement", "beginner", "10",
    "PENDING", "—", "—", "—", "—", "—", "—", "—",
    "", "", "Replace this row with your real topic"
  ];
  sheet.getRange(4, 1, 1, sampleRow.length)
    .setValues([sampleRow])
    .setFontColor("#888888")
    .setFontStyle("italic");

  const diffRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["beginner", "intermediate", "advanced"], true)
    .build();
  sheet.getRange(4, DASH_COL.DIFFICULTY, 100, 1).setDataValidation(diffRule);

  _applyStatusFormatting(sheet, DASH_COL.STATUS,        4, 100);
  _applyStatusFormatting(sheet, DASH_COL.STAGE1_STATUS, 4, 100);
  _applyStatusFormatting(sheet, DASH_COL.STAGE2_STATUS, 4, 100);
  _applyStatusFormatting(sheet, DASH_COL.STAGE3_STATUS, 4, 100);

  sheet.setFrozenRows(3);
  Logger.log("✅ Dashboard sheet created.");
}


function _setupScriptsSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.SCRIPTS);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(SHEETS.SCRIPTS);

  const headers = [
    "Job ID", "Topic",
    "Full Narration Script\n(→ ElevenLabs)",
    "HeyGen Script\n(with expression cues)",
    "YouTube Title", "YouTube Description",
    "Tags", "Thumbnail Prompt",
    "Total Scenes", "Word Count", "Created At"
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground("#1b4332")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 48);

  const colWidths = [80, 200, 400, 350, 200, 400, 250, 300, 80, 80, 140];
  colWidths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  sheet.getRange("C2:D100").setWrap(true).setVerticalAlignment("top");
  sheet.getRange("F2:F100").setWrap(true).setVerticalAlignment("top");
  sheet.setFrozenRows(1);
  Logger.log("✅ Scripts sheet created.");
}


function _setupScenesSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.SCENES);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(SHEETS.SCENES);

  const headers = [
    "Job ID", "Scene #", "Scene Name",
    "Time Start", "Time End", "Duration (s)",
    "Narration Text", "Visual Description",
    "Manim Class Name", "Render Status"
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground("#1e3a5f")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 40);

  const colWidths = [80, 60, 180, 80, 80, 80, 350, 300, 180, 100];
  colWidths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  sheet.setFrozenRows(1);
  _applyStatusFormatting(sheet, SCENE_COL.STATUS, 2, 500);
  Logger.log("✅ Scenes sheet created.");
}


function _setupManimSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.MANIM);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(SHEETS.MANIM);

  const headers = [
    "Job ID", "Scene #", "Class Name",
    "Python Code (Manim)", "Render Status",
    "Output File URL", "Render Time (s)"
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground("#3d1a78")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 40);

  const colWidths = [80, 60, 180, 600, 120, 250, 100];
  colWidths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  sheet.getRange("D2:D500")
    .setFontFamily("Courier New")
    .setFontSize(10)
    .setWrap(true)
    .setVerticalAlignment("top");

  sheet.setFrozenRows(1);
  _applyStatusFormatting(sheet, MANIM_COL.RENDER_STATUS, 2, 500);
  Logger.log("✅ Manim code sheet created.");
}


function _setupAssetsSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.ASSETS);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(SHEETS.ASSETS);

  const headers = [
    "Job ID", "Asset Type", "File Name",
    "🔗 Public URL", "Size (MB)",
    "Duration (s)", "Created At", "Status", "Notes"
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground("#7b2d00")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 40);

  const colWidths = [80, 180, 200, 400, 80, 80, 140, 100, 200];
  colWidths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  sheet.getRange("D2:D500").setFontColor("#1155cc");
  sheet.setFrozenRows(1);
  _applyStatusFormatting(sheet, ASSET_COL.STATUS, 2, 500);
  Logger.log("✅ Assets sheet created.");
}


function _setupLogsSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.LOGS);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(SHEETS.LOGS);

  const headers = ["Timestamp", "Job ID", "Stage", "Level", "Message"];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground("#2d2d2d")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 620);

  sheet.setFrozenRows(1);
  Logger.log("✅ Logs sheet created.");
}


// ============================================================
//  SECTION 5 — STATUS COLOR FORMATTING HELPER
// ============================================================

function _applyStatusFormatting(sheet, col, startRow, numRows) {
  const range = sheet.getRange(startRow, col, numRows, 1);

  const statuses = [
    { value: "LIVE",       bg: "#c3e6cb", font: "#155724" },
    { value: "DONE",       bg: "#c3e6cb", font: "#155724" },
    { value: "READY",      bg: "#c3e6cb", font: "#155724" },
    { value: "RENDERED",   bg: "#d1ecf1", font: "#0c5460" },
    { value: "GENERATING", bg: "#fff3cd", font: "#856404" },
    { value: "RENDERING",  bg: "#fff3cd", font: "#856404" },
    { value: "RUNNING",    bg: "#fff3cd", font: "#856404" },
    { value: "STAGE1",     bg: "#cce5ff", font: "#004085" },
    { value: "STAGE2",     bg: "#e2d9f3", font: "#4a0080" },
    { value: "STAGE3",     bg: "#fde8cc", font: "#7a3e00" },
    { value: "PENDING",    bg: "#f0f0f0", font: "#666666" },
    { value: "ERROR",      bg: "#f8d7da", font: "#721c24" },
  ];

  const rules = statuses.map(s =>
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(s.value)
      .setBackground(s.bg)
      .setFontColor(s.font)
      .setRanges([range])
      .build()
  );

  const existing = sheet.getConditionalFormatRules();
  sheet.setConditionalFormatRules([...existing, ...rules]);
}


// ============================================================
//  SECTION 6 — LOGGING HELPER
// ============================================================

function _log(jobId, stage, level, message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    const logSheet = ss.getSheetByName(SHEETS.LOGS);
    if (!logSheet) return;

    logSheet.insertRowAfter(1);
    logSheet.getRange(2, 1, 1, 5).setValues([[
      new Date().toISOString(),
      jobId  || "—",
      stage  || "—",
      level  || "INFO",
      message
    ]]);

    if (level === "ERROR") {
      logSheet.getRange(2, 1, 1, 5).setBackground("#f8d7da").setFontColor("#721c24");
    } else if (level === "SUCCESS") {
      logSheet.getRange(2, 1, 1, 5).setBackground("#d4edda").setFontColor("#155724");
    } else {
      logSheet.getRange(2, 1, 1, 5).setBackground(null).setFontColor(null);
    }
  } catch (err) {
    Logger.log("_log error: " + err.toString());
  }
  Logger.log("[" + level + "][" + stage + "] " + message);
}


// ============================================================
//  SECTION 7 — JOB & DASHBOARD UTILITIES
// ============================================================

function _generateJobId() {
  return "PHY-" + new Date().getTime().toString().slice(-8);
}

function _getDashboardSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet found.");
  return ss.getSheetByName(SHEETS.DASHBOARD);
}

function _updateDashboard(jobId, updates) {
  const sheet   = _getDashboardSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return;

  const data = sheet.getRange(4, DASH_COL.JOB_ID, lastRow - 3, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(jobId)) {
      const row = i + 4;
      Object.entries(updates).forEach(([col, val]) => {
        sheet.getRange(row, parseInt(col)).setValue(val);
      });
      SpreadsheetApp.flush();
      return;
    }
  }
  Logger.log("_updateDashboard: jobId not found: " + jobId);
}

function _saveAssetLink(jobId, assetType, fileName, publicUrl, sizeMb, durationSec, status, notes) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.ASSETS);
  if (!sheet) return;

  sheet.appendRow([
    jobId,
    assetType,
    fileName,
    publicUrl   || "",
    sizeMb      || "",
    durationSec || "",
    new Date().toISOString(),
    status || "READY",
    notes  || ""
  ]);

  const lastRow = sheet.getLastRow();
  if (publicUrl && publicUrl.startsWith("http")) {
    const safeUrl   = publicUrl.replace(/"/g, '""');
    const safeLabel = assetType.replace(/"/g, '""');
    sheet.getRange(lastRow, ASSET_COL.PUBLIC_URL)
      .setFormula('=HYPERLINK("' + safeUrl + '","' + safeLabel + ' Link")');
  }
}


// ============================================================
//  SECTION 8 — MAIN PIPELINE ENTRY POINT
//  Fires every 5 minutes. Finds first PENDING row,
//  sends it to the n8n Stage 1 webhook, then exits.
//  n8n handles ALL external API calls via .env credentials.
// ============================================================

function runPipeline() {
  const lock     = LockService.getScriptLock();
  const acquired = lock.tryLock(10000);
  if (!acquired) {
    Logger.log("Pipeline already running — skipping this trigger fire.");
    return;
  }

  try {
    const sheet   = _getDashboardSheet();
    const lastRow = sheet.getLastRow();

    for (let row = 4; row <= lastRow; row++) {
      const status = sheet.getRange(row, DASH_COL.STATUS).getValue();
      const topic  = sheet.getRange(row, DASH_COL.TOPIC).getValue();

      if (
        status === "PENDING" &&
        topic &&
        topic !== "e.g. Quantum Entanglement" &&
        topic !== "Replace this row with your real topic"
      ) {
        const jobId      = _generateJobId();
        const difficulty = sheet.getRange(row, DASH_COL.DIFFICULTY).getValue()   || "beginner";
        const duration   = sheet.getRange(row, DASH_COL.DURATION_MIN).getValue() || 10;

        // Mark immediately so next trigger doesn't re-pick this row
        sheet.getRange(row, DASH_COL.JOB_ID).setValue(jobId);
        sheet.getRange(row, DASH_COL.STATUS).setValue("STAGE1");
        sheet.getRange(row, DASH_COL.STAGE1_STATUS).setValue("RUNNING");
        sheet.getRange(row, DASH_COL.CREATED_AT).setValue(new Date().toISOString());
        SpreadsheetApp.flush();

        _log(jobId, "PIPELINE", "INFO", 'Sending to n8n — topic: "' + topic + '"');

        // Fire-and-forget POST to n8n Stage 1
        // n8n reads ALL credentials from .env (Claude, ElevenLabs, HeyGen, etc.)
        try {
          const payload = {
            job_id      : jobId,
            topic       : topic,
            difficulty  : difficulty,
            duration_min: duration,
            callback_url: CONFIG.WEBAPP_URL   // n8n will POST back here with stage updates
          };

          const response = UrlFetchApp.fetch(CONFIG.N8N_STAGE1_WEBHOOK, {
            method           : "POST",
            headers          : { "Content-Type": "application/json" },
            payload          : JSON.stringify(payload),
            muteHttpExceptions: true
          });

          const code = response.getResponseCode();
          _log(jobId, "PIPELINE", "INFO",
            "n8n Stage 1 accepted job. HTTP " + code + ". Waiting for callbacks...");

          if (code < 200 || code >= 300) {
            throw new Error("n8n returned HTTP " + code + ": " + response.getContentText().slice(0, 200));
          }

        } catch (err) {
          _log(jobId, "PIPELINE", "ERROR", "Failed to reach n8n: " + err.toString());
          sheet.getRange(row, DASH_COL.STATUS).setValue("ERROR");
          sheet.getRange(row, DASH_COL.STAGE1_STATUS).setValue("ERROR");
          sheet.getRange(row, DASH_COL.NOTES).setValue("n8n unreachable: " + err.toString());
          SpreadsheetApp.flush();
        }

        return; // One job per trigger fire
      }
    }

    Logger.log("No PENDING jobs found.");

  } finally {
    lock.releaseLock();
  }
}


// ============================================================
//  SECTION 9 — CALLBACK HANDLERS (called by n8n via doPost)
// ============================================================

// ── Stage 1 Done: Claude script + ElevenLabs audio + HeyGen avatar ready ──
// n8n sends: { action, job_id, topic, narration, scenes[], youtube_title,
//              youtube_description, youtube_tags, audio_url, heygen_video_url,
//              scene_count }
function _handleStage1Done(data) {
  const jobId  = data.job_id;
  const ss     = SpreadsheetApp.getActiveSpreadsheet();

  _log(jobId, "STAGE1", "SUCCESS",
    "Script + audio + avatar ready. Scenes: " + (data.scene_count || "?"));

  // ── Save to Scripts tab ──
  const scriptSheet = ss.getSheetByName(SHEETS.SCRIPTS);
  if (scriptSheet) {
    scriptSheet.appendRow([
      jobId,
      data.topic              || "",
      data.narration          || "",
      data.narration          || "",   // heygen_script same as narration
      data.youtube_title      || "",
      data.youtube_description|| "",
      Array.isArray(data.youtube_tags)
        ? data.youtube_tags.join(", ")
        : (data.youtube_tags || ""),
      "",                              // thumbnail_prompt
      data.scene_count        || "",
      "",                              // word_count
      new Date().toISOString()
    ]);
  }

  // ── Save scenes + Manim code tabs ──
  const sceneSheet = ss.getSheetByName(SHEETS.SCENES);
  const manimSheet = ss.getSheetByName(SHEETS.MANIM);

  const scenes = Array.isArray(data.scenes)
    ? data.scenes
    : (typeof data.scenes === "string" ? JSON.parse(data.scenes) : []);

  scenes.forEach(function(scene) {
    if (sceneSheet) {
      sceneSheet.appendRow([
        jobId,
        scene.scene_number || "",
        scene.class_name   || "",
        "", "", "",         // time_start, time_end, duration_sec
        "",                 // narration_text
        "",                 // visual_desc
        scene.class_name   || "",
        "PENDING"
      ]);
    }
    if (manimSheet) {
      manimSheet.appendRow([
        jobId,
        scene.scene_number || "",
        scene.class_name   || "",
        scene.code         || "",
        "RENDERING",
        "",
        ""
      ]);
    }
  });

  // ── Save asset links ──
  if (data.audio_url) {
    _saveAssetLink(jobId, "ELEVENLABS_AUDIO", jobId + "_narration.mp3",
      data.audio_url, null, null, "READY", "ElevenLabs narration audio");
  }
  if (data.heygen_video_url) {
    _saveAssetLink(jobId, "HEYGEN_AVATAR", jobId + "_avatar.mp4",
      data.heygen_video_url, null, null, "READY", "HeyGen avatar video");
  }

  // ── Update Dashboard ──
  _updateDashboard(jobId, {
    [DASH_COL.STAGE1_STATUS]: "DONE",
    [DASH_COL.STATUS]       : "STAGE2",
    [DASH_COL.STAGE2_STATUS]: "RUNNING",
    [DASH_COL.ELEVENLABS_URL]: data.audio_url        || "",
    [DASH_COL.HEYGEN_URL]   : data.heygen_video_url  || "",
  });

  SpreadsheetApp.flush();
}


// ── Stage 2 Done: Manim animation rendered and uploaded to Drive ──
// n8n sends: { action, job_id, manim_video_url, render_time_seconds }
function _handleStage2Done(data) {
  const jobId     = data.job_id;
  const manimUrl  = data.manim_video_url || "";
  const renderSec = data.render_time_seconds || "";

  _log(jobId, "STAGE2", "SUCCESS",
    "Manim render complete. URL: " + manimUrl + (renderSec ? " (" + renderSec + "s)" : ""));

  // Update render status on Manim tab
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const manimSheet = ss.getSheetByName(SHEETS.MANIM);
  if (manimSheet && manimSheet.getLastRow() > 1) {
    const rows = manimSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(jobId)) {
        manimSheet.getRange(i + 1, MANIM_COL.RENDER_STATUS).setValue("RENDERED");
        if (renderSec) manimSheet.getRange(i + 1, MANIM_COL.RENDER_TIME_S).setValue(renderSec);
      }
    }
  }

  // Update Scene tab statuses
  const sceneSheet = ss.getSheetByName(SHEETS.SCENES);
  if (sceneSheet && sceneSheet.getLastRow() > 1) {
    const rows = sceneSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(jobId)) {
        sceneSheet.getRange(i + 1, SCENE_COL.STATUS).setValue("RENDERED");
      }
    }
  }

  // Save combined animation asset
  if (manimUrl) {
    _saveAssetLink(jobId, "MANIM_COMBINED", jobId + "_animation.mp4",
      manimUrl, null, null, "READY", "All Manim scenes combined");
  }

  _updateDashboard(jobId, {
    [DASH_COL.STAGE2_STATUS]: "DONE",
    [DASH_COL.STATUS]       : "STAGE3",
    [DASH_COL.STAGE3_STATUS]: "RUNNING",
    [DASH_COL.MANIM_URL]    : manimUrl,
  });

  SpreadsheetApp.flush();
}


// ── Publish Done: Final video assembled and uploaded to YouTube ──
// n8n sends: { action, job_id, youtube_url, final_video_url }
function _handlePublishDone(data) {
  const jobId         = data.job_id;
  const youtubeUrl    = data.youtube_url    || "";
  const finalVideoUrl = data.final_video_url || "";

  _log(jobId, "STAGE3", "SUCCESS", "Video published to YouTube: " + youtubeUrl);

  if (finalVideoUrl) {
    _saveAssetLink(jobId, "FINAL_VIDEO", jobId + "_final.mp4",
      finalVideoUrl, null, null, "READY", "Final assembled video");
  }
  if (youtubeUrl) {
    _saveAssetLink(jobId, "YOUTUBE_VIDEO", jobId + "_youtube",
      youtubeUrl, null, null, "LIVE", "YouTube published video");
  }

  _updateDashboard(jobId, {
    [DASH_COL.YOUTUBE_URL]  : youtubeUrl,
    [DASH_COL.STAGE3_STATUS]: "DONE",
    [DASH_COL.STATUS]       : "LIVE",
    [DASH_COL.COMPLETED_AT] : new Date().toISOString(),
  });

  // Set YouTube URL as clickable hyperlink in Dashboard
  if (youtubeUrl) {
    const sheet   = _getDashboardSheet();
    const lastRow = sheet.getLastRow();
    const rows    = sheet.getRange(4, DASH_COL.JOB_ID, lastRow - 3, 1).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(jobId)) {
        sheet.getRange(i + 4, DASH_COL.YOUTUBE_URL)
          .setFormula('=HYPERLINK("' + youtubeUrl + '","▶ Watch on YouTube")');
        break;
      }
    }
  }

  SpreadsheetApp.flush();

  // Send email notification
  if (CONFIG.NOTIFY_EMAIL) {
    try {
      GmailApp.sendEmail(
        CONFIG.NOTIFY_EMAIL,
        "✅ Physics Video Published: " + jobId,
        "Your physics video is now LIVE on YouTube!\n\n" +
        "Job ID: " + jobId + "\n" +
        "YouTube URL: " + youtubeUrl + "\n\n" +
        "🎬🚀"
      );
    } catch (e) {
      _log(jobId, "PIPELINE", "ERROR", "Email failed: " + e.toString());
    }
  }

  _log(jobId, "PIPELINE", "SUCCESS", "🎉 Pipeline complete! YouTube: " + youtubeUrl);
}


// ============================================================
//  SECTION 10 — WEB APP ENTRY POINT
//  n8n sends POST requests here with action= to report progress.
//  Also accepts GET for simple health checks.
// ============================================================

function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || "";

    if (action === "ping") {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString() })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      "Physics Channel Pipeline — Web App ready.\n" +
      "Send POST requests with action=stage1_done, stage2_done, or publish_done."
    );

  } catch (err) {
    Logger.log("doGet error: " + err.toString());
    return ContentService.createTextOutput("ERROR: " + err.toString());
  }
}


function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action || "";

    if (!body.job_id) {
      return ContentService.createTextOutput("ERROR: missing job_id in payload")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    if (action === "mark_in_progress") {
      _updateDashboard(body.job_id, {
        [DASH_COL.STATUS]       : "IN_PROGRESS",
        [DASH_COL.STAGE1_STATUS]: "RUNNING",
        [DASH_COL.CREATED_AT]   : new Date().toISOString()
      });
      _log(body.job_id, "STAGE1", "INFO", "Job picked — marked IN_PROGRESS");
      return ContentService.createTextOutput("OK — marked in_progress")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    if (action === "stage1_done") {
      _handleStage1Done(body);
      return ContentService.createTextOutput("OK — stage1_done processed")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    if (action === "stage2_done") {
      _handleStage2Done(body);
      return ContentService.createTextOutput("OK — stage2_done processed")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    if (action === "publish_done") {
      _handlePublishDone(body);
      return ContentService.createTextOutput("OK — publish_done processed")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    _log(body.job_id, "WEBHOOK", "ERROR", "Unknown action received: " + action);
    return ContentService.createTextOutput("ERROR: unknown action: " + action)
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    Logger.log("doPost error: " + err.toString());
    return ContentService.createTextOutput("ERROR: " + err.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}


// ============================================================
//  SECTION 11 — AUTO TRIGGER SETUP
// ============================================================

function _setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger("runPipeline")
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log("✅ Time trigger created: runPipeline every 5 minutes.");
}


// ============================================================
//  SECTION 12 — CUSTOM MENU + UTILITY FUNCTIONS
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🎬 Physics Pipeline")
    .addItem("▶  Run Pipeline Now",          "runPipeline")
    .addSeparator()
    .addItem("➕  Add Test Topic",             "addTestTopic")
    .addItem("🔍  View Assets for a Job",      "viewJobAssets")
    .addSeparator()
    .addItem("⚙️  Setup / Rebuild All Sheets", "setupEntireSheet")
    .addItem("🗑️  Clear All Data",             "clearAllData")
    .addToUi();
}


function addTestTopic() {
  const sheet   = _getDashboardSheet();
  const nextRow = Math.max(sheet.getLastRow() + 1, 4);
  sheet.getRange(nextRow, DASH_COL.TOPIC).setValue("Quantum Entanglement");
  sheet.getRange(nextRow, DASH_COL.DIFFICULTY).setValue("beginner");
  sheet.getRange(nextRow, DASH_COL.DURATION_MIN).setValue(10);
  sheet.getRange(nextRow, DASH_COL.STATUS).setValue("PENDING");
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    "✅ Test topic added!\n\n" +
    "Row " + nextRow + ": Quantum Entanglement\n\n" +
    "The pipeline will pick it up within 5 minutes automatically,\n" +
    "or run it now from the menu: ▶ Run Pipeline Now"
  );
}


function viewJobAssets() {
  const ui     = SpreadsheetApp.getUi();
  const result = ui.prompt("View Assets", "Enter Job ID (e.g. PHY-12345678):", ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;

  const jobId = result.getResponseText().trim();
  if (!jobId) return;

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.ASSETS);
  const data  = sheet.getDataRange().getValues();

  const lines = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === jobId) {
      lines.push(
        data[i][ASSET_COL.ASSET_TYPE - 1] + "\n" +
        (data[i][ASSET_COL.PUBLIC_URL - 1] || "(no URL yet)") + "\n" +
        "Status: " + data[i][ASSET_COL.STATUS - 1]
      );
    }
  }

  ui.alert(
    "Assets for " + jobId,
    lines.length > 0 ? lines.join("\n\n─────────────\n\n") : "No assets found for this Job ID.",
    ui.ButtonSet.OK
  );

  ss.setActiveSheet(sheet);
}


function clearAllData() {
  const ui      = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "⚠️ Clear ALL Data",
    "This will delete all job data from every tab.\nThis cannot be undone.\n\nAre you sure?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  Object.values(SHEETS).forEach(function(name) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  });

  // Dashboard keeps row 3 headers — also clear from row 4
  const dash = _getDashboardSheet();
  if (dash && dash.getLastRow() >= 4) {
    dash.getRange(4, 1, dash.getLastRow() - 3, dash.getLastColumn()).clearContent();
  }

  SpreadsheetApp.getUi().alert("✅ All data cleared. Tabs and headers are intact.");
}
