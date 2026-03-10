/**
 * Run ACLED sync for all seeded conflicts.
 * Fetches events from the ACLED API and upserts them into the DB.
 */

import { PrismaClient } from '@prisma/client';
import { fetchAllAcledEvents, parseRawEvent } from '../modules/conflicts/acled-client.js';

const prisma = new PrismaClient();

async function main() {
  const conflicts = await prisma.acledConflict.findMany({
    select: {
      id: true,
      slug: true,
      filterCountry: true,
      filterIso: true,
      filterActors: true,
      filterDateFrom: true,
      filterDateTo: true,
    },
  });

  console.log(`Found ${conflicts.length} conflicts to sync\n`);

  for (const conflict of conflicts) {
    console.log(`⟳ Syncing ${conflict.slug}...`);

    if (!conflict.filterCountry && !conflict.filterIso) {
      console.log(`  ⚠ No filter criteria — skipping`);
      continue;
    }

    try {
      const rawEvents = await fetchAllAcledEvents({
        country: conflict.filterCountry ?? undefined,
        iso: conflict.filterIso ?? undefined,
        dateFrom: conflict.filterDateFrom?.toISOString().split('T')[0],
        dateTo: conflict.filterDateTo?.toISOString().split('T')[0],
      });

      console.log(`  Fetched ${rawEvents.length} raw events from ACLED`);

      // Filter by actor patterns if specified
      let filtered = rawEvents;
      if (conflict.filterActors.length > 0) {
        const patterns = conflict.filterActors.map((a) => a.toLowerCase());
        filtered = rawEvents.filter((e) => {
          const a1 = (e.actor1 || '').toLowerCase();
          const a2 = (e.actor2 || '').toLowerCase();
          return patterns.some((p) => a1.includes(p) || a2.includes(p));
        });
        console.log(`  After actor filter: ${filtered.length} events`);
      }

      // Parse and upsert in batches
      const parsed = filtered.map((raw) => ({
        ...parseRawEvent(raw),
        conflictId: conflict.id,
      }));

      const BATCH_SIZE = 500;
      let upserted = 0;

      for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
        const batch = parsed.slice(i, i + BATCH_SIZE);
        await prisma.$transaction(
          batch.map((e) =>
            prisma.acledEvent.upsert({
              where: { eventIdCnty: e.eventIdCnty },
              update: { ...e, syncedAt: new Date() },
              create: e,
            })
          )
        );
        upserted += batch.length;
        process.stdout.write(`  Upserted ${upserted}/${parsed.length}\r`);
      }

      // Refresh aggregates
      const agg = await prisma.acledEvent.aggregate({
        where: { conflictId: conflict.id },
        _count: true,
        _sum: { fatalities: true },
        _max: { eventDate: true },
      });

      await prisma.acledConflict.update({
        where: { id: conflict.id },
        data: {
          totalEvents: agg._count,
          totalFatalities: agg._sum.fatalities ?? 0,
          lastEventDate: agg._max.eventDate,
        },
      });

      console.log(`\n  ✔ ${conflict.slug}: ${upserted} events, ${agg._sum.fatalities ?? 0} total fatalities`);
    } catch (err) {
      console.error(`  ✗ ${conflict.slug}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log('\nSync complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
