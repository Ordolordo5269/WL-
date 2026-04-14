/**
 * Ingest CoinGecko — Major crypto prices
 *
 * P1 Fase A · Crypto capital flight / risk-on signal
 *
 * Source: CoinGecko API v3
 * Docs: https://docs.coingecko.com/reference/introduction
 * Free tier: 30 req/min, no key required
 *
 * Series: Bitcoin, Ethereum, BNB, Solana, XRP
 * Stored monthly average on WLD entity with latest tick in meta.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const CG_BASE = 'https://api.coingecko.com/api/v3';
// CoinGecko free-tier caps market_chart history at 365 days since 2024.
// For deeper history we'd need CoinGecko Pro. 365 days is enough for a
// meaningful rolling dashboard view; ML backfills can come later.
const DAYS_HISTORY = 365;
const YEAR_MIN = 2020;

interface CoinSpec { id: string; code: string; name: string }

const COINS: CoinSpec[] = [
  { id: 'bitcoin',      code: 'CRYPTO_BTC', name: 'Bitcoin' },
  { id: 'ethereum',     code: 'CRYPTO_ETH', name: 'Ethereum' },
  { id: 'binancecoin',  code: 'CRYPTO_BNB', name: 'BNB' },
  { id: 'solana',       code: 'CRYPTO_SOL', name: 'Solana' },
  { id: 'ripple',       code: 'CRYPTO_XRP', name: 'XRP' },
];

async function ensureIndicators() {
  for (const c of COINS) {
    await prisma.indicator.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        name: c.name,
        topic: 'Financial Markets',
        unit: 'USD',
        source: 'CoinGecko',
        description: `Monthly average close price in USD, stored on WLD entity.`,
      },
      update: { name: c.name, topic: 'Financial Markets', unit: 'USD', source: 'CoinGecko' },
    });
  }
  console.log(`  ${COINS.length} CoinGecko indicators ensured`);
}

async function getOrCreateWorldEntity(): Promise<string> {
  const world = await prisma.entity.upsert({
    where: { slug: 'world' },
    update: {},
    create: { type: 'REGION', name: 'World', slug: 'world', iso3: 'WLD', region: 'Global' },
    select: { id: true },
  });
  return world.id;
}

/**
 * CoinGecko returns an array of [timestampMs, priceUSD] tuples for `days=max`,
 * with automatic granularity (daily for long ranges).
 */
async function fetchCoin(id: string): Promise<Array<[number, number]>> {
  const url = `${CG_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${DAYS_HISTORY}`;
  // Retry with backoff on 429 (CoinGecko free-tier is fragile)
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data } = await axios.get<{ prices: Array<[number, number]> }>(url, { timeout: 60000 });
      return data.prices;
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 429 && attempt < 3) {
        const wait = 30000 * (attempt + 1); // 30s, 60s, 90s
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
  console.log('\n=== WorldLore: CoinGecko Crypto Ingestion (P1 Fase A) ===\n');

  await ensureIndicators();
  const worldEntityId = await getOrCreateWorldEntity();
  console.log(`  World entity: ${worldEntityId}\n`);

  const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
  const stats: Record<string, number> = {};

  for (const c of COINS) {
    process.stdout.write(`  Fetching ${c.id} (${c.code})... `);
    try {
      const prices = await fetchCoin(c.id);

      // Aggregate to annual with latest monthly tick
      type Bucket = { sum: number; count: number; latestMonth: number; latestYear: number; latestValue: number };
      const annual = new Map<number, Bucket>();
      for (const [ts, price] of prices) {
        if (!isFinite(price)) continue;
        const d = new Date(ts);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        if (year < YEAR_MIN) continue;
        const bucket = annual.get(year);
        if (!bucket) annual.set(year, { sum: price, count: 1, latestMonth: month, latestYear: year, latestValue: price });
        else {
          bucket.sum += price;
          bucket.count += 1;
          if (month > bucket.latestMonth || (month === bucket.latestMonth && ts > Date.UTC(year, month - 1, 1))) {
            bucket.latestMonth = month;
            bucket.latestValue = price;
          }
        }
      }

      for (const [year, b] of annual) {
        upsertRows.push({
          id: randomUUID(),
          entityId: worldEntityId,
          indicatorCode: c.code,
          year,
          value: Number((b.sum / b.count).toFixed(2)),
          source: 'CoinGecko',
          meta: {
            latestMonth: b.latestMonth,
            latestValue: Number(b.latestValue.toFixed(2)),
            pointsCount: b.count,
            coinGeckoId: c.id,
          },
        });
      }
      stats[c.code] = annual.size;
      console.log(`${annual.size} years`);
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }

    // Respect free-tier 30 req/min
    await new Promise((r) => setTimeout(r, 2100));
  }

  console.log('\n  Rows per indicator:');
  for (const [code, count] of Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`    ${code.padEnd(14)} ${count.toString().padStart(4)}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} rows...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log('  Done.');
  }

  console.log('\n=== CoinGecko Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
