import { prisma } from '../../db/client.js';
import { fetchAllPages, detectLatestCandidateVersion } from './client.js';
import type {
  RawGedEvent,
  RawConflict,
  RawBattleDeaths,
  RawNonState,
  RawOneSided,
  SyncDataset,
  SyncResult,
} from './types.js';

const DEFAULT_VERSION = '25.1';
const BATCH_SIZE = 500;

// ============================
// Helpers
// ============================

/** Parse a "YYYY-MM-DD" string into a Date, or return null */
function parseDate(value: string | null | undefined): Date | null {
  if (!value || value === '' || value === '-1') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Safely coerce a value that may be string or number to an integer */
function toInt(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(n) ? fallback : n;
}

/** Coerce "0"/"1" or 0/1 to boolean */
function toBool(value: string | number | null | undefined): boolean {
  return toInt(value) === 1;
}

/** Create a sync log entry */
async function createSyncLog(dataset: SyncDataset, version: string) {
  return prisma.ucdpSyncLog.create({
    data: { dataset, version, status: 'running' },
  });
}

/** Update a sync log entry on completion or failure */
async function finishSyncLog(
  logId: string,
  status: 'completed' | 'failed',
  counts: { recordsFetched: number; recordsInserted: number; recordsUpdated: number },
  errors?: unknown,
) {
  await prisma.ucdpSyncLog.update({
    where: { id: logId },
    data: {
      status,
      finishedAt: new Date(),
      recordsFetched: counts.recordsFetched,
      recordsInserted: counts.recordsInserted,
      recordsUpdated: counts.recordsUpdated,
      errors: errors ? JSON.parse(JSON.stringify(errors)) : undefined,
    },
  });
}

// ============================
// GED Events sync
// ============================

export async function syncGedEvents(version: string = DEFAULT_VERSION): Promise<SyncResult> {
  const dataset: SyncDataset = 'gedevents';
  const log = await createSyncLog(dataset, version);
  const counts = { recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0 };

  try {
    const pages = fetchAllPages<RawGedEvent>('gedevents', version);

    for await (const { results, page, totalPages } of pages) {
      counts.recordsFetched += results.length;
      console.log('[UCDP Sync] gedevents page ' + (page + 1) + '/' + totalPages + ' - ' + results.length + ' records');

      // Process in batches
      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);

        const mapped = batch.map((r) => ({
          id: r.id,
          relid: r.relid,
          year: r.year,
          activeYear: toBool(r.active_year),
          typeOfViolence: r.type_of_violence,
          conflictNewId: r.conflict_new_id ?? null,
          conflictName: r.conflict_name,
          dyadName: r.dyad_name ?? null,
          sideA: r.side_a,
          sideB: r.side_b,
          country: r.country,
          countryId: r.country_id,
          region: r.region,
          latitude: r.latitude,
          longitude: r.longitude,
          geomWkt: r.geom_wkt ?? null,
          wherePrecision: r.where_prec ?? null,
          whereDescription: r.where_description ?? null,
          adm1: r.adm_1 ?? null,
          adm2: r.adm_2 ?? null,
          dateStart: new Date(r.date_start),
          dateEnd: new Date(r.date_end),
          deathsA: r.deaths_a,
          deathsB: r.deaths_b,
          deathsCivilians: r.deaths_civilians,
          deathsUnknown: r.deaths_unknown,
          bestEstimate: r.best,
          highEstimate: r.high,
          lowEstimate: r.low,
          sourceArticle: r.source_article ?? null,
          sourceOriginal: r.source_original ?? null,
          isCandidate: version.startsWith('26.'),
          ucdpVersion: version,
          syncedAt: new Date(),
        }));

        // Upsert: try createMany first, then fall back to individual upserts for duplicates
        const result = await prisma.ucdpGedEvent.createMany({
          data: mapped,
          skipDuplicates: true,
        });
        counts.recordsInserted += result.count;

        // Update existing records that were skipped
        const skipped = mapped.length - result.count;
        if (skipped > 0) {
          for (const record of mapped) {
            await prisma.ucdpGedEvent.upsert({
              where: { id: record.id },
              create: record,
              update: { ...record, syncedAt: new Date() },
            });
          }
          counts.recordsUpdated += skipped;
        }
      }
    }

    await finishSyncLog(log.id, 'completed', counts);
    return { dataset, version, ...counts, status: 'completed' };
  } catch (error) {
    await finishSyncLog(log.id, 'failed', counts, error instanceof Error ? { message: error.message } : error);
    return { dataset, version, ...counts, status: 'failed', errors: error };
  }
}

// ============================
// Conflicts sync
// ============================

