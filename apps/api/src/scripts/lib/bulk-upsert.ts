/**
 * Shared bulk upsert for IndicatorValue table.
 *
 * Replaces the ~10 copy-pasted inline bulkUpsert functions across ingestion scripts.
 * Includes sourceVersion, sourceReleaseDate, and ingestedAt for data versioning.
 */

import { PrismaClient } from '@prisma/client';
import { getSourceMetadata } from './source-metadata';

const BATCH_SIZE = 500;

export interface UpsertRow {
  id: string;
  entityId: string;
  indicatorCode: string;
  year: number;
  value: number;
  source: string;
  meta: unknown;
}

export async function bulkUpsertIndicatorValues(
  prisma: PrismaClient,
  rows: UpsertRow[],
): Promise<void> {
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
