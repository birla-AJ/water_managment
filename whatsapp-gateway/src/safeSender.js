/**
 * The "anti-ban" layer. Callers enqueue; a single worker drains slowly:
 *   - random delay between messages
 *   - active hours only (local tz)
 *   - per-number daily cap (warm-up schedule)
 *   - skip opted-out recipients (per project)
 *   - optional "is on WhatsApp?" check
 *   - round-robin across a (project, tenant)'s connected numbers
 *
 * Project-agnostic: jobs carry { project, tenantId?, accountId?, to, text }.
 * A project can only ever send from its own accounts (verified in pickAccount).
 *
 * NOTE: queue is in-memory in this starter. Persist for durability later.
 */
const cfg = require('./config');
const logger = require('./logger');
const store = require('./store');
const sessions = require('./sessionManager');

const queue = [];
const rrIndex = new Map(); // "project:tenant" -> last used index
let running = false;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(min + Math.random() * (max - min)); }

function inActiveHours() {
  const local = new Date(Date.now() + cfg.TIMEZONE_OFFSET_MIN * 60000);
  const h = local.getUTCHours();
  return h >= cfg.ACTIVE_HOURS_START && h < cfg.ACTIVE_HOURS_END;
}

function enqueue(job) {
  // { project, tenantId?, accountId?, to, text? , media? }
  if (!job || !job.to || (!job.text && !job.media)) throw new Error('job needs { to, text|media }');
  if (!job.project) throw new Error('job needs project');
  queue.push({ ...job, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
  return queue.length;
}

// Choose the number to send from — always scoped to the job's project.
function pickAccount(job) {
  if (job.accountId) {
    const a = store.getAccount(job.accountId);
    if (!a || a.project !== job.project) return null;        // not yours / unknown
    return sessions.isConnected(job.accountId) ? job.accountId : null;
  }
  const accts = store.listAccounts(job.project, job.tenantId).filter((a) => sessions.isConnected(a.id));
  if (!accts.length) return null;
  const key = `${job.project}:${job.tenantId ?? ''}`;
  const i = ((rrIndex.get(key) ?? -1) + 1) % accts.length;
  rrIndex.set(key, i);
  return accts[i].id;
}

async function processOne(job) {
  if (store.isOptedOut(job.project, job.to)) { logger.info({ to: job.to }, 'skip: opted out'); return 'skipped'; }

  const accountId = pickAccount(job);
  if (!accountId) return 'no_account';

  const acct = store.getAccount(accountId);
  const cap = store.warmupCapFor(acct);
  if (store.getSentToday(accountId) >= cap) { logger.warn({ accountId, cap }, 'daily cap — holding'); return 'capped'; }

  if (cfg.CHECK_ON_WHATSAPP) {
    try {
      const ok = await sessions.existsOnWhatsApp(accountId, job.to);
      if (!ok) { logger.info({ to: job.to }, 'skip: not on whatsapp'); return 'skipped'; }
    } catch (e) { logger.warn(e, 'onWhatsApp check failed — sending anyway'); }
  }

  if (job.media) await sessions.sendMedia(accountId, job.to, job.media);
  else await sessions.sendText(accountId, job.to, job.text);
  store.incSent(accountId);
  logger.info({ project: job.project, accountId, to: job.to, media: !!job.media }, 'sent');
  return 'sent';
}

async function startWorker() {
  if (running) return;
  running = true;
  logger.info('safe-sender worker started');
  while (running) {
    if (!queue.length || !inActiveHours()) { await sleep(5000); continue; }

    const job = queue.shift();
    try {
      const result = await processOne(job);
      if (result === 'no_account' || result === 'capped') {
        queue.push(job); await sleep(15000); continue;       // retry later
      }
    } catch (e) {
      logger.error(e, 'send failed — requeue once');
      if (!job._retried) { job._retried = true; queue.push(job); }
    }
    await sleep(rand(cfg.SEND_MIN_DELAY_MS, cfg.SEND_MAX_DELAY_MS));
  }
}

function stats() { return { queued: queue.length }; }

/**
 * Priority / instant send — bypasses the slow queue (no delay, active-hours,
 * or warm-up cap). Meant for time-sensitive messages like login OTP. Still
 * scoped to the caller's project and still honours opt-outs. Resolves with
 * { sent, accountId } on success or { sent:false, reason } if there is no
 * connected number to send from, so the caller can fall back to another channel.
 */
async function sendNow(job) {
  if (!job || !job.to || (!job.text && !job.media)) throw new Error('job needs { to, text|media }');
  if (!job.project) throw new Error('job needs project');
  if (store.isOptedOut(job.project, job.to)) return { sent: false, reason: 'opted_out' };

  const accountId = pickAccount(job);
  if (!accountId) return { sent: false, reason: 'no_account' };

  if (job.media) await sessions.sendMedia(accountId, job.to, job.media);
  else await sessions.sendText(accountId, job.to, job.text);
  store.incSent(accountId);
  logger.info({ project: job.project, accountId, to: job.to, priority: true }, 'sent (priority)');
  return { sent: true, accountId };
}

module.exports = { enqueue, startWorker, stats, sendNow };
