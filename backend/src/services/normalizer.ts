import { RawResult, qidFromUri, parseWktPoint } from './wikidata';
import { EventFeature, EventFeatureCollection, EventProps, EventType } from '../schemas/event';

const TYPE_MAP: Record<string, EventType> = {
  Q219438: 'protest',
  Q123471: 'protest',
  Q232852: 'riot',
  Q350604: 'conflict',
  Q178561: 'battle'
};

function normalizeType(typesBinding?: { value: string }, label?: string): EventType {
  const uri = typesBinding?.value;
  const typeQid = uri ? uri.split('/').pop() : undefined;
  if (typeQid && TYPE_MAP[typeQid as keyof typeof TYPE_MAP]) {
    return TYPE_MAP[typeQid as keyof typeof TYPE_MAP];
  }
  if (label) {
    const v = label.toLowerCase();
    if (v.includes('riot')) return 'riot';
    if (v.includes('battle')) return 'battle';
    if (v.includes('conflict')) return 'conflict';
    if (v.includes('protest') || v.includes('demonstration')) return 'protest';
  }
  return 'conflict';
}

function normalizeRowToFeature(row: RawResult): EventFeature | null {
  const qid = qidFromUri(row.event.value);
  if (!qid) return null;
  const coord = parseWktPoint(row.coord.value);
  if (!coord) return null;
  const title = (row.eventLabel?.value || 'Untitled event').trim();
  const country = row.countryLabel?.value ?? null;
  const wp_en = row.wpEN?.value ?? null;

  const props: EventProps = {
    id: qid,
    title,
    type: normalizeType(row.types, title),
    country,
    source: 'wikidata',
    wp_en
  };
  if (row.when?.value) {
    const timeIso = new Date(row.when.value).toISOString();
    props.time = timeIso;
  }
  const startIso = row.start?.value ? new Date(row.start.value).toISOString() : undefined;
  const endIso = row.end?.value ? new Date(row.end.value).toISOString() : undefined;
  if (startIso || endIso) props.range = { start: startIso, end: endIso };

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coord },
    properties: props
  };
}

export function mergeAndNormalize(pointRows: RawResult[], rangeRows: RawResult[]): EventFeatureCollection {
  const byId = new Map<string, EventFeature>();

  const upsert = (row: RawResult) => {
    const feat = normalizeRowToFeature(row);
    if (!feat) return;
    const id = feat.properties.id;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, feat);
      return;
    }
    // Merge logic: keep coordinates and title; if one has time and the other has range, merge
    const merged: EventFeature = {
      type: 'Feature',
      geometry: existing.geometry || feat.geometry,
      properties: {
        ...existing.properties,
        ...feat.properties,
        range: existing.properties.range || feat.properties.range,
        time: feat.properties.time || existing.properties.time
      }
    };
    byId.set(id, merged);
  };

  for (const r of pointRows) upsert(r);
  for (const r of rangeRows) upsert(r);

  return { type: 'FeatureCollection', features: Array.from(byId.values()) };
}

