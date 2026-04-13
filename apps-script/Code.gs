// ============================================================
//  PHYSICS YOUTUBE CHANNEL — FULL PIPELINE APPS SCRIPT
//  Google Sheets Master Control Dashboard
//
//  HOW TO USE (READ THIS FIRST):
//  1. Open your Google Sheet (create a new one if needed)
//  2. Click Extensions → Apps Script
//  3. Delete ALL existing code in the editor
//  4. Paste this entire script
//  5. Save with Ctrl+S
//  6. Click Run → setupEntireSheet()
//  7. Grant all permissions when Google asks
//  8. All 6 tabs will be created automatically
//  9. Fill in your API keys in the CONFIG section below
// ============================================================


// ============================================================
//  SECTION 1 — YOUR API KEYS (FILL THESE IN)
// ============================================================

const CONFIG = {
  // Claude / Anthropic
  ANTHROPIC_API_KEY : "sk-ant-XXXXXXXXXXXXXXXXXXXXXXXX",
  ANTHROPIC_MODEL   : "claude-opus-4-20250514",

  // ElevenLabs
  ELEVENLABS_API_KEY : "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  ELEVENLABS_VOICE_ID: "21m00Tcm4TlvDq8ikWAM",

  // HeyGen
  HEYGEN_API_KEY  : "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  HEYGEN_AVATAR_ID: "YOUR_AVATAR_ID_HERE",

  // YouTube Data API v3
  YOUTUBE_CHANNEL_ID: "UCxxxxxxxxxxxxxxxxxxxxxxxx",

  // n8n Webhook URLs (your n8n server)
  N8N_STAGE2_WEBHOOK: "https://your-n8n.instance.com/webhook/stage2-render",
  N8N_STAGE3_WEBHOOK: "https://your-n8n.instance.com/webhook/stage3-publish",

  // Your Google Apps Script Web App URL
  // Fill this AFTER you deploy this script as a Web App
  WEBAPP_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",

  // Notification email
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

  // ── Safety check: must run from inside a Google Sheet ──
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("ERROR: No active spreadsheet found. Open your Google Sheet first.");
    return;
  }

  Logger.log("Setting up Physics Channel Dashboard...");

  // ── Create a temporary sheet so Google never runs out of sheets during deletion ──
  let tempSheet = ss.getSheetByName("__temp__");
  if (!tempSheet) {
    tempSheet = ss.insertSheet("__temp__");
  }
  SpreadsheetApp.flush();

  // ── Build all tabs one by one ──
  _setupDashboardSheet(ss);
  SpreadsheetApp.flush();

  _setupScriptsSheet(ss);
  SpreadsheetApp.flush();

  _setupScenesSheet(ss);
  SpreadsheetApp.flush();

  _setupManimSheet(ss);
  SpreadsheetApp.flush();

  _setupAssetsSheet(ss);
  SpreadsheetApp.flush();

  _setupLogsSheet(ss);
  SpreadsheetApp.flush();

  // ── Delete temp sheet now that all real sheets exist ──
  const temp = ss.getSheetByName("__temp__");
  if (temp) ss.deleteSheet(temp);

  // ── Set Dashboard as the active visible tab ──
  ss.setActiveSheet(ss.getSheetByName(SHEETS.DASHBOARD));

  // ── Set up the 5-minute auto trigger ──
  _setupTriggers();

  SpreadsheetApp.getUi().alert(
    "✅ Setup Complete!\n\n" +
    "Your Physics Channel Dashboard is ready.\n\n" +
    "Next steps:\n" +
    "1. Fill in your API keys in the CONFIG section of the script\n" +
    "2. Deploy this script as a Web App (Deploy → New Deployment)\n" +
    "3. Copy the Web App URL into CONFIG.WEBAPP_URL\n" +
    "4. Type a physics topic in column B of the Dashboard\n" +
    "5. Set difficulty in column C and duration in column D\n" +
    "6. The pipeline will run automatically within 5 minutes!\n\n" +
    "Good luck with your channel! 🚀"
  );
}


// ============================================================
//  SECTION 4 — TAB SETUP FUNCTIONS
// ============================================================

