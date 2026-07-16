/**
 * Holds the live whatsapp-web.js clients (one per account/number) in a map.
 * Each account links via QR and its session is persisted by LocalAuth so
 * restarts don't need a re-scan.
 *
 * whatsapp-web.js drives a REAL headless Chrome running WhatsApp Web, so the
 * crypto is handled by WhatsApp's own client — no libsignal "Bad MAC" decrypt
 * errors like Baileys. Trade-off: ~300-400MB RAM per session (Chrome), so the
 * Chrome flags below are tuned for a small (1GB) box and only ONE number.
 *
 * Public interface is UNCHANGED from the Baileys version so routes/safeSender/
 * webhook keep working:
 *   startAccount, getStatus, isConnected, sendText, sendMedia,
 *   existsOnWhatsApp, logout, restoreAll
 */
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const { SESSIONS_DIR } = require('./config');
const logger = require('./logger');
const store = require('./store');
const webhook = require('./webhook');

// accountId -> { client, status, qr }
const live = new Map();
// de-dup incoming message ids so we never reply twice
const seenMessageIds = new Set();

// Callers pass fully-qualified numbers (with country code); the gateway stays
// project-agnostic and does not assume any country.
function toWid(number) { return `${store.onlyDigits(number)}@c.us`; }

// Map a @lid jid (WhatsApp's privacy id) to the real phone number via the
// WhatsApp Web internal store's lid<->pn cache — the same mapping Baileys and
// wppconnect use. whatsapp-web.js doesn't expose it (getContact() returns the
// lid), so we reach into window.Store. Returns digits ("9198...") or null.
async function resolveLidToPhone(client, lidJid) {
  try {
    if (typeof client.getContactLidAndPhone === 'function') {
      const [r] = await client.getContactLidAndPhone([lidJid]);
      if (r?.pn) return store.onlyDigits(r.pn);
    }
  } catch { /* fall through to the raw store */ }
  try {
    const pn = await client.pupPage.evaluate((jid) => {
      try {
        const wid = window.Store.WidFactory.createWid(jid);
        const phone = window.Store.LidUtils.getPhoneNumber(wid);
        return phone ? phone._serialized : null;
      } catch (e) { return null; }
    }, lidJid);
    if (pn) return store.onlyDigits(pn);
  } catch { /* give up — caller falls back to the raw id */ }
  return null;
}

// Memory-tuned Chrome args for a constrained (1GB) VM. --disable-dev-shm-usage
// avoids the tiny /dev/shm on cloud boxes. NOTE: --single-process / --no-zygote
// shrink Chrome further but break whatsapp-web.js ("Requesting main frame too
// early!"), so they are intentionally NOT used; the swap covers the extra RAM.
// CHROME_PATH env points at a system chromium (apt install chromium).
function puppeteerOpts() {
  const opts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--no-first-run',
      '--renderer-process-limit=1',
    ],
  };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  return opts;
}

