/**
 * Ingest CoinGecko — Monthly granularity for ML
 *
 * P1 Fase B · Same 5 coins as annual script, stores each monthly average
 * in FinancialMarketMonthly instead of aggregating to annual.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertMonthly, type UpsertMonthlyRow } from './lib/bulk-upsert-monthly';

const prisma = new PrismaClient();

const CG_BASE = 'https://api.coingecko.com/api/v3';
const DAYS_HISTORY = 365;
const TABLE_NAME = 'FinancialMarketMonthly';

interface CoinSpec { id: string; code: string; name: string }

const COINS: CoinSpec[] = [
  { id: 'bitcoin',      code: 'CRYPTO_BTC', name: 'Bitcoin' },
  { id: 'ethereum',     code: 'CRYPTO_ETH', name: 'Ethereum' },
  { id: 'binancecoin',  code: 'CRYPTO_BNB', name: 'BNB' },
  { id: 'solana',       code: 'CRYPTO_SOL', name: 'Solana' },
  { id: 'ripple',       code: 'CRYPTO_XRP', name: 'XRP' },
];

async function getOrCreateWorldEntity(): Promise<string> {
  const world = await prisma.entity.upsert({
    where: { slug: 'world' },
    update: {},
    create: { type: 'REGION', name: 'World', slug: 'world', iso3: 'WLD', region: 'Global' },
    select: { id: true },
  });
  return world.id;
}

async function fetchCoin(id: string): Promise<Array<[number, number]>> {
  const url = `${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${DAYS_HISTORY}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data } = await axios.get<{ prices: Array<[number, number]> }>(url, { timeout: 60000 });
      return data.prices;
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 429 && attempt < 3) {
        const wait = 30000 * (attempt + 1);
        console.log(`\n    rate-limited, waiting ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error('exhausted retries');
}

async function main() {
  console.log('\n=== WorldLore: CoinGecko Monthly Ingestion (P1 Fase B) ===\n');

  const worldEntityId = await getOrCreateWorldEntity();
  console.log(`  World entity: ${worldEntityId}\n`);

  const upsertRows: UpsertMonthlyRow[] = [];
  const stats: Record<string, number> = {};

  for (const c of COINS) {
    process.stdout.write(`  Fetching ${c.id} (${c.code})... `);
    try {
      const prices = await fetchCoin(c.id);

      const monthly = new Map<number, { sum: number; count: number }>();
      for (const [ts, price] of prices) {
        if (!isFinite(price)) continue;
        const d = new Date(ts);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const key = year * 100 + month;
        const bucket = monthly.get(key);
        if (!bucket) monthly.set(key, { sum: price, count: 1 });
        else { bucket.sum += price; bucket.count += 1; }
      }

      let count = 0;
      for (const [key, bucket] of monthly) {
        const year = Math.floor(key / 100);
        const month = key % 100;
        const value = bucket.sum / bucket.count;
        if (!isFinite(value)) continue;

        upsertRows.push({
          id: randomUUID(),
          entityId: worldEntityId,
          indicatorCode: c.code,
          year,
          month,
          value: Number(value.toFixed(2)),
          source: 'CoinGecko',
        });
        count++;
      }

      stats[c.code] = count;
      console.log(`${count} months`);
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }

    await new Promise((r) => setTimeout(r, 2100));
  }

  console.log('\n  Rows per indicator:');
  for (const [code, count] of Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`    ${code.padEnd(14)} ${count.toString().padStart(4)}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} monthly rows to ${TABLE_NAME}...`);
    await bulkUpsertMonthly(prisma, TABLE_NAME, upsertRows);
    console.log('  Done.');
  }

  console.log('\n=== CoinGecko Monthly Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