export async function syncConflicts(version: string = DEFAULT_VERSION): Promise<SyncResult> {
  const dataset: SyncDataset = 'ucdpprioconflict';
  const log = await createSyncLog(dataset, version);
  const counts = { recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0 };

  try {
    const pages = fetchAllPages<RawConflict>('ucdpprioconflict', version);

    for await (const { results, page, totalPages } of pages) {
      counts.recordsFetched += results.length;
      console.log('[UCDP Sync] conflicts page ' + (page + 1) + '/' + totalPages + ' - ' + results.length + ' records');

      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);

        for (const r of batch) {
          const data = {
            ucdpConflictId: r.conflict_id,
            location: r.location,
            sideA: r.side_a,
            sideAId: r.side_a_id ?? null,
            sideA2nd: r.side_a_2nd ?? null,
            sideB: r.side_b,
            sideBId: r.side_b_id ?? null,
            sideB2nd: r.side_b_2nd ?? null,
            incompatibility: toInt(r.incompatibility),
            territoryName: r.territory_name ?? null,
            year: toInt(r.year),
            intensityLevel: toInt(r.intensity_level),
            cumulativeIntensity: toInt(r.cumulative_intensity),
            typeOfConflict: toInt(r.type_of_conflict),
            startDate: new Date(r.start_date),
            startDate2: parseDate(r.start_date2),
            epEnd: toBool(r.ep_end),
            epEndDate: parseDate(r.ep_end_date),
            region: toInt(r.region),
            gwnoA: r.gwno_a ?? null,
            gwnoLoc: r.gwno_loc ?? null,
            ucdpVersion: version,
            syncedAt: new Date(),
          };

          await prisma.ucdpConflict.upsert({
            where: {
              ucdpConflictId_year: {
                ucdpConflictId: data.ucdpConflictId,
                year: data.year,
              },
            },
            create: data,
            update: { ...data, syncedAt: new Date() },
          });

          counts.recordsInserted++;
        }
      }
    }

    await finishSyncLog(log.id, 'completed', counts);
    return { dataset, version, ...counts, status: 'completed' };
  } catch (error) {
    await finishSyncLog(log.id, 'failed', counts, error instanceof Error ? { message: error.message } : error);
    return { dataset, version, ...counts, status: 'failed', errors: error };
  }
}

// ============================
// Battle Deaths sync
// ============================

export async function syncBattleDeaths(version: string = DEFAULT_VERSION): Promise<SyncResult> {
  const dataset: SyncDataset = 'battledeaths';
  const log = await createSyncLog(dataset, version);
  const counts = { recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0 };

  try {
    const pages = fetchAllPages<RawBattleDeaths>('battledeaths', version);

    for await (const { results, page, totalPages } of pages) {
      counts.recordsFetched += results.length;
      console.log('[UCDP Sync] battledeaths page ' + (page + 1) + '/' + totalPages + ' - ' + results.length + ' records');

      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);

        for (const r of batch) {
          const data = {
            ucdpConflictId: r.conflict_id,
            dyadId: r.dyad_id,
            location: r.location,
            sideA: r.side_a,
            sideB: r.side_b,
            year: toInt(r.year),
            bdBest: toInt(r.bd_best),
            bdLow: toInt(r.bd_low),
            bdHigh: toInt(r.bd_high),
            typeOfConflict: toInt(r.type_of_conflict),
            battleLocation: r.battle_location ?? null,
            region: toInt(r.region),
            ucdpVersion: version,
            syncedAt: new Date(),
          };

          await prisma.ucdpBattleDeaths.upsert({
            where: {
              ucdpConflictId_dyadId_year: {
                ucdpConflictId: data.ucdpConflictId,
                dyadId: data.dyadId,
                year: data.year,
              },
            },
            create: data,
            update: { ...data, syncedAt: new Date() },
          });

          counts.recordsInserted++;
        }
      }
    }

    await finishSyncLog(log.id, 'completed', counts);
    return { dataset, version, ...counts, status: 'completed' };
  } catch (error) {
    await finishSyncLog(log.id, 'failed', counts, error instanceof Error ? { message: error.message } : error);
    return { dataset, version, ...counts, status: 'failed', errors: error };
  }
}

// ============================
// Non-State sync
// ============================

