import { Router } from 'express';
import { dataLimiter } from '../middleware/rate-limit.js';

// Módulos CQS (nuevos desde el inicio)
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
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import favoritesRoutes from './favorites.routes';
import organizationRoutes from './organization.routes';
import commoditiesRoutes from './commodities.routes';
import environmentRoutes from './environment.routes';
import liveActivityRoutes from './live-activity.routes';
import healthRoutes from './health.routes';
import infrastructureRoutes from './infrastructure.routes';
import fireRoutes from '../modules/fire/routes';
import satelliteRoutes from '../modules/satellite/routes';
import ucdpRoutes from '../modules/ucdp/routes';
import joshuaProjectRoutes from '../modules/joshua-project/routes';
import unhcrRoutes from '../modules/unhcr/routes';
import demographicsRoutes from '../modules/demographics/routes';
import conflictRoutes from '../modules/conflicts/routes';
import earthGalleryRoutes from './earth-gallery.routes';

const router = Router();

// Módulos CQS
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
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/organizations', organizationRoutes);
router.use('/commodities', commoditiesRoutes);
router.use('/environment', environmentRoutes);
router.use('/live-activity', liveActivityRoutes);
router.use('/health', healthRoutes);
router.use('/infrastructure', infrastructureRoutes);
router.use('/fire', fireRoutes);
router.use('/satellite', satelliteRoutes);
router.use('/ucdp', ucdpRoutes);
router.use('/joshua-project', joshuaProjectRoutes);
router.use('/unhcr', unhcrRoutes);
router.use('/demographics', demographicsRoutes);
router.use('/conflicts', conflictRoutes);
router.use('/earth-gallery', earthGalleryRoutes);

export default router;
