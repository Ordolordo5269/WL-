/**
 * Ingest Polymarket — Curated geopolitical prediction markets
 *
 * P1 Fase A · Sentiment / probability layer
 *
 * Source: Polymarket Gamma API
 * Docs: https://docs.polymarket.com/
 * No API key required
 *
 * Curación: lista hardcoded de slugs de mercados geopolíticos con liquidez
 * significativa (>$100K volumen). Mercados de entretenimiento (sports,
 * celebrities, memes) NO se incluyen — diluyen valor intelligence.
 *
 * Schema: Writes to the dedicated `PredictionMarketSnapshot` table (NOT
 * `IndicatorValue`). Event-based data with lifecycle fields (resolved,
 * closeDate) does not fit the (entity, indicator, year) shape of the
 * main indicators table. See DECISIONS.md 2026-04-15.
 *
 * Idempotency: Upsert keyed by `marketSlug`. Re-running the script updates
 * yesPrice/volume/liquidity + snapshotAt on each market. Expired markets
 * stay in DB as historical records (resolved=true filters them out of UI).
 *
 * Revisión editorial trimestral recomendada: algunos mercados se cierran,
 * otros nuevos aparecen. La lista en CURATED_MARKETS se actualiza a mano.
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const POLYMARKET_PUBLIC_BASE = 'https://polymarket.com/event';

/**
 * Curated geopolitical markets. Update quarterly.
 * Each entry is keyed by `slug`; category is used for UI grouping.
 */
const CURATED_MARKETS: Array<{ slug: string; category: string }> = [
  { category: 'Conflict',  slug: 'will-the-us-invade-iran-before-2027' },
  { category: 'Elections', slug: 'will-tucker-carlson-win-the-2028-republican-presidential-nomination' },
  { category: 'Elections', slug: 'will-tucker-carlson-win-the-2028-us-presidential-election' },
  { category: 'Elections', slug: 'will-donald-trump-jr-win-the-2028-us-presidential-election' },
  { category: 'Macro',     slug: 'will-stephen-miran-be-confirmed-as-fed-chair' },
  { category: 'Elections', slug: 'will-naftali-bennett-be-the-next-prime-minister-of-israel' },
  { category: 'Geopol',    slug: 'will-reza-pahlavi-enter-iran-by-december-31-898-927' },
  { category: 'Diplomacy', slug: 'will-trump-and-putin-meet-next-in-another-european-country-954-837-364' },
];

interface PolyMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string;
  outcomePrices: string;
  volumeNum?: number;
  liquidityNum?: number;
  endDateIso?: string;
  active: boolean;
  closed: boolean;
  /**
   * Some markets are children of multi-market events. When present, the
   * canonical public URL lives at `/event/{events[0].slug}`, not
   * `/event/{market.slug}`. Standalone markets have event slug === market slug.
   */
  events?: Array<{ slug?: string; ticker?: string; id?: string }>;
}