function _setupDashboardSheet(ss) {
  // Delete existing tab if it exists
  let sheet = ss.getSheetByName(SHEETS.DASHBOARD);
  if (sheet) ss.deleteSheet(sheet);

  // Insert fresh tab at position 0 (first tab)
  sheet = ss.insertSheet(SHEETS.DASHBOARD, 0);

  // ── Row 1: Title banner (merged across all 15 columns) ──
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

  // ── Row 2: Instructions banner ──
  sheet.getRange("A2:O2")
    .merge()
    .setValue("👉  Type your physics topic in column B  →  Set difficulty in C  →  Set duration in D  →  Pipeline runs automatically!")
    .setBackground("#16213e")
    .setFontColor("#a0a8d0")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 28);

  // ── Row 3: Column headers ──
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

  // ── Column widths ──
  const colWidths = [80, 220, 100, 70, 100, 90, 90, 90, 200, 180, 160, 160, 140, 140, 200];
  colWidths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  // ── Row 4: Sample placeholder row ──
  const sampleRow = [
    "—", "e.g. Quantum Entanglement", "beginner", "10",
    "PENDING", "—", "—", "—", "—", "—", "—", "—",
    "", "", "Replace this row with your real topic"
  ];
  sheet.getRange(4, 1, 1, sampleRow.length)
    .setValues([sampleRow])
    .setFontColor("#888888")
    .setFontStyle("italic");

  // ── Difficulty dropdown validation ──
  const diffRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["beginner", "intermediate", "advanced"], true)
    .build();
  sheet.getRange(4, DASH_COL.DIFFICULTY, 100, 1).setDataValidation(diffRule);

  // ── Status color formatting ──
  _applyStatusFormatting(sheet, DASH_COL.STATUS,        4, 100);
  _applyStatusFormatting(sheet, DASH_COL.STAGE1_STATUS, 4, 100);
  _applyStatusFormatting(sheet, DASH_COL.STAGE2_STATUS, 4, 100);
  _applyStatusFormatting(sheet, DASH_COL.STAGE3_STATUS, 4, 100);

  // ── Freeze only rows (NO frozen columns — causes merge conflict error) ──
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

  // Monospace font for the Python code column
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

  // Blue clickable style for URL column
  sheet.getRange("D2:D500")
    .setFontColor("#1155cc");

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

  // Merge with any existing rules
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

    // Insert new row at top (below header) so newest logs appear first
    logSheet.insertRowAfter(1);
    logSheet.getRange(2, 1, 1, 5).setValues([[
      new Date().toISOString(),
      jobId  || "—",
      stage  || "—",
      level  || "INFO",
      message
    ]]);

    // Color code by level
    if (level === "ERROR") {
      logSheet.getRange(2, 1, 1, 5)
        .setBackground("#f8d7da")
        .setFontColor("#721c24");
    } else if (level === "SUCCESS") {
      logSheet.getRange(2, 1, 1, 5)
        .setBackground("#d4edda")
        .setFontColor("#155724");
    } else if (level === "INFO") {
      logSheet.getRange(2, 1, 1, 5)
        .setBackground(null)
        .setFontColor(null);
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
  const sheet = _getDashboardSheet();
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

  // Make URL column a clickable hyperlink
  const lastRow = sheet.getLastRow();
  if (publicUrl && publicUrl.startsWith("http")) {
    const safeUrl   = publicUrl.replace(/"/g, '""');
    const safeLabel = assetType.replace(/"/g, '""');
    sheet.getRange(lastRow, ASSET_COL.PUBLIC_URL)
      .setFormula('=HYPERLINK("' + safeUrl + '","' + safeLabel + ' Link")');
  }
}

function _getOrCreateDriveFolder(path) {
  const parts = path.split("/");
  let folder = DriveApp.getRootFolder();
  parts.forEach(part => {
    const iter = folder.getFoldersByName(part);
    folder = iter.hasNext() ? iter.next() : folder.createFolder(part);
  });
  return folder;
}


// ============================================================
//  SECTION 8 — MAIN PIPELINE ENTRY POINT
//  Called automatically every 5 minutes by the time trigger.
//  Uses a script lock so only ONE topic runs at a time.
// ============================================================

function runPipeline() {
  // Acquire lock — prevents two triggers running at the same time
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(10000); // wait up to 10 seconds for the lock

  if (!acquired) {
    Logger.log("Pipeline already running — skipping this trigger fire.");
    return;
  }

  try {
    const sheet   = _getDashboardSheet();
    const lastRow = sheet.getLastRow();

    // Scan from row 4 downward for the first PENDING topic
    for (let row = 4; row <= lastRow; row++) {
      const status = sheet.getRange(row, DASH_COL.STATUS).getValue();
      const topic  = sheet.getRange(row, DASH_COL.TOPIC).getValue();

      // Skip placeholder sample row and any non-PENDING rows
      if (
        status === "PENDING" &&
        topic &&
        topic !== "e.g. Quantum Entanglement" &&
        topic !== "Replace this row with your real topic"
      ) {
        const jobId      = _generateJobId();
        const difficulty = sheet.getRange(row, DASH_COL.DIFFICULTY).getValue()   || "beginner";
        const duration   = sheet.getRange(row, DASH_COL.DURATION_MIN).getValue() || 10;

        // Mark immediately so next trigger does not pick it up again
        sheet.getRange(row, DASH_COL.JOB_ID).setValue(jobId);
        sheet.getRange(row, DASH_COL.STATUS).setValue("STAGE1");
        sheet.getRange(row, DASH_COL.STAGE1_STATUS).setValue("RUNNING");
        sheet.getRange(row, DASH_COL.CREATED_AT).setValue(new Date().toISOString());
        SpreadsheetApp.flush();

        _log(jobId, "PIPELINE", "INFO", 'Starting pipeline for topic: "' + topic + '"');

        try {
          _stage1_generateScript(jobId, row, topic, difficulty, duration);
        } catch (err) {
          _log(jobId, "STAGE1", "ERROR", err.toString());
          sheet.getRange(row, DASH_COL.STATUS).setValue("ERROR");
          sheet.getRange(row, DASH_COL.STAGE1_STATUS).setValue("ERROR");
          sheet.getRange(row, DASH_COL.NOTES).setValue("Stage 1 error: " + err.toString());
          SpreadsheetApp.flush();
        }

        return; // Process ONE job per trigger fire
      }
    }

    Logger.log("No PENDING jobs found — trigger exiting.");

  } finally {
    lock.releaseLock();
  }
}


// ============================================================
//  SECTION 9 — STAGE 1: SCRIPT GENERATION VIA CLAUDE API
// ============================================================

function _stage1_generateScript(jobId, dashRow, topic, difficulty, durationMin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _log(jobId, "STAGE1", "INFO", "Calling Claude API to generate full video script...");

  const prompt =
    'You are a world-class physics science communicator and Manim animation director. ' +
    'Your style blends 3Blue1Brown\'s visual precision with Kurzgesagt\'s sense of wonder. ' +
    'You make viewers feel curiosity and awe — not lectured at.\n\n' +
    'Generate a COMPLETE, production-ready YouTube video package for this topic:\n' +
    'TOPIC: ' + topic + '\n' +
    'DIFFICULTY: ' + difficulty + '\n' +
    'TARGET DURATION: ' + durationMin + ' minutes\n' +
    'REQUIRED SCENES: exactly 6 — each scene is exactly 5 seconds of Manim animation (30 seconds total animation)\n\n' +
    'NARRATION STYLE RULES (follow these precisely):\n' +
    '- Open with a visceral image, a paradox, or a shocking fact — NEVER with "In this video we will learn..."\n' +
    '- Write for curiosity and wonder, not explanation — every sentence should open a door, not close one\n' +
    '- Use second person ("you") to make it direct and personal\n' +
    '- Mix short punchy sentences for impact with longer flowing ones for building ideas\n' +
    '- Use em dashes — like this — for dramatic pauses; commas for natural speech rhythm\n' +
    '- Every sentence must be specific to THIS topic — nothing generic or interchangeable\n' +
    '- Mark scene transitions as [SCENE 2 BEGINS] etc. End with a wonder-evoking question, soft CTA last\n\n' +
    'SCENE ARC — use this 6-scene structure:\n' +
    '  Scene 1 (Hook): A shocking claim or counterintuitive image that demands attention\n' +
    '  Scene 2 (Setup): Build physical intuition — what the "normal" world looks like before the twist\n' +
    '  Scene 3 (Tension): Introduce the paradox or the breaking point — make the viewer genuinely puzzled\n' +
    '  Scene 4 (Physics): Reveal the core physics with visual proof — equations emerge from the story\n' +
    '  Scene 5 (Implications): What becomes possible or impossible because of this? Real-world connections\n' +
    '  Scene 6 (Wonder): End on a bigger open question — leave the viewer feeling reality is stranger and more beautiful\n\n' +
    'VISUAL DESCRIPTION RULES:\n' +
    '- Be specific and directorial: describe exactly what objects appear, how they move, what colors, what equations and when\n' +
    '- Each 5-second scene should have 2–3 distinct visual beats tightly timed to the narration\n' +
    '- Think in terms of: transforming equations, animated graphs, particle systems, wave functions, field lines\n\n' +
    'MANIM CODE RULES:\n' +
    '- Every scene must be a COMPLETE runnable Python class with "from manim import *" at the top\n' +
    '- Each scene is exactly 5 seconds: total self.wait() time must sum to approximately 5\n' +
    '- Include 2–3 distinct animation calls per scene (not just one Write + one wait)\n' +
    '- Use MathTex for equations, Axes or NumberPlane for graphs, always use vivid colors (BLUE, YELLOW, GREEN, RED, WHITE)\n' +
    '- Use smooth transforms: FadeIn, Write, Create, Transform, ReplacementTransform\n' +
    '- Scene class names must follow this pattern: Scene01_Hook, Scene02_Setup, Scene03_Tension, Scene04_Physics, Scene05_Implications, Scene06_Wonder\n' +
    '- Escape all quotes as \\" and all newlines as \\n inside the JSON string\n\n' +
    'Respond ONLY with valid JSON. No markdown. No code fences. No extra text. Pure JSON:\n\n' +
    '{\n' +
    '  "youtube_title": "string under 60 chars — curiosity-driven, not \'How X Works\' — e.g. \'The Quantum Trick That Breaks Reality\'",\n' +
    '  "youtube_description": "400+ word description. First 2 sentences are the hook (under 150 chars). Then expand. Include scene timestamps.",\n' +
    '  "tags": ["20 specific tags: topic keywords, audience search terms, related physics concepts"],\n' +
    '  "thumbnail_prompt": "Cinematic DALL-E prompt: one striking visual metaphor, high contrast, specify subject + lighting + color palette + style + emotional mood (curiosity + slight unease)",\n' +
    '  "total_scenes": 6,\n' +
    '  "word_count": 1400,\n' +
    '  "full_narration_script": "Complete word-for-word narration for all 6 scenes. Marked with [SCENE N BEGINS]. Written for spoken audio delivery via TTS.",\n' +
    '  "heygen_script": "Same narration with expression cues: [smile] [look serious] [raise eyebrow] [gesture left] [look at camera] [pause]. At least 2 cues per scene.",\n' +
    '  "scenes": [\n' +
    '    {\n' +
    '      "scene_number": 1,\n' +
    '      "scene_name": "Hook — [evocative 2-4 word title specific to this topic]",\n' +
    '      "time_start": "0:00",\n' +
    '      "time_end": "0:05",\n' +
    '      "duration_seconds": 5,\n' +
    '      "narration": "Narration text for this scene only — visceral, specific, wonder-evoking",\n' +
    '      "visual_description": "Precise directorial description: what objects appear, how they animate, what equations show, timing of each visual beat within 5 seconds",\n' +
    '      "manim_class": "Scene01_Hook",\n' +
    '      "manim_code": "from manim import *\\n\\nclass Scene01_Hook(Scene):\\n    def construct(self):\\n        question = Text(\\"What if space itself could stretch?\\", font_size=40, color=WHITE)\\n        self.play(Write(question), run_time=2)\\n        self.wait(1)\\n        self.play(question.animate.set_color(YELLOW).scale(1.2), run_time=1)\\n        self.wait(1)"\n' +
    '    },\n' +
    '    ... (repeat for all 6 scenes with scene_number 2 through 6)\n' +
    '  ]\n' +
    '}';

  const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type"    : "application/json",
      "x-api-key"       : CONFIG.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    payload: JSON.stringify({
      model     : CONFIG.ANTHROPIC_MODEL,
      max_tokens: 16000,
      messages  : [{ role: "user", content: prompt }]
    }),
    muteHttpExceptions: true
  });

  const respCode = response.getResponseCode();
  const respText = response.getContentText();

  if (respCode !== 200) {
    throw new Error("Claude API error " + respCode + ": " + respText);
  }

  const claudeData = JSON.parse(respText);
  const rawContent = claudeData.content[0].text.trim();

  // Parse the JSON Claude returned
  let videoData;
  try {
    videoData = JSON.parse(rawContent);
  } catch (parseErr) {
    // Try extracting JSON if Claude added any surrounding text
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (match) {
      videoData = JSON.parse(match[0]);
    } else {
      throw new Error("Could not parse Claude JSON response: " + rawContent.substring(0, 300));
    }
  }

  _log(jobId, "STAGE1", "INFO",
    "Claude returned " + videoData.total_scenes + " scenes, " + videoData.word_count + " words");

  // ── Save to Scripts tab ──
  const scriptSheet = ss.getSheetByName(SHEETS.SCRIPTS);
  scriptSheet.appendRow([
    jobId,
    topic,
    videoData.full_narration_script,
    videoData.heygen_script,
    videoData.youtube_title,
    videoData.youtube_description,
    (videoData.tags || []).join(", "),
    videoData.thumbnail_prompt,
    videoData.total_scenes,
    videoData.word_count,
    new Date().toISOString()
  ]);

  // ── Save scenes + Manim code ──
  const sceneSheet = ss.getSheetByName(SHEETS.SCENES);
  const manimSheet = ss.getSheetByName(SHEETS.MANIM);

  (videoData.scenes || []).forEach(function(scene) {
    sceneSheet.appendRow([
      jobId,
      scene.scene_number,
      scene.scene_name,
      scene.time_start,
      scene.time_end,
      scene.duration_seconds,
      scene.narration,
      scene.visual_description,
      scene.manim_class,
      "PENDING"
    ]);

    manimSheet.appendRow([
      jobId,
      scene.scene_number,
      scene.manim_class,
      scene.manim_code,
      "PENDING",
      "",
      ""
    ]);
  });

  SpreadsheetApp.flush();

  // ── Update Dashboard: Stage 1 done, move to Stage 2 ──
  _updateDashboard(jobId, {
    [DASH_COL.STAGE1_STATUS]: "DONE",
    [DASH_COL.STATUS]       : "STAGE2",
    [DASH_COL.STAGE2_STATUS]: "PENDING",
  });

  _log(jobId, "STAGE1", "SUCCESS",
    "Script generation complete — " + (videoData.scenes || []).length + " scenes saved.");

  // ── Automatically chain to Stage 2 ──
  _stage2_renderAssets(jobId, videoData);
}


