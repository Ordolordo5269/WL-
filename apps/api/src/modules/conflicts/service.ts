import * as repo from './repo.js';
import type { ConflictListFilters, EventFilters, TimelineParams } from './types.js';
import { fetchAllAcledEvents, parseRawEvent } from './acled-client.js';

// ── Conflict list & detail ──

export async function listConflicts(filters: ConflictListFilters) {
  return repo.findManyConflicts(filters);
}

export async function getConflictBySlug(slug: string) {
  const conflict = await repo.findConflictBySlug(slug);
  if (!conflict) return null;

  const recentEvents = await repo.findRecentEvents(conflict.id, 20);
  return { ...conflict, recentEvents };
}

export async function getConflictById(id: string) {
  return repo.findConflictById(id);
}

// ── Events ──

export async function getConflictEvents(slug: string, filters: EventFilters) {
  const conflict = await repo.findConflictBySlug(slug);
  if (!conflict) return null;
  return repo.findEventsByConflict(conflict.id, filters);
}

export async function getConflictHeatmap(slug: string) {
  const conflict = await repo.findConflictBySlug(slug);
  if (!conflict) return null;
  return repo.getEventHeatmap(conflict.id);
}

// ── Timeline ──

export async function getConflictTimeline(slug: string, params: TimelineParams) {
  const conflict = await repo.findConflictBySlug(slug);
  if (!conflict) return null;
  return repo.getTimeline(conflict.id, params);
}

// ── Stats & search ──

export async function getGlobalStats() {
  return repo.getGlobalStats();
}

export async function searchConflicts(query: string, limit: number = 20) {
  return repo.searchConflicts(query, limit);
}

// ── ACLED Sync ──

export async function syncConflict(conflictId: string) {
  const conflicts = await repo.findAllConflictsForSync();
  const conflict = conflicts.find((c) => c.id === conflictId);
  if (!conflict) throw new Error(`Conflict not found: ${conflictId}`);

  return syncSingleConflict(conflict);
}

export async function syncAllConflicts() {
  const conflicts = await repo.findAllConflictsForSync();
  const results: Array<{ slug: string; eventsUpserted: number; error?: string }> = [];

  for (const conflict of conflicts) {
    try {
      const count = await syncSingleConflict(conflict);
      results.push({ slug: conflict.slug, eventsUpserted: count });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ slug: conflict.slug, eventsUpserted: 0, error: msg });
    }
  }

  return results;
}

async function syncSingleConflict(conflict: {
  id: string;
  slug: string;
  filterCountry: string | null;
  filterIso: number | null;
  filterActors: string[];
  filterDateFrom: Date | null;
  filterDateTo: Date | null;
}): Promise<number> {
  if (!conflict.filterCountry && !conflict.filterIso) {
    throw new Error(`Conflict ${conflict.slug} has no ACLED filter criteria`);
  }

  const rawEvents = await fetchAllAcledEvents({
    country: conflict.filterCountry ?? undefined,
    iso: conflict.filterIso ?? undefined,
    dateFrom: conflict.filterDateFrom?.toISOString().split('T')[0],
    dateTo: conflict.filterDateTo?.toISOString().split('T')[0],
  });

  // Filter by actor patterns if specified
  let filtered = rawEvents;
  if (conflict.filterActors.length > 0) {
    const patterns = conflict.filterActors.map((a) => a.toLowerCase());
    filtered = rawEvents.filter((e) => {
      const a1 = (e.actor1 || '').toLowerCase();
      const a2 = (e.actor2 || '').toLowerCase();
      return patterns.some((p) => a1.includes(p) || a2.includes(p));
    });
  }

  const parsed = filtered.map((raw) => ({
    ...parseRawEvent(raw),
    conflictId: conflict.id,
  }));

  const upserted = await repo.upsertManyEvents(parsed);
  await repo.refreshConflictAggregates(conflict.id);

  return upserted;
}
