import { getCountries } from '../../src/services/country.service';

test('getCountries returns data', async () => {
  const countries = await getCountries();
  expect(Array.isArray(countries)).toBe(true);
});
