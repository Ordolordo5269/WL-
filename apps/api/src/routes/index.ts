import { Router } from 'express';
import { dataLimiter } from '../middleware/rate-limit.js';

// Módulos CQS (nuevos desde el inicio)
import conflictsRoutes from './conflicts.routes';
import osintRoutes from './osint.routes';
import insightsRoutes from './insights.routes';
import dashboardRoutes from './dashboard.routes';

// Módulos migrados (cada route file importa de modules/)
import countryRoutes from '../modules/countries/routes';
import economyRoutes from './economy.routes';
import defenseRoutes from './defense.routes';
import politicsRoutes from './politics.routes';
import societyRoutes from './society.routes';
import technologyRoutes from './technology.routes';
import internationalRoutes from './international.routes';
import indicatorRoutes from './indicator.routes';
import geoRoutes from './geo.routes';
import historyRoutes from './history.routes';
import naturalRoutes from './natural.routes';
import predictionRoutes from './prediction.routes';
import newsRoutes from './news.routes';
import acledRoutes from './acled.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import favoritesRoutes from './favorites.routes';
import organizationRoutes from './organization.routes';

const router = Router();

// Módulos CQS
router.use('/conflicts', conflictsRoutes);
router.use('/osint', osintRoutes);
router.use('/insights', insightsRoutes);
router.use('/dashboard', dashboardRoutes);

// Módulos migrados — country/geo data get a dedicated high-volume limiter
router.use('/countries', dataLimiter, countryRoutes);
router.use('/economy', economyRoutes);
router.use('/defense', defenseRoutes);
router.use('/politics', politicsRoutes);
router.use('/society', societyRoutes);
router.use('/technology', technologyRoutes);
router.use('/international', internationalRoutes);
router.use('/indicators', indicatorRoutes);
router.use('/geo', dataLimiter, geoRoutes);
router.use('/history', historyRoutes);
router.use('/natural', naturalRoutes);
router.use('/prediction', predictionRoutes);
router.use('/news', newsRoutes);
router.use('/acled', acledRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/organizations', organizationRoutes);

export default router;
