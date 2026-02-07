import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import countryRoutes from './routes/country.routes';
import organizationRoutes from './routes/organization.routes';
import indicatorRoutes from './routes/indicator.routes';
import economyRoutes from './routes/economy.routes';
import naturalRoutes from './routes/natural.routes';
import historyRoutes from './routes/history.routes';
import conflictRoutes from './routes/conflict.routes';
import geoRoutes from './routes/geo.routes';
// Section routes (aggregated indicators)
import politicsRoutes from './routes/politics.routes';
import societyRoutes from './routes/society.routes';
import technologyRoutes from './routes/technology.routes';
import defenseRoutes from './routes/defense.routes';
import internationalRoutes from './routes/international.routes';
// Auth & User routes
import authRoutes from './routes/auth.routes';
import favoritesRoutes from './routes/favorites.routes';
import userRoutes from './routes/user.routes';
// Prediction routes
import predictionRoutes from './routes/prediction.routes';
import { prisma } from './db/client';
import { requestLogger } from './middleware/requestLogger';
import { logger } from './core/logger';

const app = express();

// Request logging (antes de otros middlewares para capturar todo)
app.use(requestLogger);

// Morgan para logging HTTP tradicional (opcional, puede deshabilitarse)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json());

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'], // Vite default port and backend ports
  credentials: true
}));

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Register routes
app.use('/api/countries', countryRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/indicators', indicatorRoutes);
app.use('/api/natural', naturalRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/geo', geoRoutes);
// Section aggregated routes
app.use('/api/economy', economyRoutes);
app.use('/api/politics', politicsRoutes);
app.use('/api/society', societyRoutes);
app.use('/api/technology', technologyRoutes);
app.use('/api/defense', defenseRoutes);
app.use('/api/international', internationalRoutes);
// Auth & User routes
app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/user', userRoutes);
// Prediction routes
app.use('/api/prediction', predictionRoutes);

// DB health
app.get('/db/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

// Error handler debe ser el último middleware
import { errorHandler } from './core/errors/errorHandler';
app.use(errorHandler);

export default app;
