import { logger } from '../../config/logger.js';

const BASE_URL = 'https://api.unhcr.org/population/v1';
const MAX_RETRIES = 3;

// ── Raw response types ──────────────────────────────────────────────

export interface UNHCRRawCorridor {
  year: number;
  coo_id: number;
  coo_name: string;
  coo: string;
  coo_iso: string;
  coa_id: number;
  coa_name: string;
  coa: string;
  coa_iso: string;
  refugees: number | string;
  asylum_seekers: number | string;
  returned_refugees: number | string;
  idps: number | string;
  returned_idps: number | string;
  stateless: number | string;
  ooc: number | string;
  oip: number | string;
  hst: number | string;
}

export interface UNHCRGlobalStats {
  year: number;
  // From /solutions/
  resettlement: number;
  naturalisation: number;
  returnedRefugees: number;
  returnedIDPs: number;
  // From /asylum-decisions/
  decRecognized: number;
  decRejected: number;
  decOther: number;
  decTotal: number;
  // From /asylum-applications/
  applied: number;
}

interface UNHCRResponse<T = UNHCRRawCorridor> {
  page: number;
  maxPages: number;
  total: any;
  items: T[];
}

// ── Fetch with retry ────────────────────────────────────────────────

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      if (response.status === 429 && attempt < retries) {
        const wait = Math.pow(2, attempt) * 1000;
        logger.warn({ attempt, wait }, 'UNHCR rate limited, retrying...');
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      throw new Error(`UNHCR API returned ${response.status}: ${response.statusText}`);
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = Math.pow(2, attempt) * 1000;
      logger.warn({ attempt, err }, 'UNHCR fetch failed, retrying...');
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error('UNHCR fetch exhausted retries');
}

function num(v: any): number {
  if (typeof v === 'number') return v;
  if (!v || v === '-') return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

// ── Public fetch functions ──────────────────────────────────────────

export async function fetchCorridors(year: number): Promise<UNHCRRawCorridor[]> {
  const all: UNHCRRawCorridor[] = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/population/?year=${year}&limit=10000&page=${page}&coo_all=true&coa_all=true`;
    logger.info({ year, page }, 'Fetching UNHCR corridors page');

    const response = await fetchWithRetry(url);
    const data: UNHCRResponse<UNHCRRawCorridor> = await response.json();

    all.push(...data.items);

    if (page >= data.maxPages) break;
    page++;
  }

  logger.info({ year, total: all.length }, 'UNHCR corridors fetched');
  return all;
}

/** Fetch global aggregated stats for a year from solutions, decisions, and applications endpoints.
 *  These return small datasets so we only need page 1 and use the `total` aggregate field.
 */
export async function fetchGlobalStats(year: number): Promise<UNHCRGlobalStats> {
  const [solutionsRes, decisionsRes, applicationsRes] = await Promise.allSettled([
    fetchWithRetry(`${BASE_URL}/solutions/?year=${year}&limit=1`).then(r => r.json()),
    fetchWithRetry(`${BASE_URL}/asylum-decisions/?year=${year}&limit=1`).then(r => r.json()),
    fetchWithRetry(`${BASE_URL}/asylum-applications/?year=${year}&limit=1`).then(r => r.json()),
  ]);

  const solutions = solutionsRes.status === 'fulfilled' ? solutionsRes.value?.total ?? {} : {};
  const decisions = decisionsRes.status === 'fulfilled' ? decisionsRes.value?.total ?? {} : {};
  const applications = applicationsRes.status === 'fulfilled' ? applicationsRes.value?.total ?? {} : {};

  return {
    year,
    resettlement: num(solutions.resettlement),
    naturalisation: num(solutions.naturalisation),
    returnedRefugees: num(solutions.returned_refugees),
    returnedIDPs: num(solutions.returned_idps),
    decRecognized: num(decisions.dec_recognized),
    decRejected: num(decisions.dec_rejected),
    decOther: num(decisions.dec_other),
    decTotal: num(decisions.dec_total),
    applied: num(applications.applied),
  };
}
