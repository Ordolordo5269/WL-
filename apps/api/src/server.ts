import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { startAISStream } from './services/aisstream.js';
import { initCandidateService } from './modules/ucdp/candidate.service.js';

// ── Global safety nets — prevent the process from dying on stray errors ──
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — server stays alive');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection — server stays alive');
});

const server = http.createServer(app);

server.on('error', (err) => {
  logger.error({ err }, 'Server socket error');
});

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  startAISStream();

  // UCDP Candidate Events v26.0.2 — load into memory, refresh every 24h
  if (env.UCDP_API_TOKEN) {
    initCandidateService().catch(err =>
      logger.error({ err }, 'UCDP candidate service init failed')
    );
  }
});
