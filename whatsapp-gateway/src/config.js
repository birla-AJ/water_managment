require('dotenv').config();
const path = require('path');

function int(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }
function abs(p, fallback) {
  const v = p || fallback;
  return path.isAbsolute(v) ? v : path.join(__dirname, '..', v);
}

// Per-project API keys so ONE gateway can serve many projects, each scoped
// to its own numbers. Format: API_KEYS="school-erp:key1,dxmart:key2"
// Returns { <apiKey>: <projectName> }.
function parseKeys() {
  const map = {};
  (process.env.API_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((pair) => {
    const i = pair.indexOf(':');
    if (i > 0) {
      const project = pair.slice(0, i).trim();
      const key = pair.slice(i + 1).trim();
      if (project && key) map[key] = project;
    }
  });
  // legacy single-key support -> project "default"
  if (process.env.API_KEY && process.env.API_KEY !== 'change-me') map[process.env.API_KEY] = 'default';
  return map;
}

// project -> webhook URL for forwarding inbound messages to that app.
// Split on the FIRST '=' (URLs contain ':'). Format:
//   WEBHOOKS="school-erp=http://erp-host:5000/api/whatsapp-webhook/incoming"
function parseWebhooks() {
  const map = {};
  (process.env.WEBHOOKS || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > 0) { const p = pair.slice(0, i).trim(); const url = pair.slice(i + 1).trim(); if (p && url) map[p] = url; }
  });
  return map;
}

module.exports = {
  PORT: int(process.env.PORT, 4000),
  API_KEYS: parseKeys(),
  WEBHOOKS: parseWebhooks(),
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',

  DATA_DIR: abs(process.env.DATA_DIR, './data'),
  SESSIONS_DIR: abs(process.env.SESSIONS_DIR, './sessions'),

  SEND_MIN_DELAY_MS: int(process.env.SEND_MIN_DELAY_MS, 3000),
  SEND_MAX_DELAY_MS: int(process.env.SEND_MAX_DELAY_MS, 8000),

  ACTIVE_HOURS_START: int(process.env.ACTIVE_HOURS_START, 9),
  ACTIVE_HOURS_END: int(process.env.ACTIVE_HOURS_END, 20),
  TIMEZONE_OFFSET_MIN: int(process.env.TIMEZONE_OFFSET_MIN, 330),

  CHECK_ON_WHATSAPP: (process.env.CHECK_ON_WHATSAPP || 'true') === 'true',

  WARMUP_CAPS: (process.env.WARMUP_CAPS || '30,60,120,250,500,1000')
    .split(',').map((n) => int(n, 1000)),

  LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
};
