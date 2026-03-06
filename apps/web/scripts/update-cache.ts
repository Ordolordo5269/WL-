import fs from 'fs/promises';

async function update() {
  const countries = [{ name: 'Exampleland', capital: 'Example City', region: 'Nowhere' }];
  await fs.writeFile('../data/countries-cache.json', JSON.stringify(countries, null, 2));
}
update();