// ============================================================
//  SECTION 10 — STAGE 2: ELEVENLABS + HEYGEN + MANIM
// ============================================================

function _stage2_renderAssets(jobId, videoData) {
  _log(jobId, "STAGE2", "INFO", "Starting Stage 2: ElevenLabs + HeyGen + Manim render...");
  _updateDashboard(jobId, {
    [DASH_COL.STATUS]       : "STAGE2",
    [DASH_COL.STAGE2_STATUS]: "RUNNING",
  });

  let elevenLabsUrl = "";
  let heygenUrl     = "";

  // ── ElevenLabs: generate voice audio ──
  try {
    _log(jobId, "STAGE2", "INFO", "Calling ElevenLabs API...");
    elevenLabsUrl = _callElevenLabs(jobId, videoData.full_narration_script);
    _log(jobId, "STAGE2", "SUCCESS", "ElevenLabs audio ready: " + elevenLabsUrl);
    _saveAssetLink(jobId, "ELEVENLABS_AUDIO", jobId + "_narration.mp3",
      elevenLabsUrl, null, null, "READY", "ElevenLabs voice narration");
    _updateDashboard(jobId, { [DASH_COL.ELEVENLABS_URL]: elevenLabsUrl });
  } catch (err) {
    _log(jobId, "STAGE2", "ERROR", "ElevenLabs failed: " + err.toString());
    _saveAssetLink(jobId, "ELEVENLABS_AUDIO", jobId + "_narration.mp3",
      "", null, null, "ERROR", err.toString());
  }

  // ── HeyGen: generate avatar video ──
  try {
    _log(jobId, "STAGE2", "INFO", "Calling HeyGen API...");
    const heygenVideoId = _callHeyGen(jobId, videoData.heygen_script);
    _log(jobId, "STAGE2", "INFO", "HeyGen video ID: " + heygenVideoId + " — polling...");
    heygenUrl = _pollHeyGenUntilDone(jobId, heygenVideoId);
    _log(jobId, "STAGE2", "SUCCESS", "HeyGen avatar ready: " + heygenUrl);
    _saveAssetLink(jobId, "HEYGEN_AVATAR", jobId + "_avatar.mp4",
      heygenUrl, null, null, "READY", "HeyGen AI avatar video");
    _updateDashboard(jobId, { [DASH_COL.HEYGEN_URL]: heygenUrl });
  } catch (err) {
    _log(jobId, "STAGE2", "ERROR", "HeyGen failed: " + err.toString());
    _saveAssetLink(jobId, "HEYGEN_AVATAR", jobId + "_avatar.mp4",
      "", null, null, "ERROR", err.toString());
  }

  // ── Manim: send all scene code to n8n for server-side rendering ──
  try {
    _log(jobId, "STAGE2", "INFO", "Collecting Manim scenes and sending to n8n...");

    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const manimSheet = ss.getSheetByName(SHEETS.MANIM);
    const manimData  = manimSheet.getDataRange().getValues();

    const scenes = [];
    for (let i = 1; i < manimData.length; i++) {
      if (String(manimData[i][0]) === String(jobId)) {
        scenes.push({
          scene_number: manimData[i][MANIM_COL.SCENE_NUMBER - 1],
          class_name  : manimData[i][MANIM_COL.CLASS_NAME   - 1],
          code        : manimData[i][MANIM_COL.PYTHON_CODE  - 1]
        });
      }
    }

    const n8nPayload = {
      job_id             : jobId,
      scenes             : scenes,
      elevenlabs_audio_url: elevenLabsUrl,
      heygen_avatar_url  : heygenUrl,
      callback_url       : CONFIG.WEBAPP_URL + "?action=manim_done"
    };

    const n8nResponse = UrlFetchApp.fetch(CONFIG.N8N_STAGE2_WEBHOOK, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(n8nPayload),
      muteHttpExceptions: true
    });

    _log(jobId, "STAGE2", "INFO",
      "Sent " + scenes.length + " Manim scenes to n8n. Response: " + n8nResponse.getResponseCode());
    _log(jobId, "STAGE2", "INFO",
      "Waiting for n8n to render Manim and call back...");

  } catch (err) {
    _log(jobId, "STAGE2", "ERROR", "Failed to send to n8n Stage 2 webhook: " + err.toString());
    _updateDashboard(jobId, {
      [DASH_COL.STAGE2_STATUS]: "ERROR",
      [DASH_COL.STATUS]       : "ERROR",
      [DASH_COL.NOTES]        : "Stage 2 n8n error: " + err.toString()
    });
  }
}


