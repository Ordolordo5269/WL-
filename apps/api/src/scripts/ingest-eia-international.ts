/**
 * Ingest EIA International — Oil production + consumption by country
 *
 * P3 Fase A · Paso A2 (MÍNIMO VIABLE — scope reducido vs plan original)
 *
 * Source: US Energy Information Administration (EIA)
 * API v2 — https://api.eia.gov/v2/international/data
 *
 * ───────────────────────────────────────────────────────────────
 *  POR QUÉ A2 TIENE SOLO 2 INDICADORES (vs 13 de A1)
 * ───────────────────────────────────────────────────────────────
 *
 * El plan original de A2 apuntaba a: reservas probadas (oil/gas/coal),
 * capacidad eléctrica instalada por tipo, y consumo global. Al inspeccionar
 * la API de EIA con la key registrada, descubrimos que:
 *
 *   1. `/v2/international` — solo petroleum (18 productIds, todos crude/refined)
 *   2. `/v2/natural-gas`   — solo US (filtra por stateId, no countryRegionId)
 *   3. `/v2/coal`          — solo US (idem — reserves-capacity es por state)
 *   4. `/v2/electricity`   — solo US
 *
 * EIA NO expone reservas, capacidad instalada ni consumo de gas/coal/electric
 * a nivel internacional en su API pública. Esos datasets existen como XLSX
 * descargables en eia.gov pero no en la API.
 *
 * Decisión (2026-04-14): ingestar SOLO lo que EIA sí ofrece a nivel global
 * — oil production + oil consumption — y no inventar proxies ni parsear
 * XLSX. El Energy Institute Statistical Review (ya en A1 vía OWID) cubre
 * el resto de combustibles a nivel global con calidad equivalente.
 *
 * Ver docs/DECISIONS.md entrada "2026-04-14 — A2 scope reducido" para el
 * razonamiento completo y opciones futuras de expansión.
 *
 * ───────────────────────────────────────────────────────────────
 *  QUÉ APORTA A2 SOBRE A1
 * ───────────────────────────────────────────────────────────────
 *
 *   - OIL_PROD_TBPD         — producción de crudo+NGPL+otros líquidos (kbbl/día)
 *   - OIL_CONSUMPTION_TBPD  — consumo de petróleo (kbbl/día)
 *
 * Ambos en MISMA UNIDAD (TBPD) → permite calcular directamente el ratio
 * producción/consumo en la UI ("oil self-sufficiency"). A1 tiene producción
 * en TWh, no comparable con consumo sin conversión. La narrativa "Arabia
 * exporta 2.99× lo que consume, Japón depende en 0.00×" es el diferencial.
 *
 * Requires: EIA_API_KEY en .env (gratuita, register en
 *           eia.gov/opendata/register.php — llega al instante)
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

dotenv.config();

const prisma = new PrismaClient();

const API_KEY = process.env.EIA_API_KEY;
const API_BASE = 'https://api.eia.gov/v2/international/data';
const PAGE_SIZE = 5000; // EIA max per call

const INDICATORS = [
  {
    code: 'OIL_PROD_TBPD',
    name: 'Oil Production (TBPD)',
    unit: 'thousand_barrels_per_day',
    topic: 'Raw Materials',
    productId: '55',   // Crude oil, NGPL, and other liquids
    activityId: '1',   // Production
  },
  {
    code: 'OIL_CONSUMPTION_TBPD',
    name: 'Oil Consumption (TBPD)',
    unit: 'thousand_barrels_per_day',
    topic: 'Raw Materials',
    productId: '5',    // Petroleum and other liquids (consumption-side aggregate)
    activityId: '2',   // Consumption
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'EIA' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'EIA' },
    });
  }
  console.log(`  ${INDICATORS.length} EIA indicators ensured`);
}

interface EiaRow {
  period: string;           // year as string "2025"
  countryRegionId: string;  // ISO3
  countryRegionTypeId: string; // "c" = country, others = regions
  value: string | null;
  unit: string;
}

/**
 * Fetch a single EIA query with pagination. Returns all rows matching the
 * given productId/activityId filter at country granularity and TBPD units.
 */
