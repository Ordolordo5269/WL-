import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Cache HDI CSV in-memory to avoid repeated downloads during dev
let hdiCsvCache: { text: string; fetchedAt: number } | null = null;
const OWID_HDI_CSV_URL = 'https://ourworldindata.org/grapher/hdi.csv';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function getHDICsvText(): Promise<string> {
  const now = Date.now();
  if (hdiCsvCache && now - hdiCsvCache.fetchedAt < CACHE_TTL_MS) {
    return hdiCsvCache.text;
  }
  const res = await axios.get(OWID_HDI_CSV_URL, { responseType: 'text' });
  if (res.status < 200 || res.status >= 300 || typeof res.data !== 'string') {
    throw new Error(`OWID HDI fetch failed: ${res.status}`);
  }
  const text = res.data as string;
  hdiCsvCache = { text, fetchedAt: now };
  return text;
}

router.get('/hdi/:iso3', async (req, res) => {
  try {
    const iso3 = String(req.params.iso3 || '').toUpperCase();
    if (!iso3 || iso3.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }

    const csv = await getHDICsvText();
    const lines = csv.split(/\r?\n/);
    if (lines.length <= 1) return res.json({ iso3, value: null, year: null });
    const header = lines[0].split(',');
    const codeIdx = header.indexOf('Code');
    const yearIdx = header.indexOf('Year');
    const hdiIdx = header.findIndex(h => h.toLowerCase() === 'hdi' || h.toLowerCase() === 'human development index');
    if (codeIdx === -1 || yearIdx === -1 || hdiIdx === -1) {
      return res.json({ iso3, value: null, year: null });
    }

    let latest: { value: number | null; year: number | null } = { value: null, year: null };
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(',');
      if (cols.length <= Math.max(codeIdx, yearIdx, hdiIdx)) continue;
      if (cols[codeIdx].toUpperCase() !== iso3) continue;
      const year = Number(cols[yearIdx]);
      const value = cols[hdiIdx] === '' ? null : Number(cols[hdiIdx]);
      if (value === null || Number.isNaN(value)) continue;
      if (latest.year === null || (Number.isFinite(year) && year > (latest.year ?? -Infinity))) {
        latest = { value, year };
      }
    }
    return res.json({ iso3, value: latest.value, year: latest.year });
  } catch (error) {
    console.error('HDI endpoint error', error);
    return res.status(500).json({ error: 'Failed to retrieve HDI' });
  }
});

export default router;