// ============================================================
//  SECTION 11 — ELEVENLABS API
// ============================================================

function _callElevenLabs(jobId, scriptText) {
  const url = "https://api.elevenlabs.io/v1/text-to-speech/" + CONFIG.ELEVENLABS_VOICE_ID;

  const response = UrlFetchApp.fetch(url, {
    method : "POST",
    headers: {
      "Accept"      : "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key"  : CONFIG.ELEVENLABS_API_KEY
    },
    payload: JSON.stringify({
      text        : scriptText,
      model_id    : "eleven_monolingual_v1",
      voice_settings: {
        stability       : 0.5,
        similarity_boost: 0.75,
        style           : 0.3,
        use_speaker_boost: true
      }
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("ElevenLabs error " + response.getResponseCode() + ": " + response.getContentText());
  }

  // Save MP3 to Google Drive and return public URL
  const blob   = response.getBlob().setName(jobId + "_narration.mp3");
  const folder = _getOrCreateDriveFolder("PhysicsChannel/" + jobId);
  const file   = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getDownloadUrl();
}


// ============================================================
//  SECTION 12 — HEYGEN API
// ============================================================

function _callHeyGen(jobId, scriptText) {
  const response = UrlFetchApp.fetch("https://api.heygen.com/v2/video/generate", {
    method : "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key"   : CONFIG.HEYGEN_API_KEY
    },
    payload: JSON.stringify({
      video_inputs: [{
        character: {
          type     : "avatar",
          avatar_id: CONFIG.HEYGEN_AVATAR_ID,
          avatar_style: "normal"
        },
        voice: {
          type      : "text",
          input_text: scriptText,
          speed     : 1.0
        },
        background: { type: "color", value: "#000000" }
      }],
      dimension  : { width: 1920, height: 1080 },
      aspect_ratio: "16:9",
      test       : false
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("HeyGen error " + response.getResponseCode() + ": " + response.getContentText());
  }

  const data = JSON.parse(response.getContentText());
  return data.data.video_id;
}


function _pollHeyGenUntilDone(jobId, videoId) {
  const maxAttempts = 80; // 80 × 15s = 20 minutes max
  for (let i = 0; i < maxAttempts; i++) {
    Utilities.sleep(15000); // wait 15 seconds between polls

    const response = UrlFetchApp.fetch(
      "https://api.heygen.com/v1/video_status.get?video_id=" + videoId,
      {
        method : "GET",
        headers: { "X-Api-Key": CONFIG.HEYGEN_API_KEY },
        muteHttpExceptions: true
      }
    );

    const data   = JSON.parse(response.getContentText());
    const status = data.data.status;

    _log(jobId, "STAGE2", "INFO",
      "HeyGen poll " + (i + 1) + "/" + maxAttempts + ": status = " + status);

    if (status === "completed") {
      return data.data.video_url; // public HeyGen video URL
    } else if (status === "failed") {
      throw new Error("HeyGen failed: " + JSON.stringify(data.data.error));
    }
  }
  throw new Error("HeyGen timed out after 20 minutes");
}


// ============================================================
//  SECTION 13 — N8N CALLBACK: MANIM DONE → TRIGGER STAGE 3
// ============================================================

function _handleManimDone(params) {
  const jobId           = params.job_id;
  const manimCombinedUrl = params.manim_combined_url || params.manim_video_url || "";
  const sceneUrlsRaw    = params.scene_urls || "[]";
  const renderTimeSec   = params.render_time_seconds || "";

  _log(jobId, "STAGE2", "SUCCESS", "Manim render complete! Combined URL: " + manimCombinedUrl);

  // Parse scene URLs array
  let sceneUrls = [];
  try {
    sceneUrls = JSON.parse(sceneUrlsRaw);
  } catch (e) {
    _log(jobId, "STAGE2", "ERROR", "Could not parse scene_urls: " + sceneUrlsRaw);
  }

  // Save each individual scene URL to Assets tab
  sceneUrls.forEach(function(url, idx) {
    _saveAssetLink(
      jobId, "MANIM_SCENE_" + (idx + 1),
      jobId + "_scene" + (idx + 1) + ".mp4",
      url, null, null, "READY",
      "Manim scene " + (idx + 1)
    );
  });

  // Save the combined animation video URL
  _saveAssetLink(jobId, "MANIM_COMBINED", jobId + "_animation.mp4",
    manimCombinedUrl, null, null, "READY", "All scenes concatenated");

  // Update Dashboard Manim URL column
  _updateDashboard(jobId, { [DASH_COL.MANIM_URL]: manimCombinedUrl });

  // Update Manim tab statuses
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const manimSheet = ss.getSheetByName(SHEETS.MANIM);
  const data       = manimSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(jobId)) {
      manimSheet.getRange(i + 1, MANIM_COL.RENDER_STATUS).setValue("RENDERED");
      if (renderTimeSec) {
        manimSheet.getRange(i + 1, MANIM_COL.RENDER_TIME_S).setValue(renderTimeSec);
      }
      const sceneIdx = data[i][MANIM_COL.SCENE_NUMBER - 1] - 1;
      if (sceneUrls[sceneIdx]) {
        manimSheet.getRange(i + 1, MANIM_COL.OUTPUT_FILE).setValue(sceneUrls[sceneIdx]);
      }
    }
  }
  SpreadsheetApp.flush();

  // Update Dashboard: Stage 2 done → Stage 3 starts
  _updateDashboard(jobId, {
    [DASH_COL.STAGE2_STATUS]: "DONE",
    [DASH_COL.STATUS]       : "STAGE3",
    [DASH_COL.STAGE3_STATUS]: "PENDING",
  });

  _log(jobId, "STAGE2", "SUCCESS", "Stage 2 complete. Chaining to Stage 3...");

  // Automatically chain to Stage 3
  _stage3_assembleAndPublish(jobId, manimCombinedUrl);
}


// ============================================================
//  SECTION 14 — STAGE 3: ASSEMBLE + PUBLISH TO YOUTUBE
// ============================================================

function _stage3_assembleAndPublish(jobId, manimVideoUrl) {
  _log(jobId, "STAGE3", "INFO", "Starting Stage 3: FFmpeg assembly + YouTube upload...");
  _updateDashboard(jobId, {
    [DASH_COL.STATUS]       : "STAGE3",
    [DASH_COL.STAGE3_STATUS]: "RUNNING",
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Read ElevenLabs + HeyGen URLs from Assets tab ──
  const assetSheet = ss.getSheetByName(SHEETS.ASSETS);
  const assetData  = assetSheet.getDataRange().getValues();
  let elevenLabsUrl = "";
  let heygenUrl     = "";

  for (let i = 1; i < assetData.length; i++) {
    if (String(assetData[i][0]) === String(jobId)) {
      if (assetData[i][ASSET_COL.ASSET_TYPE - 1] === "ELEVENLABS_AUDIO") {
        elevenLabsUrl = assetData[i][ASSET_COL.PUBLIC_URL - 1];
      }
      if (assetData[i][ASSET_COL.ASSET_TYPE - 1] === "HEYGEN_AVATAR") {
        heygenUrl = assetData[i][ASSET_COL.PUBLIC_URL - 1];
      }
    }
  }

  // ── Read YouTube metadata from Scripts tab ──
  const scriptSheet = ss.getSheetByName(SHEETS.SCRIPTS);
  const scriptData  = scriptSheet.getDataRange().getValues();
  let ytTitle = "";
  let ytDesc  = "";
  let ytTags  = "";

  for (let i = 1; i < scriptData.length; i++) {
    if (String(scriptData[i][0]) === String(jobId)) {
      ytTitle = scriptData[i][SCRIPT_COL.VIDEO_TITLE  - 1];
      ytDesc  = scriptData[i][SCRIPT_COL.DESCRIPTION  - 1];
      ytTags  = scriptData[i][SCRIPT_COL.TAGS         - 1];
      break;
    }
  }

  // ── Send to n8n Stage 3 webhook ──
  const n8nPayload = {
    job_id               : jobId,
    manim_video_url      : manimVideoUrl,
    elevenlabs_audio_url : elevenLabsUrl,
    heygen_avatar_url    : heygenUrl,
    youtube_title        : ytTitle,
    youtube_description  : ytDesc,
    youtube_tags         : ytTags.split(",").map(function(t) { return t.trim(); }),
    youtube_channel_id   : CONFIG.YOUTUBE_CHANNEL_ID,
    callback_url         : CONFIG.WEBAPP_URL + "?action=publish_done"
  };

  try {
    const n8nResponse = UrlFetchApp.fetch(CONFIG.N8N_STAGE3_WEBHOOK, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(n8nPayload),
      muteHttpExceptions: true
    });
    _log(jobId, "STAGE3", "INFO",
      "Sent to n8n Stage 3 webhook. Response: " + n8nResponse.getResponseCode());
    _log(jobId, "STAGE3", "INFO",
      "Waiting for n8n to assemble video + upload to YouTube...");
  } catch (err) {
    _log(jobId, "STAGE3", "ERROR", "n8n Stage 3 webhook failed: " + err.toString());
    _updateDashboard(jobId, {
      [DASH_COL.STAGE3_STATUS]: "ERROR",
      [DASH_COL.STATUS]       : "ERROR",
      [DASH_COL.NOTES]        : "Stage 3 error: " + err.toString()
    });
  }
}


// ============================================================
//  SECTION 15 — N8N CALLBACK: PUBLISH DONE → MARK LIVE
// ============================================================

function _handlePublishDone(params) {
  const jobId        = params.job_id;
  const youtubeUrl   = params.youtube_url    || "";
  const finalVideoUrl = params.final_video_url || "";

  _log(jobId, "STAGE3", "SUCCESS", "Video published to YouTube: " + youtubeUrl);

  // Save final assembled video URL
  if (finalVideoUrl) {
    _saveAssetLink(jobId, "FINAL_VIDEO", jobId + "_final.mp4",
      finalVideoUrl, null, null, "READY", "Final assembled video");
  }

  // Save YouTube URL
  if (youtubeUrl) {
    _saveAssetLink(jobId, "YOUTUBE_VIDEO", jobId + "_youtube",
      youtubeUrl, null, null, "LIVE", "YouTube published video");
  }

  // Update Dashboard
  _updateDashboard(jobId, {
    [DASH_COL.YOUTUBE_URL]  : youtubeUrl,
    [DASH_COL.STAGE3_STATUS]: "DONE",
    [DASH_COL.STATUS]       : "LIVE",
    [DASH_COL.COMPLETED_AT] : new Date().toISOString(),
  });

  // Set YouTube URL as a clickable hyperlink in the Dashboard
  if (youtubeUrl) {
    const sheet   = _getDashboardSheet();
    const lastRow = sheet.getLastRow();
    const data    = sheet.getRange(4, DASH_COL.JOB_ID, lastRow - 3, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(jobId)) {
        sheet.getRange(i + 4, DASH_COL.YOUTUBE_URL)
          .setFormula('=HYPERLINK("' + youtubeUrl + '","▶ Watch on YouTube")');
        break;
      }
    }
  }

  SpreadsheetApp.flush();

  // Send completion email notification
  if (CONFIG.NOTIFY_EMAIL) {
    try {
      GmailApp.sendEmail(
        CONFIG.NOTIFY_EMAIL,
        "✅ Physics Video Published: " + jobId,
        "Your physics video is now LIVE on YouTube!\n\n" +
        "Job ID: " + jobId + "\n" +
        "YouTube URL: " + youtubeUrl + "\n\n" +
        "Great work! 🎬🚀"
      );
    } catch (emailErr) {
      _log(jobId, "PIPELINE", "ERROR", "Email notification failed: " + emailErr.toString());
    }
  }

  _log(jobId, "PIPELINE", "SUCCESS", "🎉 Pipeline complete! YouTube: " + youtubeUrl);
}


// ============================================================
//  SECTION 16 — WEB APP ENTRY POINT (receives n8n callbacks)
// ============================================================

function doGet(e) {
  try {
    const action = e.parameter.action || "";

    if (action === "manim_done") {
      _handleManimDone(e.parameter);
      return ContentService.createTextOutput("OK — manim_done processed");
    }

    if (action === "publish_done") {
      _handlePublishDone(e.parameter);
      return ContentService.createTextOutput("OK — publish_done processed");
    }

    return ContentService.createTextOutput("Physics Channel Pipeline — Ready. Use action= parameter.");

  } catch (err) {
    Logger.log("doGet error: " + err.toString());
    return ContentService.createTextOutput("ERROR: " + err.toString());
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action || e.parameter.action || "";

    if (action === "manim_done") {
      _handleManimDone(body);
      return ContentService.createTextOutput("OK — manim_done processed");
    }

    if (action === "publish_done") {
      _handlePublishDone(body);
      return ContentService.createTextOutput("OK — publish_done processed");
    }

    return ContentService.createTextOutput("Unknown action: " + action);

  } catch (err) {
    Logger.log("doPost error: " + err.toString());
    return ContentService.createTextOutput("ERROR: " + err.toString());
  }
}


// ============================================================
//  SECTION 17 — AUTO TRIGGER SETUP
// ============================================================

function _setupTriggers() {
  // Delete ALL existing triggers first
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  // Create ONE trigger: runPipeline fires every 5 minutes
  ScriptApp.newTrigger("runPipeline")
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log("✅ Time trigger created: runPipeline every 5 minutes.");
}


// ============================================================
//  SECTION 18 — CUSTOM MENU + UTILITY FUNCTIONS
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
    "or you can run it now from the menu: ▶ Run Pipeline Now"
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

  // Switch to Assets tab so they can see it
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

  SpreadsheetApp.getUi().alert("✅ All data cleared. Tabs and headers are intact.");
}