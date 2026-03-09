import { Router } from 'express';

// Legacy routes (will be replaced module by module in later phases)
import countryRoutes from '../modules/countries/routes';
import organizationRoutes from './organization.routes';
import indicatorRoutes from './indicator.routes';
import economyRoutes from './economy.routes';
import naturalRoutes from './natural.routes';
import historyRoutes from './history.routes';
import conflictRoutes from './conflict.routes';
import conflictsModuleRoutes from './conflicts.routes';
import geoRoutes from './geo.routes';
import politicsRoutes from './politics.routes';
import societyRoutes from './society.routes';
import technologyRoutes from './technology.routes';
import defenseRoutes from './defense.routes';
import internationalRoutes from './international.routes';
import authRoutes from './auth.routes';
import favoritesRoutes from './favorites.routes';
import userRoutes from './user.routes';
import predictionRoutes from './prediction.routes';
import newsRoutes from './news.routes';
import acledRoutes from './acled.routes';
import osintRoutes from './osint.routes';

const router = Router();

// Curated conflicts module (CQS — enriched with OSINT data)
// Must be registered before legacy /conflicts to avoid /:id capturing "v2"
router.use('/conflicts/v2', conflictsModuleRoutes);

// Legacy routes
router.use('/countries', countryRoutes);
router.use('/organizations', organizationRoutes);
router.use('/indicators', indicatorRoutes);
router.use('/natural', naturalRoutes);
router.use('/history', historyRoutes);
router.use('/conflicts', conflictRoutes);
router.use('/geo', geoRoutes);
router.use('/economy', economyRoutes);
router.use('/politics', politicsRoutes);
router.use('/society', societyRoutes);
router.use('/technology', technologyRoutes);
router.use('/defense', defenseRoutes);
router.use('/international', internationalRoutes);
router.use('/auth', authRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/user', userRoutes);
router.use('/prediction', predictionRoutes);
router.use('/news', newsRoutes);
router.use('/acled', acledRoutes);

// Geo data layers (minerals, pipelines, infrastructure)
import geoLayersRoutes from './geo-layers.routes';
router.use('/geo-layers', geoLayersRoutes);

// OSINT scraper routes
router.use('/osint', osintRoutes);

// UCDP Uppsala Conflict Data module
import ucdpRoutes from './ucdp.routes';
router.use('/ucdp', ucdpRoutes);

// Insights module (protected — requires auth)
import insightsRoutes from './insights.routes';
router.use('/insights', insightsRoutes);

// Dashboard
import dashboardRoutes from './dashboard.routes';
router.use('/dashboard', dashboardRoutes);

export default router;
