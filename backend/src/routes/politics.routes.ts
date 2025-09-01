import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.get('/offices/:iso3', async (req, res) => {
  const iso3 = String(req.params.iso3 || '').toUpperCase();
  if (!iso3 || iso3.length !== 3) {
    return res.status(400).json({ error: 'Invalid ISO3' });
  }

  const sparql = `
SELECT ?country ?countryLabel ?formLabel
       ?hogOffice ?hogOfficeLabel ?hog ?hogLabel ?hogItem
       ?hosOffice ?hosOfficeLabel ?hos ?hosLabel ?hosItem
WHERE {
  ?country wdt:P298 "${iso3}" .
  OPTIONAL { ?country wdt:P122 ?form . }
  OPTIONAL {
    ?country wdt:P1313 ?hogOffice .
    ?country p:P6 ?hogStmt .
    ?hogStmt ps:P6 ?hogItem .
    FILTER NOT EXISTS { ?hogStmt pq:P582 ?end }
  }
  OPTIONAL {
    ?country wdt:P1906 ?hosOffice .
    ?country p:P35 ?hosStmt .
    ?hosStmt ps:P35 ?hosItem .
    FILTER NOT EXISTS { ?hosStmt pq:P582 ?end2 }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". 
    ?country rdfs:label ?countryLabel .
    ?form rdfs:label ?formLabel .
    ?hogOffice rdfs:label ?hogOfficeLabel .
    ?hogItem rdfs:label ?hogLabel .
    ?hosOffice rdfs:label ?hosOfficeLabel .
    ?hosItem rdfs:label ?hosLabel .
  }
}`;

  try {
    const r = await axios.get('https://query.wikidata.org/sparql', {
      params: { query: sparql, format: 'json' },
      headers: {
        'User-Agent': 'WL-Backend/1.0 (+http://localhost) ',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 12000,
      validateStatus: s => s >= 200 && s < 300
    });
    const rows = r.data?.results?.bindings ?? [];
    const offices: Array<{ officeLabel: string; personLabel: string; role: 'head_of_government' | 'head_of_state'; personUrl: string | null }>
      = [];
    for (const row of rows) {
      if (row.hogOfficeLabel && row.hogLabel) {
        offices.push({
          officeLabel: row.hogOfficeLabel.value,
          personLabel: row.hogLabel.value,
          role: 'head_of_government',
          personUrl: row.hogItem?.value ? String(row.hogItem.value).replace('http://', 'https://') : null
        });
      }
      if (row.hosOfficeLabel && row.hosLabel) {
        offices.push({
          officeLabel: row.hosOfficeLabel.value,
          personLabel: row.hosLabel.value,
          role: 'head_of_state',
          personUrl: row.hosItem?.value ? String(row.hosItem.value).replace('http://', 'https://') : null
        });
      }
    }

    // Deduplicate by office/person/url combination to avoid cartesian duplicates from OPTIONAL blocks
    const seen = new Set<string>();
    const uniqueOffices: Array<{ officeLabel: string; personLabel: string; role: 'head_of_government' | 'head_of_state'; personUrl: string | null }>
      = [];
    for (const o of offices) {
      const key = [
        (o.officeLabel || '').trim().toLowerCase(),
        (o.personLabel || '').trim().toLowerCase(),
        (o.personUrl || '').trim().toLowerCase()
      ].join('||');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueOffices.push(o);
      }
    }

    res.json({
      iso3,
      formOfGovernment: rows[0]?.formLabel?.value ?? null,
      offices: uniqueOffices
    });
  } catch (err) {
    console.error('wikidata offices error', err);
    res.json({ iso3, formOfGovernment: null, offices: [] });
  }
});

export default router;


