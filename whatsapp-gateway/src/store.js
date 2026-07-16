/**
 * Tiny JSON-file store for the gateway's small state.
 *
 * Generic model (project-agnostic):
 *   account = { id, project, tenantId, label, status, firstConnectedAt }
 *     - project  : which app owns it (resolved from API key) e.g. "school-erp", "dxmart"
 *     - tenantId : sub-group inside that app (a school, a shop, a gym...) — optional
 * Opt-outs are scoped per-project (opting out of one app doesn't mute another).
 *
 * Baileys session auth lives separately under SESSIONS_DIR/<accountId>/.
 */
const fs = require('fs');
const path = require('path');
const { DATA_DIR, TIMEZONE_OFFSET_MIN, WARMUP_CAPS } = require('./config');

const FILE = path.join(DATA_DIR, 'store.json');
let data = { accounts: [], optouts: {}, counters: {} };

function init() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(FILE)) {
    try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* start fresh */ }
  } else { save(); }
}
function save() { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

/* ---------- accounts (always scoped by project) ---------- */
function listAccounts(project, tenantId) {
  let r = data.accounts;
  if (project != null) r = r.filter((a) => a.project === project);
  if (tenantId != null) r = r.filter((a) => String(a.tenantId) === String(tenantId));
  return r.slice();
}
function getAccount(id) { return data.accounts.find((a) => a.id === id) || null; }

function createAccount({ project, tenantId = null, label = 'WhatsApp Account' }) {
  const rand = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const id = `wa_${slug(project)}_${slug(tenantId ?? 'na')}_${rand}`;
  const account = {
    id, project, tenantId, label: String(label).trim(),
    status: 'new', firstConnectedAt: null, createdAt: new Date().toISOString(),
  };
  data.accounts.push(account);
  save();
  return account;
}
function setAccountStatus(id, status) {
  const a = getAccount(id);
  if (!a) return;
  a.status = status;
  if (status === 'connected' && !a.firstConnectedAt) a.firstConnectedAt = new Date().toISOString();
  save();
}
function removeAccount(id) {
  data.accounts = data.accounts.filter((a) => a.id !== id);
  save();
}

/* ---------- opt-outs (per project) ---------- */
function isOptedOut(project, number) {
  return !!(data.optouts[project] && data.optouts[project][onlyDigits(number)]);
}
function setOptOut(project, number) {
  data.optouts[project] = data.optouts[project] || {};
  data.optouts[project][onlyDigits(number)] = new Date().toISOString();
  save();
}
function removeOptOut(project, number) {
  if (data.optouts[project]) { delete data.optouts[project][onlyDigits(number)]; save(); }
}

/* ---------- daily counters + warm-up (per account) ---------- */
function localNow() { return new Date(Date.now() + TIMEZONE_OFFSET_MIN * 60000); }
function todayKey() { return localNow().toISOString().slice(0, 10); }

function getSentToday(accountId) {
  const day = data.counters[todayKey()];
  return (day && day[accountId]) || 0;
}
function incSent(accountId) {
  const key = todayKey();
  data.counters[key] = data.counters[key] || {};
  data.counters[key][accountId] = (data.counters[key][accountId] || 0) + 1;
  for (const k of Object.keys(data.counters)) if (k !== key) delete data.counters[k]; // keep today only
  save();
}
function warmupCapFor(account) {
  if (!account || !account.firstConnectedAt) return WARMUP_CAPS[0];
  const days = Math.floor((Date.now() - new Date(account.firstConnectedAt).getTime()) / 86400000);
  return WARMUP_CAPS[Math.min(days, WARMUP_CAPS.length - 1)];
}

function onlyDigits(s) { return String(s || '').replace(/\D/g, ''); }
function slug(s) { return String(s).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'x'; }

module.exports = {
  init, save,
  listAccounts, getAccount, createAccount, setAccountStatus, removeAccount,
  isOptedOut, setOptOut, removeOptOut,
  getSentToday, incSent, warmupCapFor, todayKey, onlyDigits,
};
