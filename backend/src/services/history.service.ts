import { prisma } from '../db/client';

type HistoryLod = 'auto' | 'low' | 'med' | 'high';

interface GetHistoryParams {
  year: number;
  lod?: HistoryLod;
  limit?: number;
}

function resolveLod(lod?: HistoryLod): 'LOW' | 'MED' | 'HIGH' {
  if (lod === 'low') return 'LOW';
  if (lod === 'high') return 'HIGH';
  return 'MED';
}

function colorFromKey(key: string): string {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  const hue = hash % 360;
  const s = 55;
  const l = 62;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => l / 100 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export async function getHistoryLayer(params: GetHistoryParams): Promise<{ etag?: string; body: unknown }> {
  const year = Number(params.year);
  if (!Number.isFinite(year)) throw new Error('year is required');
  const lod = resolveLod(params.lod);
  const limit = Number.isFinite(params.limit) && params.limit! > 0 ? Math.min(params.limit!, 100000) : 50000;

  // Join areas for the given year to their polity and geometry at requested LOD
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    name: string | null;
    canonicalName: string | null;
    borderPrecision: number | null;
    polityId: string | null;
    polityKey: string | null;
    polityName: string | null;
    polityColor: string | null;
    geojson: any;
  }>>`
    SELECT a."id",
           a."name",
           a."canonicalName",
           a."borderPrecision",
           a."polityId",
           p."canonicalKey" AS "polityKey",
           p."displayName" AS "polityName",
           p."colorHex"    AS "polityColor",
           g."geojson"
      FROM "HistoricalArea" a
      JOIN "HistoricalAreaGeometry" g ON g."areaId" = a."id" AND g."lod" = ${lod}::"HistoryLod"
      LEFT JOIN "HistoricalPolity" p ON p."id" = a."polityId"
     WHERE a."year" = ${year}
     LIMIT ${limit};
  `;

  const features = rows.map((r) => {
    const canonical = r.polityKey || r.canonicalName || (r.name ? String(r.name).toLowerCase() : 'unknown');
    const color = r.polityColor || colorFromKey(canonical);
    return {
      type: 'Feature',
      properties: {
        NAME: r.name,
        CANONICAL: canonical,
        SUBJECTO: r.polityName || null,
        COLOR: color,
        BORDERPRECISION: r.borderPrecision ?? null,
        POLITY_ID: r.polityId
      },
      geometry: r.geojson
    };
  });

  const etag = `W/"hist-${year}-${lod}-${features.length}"`;
  return { etag, body: { type: 'FeatureCollection', features } };
}






















