/**
 * Ingest UN Comtrade — HS2 Commodity Bilateral Trade Flows
 *
 * P4 Fase B · Commodity-level trade for ML & country profiles
 *
 * Source: UN Comtrade Data API (authenticated, subscription key required)
 * Endpoint: https://comtradeapi.un.org/data/v1/get/C/A/HS
 * License: UN Open Data
 *
 * Scope: HS2-level (97 chapters) bilateral flows for ~59 top economies
 * × 5 years (2020-2024). Batches ~10 HS codes per request to reduce
 * API calls from ~58K to ~5.9K.
 *
 * Stores in TradeFlow table alongside Fase A TOTAL data (hsCode != 'TOTAL').
 * Direction convention: exports → fromId = reporter, toId = partner.
 *                       imports → fromId = partner, toId = reporter.
 *
 * Features: checkpoint resume, retry with backoff, HS batch requests,
 * M49 override map, ETA display.
 *
 * Requires: COMTRADE_API_KEY in apps/api/.env
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { bulkUpsertTradeFlows, type TradeFlowRow } from './lib/bulk-upsert-trade';
import { HS2_CODE_LIST } from './lib/hs2-codes';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

const API_KEY = process.env.COMTRADE_API_KEY;
if (!API_KEY) {
  console.error('ERROR: COMTRADE_API_KEY not found in .env');
  process.exit(1);
}

const COMTRADE_BASE = 'https://comtradeapi.un.org/data/v1/get/C/A/HS';
const DELAY_MS = 300;
const BATCH_SIZE = 10; // HS codes per API request
const YEARS = [2020, 2021, 2022, 2023, 2024];
const FLOWS: Array<{ code: string; label: string }> = [
  { code: 'X', label: 'exports' },
  { code: 'M', label: 'imports' },
];

const PROGRESS_FILE = path.join(__dirname, 'comtrade-hs2-progress.json');
const ERROR_LOG = path.join(__dirname, 'comtrade-hs2-errors.log');

const M49_OVERRIDES: Record<number, number> = {
  842: 840, 251: 250, 757: 756, 579: 578, 527: 528,
};

const SKIP_M49 = new Set([
  0, 97, 290, 492, 490, 568, 577, 636, 637, 699,
  711, 837, 838, 839, 849, 879, 899,
]);

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

// Build HS code batches (groups of BATCH_SIZE)
function buildHsBatches(): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < HS2_CODE_LIST.length; i += BATCH_SIZE) {
    batches.push(HS2_CODE_LIST.slice(i, i + BATCH_SIZE));
  }
  return batches;
}

function loadProgress(): Set<string> {
  if (!fs.existsSync(PROGRESS_FILE)) return new Set();
  const data: string[] = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  return new Set(data);
}

function saveProgress(done: Set<string>) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done], null, 2));
}

function logError(msg: string) {
  fs.appendFileSync(ERROR_LOG, `[${new Date().toISOString()}] ${msg}\n`);
}

async function fetchWithRetry(
  url: string,
  maxRetries = 3,
): Promise<{ count: number; data: Array<Record<string, unknown>> }> {
  const delays = [3000, 10000, 30000];
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data } = await axios.get<{ count?: number; data?: Array<Record<string, unknown>> }>(url, {
        timeout: 60000,
        headers: { 'Ocp-Apim-Subscription-Key': API_KEY! },
      });
      return { count: data.count ?? 0, data: data.data ?? [] };
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      const msg = (err as Error).message;

      if (status === 429) {
        const pause = attempt === 0 ? 60000 : 120000;
        console.log(`    429 rate limit — pausing ${pause / 1000}s...`);
        await new Promise((r) => setTimeout(r, pause));
        continue;
      }

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
  console.log('\n=== WorldLore: UN Comtrade HS2 Commodity Trade (P4 Fase B) ===\n');

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
  console.log(`  Entity lookup: ${m49Map.size} M49, ${iso3Map.size} iso3`);

  const hsBatches = buildHsBatches();
  console.log(`  HS2 codes: ${HS2_CODE_LIST.length} codes in ${hsBatches.length} batches of ${BATCH_SIZE}`);

  const done = loadProgress();
  console.log(`  Checkpoint: ${done.size} combinations already done`);

  const totalCombinations = REPORTERS.length * FLOWS.length * YEARS.length * hsBatches.length;
  let callsDone = done.size;
  let rowsTotal = 0;
  let skippedRegions = 0;
  let skippedUnknown = 0;
  const startTime = Date.now();

  for (const reporter of REPORTERS) {
    const reporterEntityId = iso3Map.get(reporter.iso3);
    if (!reporterEntityId) {
      console.log(`  SKIP reporter ${reporter.iso3}: no Entity match`);
      continue;
    }

    for (const flow of FLOWS) {
      for (const year of YEARS) {
        for (let batchIdx = 0; batchIdx < hsBatches.length; batchIdx++) {
          const batch = hsBatches[batchIdx];
          const key = `${reporter.m49}:${flow.code}:${year}:b${batchIdx}`;
          if (done.has(key)) continue;

          const cmdCode = batch.join(',');
          const url = `${COMTRADE_BASE}?reporterCode=${reporter.m49}&period=${year}&cmdCode=${cmdCode}&flowCode=${flow.code}`;
          callsDone++;

          // ETA calculation
          const elapsed = (Date.now() - startTime) / 1000;
          const remaining = callsDone > 1 ? ((elapsed / (callsDone - done.size)) * (totalCombinations - callsDone)) : 0;
          const eta = remaining > 0 ? `ETA ${Math.floor(remaining / 60)}m${Math.floor(remaining % 60)}s` : '';

          process.stdout.write(`  [${callsDone}/${totalCombinations}] ${reporter.iso3} ${flow.label} ${year} HS[${batch[0]}-${batch[batch.length - 1]}]... `);

          try {
            const resp = await fetchWithRetry(url);

            if (resp.data.length === 0) {
              console.log(`0 rows ${eta}`);
            } else {
              const rows: TradeFlowRow[] = [];

              for (const r of resp.data) {
                const partnerCode = r.partnerCode as number;
                if (SKIP_M49.has(partnerCode)) { skippedRegions++; continue; }

                const resolvedPartnerCode = M49_OVERRIDES[partnerCode] ?? partnerCode;
                const partnerEntityId = m49Map.get(resolvedPartnerCode);
                if (!partnerEntityId) { skippedUnknown++; continue; }

                const valueUsd = r.primaryValue as number | null;
                if (valueUsd === null || valueUsd === undefined || valueUsd <= 0) continue;

                const hsCode = String(r.cmdCode || '').padStart(2, '0');
                const fromId = flow.code === 'X' ? reporterEntityId : partnerEntityId;
                const toId = flow.code === 'X' ? partnerEntityId : reporterEntityId;

                const qty = r.qty as number | null;
                const unit = r.qtyUnitAbbr as string | null;

                rows.push({
                  id: randomUUID(),
                  year,
                  fromId,
                  toId,
                  hsCode,
                  quantity: qty && qty > 0 ? qty : null,
                  unit: unit && unit !== 'N/A' ? unit : null,
                  valueUsd,
                });
              }

              // Deduplicate: keep highest valueUsd per unique key
              const deduped = new Map<string, TradeFlowRow>();
              for (const r of rows) {
                const dk = `${r.fromId}:${r.toId}:${r.hsCode}:${r.year}`;
                const existing = deduped.get(dk);
                if (!existing || (r.valueUsd ?? 0) > (existing.valueUsd ?? 0)) {
                  deduped.set(dk, r);
                }
              }
              const dedupedRows = [...deduped.values()];

              if (dedupedRows.length > 0) {
                await bulkUpsertTradeFlows(prisma, dedupedRows);
                rowsTotal += dedupedRows.length;
              }
              console.log(`${dedupedRows.length} flows ${eta}`);
            }

            done.add(key);
            saveProgress(done);
          } catch (err) {
            const msg = `${reporter.iso3} ${flow.label} ${year} HS[${batch[0]}-${batch[batch.length - 1]}]: ${(err as Error).message}`;
            console.log(`FAILED: ${msg}`);
            logError(msg);
          }

          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    }
  }

  console.log(`\n  === SUMMARY ===`);
  console.log(`  Total HS2 rows upserted: ${rowsTotal}`);
  console.log(`  Skipped (aggregate regions): ${skippedRegions}`);
  console.log(`  Skipped (unknown M49 codes): ${skippedUnknown}`);
  console.log(`  Elapsed: ${((Date.now() - startTime) / 60000).toFixed(1)} minutes`);

  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
  console.log(`  Progress file cleaned up`);
  console.log('\n=== UN Comtrade HS2 Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
