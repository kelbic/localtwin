/**
 * LocalTwin Gate-0 — Google Apps Script Event Collector & Telegram Notifier
 *
 * Required Script Properties (Project Settings -> Script Properties):
 *   - TG_BOT_TOKEN : Telegram Bot API token
 *   - TG_CHAT_ID   : Telegram chat or channel ID
 */

const SHEET_HEADERS = [
  "timestamp",
  "event_type",
  "utm_source",
  "selected_format",
  "email",
  "payment_status",
  "tx_hash_or_note"
];

const TELEGRAM_ALERT_EVENTS = {
  lead_submit: true,
  crypto_tx: true,
  invoice_intent: true
};

/**
 * Healthcheck endpoint (optional browser check after Web App deployment).
 */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "LocalTwin Gate-0 Collector" }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main POST handler: logs JSON events to the active Google Sheet
 * and dispatches Telegram alerts for high-intent lead/payment events.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (parseErr) {
      return jsonResponse({ ok: false, error: "Invalid JSON payload" });
    }

    const rowData = {
      timestamp: sanitizeCell(data.timestamp || new Date().toISOString()),
      event_type: sanitizeCell(data.event_type || "unknown"),
      utm_source: sanitizeCell(data.utm_source || "direct"),
      selected_format: sanitizeCell(data.selected_format || ""),
      email: sanitizeCell(data.email || ""),
      payment_status: sanitizeCell(data.payment_status || ""),
      tx_hash_or_note: sanitizeCell(data.tx_hash_or_note || "")
    };

    appendEventRow(rowData);

    if (TELEGRAM_ALERT_EVENTS[rowData.event_type]) {
      sendTelegramAlert(rowData);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("doPost error:", err);
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseErr) {
      // Ignore lock release errors
    }
  }
}

/**
 * Appends a row to the active sheet, creating headers automatically if empty.
 */
function appendEventRow(rowData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    rowData.timestamp,
    rowData.event_type,
    rowData.utm_source,
    rowData.selected_format,
    rowData.email,
    rowData.payment_status,
    rowData.tx_hash_or_note
  ]);
}

/**
 * Sends a Telegram notification using credentials stored strictly in Script Properties.
 */
function sendTelegramAlert(rowData) {
  const props = PropertiesService.getScriptProperties();
  const botToken = props.getProperty("TG_BOT_TOKEN");
  const chatId = props.getProperty("TG_CHAT_ID");

  if (!botToken || !chatId) {
    console.warn("Telegram alert skipped: TG_BOT_TOKEN or TG_CHAT_ID not set in Script Properties.");
    return;
  }

  const labelMap = {
    lead_submit: "NEW LEAD (Spot Reserved)",
    crypto_tx: "CRYPTO TX SUBMITTED ($39)",
    invoice_intent: "CARD / INVOICE REQUESTED ($39)"
  };

  const title = labelMap[rowData.event_type] || rowData.event_type;
  const lines = [
    "LocalTwin Gate-0 — " + title,
    "Event: " + rowData.event_type,
    "Email: " + (rowData.email || "-"),
    "Format: " + (rowData.selected_format || "-"),
    "UTM: " + (rowData.utm_source || "direct"),
    "Status: " + (rowData.payment_status || "-"),
    "Tx / Note: " + (rowData.tx_hash_or_note || "-"),
    "Time: " + rowData.timestamp
  ];

  const url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
  const payload = {
    chat_id: chatId,
    text: lines.join("\n"),
    disable_web_page_preview: true
  };

  try {
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (tgErr) {
    console.error("Telegram send error:", tgErr);
  }
}

/**
 * Prevents formula injection in Sheets cells and normalizes strings.
 */
function sanitizeCell(value) {
  const str = String(value == null ? "" : value).trim();
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
