import * as repo from './repo.js';
import type {
  UcdpEventFilters,
  UcdpConflictFilters,
  UcdpBattleDeathsFilters,
  UcdpNonStateFilters,
  UcdpOneSidedFilters,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
} from './types.js';

export async function listEvents(filters: UcdpEventFilters) {
  return repo.findGedEvents(filters);
}

export async function getEventsGeoJson(filters: UcdpEventFilters): Promise<GeoJsonFeatureCollection> {
  const events = await repo.findGedEventsGeoJson(filters);

  const features: GeoJsonFeature[] = events.map((event) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [event.longitude, event.latitude] as [number, number],
    },
    properties: {
      id: event.id,
      bestEstimate: event.bestEstimate,
      typeOfViolence: event.typeOfViolence,
      conflictName: event.conflictName,
      sideA: event.sideA,
      sideB: event.sideB,
      dateStart: event.dateStart instanceof Date
        ? event.dateStart.toISOString().split('T')[0]
        : String(event.dateStart),
      country: event.country,
      deathsCivilians: event.deathsCivilians ?? 0,
      deathsA: event.deathsA ?? 0,
      deathsB: event.deathsB ?? 0,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

export async function listConflicts(filters: UcdpConflictFilters) {
  return repo.findConflicts(filters);
}

export async function getActiveConflicts(year?: number) {
  return repo.getActiveConflicts(year);
}

export async function getConflictDetail(conflictId: string) {
  const [conflict, summary] = await Promise.all([
    repo.findConflictById(conflictId),
    repo.getConflictSummary(conflictId),
  ]);

  if (!conflict) return null;

  return {
    ...conflict,
    battleDeaths: summary.battleDeaths,
    totalDeaths: summary.totalDeaths,
  };
}

export async function listBattleDeaths(filters: UcdpBattleDeathsFilters) {
  return repo.findBattleDeaths(filters);
}

export async function listNonState(filters: UcdpNonStateFilters) {
  return repo.findNonState(filters);
}

export async function listOneSided(filters: UcdpOneSidedFilters) {
  return repo.findOneSided(filters);
}

export async function getStats() {
  return repo.getEventStats();
}

export async function getSyncStatus() {
  return repo.getSyncStatus();
}
