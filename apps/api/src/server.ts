import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createConflictSocketServer } from './websocket/conflict-socket.js';
import { setBroadcaster } from './websocket/broadcast.js';
import { syncUcdpData } from './modules/ucdp/sync.js';

const server = http.createServer(app);

// Initialize WebSocket and wire up the broadcaster
const conflictSocket = createConflictSocketServer(server);
setBroadcaster(conflictSocket.broadcastConflictUpdate);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');

  // UCDP sync: every 6 hours (manual trigger via POST /api/ucdp/sync)
  if (env.UCDP_API_TOKEN) {
    setInterval(() => {
      syncUcdpData().catch(err => logger.error({ err }, 'Periodic UCDP sync failed'));
    }, 6 * 60 * 60 * 1000);
  }
});
