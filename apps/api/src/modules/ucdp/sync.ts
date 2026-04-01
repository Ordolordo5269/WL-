import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';
import { logger } from '../../config/logger.js';
import { fetchGedEvents, discoverCandidateVersions } from './client.js';
import { groupEventsIntoConflicts, type UcdpConflictGroup } from './mapper.js';
import type { UcdpRawEvent } from './client.js';
import { broadcastConflictUpdate } from '../../websocket/broadcast.js';

export interface SyncResult {
  versionsProcessed: string[];
  eventsIngested: number;
  conflictsCreated: number;
  conflictsUpdated: number;
  errors: string[];
}

/**
 * Batch insert raw events using raw SQL for performance.
 * Skips events that already exist (ON CONFLICT DO NOTHING on first pass,
 * then bulk-updates conflictId linkage).
 */
async function batchInsertEvents(events: UcdpRawEvent[], conflictId: string) {
  const BATCH_SIZE = 500;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);

    const values = batch.map(e => {
      return Prisma.sql`(
        gen_random_uuid(),
        ${e.id}::int,
        ${e.year}::int,
        ${e.conflict_name},
        ${e.dyad_name},
        ${e.side_a},
        ${e.side_b},
        ${new Date(e.date_start)}::timestamp,
        ${new Date(e.date_end)}::timestamp,
        ${e.deaths_a}::int,
        ${e.deaths_b}::int,
        ${e.deaths_civilians}::int,
        ${e.deaths_unknown}::int,
        ${e.best}::int,
        ${e.high}::int,
        ${e.low}::int,
        ${e.country},
        ${e.country_id}::int,
        ${e.region},
        ${e.latitude}::float8,
        ${e.longitude}::float8,
        ${e.where_description || null},
        ${e.adm_1 || null},
        ${e.adm_2 || null},
        ${e.type_of_violence}::int,
        ${e.source_article || null},
        ${e.source_headline || null},
        ${e.conflict_new_id}::int,
        ${e.dyad_new_id}::int,
        ${conflictId}::uuid,
        now()
      )`;
    });

    await prisma.$executeRaw`
      INSERT INTO "UcdpGedEvent" (
        "id", "ucdpEventId", "year", "conflictName", "dyadName",
        "sideA", "sideB", "dateStart", "dateEnd",
        "deathsA", "deathsB", "deathsCivilians", "deathsUnknown",
        "bestEstimate", "highEstimate", "lowEstimate",
        "country", "countryId", "region", "latitude", "longitude",
        "whereDescription", "adm1", "adm2", "typeOfViolence",
        "sourceArticle", "sourceHeadline", "conflictNewId", "dyadNewId",
        "conflictId", "createdAt"
      )
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("ucdpEventId") DO UPDATE SET
        "deathsA" = EXCLUDED."deathsA",
        "deathsB" = EXCLUDED."deathsB",
        "deathsCivilians" = EXCLUDED."deathsCivilians",
        "deathsUnknown" = EXCLUDED."deathsUnknown",
        "bestEstimate" = EXCLUDED."bestEstimate",
        "highEstimate" = EXCLUDED."highEstimate",
        "lowEstimate" = EXCLUDED."lowEstimate",
        "conflictId" = EXCLUDED."conflictId"
    `;
  }
}

/**
 * Upsert a conflict derived from grouped UCDP events
 */
async function upsertConflict(group: UcdpConflictGroup): Promise<string> {
  const existing = await prisma.conflict.findFirst({
    where: {
      OR: [
        { slug: group.slug },
        { ucdpConflictId: group.conflictNewId },
      ],
    },
  });

  const conflictData = {
    name: group.conflictName,
    country: group.countries.join(', '),
    region: group.region,
    conflictType: group.conflictType,
    description: group.description,
    status: group.status,
    startDate: group.startDate,
    endDate: group.endDate,
    coordinates: group.coordinates,
    involvedISO: group.involvedISO,
    sources: group.sources,
    ucdpConflictId: group.conflictNewId,
    dyadName: group.dyadName,
    sideA: group.sideA,
    sideB: group.sideB,
    typeOfViolence: group.typeOfViolence,
    adminRegion: group.events[0]?.adm_1 || null,
    dataSource: 'ucdp',
    lastSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.conflict.update({
      where: { id: existing.id },
      data: conflictData,
    });
    return existing.id;
  }

  const created = await prisma.conflict.create({
    data: {
      slug: group.slug,
      ...conflictData,
    },
  });
  return created.id;
}

/**
 * Batch upsert monthly casualty aggregates
 */
