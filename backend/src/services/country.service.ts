import fs from 'fs/promises';
import path from 'path';

export async function getCountries() {
  const dataPath = path.join(__dirname, '../public/data/countries-cache.json');
  const content = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(content);
}
