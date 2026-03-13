import { prisma } from '../../db/client';

type NaturalType = 'rivers' | 'peaks' | 'mountain-ranges' | 'lakes' | 'volcanoes' | 'fault-lines' | 'deserts';
type NaturalLod = 'auto' | 'low' | 'med' | 'high';

export interface GetNaturalParams {
  type: string;
  lod?: NaturalLod;
  bbox?: string;
  region?: string;
  classMin?: number;
  minElevation?: number;
  limit?: number;
}

export async function getNaturalLayer(params: GetNaturalParams): Promise<{ etag?: string; body: unknown }> {
  const type = normalizeType(params.type);
  const lod = resolveLod(params.lod);
  const limit = Number.isFinite(params.limit) && params.limit! > 0 ? Math.min(params.limit!, 5000) : 2000;

  const dbType = toDbFeatureType(type);
  const dbLod = toDbLod(lod);

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    name: string | null;
    type: string;
    props: any | null;
    geojson: any;
  }>>`
    SELECT f."id", f."name", f."type", f."props", g."geojson"
    FROM "NaturalFeature" f
    JOIN "NaturalGeometry" g
      ON g."featureId" = f."id"
    WHERE f."type" = ${dbType}::"NaturalFeatureType"
      AND g."lod" = ${dbLod}::"NaturalLod"
    LIMIT ${limit}
  `;

  const features = rows.map((r) => ({
    type: 'Feature',
    properties: {
      id: r.id,
      name: r.name,
      type,
      ...(r.props || {})
    },
    geometry: r.geojson
  }));

  const etag = `W/"nat-${type}-${lod}-${rows.length}"`;
  return {
    etag,
    body: {
      type: 'FeatureCollection',
      features
    }
  };
}

export async function searchNatural(q: string): Promise<Array<{ type: NaturalType; name: string; id?: string }>> {
  const term = String(q || '').trim();
  if (term.length < 2) return [];
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string | null; type: string }>>`
    SELECT "id","name","type"
    FROM "NaturalFeature"
    WHERE "name" ILIKE ${'%' + term + '%'}
    ORDER BY "name" ASC NULLS LAST
    LIMIT 20
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name || '',
    type: fromDbFeatureType(r.type) as NaturalType
  }));
}

function normalizeType(t: string): NaturalType {
  const v = t.toLowerCase();
  if (v === 'rivers') return 'rivers';
  if (v === 'peaks') return 'peaks';
  if (v === 'mountain-ranges' || v === 'ranges' || v === 'mountain_ranges') return 'mountain-ranges';
  if (v === 'lakes') return 'lakes';
  if (v === 'volcanoes') return 'volcanoes';
  if (v === 'fault-lines' || v === 'fault_lines' || v === 'faultlines') return 'fault-lines';
  if (v === 'deserts') return 'deserts';
  return 'rivers';
}

function resolveLod(lod?: NaturalLod): Exclude<NaturalLod, 'auto'> {
  if (lod === 'low') return 'low';
  if (lod === 'high') return 'high';
  return 'med';
}

function toDbFeatureType(t: NaturalType): 'RIVER' | 'MOUNTAIN_RANGE' | 'PEAK' | 'LAKE' | 'VOLCANO' | 'FAULT_LINE' | 'DESERT' {
  if (t === 'rivers') return 'RIVER';
  if (t === 'peaks') return 'PEAK';
  if (t === 'lakes') return 'LAKE';
  if (t === 'volcanoes') return 'VOLCANO';
  if (t === 'fault-lines') return 'FAULT_LINE';
  if (t === 'deserts') return 'DESERT';
  return 'MOUNTAIN_RANGE';
}

function fromDbFeatureType(t: string): NaturalType {
  const v = String(t || '').toUpperCase();
  if (v === 'RIVER') return 'rivers';
  if (v === 'PEAK') return 'peaks';
  if (v === 'LAKE') return 'lakes';
  if (v === 'VOLCANO') return 'volcanoes';
  if (v === 'FAULT_LINE') return 'fault-lines';
  if (v === 'DESERT') return 'deserts';
  return 'mountain-ranges';
}

function toDbLod(lod: Exclude<NaturalLod, 'auto'>): 'LOW' | 'MED' | 'HIGH' {
  if (lod === 'low') return 'LOW';
  if (lod === 'high') return 'HIGH';
  return 'MED';
}
