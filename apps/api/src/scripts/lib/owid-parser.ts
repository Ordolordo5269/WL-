/**
 * Shared OWID (Our World in Data) API parser and bulk upsert utilities.
 *
 * Uses the OWID JSON API:
 *   - Data: https://api.ourworldindata.org/v1/indicators/{id}.data.json
 *     → { values: number[], years: number[], entities: number[] }
 *   - Metadata: https://api.ourworldindata.org/v1/indicators/{id}.metadata.json
 *     → { dimensions: { entities: { values: [{id, name, code}] } } }
 *
 * `code` in metadata is ISO3 alpha-3.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { getSourceMetadata } from './source-metadata';

const BATCH_SIZE = 500;

export interface OWIDRow {
  iso3: string;
  year: number;
  value: number;
}

export interface IndicatorDef {
  code: string;
  name: string;
  unit: string;
  topic: string;
  source: string;
}

/**
 * Fetch data from OWID JSON API by indicator ID.
 *
 * To find the indicator ID: inspect the page source of any OWID grapher URL,
 * look for `preload` links like:
 *   https://api.ourworldindata.org/v1/indicators/{ID}.data.json
 *
 * @param indicatorId — OWID indicator numeric ID
 * @param valueTransform — optional transform function
 */
export async function fetchOWIDData(
  indicatorId: number,
  valueTransform?: (value: number, year: number) => number
): Promise<OWIDRow[]> {
  console.log(`  Fetching OWID indicator ${indicatorId}...`);

  // Fetch data + metadata in parallel
  const [dataRes, metaRes] = await Promise.all([
    axios.get(`https://api.ourworldindata.org/v1/indicators/${indicatorId}.data.json`, { timeout: 60000 }),
    axios.get(`https://api.ourworldindata.org/v1/indicators/${indicatorId}.metadata.json`, { timeout: 60000 }),
  ]);

  const data = dataRes.data as { values: number[]; years: number[]; entities: number[] };
  const meta = metaRes.data as { dimensions: { entities: { values: Array<{ id: number; name: string; code: string }> } } };

  // Build entity ID → ISO3 lookup
  const entityIdToIso3: Record<number, string> = {};
  for (const ent of meta.dimensions.entities.values) {
    if (ent.code && ent.code.length === 3 && !ent.code.startsWith('OWI')) {
      entityIdToIso3[ent.id] = ent.code.toUpperCase();
    }
  }

  const results: OWIDRow[] = [];
  for (let i = 0; i < data.values.length; i++) {
    const entityId = data.entities[i];
    const iso3 = entityIdToIso3[entityId];
    if (!iso3) continue;

    const year = data.years[i];
    if (year < 1800 || year > 2030) continue;

    let value = data.values[i];
    if (value === null || value === undefined || !Number.isFinite(value)) continue;

    if (valueTransform) {
      value = valueTransform(value, year);
    }

    results.push({ iso3, year, value });
  }

  const countries = new Set(results.map(r => r.iso3));
  const minYear = results.length > 0 ? Math.min(...results.map(r => r.year)) : 0;
  const maxYear = results.length > 0 ? Math.max(...results.map(r => r.year)) : 0;
  console.log(`  Parsed ${results.length} rows (${countries.size} countries, years ${minYear}-${maxYear})`);

  return results;
}

/**
 * Ensure an indicator exists in the Indicator master table.
 */
export async function ensureIndicator(prisma: PrismaClient, def: IndicatorDef) {
  await prisma.indicator.upsert({
    where: { code: def.code },
    create: { code: def.code, name: def.name, topic: def.topic, unit: def.unit, source: def.source },
    update: { name: def.name, topic: def.topic, unit: def.unit, source: def.source },
  });
}

/**
 * Build ISO3 → Entity ID lookup for all COUNTRY entities.
 */
export async function buildEntityLookup(prisma: PrismaClient): Promise<Record<string, string>> {
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });

  const lookup: Record<string, string> = {};
  for (const e of entities) {
    lookup[(e.iso3 as string).toUpperCase()] = e.id;
  }
  console.log(`  ${Object.keys(lookup).length} country entities loaded`);
  return lookup;
}

/**
 * Convert OWID rows to upsert-ready records and bulk insert.
 */
export async function ingestRows(
  prisma: PrismaClient,
  indicatorCode: string,
  source: string,
  rows: OWIDRow[],
  entityLookup: Record<string, string>
): Promise<number> {
  const upsertRows: Array<{
    id: string;
    entityId: string;
    indicatorCode: string;
    year: number;
    value: number;
    source: string;
    meta: unknown;
  }> = [];

  for (const row of rows) {
    const entityId = entityLookup[row.iso3];
    if (!entityId) continue;

    upsertRows.push({
      id: randomUUID(),
      entityId,
      indicatorCode,
      year: row.year,
      value: row.value,
      source,
      meta: null,
    });
  }

  // Deduplicate by entityId+year (keep last)
  const seen = new Map<string, number>();
  for (let i = 0; i < upsertRows.length; i++) {
    const key = `${upsertRows[i].entityId}:${upsertRows[i].year}`;
    seen.set(key, i);
  }
  const deduped = upsertRows.filter((_, idx) => {
    const key = `${upsertRows[idx].entityId}:${upsertRows[idx].year}`;
    return seen.get(key) === idx;
  });

  if (deduped.length > 0) {
    await bulkUpsert(prisma, deduped);
  }

  return deduped.length;
}

/**
 * Bulk upsert using raw SQL INSERT ... ON CONFLICT for speed.
 */
async function bulkUpsert(
  prisma: PrismaClient,
  rows: Array<{
    id: string;
    entityId: string;
    indicatorCode: string;
    year: number;
    value: number;
    source: string;
    meta: unknown;
  }>
) {
  if (rows.length === 0) return;

  const { sourceVersion, sourceReleaseDate } = getSourceMetadata(rows[0].source);
  const svLiteral = sourceVersion ? `'${sourceVersion.replace(/'/g, "''")}'` : 'NULL';
  const srdLiteral = sourceReleaseDate ? `'${sourceReleaseDate.toISOString()}'::timestamp` : 'NULL';

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = batch
      .map((r) => {
        const metaJson = r.meta ? JSON.stringify(r.meta).replace(/'/g, "''") : null;
        return `('${r.id}', '${r.entityId}', '${r.indicatorCode}', ${r.year}, ${r.value}, '${r.source}', ${metaJson ? `'${metaJson}'::jsonb` : 'NULL'}, NOW(), ${svLiteral}, ${srdLiteral}, NOW())`;
      })
      .join(',\n');

    await prisma.$executeRawUnsafe(`
      INSERT INTO "IndicatorValue" ("id", "entityId", "indicatorCode", "year", "value", "source", "meta", "revisedAt", "sourceVersion", "sourceReleaseDate", "ingestedAt")
      VALUES ${values}
      ON CONFLICT ("entityId", "indicatorCode", "year")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "source" = EXCLUDED."source",
        "meta" = COALESCE(EXCLUDED."meta", "IndicatorValue"."meta"),
        "revisedAt" = NOW(),
        "sourceVersion" = EXCLUDED."sourceVersion",
        "sourceReleaseDate" = EXCLUDED."sourceReleaseDate",
        "ingestedAt" = NOW()
    `);
  }
}
