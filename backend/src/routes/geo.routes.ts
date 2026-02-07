import { Router } from 'express';
import * as geoController from '../controllers/geo.controller';

const router = Router();

// Debug endpoint
router.get('/debug', geoController.debugConfig);

// Cities and Regions by country
router.get('/countries/:iso2/cities', geoController.getCitiesByCountry);
router.get('/countries/:iso2/regions', geoController.getRegionsByCountry);

// Place details
router.get('/places/:placeId', geoController.getPlaceDetails);

// Search
router.get('/search', geoController.searchPlaces);

// Cache management
router.post('/refresh/:iso2', geoController.refreshGeoCache);
router.get('/cache/status', geoController.getCacheStatus);

export default router;


