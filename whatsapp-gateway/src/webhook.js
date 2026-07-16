/**
 * Forwards inbound WhatsApp messages to each project's app (fire-and-forget).
 * The app processes the message (its bot logic) and replies by calling /send.
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { WEBHOOKS, WEBHOOK_SECRET } = require('./config');
const logger = require('./logger');

function postJson(urlStr, body, headers = {}) {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const lib = u.protocol === 'https:' ? https : http;
      const data = JSON.stringify(body);
      const req = lib.request(u, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data), ...headers },
        timeout: 10000,
      }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', (e) => { logger.warn({ err: e.message }, 'webhook post failed'); resolve(null); });
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(data); req.end();
    } catch (e) { logger.warn({ err: e.message }, 'webhook bad url'); resolve(null); }
  });
}

// project -> url, send the inbound payload. No-op if the project has no webhook.
function forwardIncoming(project, payload) {
  const url = WEBHOOKS[project];
  if (!url) { logger.warn({ project }, 'DIAG no webhook url for project'); return; }
  postJson(url, payload, WEBHOOK_SECRET ? { 'x-webhook-secret': WEBHOOK_SECRET } : {})
    .then((code) => logger.warn({ project, url, code }, 'DIAG webhook post result'));
}

module.exports = { forwardIncoming };