async function fetchMarketBySlug(slug: string): Promise<PolyMarket | null> {
  const { data } = await axios.get<PolyMarket[]>(`${GAMMA_BASE}/markets`, {
    params: { slug },
    timeout: 30000,
  });
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

async function upsertSnapshot(input: {
  marketSlug: string;
  source: string;
  question: string;
  category: string;
  outcomes: string[];
  yesPrice: number;
  noPrice: number;
  probability: number;
  volume: number | null;
  liquidity: number | null;
  closeDate: Date | null;
  sourceUrl: string;
}) {
  const iso = input.closeDate ? input.closeDate.toISOString() : null;
  const resolved = input.closeDate ? input.closeDate.getTime() < Date.now() : false;
  const outcomesJson = JSON.stringify(input.outcomes);

  // Use raw SQL to stay independent of Prisma client type drift during dev;
  // a later refactor can swap to prisma.predictionMarketSnapshot.upsert()
  // once the generated client is reliably in sync across environments.
  await prisma.$executeRawUnsafe(
    `INSERT INTO "PredictionMarketSnapshot"
      ("marketSlug","source","question","category","outcomes",
       "yesPrice","noPrice","probability","volume","liquidity",
       "closeDate","resolved","snapshotAt","sourceUrl")
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11::timestamp,$12,NOW(),$13)
     ON CONFLICT ("marketSlug") DO UPDATE SET
       "question"    = EXCLUDED."question",
       "category"    = EXCLUDED."category",
       "outcomes"    = EXCLUDED."outcomes",
       "yesPrice"    = EXCLUDED."yesPrice",
       "noPrice"     = EXCLUDED."noPrice",
       "probability" = EXCLUDED."probability",
       "volume"      = EXCLUDED."volume",
       "liquidity"   = EXCLUDED."liquidity",
       "closeDate"   = EXCLUDED."closeDate",
       "resolved"    = EXCLUDED."resolved",
       "snapshotAt"  = NOW(),
       "sourceUrl"   = EXCLUDED."sourceUrl"`,
    input.marketSlug,
    input.source,
    input.question,
    input.category,
    outcomesJson,
    input.yesPrice,
    input.noPrice,
    input.probability,
    input.volume,
    input.liquidity,
    iso,
    resolved,
    input.sourceUrl,
  );
}

async function main() {
  console.log('\n=== WorldLore: Polymarket Curated Events (P1 Fase A, PredictionMarketSnapshot) ===\n');

  let resolved = 0;
  let missing = 0;
  let closedSkip = 0;

  for (const m of CURATED_MARKETS) {
    process.stdout.write(`  Fetching ${m.slug.slice(0, 55)}... `);
    try {
      const market = await fetchMarketBySlug(m.slug);
      if (!market) { console.log('NOT FOUND'); missing++; continue; }

      const outcomes: string[] = JSON.parse(market.outcomes || '[]');
      const prices: string[] = JSON.parse(market.outcomePrices || '[]');
      if (outcomes.length < 2 || prices.length < 2) { console.log('no prices'); continue; }

      const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === 'yes');
      const yesPrice = yesIdx >= 0 ? parseFloat(prices[yesIdx]) : parseFloat(prices[0]);
      const noPrice = yesIdx >= 0 ? parseFloat(prices[1 - yesIdx] ?? prices[1]) : parseFloat(prices[1] ?? '0');
      if (!isFinite(yesPrice)) { console.log('invalid prob'); continue; }

      const closeDate = market.endDateIso ? new Date(market.endDateIso) : null;
      // Prefer the parent event slug (works for multi-market events like
      // "republican-presidential-nominee-2028"); fall back to the market
      // slug for standalone markets where both are identical.
      const eventSlug = market.events?.[0]?.slug || market.slug;
      const sourceUrl = `${POLYMARKET_PUBLIC_BASE}/${eventSlug}`;

      await upsertSnapshot({
        marketSlug: market.slug,
        source: 'Polymarket',
        question: market.question,
        category: m.category,
        outcomes,
        yesPrice,
        noPrice: isFinite(noPrice) ? noPrice : 1 - yesPrice,
        probability: yesPrice,
        volume: market.volumeNum ?? null,
        liquidity: market.liquidityNum ?? null,
        closeDate,
        sourceUrl,
      });

      if (market.closed || (closeDate && closeDate.getTime() < Date.now())) {
        console.log(`p(yes)=${(yesPrice * 100).toFixed(1)}% (CLOSED, stored as resolved)`);
        closedSkip++;
      } else {
        console.log(`p(yes)=${(yesPrice * 100).toFixed(1)}% vol=$${(market.volumeNum || 0).toLocaleString()}`);
      }
      resolved++;
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
      missing++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n  Upserted ${resolved}/${CURATED_MARKETS.length} markets (${closedSkip} already closed; ${missing} missing)`);
  console.log('\n=== Polymarket Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
