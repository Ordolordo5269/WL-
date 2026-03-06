import { prisma } from '../db/client';

type NaturalType = 'rivers' | 'peaks' | 'mountain-ranges';
type NaturalLod = 'auto' | 'low' | 'med' | 'high';

interface GetNaturalParams {
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

  const dbType = toDbFeatureType(type); // 'RIVER' | 'MOUNTAIN_RANGE' | 'PEAK'
  const dbLod = toDbLod(lod); // 'LOW' | 'MED' | 'HIGH'

  // Basic query: join feature + geometry per LOD
  // Note: No PostGIS; bbox/region filters are omitted for now to keep it fast.
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

  // ETag heuristic: combine type, lod and count
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
  return 'rivers';
}

function resolveLod(lod?: NaturalLod): Exclude<NaturalLod, 'auto'> {
  if (lod === 'low') return 'low';
  if (lod === 'high') return 'high';
  return 'med';
}

function toDbFeatureType(t: NaturalType): 'RIVER' | 'MOUNTAIN_RANGE' | 'PEAK' {
  if (t === 'rivers') return 'RIVER';
  if (t === 'peaks') return 'PEAK';
  return 'MOUNTAIN_RANGE';
}

function fromDbFeatureType(t: string): NaturalType {
  const v = String(t || '').toUpperCase();
  if (v === 'RIVER') return 'rivers';
  if (v === 'PEAK') return 'peaks';
  return 'mountain-ranges';
}

function toDbLod(lod: Exclude<NaturalLod, 'auto'>): 'LOW' | 'MED' | 'HIGH' {
  if (lod === 'low') return 'LOW';
  if (lod === 'high') return 'HIGH';
  return 'MED';
}




