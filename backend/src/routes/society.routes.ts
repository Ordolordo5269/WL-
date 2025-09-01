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

  const axiosConfig = {
    responseType: 'text' as const,
    timeout: 10000,
    headers: {
      'User-Agent': 'WL-Backend/1.0 (+https://localhost)',
      'Accept': 'text/csv, text/plain; q=0.9, */*; q=0.8'
    },
    validateStatus: (status: number) => status >= 200 && status < 300
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await axios.get(OWID_HDI_CSV_URL, axiosConfig);
      if (typeof res.data === 'string') {
        const text = res.data as string;
        hdiCsvCache = { text, fetchedAt: now };
        return text;
      }
      lastError = new Error('Invalid CSV response type');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Unknown error fetching HDI');
}

// HDI endpoint removed per product requirement

export default router;


