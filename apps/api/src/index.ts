// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { createConflictSocketServer } from './websocket/conflict-socket';
import { logger } from './core/logger';

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

// Initialize WebSocket server for conflict updates
const conflictSocket = createConflictSocketServer(server);

// Expose broadcaster for other modules (e.g. controllers)
export const broadcastConflictUpdate = conflictSocket.broadcastConflictUpdate;

server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    websocket: '/ws/conflicts',
  });
});
