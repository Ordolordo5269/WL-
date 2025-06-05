import { Router } from 'express';
import { listCountries } from '../controllers/country.controller';

const router = Router();

router.get('/', listCountries);

export default router;