export async function syncNonState(version: string = DEFAULT_VERSION): Promise<SyncResult> {
  const dataset: SyncDataset = 'nonstate';
  const log = await createSyncLog(dataset, version);
  const counts = { recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0 };

  try {
    const pages = fetchAllPages<RawNonState>('nonstate', version);

    for await (const { results, page, totalPages } of pages) {
      counts.recordsFetched += results.length;
      console.log('[UCDP Sync] nonstate page ' + (page + 1) + '/' + totalPages + ' - ' + results.length + ' records');

      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);

        for (const r of batch) {
          const data = {
            ucdpConflictId: r.conflict_id,
            dyadId: r.dyad_id,
            sideAName: r.side_a_name,
            sideBName: r.side_b_name,
            year: toInt(r.year),
            bestFatalityEstimate: toInt(r.best_fatality_estimate),
            lowFatalityEstimate: toInt(r.low_fatality_estimate),
            highFatalityEstimate: toInt(r.high_fatality_estimate),
            location: r.location,
            region: toInt(r.region),
            epEnd: toBool(r.ep_end),
            startDate: parseDate(r.start_date),
            ucdpVersion: version,
            syncedAt: new Date(),
          };

          await prisma.ucdpNonState.upsert({
            where: {
              ucdpConflictId_dyadId_year: {
                ucdpConflictId: data.ucdpConflictId,
                dyadId: data.dyadId,
                year: data.year,
              },
            },
            create: data,
            update: { ...data, syncedAt: new Date() },
          });

          counts.recordsInserted++;
        }
      }
    }

    await finishSyncLog(log.id, 'completed', counts);
    return { dataset, version, ...counts, status: 'completed' };
  } catch (error) {
    await finishSyncLog(log.id, 'failed', counts, error instanceof Error ? { message: error.message } : error);
    return { dataset, version, ...counts, status: 'failed', errors: error };
  }
}

// ============================
// One-Sided sync
// ============================

export async function syncOneSided(version: string = DEFAULT_VERSION): Promise<SyncResult> {
  const dataset: SyncDataset = 'onesided';
  const log = await createSyncLog(dataset, version);
  const counts = { recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0 };

  try {
    const pages = fetchAllPages<RawOneSided>('onesided', version);

    for await (const { results, page, totalPages } of pages) {
      counts.recordsFetched += results.length;
      console.log('[UCDP Sync] onesided page ' + (page + 1) + '/' + totalPages + ' - ' + results.length + ' records');

      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);

        for (const r of batch) {
          const data = {
            ucdpConflictId: r.conflict_id,
            actorId: r.actor_id,
            actorName: r.actor_name,
            year: toInt(r.year),
            bestFatalityEstimate: toInt(r.best_fatality_estimate),
            lowFatalityEstimate: toInt(r.low_fatality_estimate),
            highFatalityEstimate: toInt(r.high_fatality_estimate),
            isGovernmentActor: toBool(r.is_government_actor),
            location: r.location,
            region: toInt(r.region),
            ucdpVersion: version,
            syncedAt: new Date(),
          };

          await prisma.ucdpOneSided.upsert({
            where: {
              ucdpConflictId_actorId_year: {
                ucdpConflictId: data.ucdpConflictId,
                actorId: data.actorId,
                year: data.year,
              },
            },
            create: data,
            update: { ...data, syncedAt: new Date() },
          });

          counts.recordsInserted++;
        }
      }
    }

    await finishSyncLog(log.id, 'completed', counts);
    return { dataset, version, ...counts, status: 'completed' };
  } catch (error) {
    await finishSyncLog(log.id, 'failed', counts, error instanceof Error ? { message: error.message } : error);
    return { dataset, version, ...counts, status: 'failed', errors: error };
  }
}

// ============================
// Candidate Events sync
// ============================

/**
 * Auto-detect the latest UCDP candidate version (26.0.X) and sync those events.
 * Candidate events are near-real-time data published monthly.
 * They are marked with isCandidate=true in the database.
 */
export async function syncCandidateEvents(): Promise<SyncResult> {
  console.log('[UCDP Sync] Detecting latest candidate version...');
  const candidateVersion = await detectLatestCandidateVersion();

  if (!candidateVersion) {
    console.log('[UCDP Sync] No candidate version available.');
    return {
      dataset: 'gedevents',
      version: 'candidate',
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      status: 'completed',
    };
  }

  console.log('[UCDP Sync] Found candidate version: ' + candidateVersion);
  return syncGedEvents(candidateVersion);
}

// ============================
// Sync ALL datasets
// ============================

export async function syncAll(version: string = DEFAULT_VERSION): Promise<SyncResult[]> {
  console.log('[UCDP Sync] Starting full sync (version ' + version + ')...');

  const results: SyncResult[] = [];

  // Run sequentially to avoid overwhelming the API
  results.push(await syncGedEvents(version));
  results.push(await syncConflicts(version));
  results.push(await syncBattleDeaths(version));
  results.push(await syncNonState(version));
  results.push(await syncOneSided(version));

  // Auto-sync latest candidate events (near-real-time data)
  console.log('[UCDP Sync] Syncing candidate events...');
  results.push(await syncCandidateEvents());

  const failed = results.filter((r) => r.status === 'failed');
  if (failed.length > 0) {
    console.error('[UCDP Sync] ' + failed.length + ' dataset(s) failed:', failed.map((f) => f.dataset));
  }

  const totalFetched = results.reduce((sum, r) => sum + r.recordsFetched, 0);
  console.log('[UCDP Sync] Full sync complete. Total records fetched: ' + totalFetched);

  return results;
}
