const express = require('express');
const safeSender = require('../safeSender');

const router = express.Router();

// Queue a single message (project comes from the API key).
// body: { to, text, accountId? , tenantId? }
//   - accountId -> send from that specific number
//   - tenantId  -> round-robin across that tenant's connected numbers
router.post('/send', (req, res) => {
  const { to, text, accountId, tenantId } = req.body || {};
  if (!to || !text) return res.status(400).json({ error: 'to and text required' });
  if (!accountId && tenantId === undefined) {
    return res.status(400).json({ error: 'provide accountId or tenantId' });
  }
  const queued = safeSender.enqueue({ project: req.project, to, text, accountId, tenantId });
  res.json({ queued: true, position: queued });
});

// Send a single message NOW, bypassing the slow anti-ban queue (no delay /
// active-hours / warm-up cap). For time-sensitive messages like login OTP.
// Responds synchronously so the caller knows whether to fall back to SMS.
// body: { to, text, accountId?, tenantId? }
router.post('/send-priority', async (req, res) => {
  const { to, text, accountId, tenantId } = req.body || {};
  if (!to || !text) return res.status(400).json({ error: 'to and text required' });
  if (!accountId && tenantId === undefined) {
    return res.status(400).json({ error: 'provide accountId or tenantId' });
  }
  try {
    const result = await safeSender.sendNow({ project: req.project, to, text, accountId, tenantId });
    return res.json(result);
  } catch (e) {
    return res.status(502).json({ sent: false, reason: 'send_failed', error: e.message });
  }
});

// Queue many at once.
// body: { accountId? , tenantId?, recipients: [{ to, text }] }
router.post('/send-bulk', (req, res) => {
  const { accountId, tenantId, recipients } = req.body || {};
  if (!Array.isArray(recipients) || !recipients.length) {
    return res.status(400).json({ error: 'recipients[] required' });
  }
  let n = 0;
  for (const r of recipients) {
    if (!r.to || !r.text) continue;
    safeSender.enqueue({ project: req.project, to: r.to, text: r.text, accountId, tenantId });
    n++;
  }
  res.json({ queued: n });
});

// Queue a media message (image/document) as base64.
// body: { to, accountId?/tenantId?, caption?, dataB64, mimetype?, filename? }
router.post('/send-media', (req, res) => {
  // const { to, accountId, tenantId, caption, dataB64, mimetype, filename } = req.body || {};
  const {to,accountId,tenantId,caption,dataB64,mimetype,filename,url,filePath,sendAsDocument} = req.body || {};
  // if (!to || !dataB64)
  if (!to) {
    return res.status(400).json({
        error: "to required"
    });
}

if (!dataB64 && !url && !filePath) {
    return res.status(400).json({
        error: "Provide dataB64 or url or filePath"
    });
}
     return res.status(400).json({ error: 'to and dataB64 required' });
  if (!accountId && tenantId === undefined) {
    return res.status(400).json({ error: 'provide accountId or tenantId' });
  }
  const queued = safeSender.enqueue({
    project: req.project, to, accountId, tenantId,
   media: {dataB64,mimetype,filename,caption,url,filePath,sendAsDocument},
  });
  res.json({ queued: true, position: queued });
});

router.get('/queue', (req, res) => res.json(safeSender.stats()));

module.exports = router;
