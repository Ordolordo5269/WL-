import { Router } from 'express';
import * as ctrl from './controller';

const router = Router();

// Keep compatibility: '/' previously returned cached/all; we will return all with cache
router.get('/', ctrl.list);
router.get('/all', ctrl.list);
router.get('/search', ctrl.searchByName);
router.get('/code/:code', ctrl.byCode);
router.get('/:countryName/basic-info', ctrl.basicInfoByName);

export default router;