async function upsertCasualties(conflictId: string, group: UcdpConflictGroup) {
  const monthMap = new Map<string, { military: number; civilian: number; total: number }>();

  for (const event of group.events) {
    const monthKey = event.date_start.substring(0, 7);
    const existing = monthMap.get(monthKey) || { military: 0, civilian: 0, total: 0 };
    existing.military += event.deaths_a + event.deaths_b;
    existing.civilian += event.deaths_civilians;
    existing.total += event.best;
    monthMap.set(monthKey, existing);
  }

  // Delete existing UCDP casualties for this conflict and re-insert
  await prisma.conflictCasualty.deleteMany({
    where: { conflictId, source: 'UCDP' },
  });

  const records = [...monthMap.entries()].map(([monthKey, data]) => ({
    conflictId,
    date: new Date(`${monthKey}-01`),
    military: data.military,
    civilian: data.civilian,
    total: data.total,
    source: 'UCDP',
    notes: `UCDP GED aggregated data for ${monthKey}`,
  }));

  if (records.length > 0) {
    await prisma.conflictCasualty.createMany({ data: records });
  }
}

/**
 * Main sync function: discovers UCDP candidate versions,
 * fetches all events, groups them, and batch-inserts into the database.
 */
export async function syncUcdpData(): Promise<SyncResult> {
  const result: SyncResult = {
    versionsProcessed: [],
    eventsIngested: 0,
    conflictsCreated: 0,
    conflictsUpdated: 0,
    errors: [],
  };

  try {
    logger.info('Starting UCDP sync...');

    // Discover available candidate versions for 2026 (current year data only)
    const versions = await discoverCandidateVersions(26);

    if (versions.length === 0) {
      logger.warn('No UCDP candidate versions found');
      return result;
    }

    // Fetch all events from all versions
    const allEvents: UcdpRawEvent[] = [];
    for (const version of versions) {
      try {
        const events = await fetchGedEvents(version);
        allEvents.push(...events);
        result.versionsProcessed.push(version);
      } catch (err) {
        const msg = `Failed to fetch version ${version}: ${err}`;
        logger.error(msg);
        result.errors.push(msg);
      }
    }

    // Deduplicate events by UCDP event ID
    const uniqueEvents = new Map<number, UcdpRawEvent>();
    for (const event of allEvents) {
      uniqueEvents.set(event.id, event);
    }
    const dedupedEvents = Array.from(uniqueEvents.values());
    logger.info({ totalRaw: allEvents.length, deduped: dedupedEvents.length }, 'Events collected');

    // Group events into conflict-level aggregates
    const conflictGroups = groupEventsIntoConflicts(dedupedEvents);
    logger.info({ conflicts: conflictGroups.length }, 'Conflict groups derived');

    // Count existing UCDP conflicts to determine created vs updated
    const existingSlugs = new Set(
      (await prisma.conflict.findMany({
        where: { dataSource: 'ucdp' },
        select: { slug: true },
      })).map(c => c.slug)
    );

    // Process each conflict group
    for (const group of conflictGroups) {
      try {
        const isNew = !existingSlugs.has(group.slug);
        const conflictId = await upsertConflict(group);

        // Batch insert raw events (500 per batch via raw SQL)
        await batchInsertEvents(group.events, conflictId);

        // Batch upsert casualty aggregates
        await upsertCasualties(conflictId, group);

        if (isNew) {
          result.conflictsCreated++;
        } else {
          result.conflictsUpdated++;
        }

        result.eventsIngested += group.events.length;

        // Log progress every 50 conflicts
        if ((result.conflictsCreated + result.conflictsUpdated) % 50 === 0) {
          logger.info({
            progress: result.conflictsCreated + result.conflictsUpdated,
            total: conflictGroups.length,
            events: result.eventsIngested,
          }, 'Sync progress');
        }
      } catch (err) {
        const msg = `Failed to upsert conflict "${group.conflictName}": ${err}`;
        logger.error(msg);
        result.errors.push(msg);
      }
    }

    // Broadcast a single update at the end
    broadcastConflictUpdate({ id: 'sync', type: 'updated' });

    logger.info(result, 'UCDP sync completed');
  } catch (err) {
    logger.error({ err }, 'UCDP sync failed');
    result.errors.push(String(err));
  }

  return result;
}

/**
 * Get sync status information
 */
export async function getSyncStatus() {
  const lastSynced = await prisma.conflict.findFirst({
    where: { dataSource: 'ucdp' },
    orderBy: { lastSyncedAt: 'desc' },
    select: { lastSyncedAt: true },
  });

  const totalConflicts = await prisma.conflict.count({ where: { dataSource: 'ucdp' } });
  const totalEvents = await prisma.ucdpGedEvent.count();

  return {
    lastSyncedAt: lastSynced?.lastSyncedAt || null,
    totalConflicts,
    totalEvents,
  };
}