async function startAccount(accountId) {
  const existing = live.get(accountId);
  if (existing && ['connecting', 'qr', 'connected'].includes(existing.status)) return existing;

  const clientOpts = {
    authStrategy: new LocalAuth({ clientId: accountId, dataPath: SESSIONS_DIR }),
    puppeteer: puppeteerOpts(),
    takeoverOnConflict: true,   // win the web session if the number is also open elsewhere
    takeoverTimeoutMs: 10000,
  };
  // Optionally pin WhatsApp Web to a known version (WWEB_VERSION). Set
  // WWEB_VERSION=none to use the library's default served version (helps with
  // "pairs then immediately logs out", which a pinned/mismatched version can
  // trigger). With no pin, whatsapp-web.js uses the version it's built for.
  const pinVersion = process.env.WWEB_VERSION;
  if (pinVersion && !['none', 'off', 'default'].includes(pinVersion.toLowerCase())) {
    clientOpts.webVersion = pinVersion;
    clientOpts.webVersionCache = {
      type: 'remote',
      remotePath: process.env.WWEB_REMOTE
        || `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${pinVersion}.html`,
    };
  }
  const client = new Client(clientOpts);

  const entry = { client, status: 'connecting', qr: null };
  live.set(accountId, entry);

  client.on('qr', (qr) => {
    entry.qr = qr; entry.status = 'qr';
    store.setAccountStatus(accountId, 'qr');
  });

  client.on('ready', () => {
    entry.qr = null; entry.status = 'connected';
    store.setAccountStatus(accountId, 'connected');
    logger.info({ accountId }, 'whatsapp connected');
  });

  client.on('auth_failure', (msg) => {
    entry.status = 'logged_out';
    store.setAccountStatus(accountId, 'logged_out');
    logger.error({ accountId, msg }, 'auth failure — needs re-scan');
  });

  client.on('disconnected', (reason) => {
    logger.warn({ accountId, reason }, 'disconnected');
    try { client.destroy(); } catch { /* ignore */ }
    live.delete(accountId);
    if (String(reason).toUpperCase().includes('LOGOUT')) {
      entry.status = 'logged_out';
      store.setAccountStatus(accountId, 'logged_out');
    } else {
      // transient drop -> rebuild a fresh client (LocalAuth session persists)
      setTimeout(() => startAccount(accountId).catch((e) => logger.error(e, 'reconnect failed')), 2000);
    }
  });

  // Incoming -> auto opt-out + forward to the project's webhook (its bot logic).
  // whatsapp-web.js fires 'message' only for NEW inbound messages (own messages
  // come via 'message_create'), so no history-replay handling is needed; we keep
  // a recent-timestamp guard + de-dup by id as belt-and-braces.
  client.on('message', async (msg) => {
    try {
      const account = store.getAccount(accountId);
      if (!account) return;
      const from = msg.from || '';
      // Accept individual chats: @c.us (classic) or @lid (WhatsApp's newer id).
      if (!from.endsWith('@c.us') && !from.endsWith('@lid')) return; // skip groups/status/broadcast
      const text = (msg.body || '').trim();
      if (!text) return;
      const nowSec = Math.floor(Date.now() / 1000);
      const ts = Number(msg.timestamp) || 0;
      if (ts && nowSec - ts > 120) return;            // skip old messages
      const id = msg.id?._serialized || msg.id?.id || '';
      if (id) {
        if (seenMessageIds.has(id)) return;
        seenMessageIds.add(id);
        if (seenMessageIds.size > 1000) seenMessageIds.delete(seenMessageIds.values().next().value);
      }
      // msg.from can be @c.us (classic) or @lid (WhatsApp's privacy id, which is
      // NOT a phone number). Resolve the real phone so we can match school data
      // and reply to a deliverable number.
      let fromNumber = from.split('@')[0];
      try {
        if (from.endsWith('@lid')) {
          fromNumber = (await resolveLidToPhone(client, from)) || fromNumber;
        } else {
          const contact = await msg.getContact();
          fromNumber = contact?.number || contact?.id?.user || fromNumber;
        }
      } catch { /* fall back to the raw id */ }
      if (/^(stop|unsubscribe|band|बंद|रोको)\b/i.test(text)) {
        store.setOptOut(account.project, fromNumber);
        logger.info({ project: account.project, from: fromNumber }, 'opted out');
      }
      webhook.forwardIncoming(account.project, {
        project: account.project, tenantId: account.tenantId, accountId,
        from: fromNumber, fromName: msg._data?.notifyName || '', text,
        messageId: id, timestamp: Date.now(),
      });
    } catch (e) {
      logger.error({ accountId, err: e.message }, 'message handler error');
    }
  });

  client.initialize().catch((err) => {
    logger.error({ accountId, err: err.message }, 'initialize failed');
    entry.status = 'disconnected';
    store.setAccountStatus(accountId, 'disconnected');
    live.delete(accountId);
  });

  return entry;
}

function getStatus(accountId) {
  const e = live.get(accountId);
  return e ? { status: e.status, qr: e.qr } : { status: store.getAccount(accountId)?.status || 'new', qr: null };
}

function isConnected(accountId) { return live.get(accountId)?.status === 'connected'; }

async function sendText(accountId, number, text) {
  const e = live.get(accountId);
  if (!e || e.status !== 'connected') throw new Error(`account ${accountId} not connected`);
  await e.client.sendMessage(toWid(number), text);
}

// async function sendMedia(accountId, number, media) {
//   const e = live.get(accountId);
//   if (!e || e.status !== 'connected') throw new Error(`account ${accountId} not connected`);
//   const mm = new MessageMedia(
//     media.mimetype || 'application/octet-stream',
//     media.dataB64 || '',
//     media.filename || 'file',
//   );
//   await e.client.sendMessage(toWid(number), mm, { caption: media.caption || '' });
// }

async function sendMedia(accountId, number, media) {
  const e = live.get(accountId);

  if (!e || e.status !== 'connected') {
    throw new Error(`account ${accountId} not connected`);
  }

  let mm;

  // Public URL
  if (media.url) {
    mm = await MessageMedia.fromUrl(media.url, {
      unsafeMime: true
    });
  }

  // Local file
  else if (media.filePath) {
    mm = MessageMedia.fromFilePath(media.filePath);
  }

  // Existing Base64 (backward compatible)
  else {
    mm = new MessageMedia(
      media.mimetype || 'application/octet-stream',
      media.dataB64 || '',
      media.filename || 'file'
    );
  }

  await e.client.sendMessage(
    toWid(number),
    mm,
    {
      caption: media.caption || '',
      sendMediaAsDocument: media.sendAsDocument || false
    }
  );
}
async function existsOnWhatsApp(accountId, number) {
  const e = live.get(accountId);
  if (!e || e.status !== 'connected') throw new Error(`account ${accountId} not connected`);
  const id = await e.client.getNumberId(store.onlyDigits(number));
  return Boolean(id);
}

async function logout(accountId) {
  const e = live.get(accountId);
  try { if (e?.client) await e.client.logout(); } catch { /* ignore */ }
  try { if (e?.client) await e.client.destroy(); } catch { /* ignore */ }
  live.delete(accountId);
  store.setAccountStatus(accountId, 'logged_out');
}

async function restoreAll() {
  for (const a of store.listAccounts()) {
    if (a.status === 'logged_out') continue;
    startAccount(a.id).catch((e) => logger.error(e, `restore ${a.id} failed`));
  }
}

module.exports = {
  startAccount, getStatus, isConnected, sendText, sendMedia, existsOnWhatsApp, logout, restoreAll,
};
