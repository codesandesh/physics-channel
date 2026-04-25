/**
 * QPC Image Post Queue — Google Apps Script
 * Run setupImagePostQueue() once to create the sheet.
 * The n8n workflow reads PENDING rows and updates status/post IDs.
 *
 * Sheet name: "Image Post Queue"
 * Columns: A=ID, B=Topic, C=Custom Headline, D=Status,
 *          E=Scheduled Date, F=Generated Headline, G=Drive File ID,
 *          H=Drive URL, I=Facebook Post ID, J=LinkedIn Post ID,
 *          K=Created At, L=Published At, M=Notes
 */

const SHEET_NAME = "Image Post Queue";

const COLS = {
  ID:               1,
  TOPIC:            2,
  CUSTOM_HEADLINE:  3,
  STATUS:           4,
  SCHEDULED_DATE:   5,
  GENERATED_HEADLINE: 6,
  DRIVE_FILE_ID:    7,
  DRIVE_URL:        8,
  FACEBOOK_POST_ID: 9,
  LINKEDIN_POST_ID: 10,
  CREATED_AT:       11,
  PUBLISHED_AT:     12,
  NOTES:            13
};

const HEADERS = [
  "ID", "Topic", "Custom Headline", "Status", "Scheduled Date",
  "Generated Headline", "Drive File ID", "Drive URL",
  "Facebook Post ID", "LinkedIn Post ID",
  "Created At", "Published At", "Notes"
];

const STATUS_COLORS = {
  PENDING:    "#FFF9C4",  // yellow
  PROCESSING: "#FFF3E0",  // orange-light
  PUBLISHED:  "#E8F5E9",  // green
  FAILED:     "#FFEBEE"   // red
};

