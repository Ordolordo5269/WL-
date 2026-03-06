import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createConflictSocketServer } from './websocket/conflict-socket';
import { setBroadcaster } from './websocket/broadcast';

const server = http.createServer(app);

// Initialize WebSocket and wire up the broadcaster
const conflictSocket = createConflictSocketServer(server);
setBroadcaster(conflictSocket.broadcastConflictUpdate);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
});
