/**
 * Ingest UN Comtrade — Bilateral Trade Flows (TOTAL aggregate)
 *
 * P4 Fase A · Trade dependency features for ML
 *
 * Source: UN Comtrade Preview API (public, no key)
 * Endpoint: https://comtradeapi.un.org/public/v1/preview/C/A/HS
 * License: UN Open Data
 *
 * Scope: TOTAL aggregate bilateral (exports + imports) for ~60 top
 * economies × 4 years (2020-2023). HS-level detail deferred to Fase B.
 *
 * Stores in TradeFlow table (already exists in schema with indexes).
 * For exports: fromId = reporter, toId = partner.
 * For imports: fromId = partner, toId = reporter.
 *
 * Features: checkpoint resume, retry with backoff, silent-rate-limit
 * detection, M49 aggregate region skip list.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { bulkUpsertTradeFlows, type TradeFlowRow } from './lib/bulk-upsert-trade';

const prisma = new PrismaClient();

const COMTRADE_BASE = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS';
const DELAY_MS = 1000;
const YEARS = [2020, 2021, 2022, 2023, 2024];
const FLOWS: Array<{ code: string; label: string }> = [
  { code: 'X', label: 'exports' },
  { code: 'M', label: 'imports' },
];

const PROGRESS_FILE = path.join(__dirname, 'comtrade-progress.json');
const ERROR_LOG = path.join(__dirname, 'comtrade-errors.log');

// Comtrade M49 codes that differ from ISO 3166-1 numeric.
// These partner codes won't match isoNumeric directly, so we alias them.
const M49_OVERRIDES: Record<number, number> = {
  842: 840,   // USA: Comtrade 842 → ISO 840
  251: 250,   // France: Comtrade 251 → ISO 250
  757: 756,   // Switzerland: Comtrade 757 → ISO 756
  579: 578,   // Norway: Comtrade 579 → ISO 578
  527: 528,   // Netherlands: Comtrade 527 → ISO 528
};

const SKIP_M49 = new Set([
  0,    // World
  97,   // EU
  290,  // Caribbean small states
  492,  // Other Asia nes
  490,  // Other Asia nes (alt)
  568,  // Other Europe nes
  577,  // Other Africa nes
  636,  // Rest of World
  637,  // Bunkers
  699,  // Areas nes
  711,  // South Africa CU
  837,  // World (alt)
  838,  // Free Zones
  839,  // Special Categories
  849,  // Neutral Zone
  879,  // Other nes
  899,  // Areas nes (alt)
]);

// Top ~60 economies by trade volume (M49 codes)
const REPORTERS: Array<{ m49: number; iso3: string }> = [
  { m49: 842, iso3: 'USA' }, { m49: 156, iso3: 'CHN' }, { m49: 276, iso3: 'DEU' },
  { m49: 392, iso3: 'JPN' }, { m49: 826, iso3: 'GBR' }, { m49: 250, iso3: 'FRA' },
  { m49: 356, iso3: 'IND' }, { m49: 380, iso3: 'ITA' }, { m49: 76, iso3: 'BRA' },
  { m49: 124, iso3: 'CAN' }, { m49: 410, iso3: 'KOR' }, { m49: 643, iso3: 'RUS' },
  { m49: 36, iso3: 'AUS' },  { m49: 724, iso3: 'ESP' }, { m49: 484, iso3: 'MEX' },
  { m49: 360, iso3: 'IDN' }, { m49: 528, iso3: 'NLD' }, { m49: 792, iso3: 'TUR' },
  { m49: 682, iso3: 'SAU' }, { m49: 756, iso3: 'CHE' }, { m49: 616, iso3: 'POL' },
  { m49: 752, iso3: 'SWE' }, { m49: 56, iso3: 'BEL' },  { m49: 578, iso3: 'NOR' },
  { m49: 40, iso3: 'AUT' },  { m49: 764, iso3: 'THA' }, { m49: 704, iso3: 'VNM' },
  { m49: 458, iso3: 'MYS' }, { m49: 608, iso3: 'PHL' }, { m49: 702, iso3: 'SGP' },
  { m49: 784, iso3: 'ARE' }, { m49: 376, iso3: 'ISR' }, { m49: 152, iso3: 'CHL' },
  { m49: 32, iso3: 'ARG' },  { m49: 170, iso3: 'COL' }, { m49: 604, iso3: 'PER' },
  { m49: 710, iso3: 'ZAF' }, { m49: 566, iso3: 'NGA' }, { m49: 818, iso3: 'EGY' },
  { m49: 404, iso3: 'KEN' }, { m49: 586, iso3: 'PAK' }, { m49: 50, iso3: 'BGD' },
  { m49: 804, iso3: 'UKR' }, { m49: 398, iso3: 'KAZ' }, { m49: 634, iso3: 'QAT' },
  { m49: 414, iso3: 'KWT' }, { m49: 368, iso3: 'IRQ' }, { m49: 364, iso3: 'IRN' },
  { m49: 12, iso3: 'DZA' },  { m49: 504, iso3: 'MAR' }, { m49: 203, iso3: 'CZE' },
  { m49: 642, iso3: 'ROU' }, { m49: 348, iso3: 'HUN' }, { m49: 620, iso3: 'PRT' },
  { m49: 300, iso3: 'GRC' }, { m49: 208, iso3: 'DNK' }, { m49: 246, iso3: 'FIN' },
  { m49: 372, iso3: 'IRL' }, { m49: 554, iso3: 'NZL' },
];

interface ProgressEntry { reporterM49: number; flowCode: string; year: number }

function loadProgress(): Set<string> {
  if (!fs.existsSync(PROGRESS_FILE)) return new Set();
  const data: ProgressEntry[] = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  return new Set(data.map((p) => `${p.reporterM49}:${p.flowCode}:${p.year}`));
}

function saveProgress(done: Set<string>) {
  const entries: ProgressEntry[] = [...done].map((k) => {
    const [r, f, y] = k.split(':');
    return { reporterM49: parseInt(r), flowCode: f, year: parseInt(y) };
  });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(entries, null, 2));
}

function logError(msg: string) {
  fs.appendFileSync(ERROR_LOG, `[${new Date().toISOString()}] ${msg}\n`);
}

async function fetchWithRetry(
  url: string,
  maxRetries = 3,
): Promise<{ count: number; data: Array<Record<string, unknown>> }> {
  const delays = [2000, 5000, 15000];
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data } = await axios.get<{ count?: number; data?: Array<Record<string, unknown>> }>(url, {
        timeout: 30000,
      });
      return { count: data.count ?? 0, data: data.data ?? [] };
    } catch (err) {
      const msg = (err as Error).message;
      if (attempt < maxRetries - 1) {
        console.log(`    retry ${attempt + 1}/${maxRetries} after ${delays[attempt] / 1000}s (${msg})`);
        await new Promise((r) => setTimeout(r, delays[attempt]));
      } else {
        throw err;
      }
    }
  }
  throw new Error('unreachable');
}

async function main() {
  console.log('\n=== WorldLore: UN Comtrade Bilateral Trade (P4 Fase A) ===\n');

  // Entity lookup: M49 → entityId (for partners) + iso3 → entityId (for reporters)
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY' },
    select: { id: true, iso3: true, isoNumeric: true },
  });
  const m49Map = new Map<number, string>();
  const iso3Map = new Map<string, string>();
  for (const e of entities) {
    if (e.isoNumeric !== null) m49Map.set(e.isoNumeric, e.id);
    if (e.iso3) iso3Map.set(e.iso3, e.id);
  }
  console.log(`  M49 lookup: ${m49Map.size} countries mapped, iso3 lookup: ${iso3Map.size}`);
  if (m49Map.size < 170) {
    console.warn(`  WARNING: expected ~190 countries with isoNumeric, got ${m49Map.size}. Some partners will be skipped.`);
  }

  const done = loadProgress();
  console.log(`  Checkpoint: ${done.size} combinations already done`);

  const totalCombinations = REPORTERS.length * FLOWS.length * YEARS.length;
  let callsDone = done.size;
  let rowsTotal = 0;
  let skippedRegions = 0;
  let skippedUnknown = 0;
  const unknownCodes = new Set<number>();
  let consecutiveEmpty = 0;

  for (const reporter of REPORTERS) {
    // Use iso3 for reporter lookup (avoids M49 vs ISO-3166-1 numeric mismatches, e.g. USA 842 vs 840)
    const reporterEntityId = iso3Map.get(reporter.iso3);
    if (!reporterEntityId) {
      console.log(`  SKIP reporter ${reporter.iso3} (M49 ${reporter.m49}): no Entity match`);
      continue;
    }

    for (const flow of FLOWS) {
      for (const year of YEARS) {
        const key = `${reporter.m49}:${flow.code}:${year}`;
        if (done.has(key)) continue;

        const url = `${COMTRADE_BASE}?reporterCode=${reporter.m49}&period=${year}&cmdCode=TOTAL&flowCode=${flow.code}`;
        callsDone++;
        process.stdout.write(`  [${callsDone}/${totalCombinations}] ${reporter.iso3} ${flow.label} ${year}... `);

        try {
          const resp = await fetchWithRetry(url);
          const rows: TradeFlowRow[] = [];

          if (resp.data.length === 0) {
            consecutiveEmpty++;
            console.log(`0 rows`);

            if (consecutiveEmpty >= 3) {
              console.log(`    ⚠ 3 consecutive empty responses — possible silent rate limit. Pausing 60s...`);
              await new Promise((r) => setTimeout(r, 60000));
              consecutiveEmpty = 0;
            }
          } else {
            consecutiveEmpty = 0;

            for (const r of resp.data) {
              const partnerCode = r.partnerCode as number;
              if (SKIP_M49.has(partnerCode)) { skippedRegions++; continue; }

              const resolvedPartnerCode = M49_OVERRIDES[partnerCode] ?? partnerCode;
              const partnerEntityId = m49Map.get(resolvedPartnerCode);
              if (!partnerEntityId) {
                skippedUnknown++;
                unknownCodes.add(partnerCode);
                continue;
              }

              const valueUsd = r.primaryValue as number | null;
              if (valueUsd === null || valueUsd === undefined || valueUsd <= 0) continue;

              const fromId = flow.code === 'X' ? reporterEntityId : partnerEntityId;
              const toId = flow.code === 'X' ? partnerEntityId : reporterEntityId;

              rows.push({
                id: randomUUID(),
                year,
                fromId,
                toId,
                hsCode: 'TOTAL',
                quantity: null,
                unit: null,
                valueUsd,
              });
            }

            // Deduplicate: Comtrade can return same partner multiple times
            // (e.g., re-exports). Keep the one with highest valueUsd.
            const deduped = new Map<string, TradeFlowRow>();
            for (const r of rows) {
              const key = `${r.fromId}:${r.toId}:${r.hsCode}:${r.year}`;
              const existing = deduped.get(key);
              if (!existing || (r.valueUsd ?? 0) > (existing.valueUsd ?? 0)) {
                deduped.set(key, r);
              }
            }
            const dedupedRows = [...deduped.values()];

            if (dedupedRows.length > 0) {
              await bulkUpsertTradeFlows(prisma, dedupedRows);
              rowsTotal += dedupedRows.length;
            }
            console.log(`${dedupedRows.length} trade flows (${rows.length - dedupedRows.length} dupes removed)`);
          }

          done.add(key);
          saveProgress(done);
        } catch (err) {
          const msg = `${reporter.iso3} ${flow.label} ${year}: ${(err as Error).message}`;
          console.log(`FAILED: ${msg}`);
          logError(msg);
        }

        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
  }

  console.log(`\n  === SUMMARY ===`);
  console.log(`  Total rows upserted: ${rowsTotal}`);
  console.log(`  Skipped (aggregate regions): ${skippedRegions} (expected)`);
  console.log(`  Skipped (unknown M49 codes): ${skippedUnknown}`);
  if (unknownCodes.size > 0) {
    console.log(`  Unknown codes to investigate: ${[...unknownCodes].slice(0, 20).join(', ')}`);
  }

  // Cleanup progress file on successful completion
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
  console.log(`  Progress file cleaned up`);

  console.log('\n=== UN Comtrade Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
