const { API_KEYS } = require('../config');

// Resolve x-api-key -> project, and scope the whole request to it.
// A project can only ever see/use its own accounts (enforced in routes/sender).
module.exports = function apiKeyAuth(req, res, next) {
  if (req.path.startsWith('/link/')) return next(); // public QR page (browser)

  if (!Object.keys(API_KEYS).length) {
    return res.status(500).json({ error: 'gateway has no API keys configured (set API_KEYS)' });
  }
  const project = API_KEYS[req.get('x-api-key')];
  if (!project) return res.status(401).json({ error: 'unauthorized' });

  req.project = project;
  next();
};
