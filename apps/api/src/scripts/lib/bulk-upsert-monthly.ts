/**
 * Generic bulk upsert for monthly time-series tables.
 *
 * Designed for FinancialMarketMonthly today, reusable for any future table
 * with shape (entityId, indicatorCode, year, month, value). The tableName
 * parameter is always a hardcoded internal constant — never user input.
 */

import { PrismaClient } from '@prisma/client';
import { getSourceMetadata } from './source-metadata';

const BATCH_SIZE = 500;

export interface UpsertMonthlyRow {
  id: string;
  entityId: string;
  indicatorCode: string;
  year: number;
  month: number;
  value: number;
  source: string;
}

export async function bulkUpsertMonthly(
  prisma: PrismaClient,
  tableName: string,
  rows: UpsertMonthlyRow[],
): Promise<void> {
  if (rows.length === 0) return;

  const { sourceVersion, sourceReleaseDate } = getSourceMetadata(rows[0].source);
  const svLiteral = sourceVersion ? `'${sourceVersion.replace(/'/g, "''")}'` : 'NULL';
  const srdLiteral = sourceReleaseDate ? `'${sourceReleaseDate.toISOString()}'::timestamp` : 'NULL';

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = batch
      .map((r) =>
        `('${r.id}', '${r.entityId}', '${r.indicatorCode}', ${r.year}, ${r.month}, ${r.value}, '${r.source}', ${svLiteral}, ${srdLiteral}, NOW())`
      )
      .join(',\n');

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tableName}" ("id", "entityId", "indicatorCode", "year", "month", "value", "source", "sourceVersion", "sourceReleaseDate", "ingestedAt")
      VALUES ${values}
      ON CONFLICT ("entityId", "indicatorCode", "year", "month")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "source" = EXCLUDED."source",
        "sourceVersion" = EXCLUDED."sourceVersion",
        "sourceReleaseDate" = EXCLUDED."sourceReleaseDate",
        "ingestedAt" = NOW()
    `);
  }
}