async function fetchEIARows(productId: string, activityId: string, indicatorCode: string): Promise<EiaRow[]> {
  const all: EiaRow[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams();
    params.set('api_key', API_KEY || '');
    params.set('frequency', 'annual');
    params.append('data[0]', 'value');
    params.append('facets[productId][]', productId);
    params.append('facets[activityId][]', activityId);
    params.append('facets[unit][]', 'TBPD');
    params.append('facets[countryRegionTypeId][]', 'c'); // only countries
    params.set('length', String(PAGE_SIZE));
    params.set('offset', String(offset));

    const url = `${API_BASE}?${params.toString()}`;

    let data: any;
    try {
      const res = await axios.get(url, { timeout: 60000 });
      data = res.data;
    } catch (err: any) {
      if (err?.response?.status === 429) {
        console.log(`  ⏸ 429 rate limit at offset ${offset}, waiting 5s`);
        await sleep(5000);
        continue;
      }
      throw err;
    }

    const rows: EiaRow[] = data?.response?.data || [];
    const total = parseInt(data?.response?.total || '0', 10);
    all.push(...rows);

    console.log(`    ${indicatorCode} offset=${offset} got=${rows.length} totalSoFar=${all.length}/${total}`);

    if (rows.length < PAGE_SIZE) break;       // no more pages
    if (all.length >= total) break;
    offset += PAGE_SIZE;

    // Conservative throttle: EIA is generous but we stay polite
    await sleep(400);
  }

  return all;
}

async function main() {
  console.log('\n=== WorldLore: EIA International Ingestion (P3 A2) ===\n');

  if (!API_KEY) {
    console.error('ERROR: EIA_API_KEY not set in .env');
    process.exit(1);
  }

  await ensureIndicators();

  // Build entity lookup
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  console.log(`  ${Object.keys(iso3ToEntityId).length} country entities loaded\n`);

  let totalUpserted = 0;
  const stats: Record<string, number> = {};

  for (const spec of INDICATORS) {
    console.log(`  Fetching ${spec.code} (productId=${spec.productId}, activityId=${spec.activityId})...`);
    const rows = await fetchEIARows(spec.productId, spec.activityId, spec.code);
    console.log(`  ${spec.code}: ${rows.length} raw rows from EIA`);

    const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
    let matched = 0;
    let skippedNoEntity = 0;
    let skippedNullValue = 0;

    for (const row of rows) {
      const iso3 = (row.countryRegionId || '').toUpperCase();
      if (!iso3 || iso3.length !== 3) continue;

      const year = parseInt(row.period, 10);
      if (isNaN(year) || year < 1980 || year > 2030) continue;

      if (row.value === null || row.value === '' || row.value === undefined) {
        skippedNullValue++;
        continue;
      }
      const value = parseFloat(row.value);
      if (!isFinite(value)) continue;

      const entityId = iso3ToEntityId[iso3];
      if (!entityId) { skippedNoEntity++; continue; }

      matched++;
      upsertRows.push({
        id: randomUUID(),
        entityId,
        indicatorCode: spec.code,
        year,
        value,
        source: 'EIA',
        meta: null,
      });
    }

    console.log(`    matched=${matched} skipped_null=${skippedNullValue} skipped_no_entity=${skippedNoEntity}`);

    if (upsertRows.length > 0) {
      await bulkUpsertIndicatorValues(prisma, upsertRows);
      stats[spec.code] = upsertRows.length;
      totalUpserted += upsertRows.length;
    }

    // Small break between indicators
    await sleep(500);
  }

  console.log('\n  Upserts per indicator:');
  for (const [code, count] of Object.entries(stats)) {
    console.log(`    ${code.padEnd(22)} ${count.toString().padStart(6)}`);
  }
  console.log(`\n  Total EIA records upserted: ${totalUpserted}`);
  console.log('\n=== EIA International Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
