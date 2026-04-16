/**
 * Bulk upsert for TradeFlow table.
 *
 * Uses ON CONFLICT (fromId, toId, hsCode, year) DO UPDATE.
 */

import { PrismaClient } from '@prisma/client';

const BATCH_SIZE = 500;

export interface TradeFlowRow {
  id: string;
  year: number;
  fromId: string;
  toId: string;
  hsCode: string;
  quantity: number | null;
  unit: string | null;
  valueUsd: number | null;
}

export async function bulkUpsertTradeFlows(
  prisma: PrismaClient,
  rows: TradeFlowRow[],
): Promise<void> {
  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = batch
      .map((r) => {
        const qty = r.quantity !== null ? r.quantity : 'NULL';
        const unit = r.unit ? `'${r.unit.replace(/'/g, "''")}'` : 'NULL';
        const val = r.valueUsd !== null ? r.valueUsd : 'NULL';
        return `('${r.id}', ${r.year}, '${r.fromId}', '${r.toId}', '${r.hsCode}', ${qty}, ${unit}, ${val})`;
      })
      .join(',\n');

    await prisma.$executeRawUnsafe(`
      INSERT INTO "TradeFlow" ("id", "year", "fromId", "toId", "hsCode", "quantity", "unit", "valueUsd")
      VALUES ${values}
      ON CONFLICT ("fromId", "toId", "hsCode", "year")
      DO UPDATE SET
        "valueUsd" = EXCLUDED."valueUsd",
        "quantity" = EXCLUDED."quantity",
        "unit" = EXCLUDED."unit"
    `);
  }
}
