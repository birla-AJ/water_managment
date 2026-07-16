const express = require('express');
const cfg = require('./config');
const logger = require('./logger');
const store = require('./store');
const sessions = require('./sessionManager');
const safeSender = require('./safeSender');
const apiKeyAuth = require('./middleware/auth');

async function main() {
  store.init();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => res.json({ ok: true, queue: safeSender.stats().queued }));

  app.use(apiKeyAuth);                 // everything below needs x-api-key (except /link/*)
  app.use(require('./routes/sessions'));
  app.use(require('./routes/messages'));

  app.use((err, req, res, next) => {
    logger.error(err, 'request error');
    res.status(500).json({ error: err.message });
  });

  app.listen(cfg.PORT, () => logger.info(`gateway listening on :${cfg.PORT}`));

  await sessions.restoreAll();         // reconnect linked numbers
  safeSender.startWorker();            // start draining the send queue
}

main().catch((e) => { logger.error(e, 'fatal'); process.exit(1); });
