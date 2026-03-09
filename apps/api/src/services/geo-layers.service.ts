import { prisma } from '../db/client';

/**
 * Service for serving geo-layers that use Entity/Infrastructure models
 * (as opposed to NaturalFeature-based layers served by natural.service.ts)
 */

export async function getMineralsGeoJSON(params: {
  commodity?: string;
  limit?: number;
}): Promise<{ body: unknown; etag?: string }> {
  const limit = Math.min(params.limit || 5000, 10000);
  const commodityFilter = params.commodity
    ? `AND rs."commodity" ILIKE '%' || ${params.commodity} || '%'`
    : '';

  // Query entities of type MINE with their specs
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    name: string;
    slug: string;
    props: any;
    country: string | null;
    mine_status: string | null;
    mine_method: string | null;
    commodity: string | null;
  }>>(
    `SELECT e."id", e."name", e."slug", e."props", e."country",
            ms."status" as mine_status, ms."method" as mine_method,
            rs."commodity"
     FROM "Entity" e
     LEFT JOIN "MineSpec" ms ON ms."entityId" = e."id"
     LEFT JOIN "ResourceSpec" rs ON rs."entityId" = e."id"
     WHERE e."type" = 'MINE'
     ${commodityFilter}
     LIMIT ${limit}`
  );

  const features = rows
    .filter(r => r.props?.lat != null && r.props?.lng != null)
    .map(r => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [r.props.lng, r.props.lat]
      },
      properties: {
        id: r.id,
        name: r.name,
        country: r.country,
        commodity: r.commodity || r.props?.commodity || 'Unknown',
        status: r.mine_status,
        method: r.mine_method,
        ...(r.props?.deposit_type ? { deposit_type: r.props.deposit_type } : {}),
        ...(r.props?.production ? { production: r.props.production } : {})
      }
    }));

  return {
    etag: `W/"minerals-${rows.length}"`,
    body: { type: 'FeatureCollection', features }
  };
}

export async function getPipelinesGeoJSON(params: {
  limit?: number;
}): Promise<{ body: unknown; etag?: string }> {
  const limit = Math.min(params.limit || 2000, 5000);

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    type: string;
    fromNode: string;
    toNode: string;
    geojson: any;
    props: any;
  }>>`
    SELECT "id", "type", "fromNode", "toNode", "geojson", "props"
    FROM "InfrastructureEdge"
    WHERE "type" = 'PIPELINE'
      AND "geojson" IS NOT NULL
    LIMIT ${limit}
  `;

  const features = rows.map(r => ({
    type: 'Feature' as const,
    geometry: typeof r.geojson === 'string' ? JSON.parse(r.geojson) : r.geojson,
    properties: {
      id: r.id,
      type: r.type,
      name: r.props?.name || `Pipeline ${r.id.slice(0, 8)}`,
      operator: r.props?.operator,
      product: r.props?.product,
      ...r.props
    }
  }));

  return {
    etag: `W/"pipelines-${rows.length}"`,
    body: { type: 'FeatureCollection', features }
  };
}

export async function getGasFlaringGeoJSON(params: {
  limit?: number;
}): Promise<{ body: unknown; etag?: string }> {
  const limit = Math.min(params.limit || 2000, 5000);

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    type: string;
    lat: number | null;
    lng: number | null;
    props: any;
  }>>`
    SELECT "id", "name", "type", "lat", "lng", "props"
    FROM "InfrastructureNode"
    WHERE "type" = 'GAS_FLARE'
      AND "lat" IS NOT NULL
      AND "lng" IS NOT NULL
    LIMIT ${limit}
  `;

  const features = rows.map(r => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [r.lng!, r.lat!]
    },
    properties: {
      id: r.id,
      name: r.name,
      type: r.type,
      ...r.props
    }
  }));

  return {
    etag: `W/"gas-flaring-${rows.length}"`,
    body: { type: 'FeatureCollection', features }
  };
}
