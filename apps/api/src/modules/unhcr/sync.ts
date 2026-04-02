import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';
import { logger } from '../../config/logger.js';
import { fetchCorridors } from './client.js';
import { mapCorridors } from './mapper.js';

const BATCH_SIZE = 500;

export interface UNHCRSyncResult {
  corridorsUpserted: number;
  yearsProcessed: number[];
  errors: string[];
}

async function syncYear(year: number): Promise<{ upserted: number; errors: string[] }> {
  const errors: string[] = [];
  let upserted = 0;

  logger.info({ year }, 'Starting UNHCR sync for year');
  const raw = await fetchCorridors(year);
  const mapped = mapCorridors(raw);
  logger.info({ year, raw: raw.length, mapped: mapped.length }, 'UNHCR data mapped');

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);

    const values = batch.map(c => Prisma.sql`(
      gen_random_uuid(),
      ${c.originIso3}, ${c.originName},
      ${c.destinationIso3}, ${c.destinationName},
      ${c.year}::int,
      ${c.refugees}::int, ${c.asylumSeekers}::int, ${c.returnedRefugees}::int,
      ${c.idps}::int, ${c.stateless}::int, ${c.otherOfConcern}::int,
      ${c.otherInNeed}::int, ${c.hostCommunity}::int,
      NOW()
    )`);

    try {
      await prisma.$executeRaw`
        INSERT INTO "MigrationCorridor" (
          "id", "originIso3", "originName", "destinationIso3", "destinationName",
          "year", "refugees", "asylumSeekers", "returnedRefugees",
          "idps", "stateless", "otherOfConcern", "otherInNeed", "hostCommunity",
          "syncedAt"
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("originIso3", "destinationIso3", "year")
        DO UPDATE SET
          "originName" = EXCLUDED."originName",
          "destinationName" = EXCLUDED."destinationName",
          "refugees" = EXCLUDED."refugees",
          "asylumSeekers" = EXCLUDED."asylumSeekers",
          "returnedRefugees" = EXCLUDED."returnedRefugees",
          "idps" = EXCLUDED."idps",
          "stateless" = EXCLUDED."stateless",
          "otherOfConcern" = EXCLUDED."otherOfConcern",
          "otherInNeed" = EXCLUDED."otherInNeed",
          "hostCommunity" = EXCLUDED."hostCommunity",
          "syncedAt" = NOW()
      `;
      upserted += batch.length;
    } catch (err) {
      const msg = `UNHCR batch ${i}-${i + batch.length} year ${year} failed: ${err}`;
      logger.error(msg);
      errors.push(msg);
    }
  }

  logger.info({ year, corridors: mapped.length }, 'UNHCR year sync complete');
  return { upserted, errors };
}

export async function syncUnhcr(years: number[]): Promise<UNHCRSyncResult> {
  const result: UNHCRSyncResult = { corridorsUpserted: 0, yearsProcessed: [], errors: [] };

  try {
    const settled = await Promise.allSettled(years.map(year => syncYear(year).then(r => ({ year, ...r }))));

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        result.corridorsUpserted += outcome.value.upserted;
        result.yearsProcessed.push(outcome.value.year);
        result.errors.push(...outcome.value.errors);
      } else {
        const msg = `UNHCR year sync rejected: ${outcome.reason}`;
        logger.error(msg);
        result.errors.push(msg);
      }
    }

    logger.info(result, 'UNHCR sync complete');
  } catch (err) {
    const msg = `UNHCR sync top-level error: ${err}`;
    logger.error(msg);
    result.errors.push(msg);
  }

  return result;
}
