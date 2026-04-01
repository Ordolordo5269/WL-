import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { generalLimiter } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error.js';
import { swaggerSpec } from './docs/swagger.js';
import apiRouter from './routes/index.js';

// BigInt cannot be serialized by JSON.stringify by default.
// Prisma returns BigInt for some fields (e.g. AcledEvent.timestamp).
(BigInt.prototype as any).toJSON = function () { return Number(this); };

const app = express();

// Security headers
app.use(helmet());

// CORS — explicit origins from env (comma-separated)
app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
}));

// Body parsing
app.use(express.json());

// HTTP request logging with Pino
app.use(pinoHttp({ logger }));

// Global rate limit: 100 requests per 15 min
app.use(generalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// OpenAPI docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api', apiRouter);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
