import { Router } from 'express';
import { 
  listCountries, 
  getCountryInfo, 
  searchCountriesByName, 
  getCountryByCodeController,
  getAllCountriesController 
} from '../controllers/country.controller';

const router = Router();

// Get all countries (cached data)
router.get('/', listCountries);

// Get all countries from API
router.get('/all', getAllCountriesController);

// Search countries by name
router.get('/search', searchCountriesByName);

// Get country by ISO code
router.get('/code/:code', getCountryByCodeController);

// Get country basic information by name
router.get('/:countryName/basic-info', getCountryInfo);

export default router;