// ── Main setup function ─────────────────────────────────────────
function setupImagePostQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (sheet) {
    const ui = SpreadsheetApp.getUi();
    const resp = ui.alert(
      "Sheet already exists",
      `"${SHEET_NAME}" already exists. Re-create it? (All data will be lost)`,
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;
    ss.deleteSheet(sheet);
  }

  sheet = ss.insertSheet(SHEET_NAME);

  // ── Header row ──────────────────────────────────────────────
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground("#1A237E")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setFontSize(11);
  sheet.setFrozenRows(1);

  // ── Column widths ────────────────────────────────────────────
  sheet.setColumnWidth(COLS.ID,                60);
  sheet.setColumnWidth(COLS.TOPIC,             280);
  sheet.setColumnWidth(COLS.CUSTOM_HEADLINE,   220);
  sheet.setColumnWidth(COLS.STATUS,            110);
  sheet.setColumnWidth(COLS.SCHEDULED_DATE,    130);
  sheet.setColumnWidth(COLS.GENERATED_HEADLINE,260);
  sheet.setColumnWidth(COLS.DRIVE_FILE_ID,     200);
  sheet.setColumnWidth(COLS.DRIVE_URL,         200);
  sheet.setColumnWidth(COLS.FACEBOOK_POST_ID,  160);
  sheet.setColumnWidth(COLS.LINKEDIN_POST_ID,  160);
  sheet.setColumnWidth(COLS.CREATED_AT,        160);
  sheet.setColumnWidth(COLS.PUBLISHED_AT,      160);
  sheet.setColumnWidth(COLS.NOTES,             220);

  // ── Status data-validation dropdown (rows 2-1000) ───────────
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["PENDING", "PROCESSING", "PUBLISHED", "FAILED"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, COLS.STATUS, 999).setDataValidation(statusRule);

  // ── Conditional formatting for Status column ─────────────────
  const statusColA1 = `D2:D1000`;
  const rules = [];
  for (const [status, color] of Object.entries(STATUS_COLORS)) {
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(status)
      .setBackground(color)
      .setRanges([sheet.getRange(statusColA1)])
      .build();
    rules.push(rule);
  }
  sheet.setConditionalFormatRules(rules);

  // ── Add 5 sample PENDING topics ─────────────────────────────
  const now = new Date().toISOString();
  const samples = [
    ["QPC-001", "Quantum entanglement and spooky action at a distance", "", "PENDING", "", "", "", "", "", "", now, "", ""],
    ["QPC-002", "The double-slit experiment and wave-particle duality",   "", "PENDING", "", "", "", "", "", "", now, "", ""],
    ["QPC-003", "Schrödinger's cat thought experiment explained",          "", "PENDING", "", "", "", "", "", "", now, "", ""],
    ["QPC-004", "Heisenberg uncertainty principle in everyday life",       "", "PENDING", "", "", "", "", "", "", now, "", ""],
    ["QPC-005", "Quantum tunneling and how it powers the sun",             "", "PENDING", "", "", "", "", "", "", now, "", ""],
  ];
  sheet.getRange(2, 1, samples.length, HEADERS.length).setValues(samples);

  // Wrap text in Topic/Notes columns, left-align dates
  sheet.getRange(2, COLS.TOPIC, 999).setWrap(true);
  sheet.getRange(2, COLS.NOTES, 999).setWrap(true);
  sheet.getRange(2, COLS.CREATED_AT,  999).setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange(2, COLS.PUBLISHED_AT, 999).setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange(2, COLS.SCHEDULED_DATE, 999).setNumberFormat("yyyy-mm-dd");

  // ── Custom menu ──────────────────────────────────────────────
  addCustomMenu_();

  SpreadsheetApp.getUi().alert(
    "✅ Setup complete",
    `"${SHEET_NAME}" created with ${samples.length} sample topics.\n\n` +
    `Copy the Spreadsheet ID from the URL and add it to:\n` +
    `  .env  →  GOOGLE_SHEET_ID_IMAGE_POSTS=<id>\n` +
    `  docker-compose.yml  →  - GOOGLE_SHEET_ID_IMAGE_POSTS=\${GOOGLE_SHEET_ID_IMAGE_POSTS}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ── Add menu on open ─────────────────────────────────────────────
function onOpen() {
  addCustomMenu_();
}

function addCustomMenu_() {
  SpreadsheetApp.getUi()
    .createMenu("📸 QPC Image Queue")
    .addItem("Setup / Reset Sheet", "setupImagePostQueue")
    .addSeparator()
    .addItem("Add New Topic", "addNewTopic")
    .addItem("Reset PROCESSING → PENDING", "resetStuckRows")
    .addSeparator()
    .addItem("Show Sheet ID", "showSheetId")
    .addToUi();
}

// ── Helper: Add new topic via dialog ────────────────────────────
function addNewTopic() {
  const ui = SpreadsheetApp.getUi();
  const topicResp = ui.prompt("Add Topic", "Enter the physics topic:", ui.ButtonSet.OK_CANCEL);
  if (topicResp.getSelectedButton() !== ui.Button.OK) return;
  const topic = topicResp.getResponseText().trim();
  if (!topic) return;

  const headlineResp = ui.prompt(
    "Custom Headline (optional)",
    "Leave blank to let AI generate one:",
    ui.ButtonSet.OK_CANCEL
  );
  const customHeadline = headlineResp.getSelectedButton() === ui.Button.OK
    ? headlineResp.getResponseText().trim() : "";

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = Math.max(sheet.getLastRow(), 1);

  // Auto-increment ID
  let nextNum = 1;
  if (lastRow > 1) {
    const ids = sheet.getRange(2, COLS.ID, lastRow - 1).getValues().flat()
      .filter(v => String(v).startsWith("QPC-"))
      .map(v => parseInt(String(v).replace("QPC-", ""), 10))
      .filter(n => !isNaN(n));
    if (ids.length) nextNum = Math.max(...ids) + 1;
  }
  const id = `QPC-${String(nextNum).padStart(3, "0")}`;
  const now = new Date().toISOString();

  const row = new Array(HEADERS.length).fill("");
  row[COLS.ID - 1]              = id;
  row[COLS.TOPIC - 1]           = topic;
  row[COLS.CUSTOM_HEADLINE - 1] = customHeadline;
  row[COLS.STATUS - 1]          = "PENDING";
  row[COLS.CREATED_AT - 1]      = now;

  sheet.appendRow(row);
  ui.alert("✅ Added", `Topic "${id}" added as PENDING.`, ui.ButtonSet.OK);
}

// ── Helper: Reset stuck PROCESSING rows back to PENDING ─────────
function resetStuckRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  let reset = 0;
  for (let r = 1; r < data.length; r++) {
    if (data[r][COLS.STATUS - 1] === "PROCESSING") {
      sheet.getRange(r + 1, COLS.STATUS).setValue("PENDING");
      sheet.getRange(r + 1, COLS.NOTES).setValue(
        `[Reset from PROCESSING on ${new Date().toISOString()}] ${data[r][COLS.NOTES - 1]}`
      );
      reset++;
    }
  }
  SpreadsheetApp.getUi().alert(`Reset ${reset} PROCESSING row(s) back to PENDING.`);
}

// ── Helper: Show Spreadsheet ID ──────────────────────────────────
function showSheetId() {
  const id = SpreadsheetApp.getActiveSpreadsheet().getId();
  SpreadsheetApp.getUi().alert(
    "Spreadsheet ID",
    `${id}\n\nAdd this to .env as:\nGOOGLE_SHEET_ID_IMAGE_POSTS=${id}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
