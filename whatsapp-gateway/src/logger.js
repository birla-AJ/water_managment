const pino = require('pino');
const { LOG_LEVEL } = require('./config');

// Shared logger. Also handed to Baileys (warn level keeps its chatter down).
module.exports = pino({
  level: LOG_LEVEL,
  transport: process.stdout.isTTY
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
});
