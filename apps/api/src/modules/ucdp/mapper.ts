import type { UcdpRawEvent } from './client.js';
import { extractInvolvedISO, gwToIso3 } from './gw-to-iso.js';

/** Grouped conflict derived from UCDP events */
export interface UcdpConflictGroup {
  conflictName: string;
  slug: string;
  country: string;
  countries: string[];
  region: string;
  conflictType: string;
  typeOfViolence: number;
  sideA: string;
  sideB: string;
  dyadName: string;
  conflictNewId: number;
  startDate: Date;
  endDate: Date;
  coordinates: { lat: number; lng: number };
  involvedISO: string[];
  sources: string[];
  totalDeaths: number;
  deathsSideA: number;
  deathsSideB: number;
  deathsCivilians: number;
  deathsUnknown: number;
  bestEstimate: number;
  highEstimate: number;
  lowEstimate: number;
  eventCount: number;
  events: UcdpRawEvent[];
  status: 'WAR' | 'WARM' | 'IMPROVING' | 'RESOLVED' | 'FROZEN' | 'ONE_SIDED';
  description: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120);
}

/** Clean UCDP XXX anonymized actor names for display */
function cleanActor(name: string): string {
  if (/^XXX\d*$/.test(name.trim())) return 'Undisclosed actor';
  return name.replace(/XXX\d*/g, 'Undisclosed').trim();
}

function violenceTypeLabel(type: number): string {
  switch (type) {
    case 1: return 'State-based armed conflict';
    case 2: return 'Non-state conflict';
    case 3: return 'One-sided violence';
    default: return 'Unknown';
  }
}

function deriveStatus(
  typeOfViolence: number,
  totalBest: number,
  eventCount: number
): UcdpConflictGroup['status'] {
  if (typeOfViolence === 3) return 'ONE_SIDED';

  // Monthly death rate approximation (data spans ~1 month per candidate version)
  if (totalBest >= 83) return 'WAR';      // >= 1000/year pace
  if (totalBest >= 2) return 'WARM';       // >= 25/year pace
  if (eventCount > 0) return 'IMPROVING';
  return 'FROZEN';
}

/**
 * Group raw UCDP GED events into conflict-level aggregates
 */
export function groupEventsIntoConflicts(events: UcdpRawEvent[]): UcdpConflictGroup[] {
  const groupMap = new Map<string, UcdpRawEvent[]>();

  for (const event of events) {
    const key = event.conflict_name;
    const arr = groupMap.get(key) || [];
    arr.push(event);
    groupMap.set(key, arr);
  }

  const conflicts: UcdpConflictGroup[] = [];

  for (const [conflictName, conflictEvents] of groupMap) {
    const first = conflictEvents[0];
    const countries = [...new Set(conflictEvents.map(e => e.country))];
    const allISO = new Set<string>();
    for (const e of conflictEvents) {
      for (const iso of extractInvolvedISO(e.country_id, e.gwnoa, e.gwnob)) {
        allISO.add(iso);
      }
    }

    // Aggregate deaths
    let deathsA = 0, deathsB = 0, deathsCiv = 0, deathsUnk = 0;
    let best = 0, high = 0, low = 0;
    let minDate = new Date(first.date_start);
    let maxDate = new Date(first.date_end);
    let latSum = 0, lngSum = 0;
    const sourceSet = new Set<string>();

    for (const e of conflictEvents) {
      deathsA += e.deaths_a;
      deathsB += e.deaths_b;
      deathsCiv += e.deaths_civilians;
      deathsUnk += e.deaths_unknown;
      best += e.best;
      high += e.high;
      low += e.low;

      const ds = new Date(e.date_start);
      const de = new Date(e.date_end);
      if (ds < minDate) minDate = ds;
      if (de > maxDate) maxDate = de;

      latSum += e.latitude;
      lngSum += e.longitude;

      // Extract source names from source_article (format: "Source;Source;...")
      if (e.source_article) {
        for (const src of e.source_article.split(';')) {
          const name = src.trim().split(',')[0]?.trim();
          if (name) sourceSet.add(name);
        }
      }
    }

    const n = conflictEvents.length;
    const description = `${violenceTypeLabel(first.type_of_violence)} between ${cleanActor(first.side_a)} and ${cleanActor(first.side_b)} in ${countries.join(', ')}. ${best} total fatalities across ${n} recorded events.`;

    conflicts.push({
      conflictName,
      slug: slugify(conflictName),
      country: first.country,
      countries,
      region: first.region,
      conflictType: violenceTypeLabel(first.type_of_violence),
      typeOfViolence: first.type_of_violence,
      sideA: first.side_a,
      sideB: first.side_b,
      dyadName: first.dyad_name,
      conflictNewId: first.conflict_new_id,
      startDate: minDate,
      endDate: maxDate,
      coordinates: {
        lat: latSum / n,
        lng: lngSum / n,
      },
      involvedISO: Array.from(allISO),
      sources: Array.from(sourceSet).slice(0, 20),
      totalDeaths: best,
      deathsSideA: deathsA,
      deathsSideB: deathsB,
      deathsCivilians: deathsCiv,
      deathsUnknown: deathsUnk,
      bestEstimate: best,
      highEstimate: high,
      lowEstimate: low,
      eventCount: n,
      events: conflictEvents,
      status: deriveStatus(first.type_of_violence, best, n),
      description,
    });
  }

  // Sort by total deaths descending
  conflicts.sort((a, b) => b.totalDeaths - a.totalDeaths);
  return conflicts;
}
