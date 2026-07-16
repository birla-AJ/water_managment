const express = require('express');
const QRCode = require('qrcode');
const store = require('../store');
const sessions = require('../sessionManager');

const router = express.Router();

// Ensure the account belongs to the caller's project (else 404).
function ownOr404(req, res) {
  const a = store.getAccount(req.params.id);
  if (!a || a.project !== req.project) { res.status(404).json({ error: 'account not found' }); return null; }
  return a;
}

// Create a number slot for this project (+ optional tenant) and start linking.
// body: { tenantId?, label }
router.post('/sessions', async (req, res) => {
  const { tenantId = null, label } = req.body || {};
  const account = store.createAccount({ project: req.project, tenantId, label });
  await sessions.startAccount(account.id);
  res.json({ accountId: account.id, linkUrl: `/link/${account.id}` });
});

// List this project's accounts (optionally by tenant) with live status.
router.get('/sessions', (req, res) => {
  const list = store.listAccounts(req.project, req.query.tenantId).map((a) => ({
    ...a, live: sessions.getStatus(a.id).status,
  }));
  res.json({ accounts: list });
});

// Poll status + QR (data URL).
router.get('/sessions/:id/qr', async (req, res) => {
  if (!ownOr404(req, res)) return;
  const s = sessions.getStatus(req.params.id);
  const qrDataUrl = s.qr ? await QRCode.toDataURL(s.qr) : null;
  res.json({ status: s.status, qr: qrDataUrl });
});

router.post('/sessions/:id/start', async (req, res) => {
  if (!ownOr404(req, res)) return;
  await sessions.startAccount(req.params.id);
  res.json({ ok: true });
});

router.post('/sessions/:id/logout', async (req, res) => {
  if (!ownOr404(req, res)) return;
  await sessions.logout(req.params.id);
  res.json({ ok: true });
});

router.delete('/sessions/:id', async (req, res) => {
  if (!ownOr404(req, res)) return;
  await sessions.logout(req.params.id);
  store.removeAccount(req.params.id);
  res.json({ ok: true });
});

// Public QR poll used by the link page below (no api key).
router.get('/link/:id/qr', async (req, res) => {
  const s = sessions.getStatus(req.params.id);
  const qrDataUrl = s.qr ? await QRCode.toDataURL(s.qr) : null;
  res.json({ status: s.status, qr: qrDataUrl });
});

// Public browser page to scan the QR (no api key — opened by staff).
router.get('/link/:id', (req, res) => {
  const id = req.params.id;
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link WhatsApp</title>
<style>body{font-family:system-ui,sans-serif;text-align:center;padding:24px;color:#111}
img{width:280px;height:280px}.s{margin-top:12px;color:#555}</style></head>
<body><h2>WhatsApp number link karo</h2>
<p>Phone → WhatsApp → Settings → Linked Devices → Link a Device → scan</p>
<div id="box">Loading…</div><div class="s" id="st"></div>
<script>
async function tick(){
  const r=await fetch('/link/${id}/qr'); const d=await r.json();
  document.getElementById('st').textContent='Status: '+(d.status||'?');
  const box=document.getElementById('box');
  if(d.status==='connected'){box.innerHTML='✅ Connected!';return;}
  box.innerHTML = d.qr ? '<img src="'+d.qr+'">' : 'QR aa raha hai…';
  setTimeout(tick,3000);
}
tick();
</script></body></html>`);
});

module.exports = router;
