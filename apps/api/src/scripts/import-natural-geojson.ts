import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

type GeoJSONGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'MultiPoint'; coordinates: [number, number][] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] };

interface Feature {
  type: 'Feature';
  properties?: Record<string, any>;
  geometry: GeoJSONGeometry;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

const prisma = new PrismaClient();
type NaturalLodStr = 'LOW' | 'MED' | 'HIGH';
type NaturalFeatureTypeStr = 'RIVER' | 'MOUNTAIN_RANGE' | 'PEAK';

function normalizeName(s: string | null | undefined): string | null {
  if (!s || typeof s !== 'string') return null;
  try {
    return s
      .normalize('NFD')
      // @ts-ignore unicode escapes supported at runtime
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  } catch {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-_]/g, '').replace(/\s+/g, '-');
  }
}

function flattenCoords(geom: GeoJSONGeometry): [number, number][] {
  switch (geom.type) {
    case 'Point':
      return [geom.coordinates];
    case 'MultiPoint':
      return geom.coordinates;
    case 'LineString':
      return geom.coordinates;
    case 'MultiLineString':
      return geom.coordinates.flat();
    case 'Polygon':
      return geom.coordinates.flat();
    case 'MultiPolygon':
      return geom.coordinates.flat(2);
  }
}

function computeCentroid(geom: GeoJSONGeometry): [number, number] {
  const pts = flattenCoords(geom);
  if (pts.length === 0) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return [sx / pts.length, sy / pts.length];
}

function roundCoord(x: number, factor = 100): number {
  // factor=100 -> ~0.01 degree precision
  return Math.round(x * factor) / factor;
}

function deriveName(props: Record<string, any> | undefined): string | null {
  if (!props) return null;
  return props.name_en || props.name || props.NAME || null;
}

function toLod(lod: 'low' | 'med' | 'high'): NaturalLodStr {
  if (lod === 'low') return 'LOW';
  if (lod === 'med') return 'MED';
  return 'HIGH';
}

function toType(folder: 'rivers' | 'mountain_ranges' | 'peaks'): NaturalFeatureTypeStr {
  if (folder === 'rivers') return 'RIVER';
  if (folder === 'mountain_ranges') return 'MOUNTAIN_RANGE';
  return 'PEAK';
}

function buildSlug(type: NaturalFeatureTypeStr, name: string | null, geom: GeoJSONGeometry): string {
  const n = normalizeName(name || '') || 'unnamed';
  const [cx, cy] = computeCentroid(geom);
  const rx = roundCoord(cx, 100);
  const ry = roundCoord(cy, 100);
  return `${type.toLowerCase()}:${n}:${ry}_${rx}`;
}

async function importCollection(folder: 'rivers' | 'mountain_ranges' | 'peaks', lod: 'low' | 'med' | 'high', filePath: string) {
  const data = JSON.parse(await fs.readFile(filePath, 'utf-8')) as FeatureCollection;
  const type = toType(folder);
  const lodEnum = toLod(lod);
  const sourceLabel =
    folder === 'rivers'
      ? `natural-earth rivers ${lod}`
      : folder === 'mountain_ranges'
      ? `natural-earth ranges ${lod}`
      : `natural-earth peaks ${lod}`;

  let created = 0;
  let updated = 0;
  let geomUpserts = 0;

  for (const f of data.features) {
    if (!f || f.type !== 'Feature' || !f.geometry) continue;
    const name = deriveName(f.properties);
    const slug = buildSlug(type, name, f.geometry);
    // Upsert feature by unique slug (raw SQL)
    const rows = await prisma.$queryRaw<
      { id: string; createdAt: Date | string; updatedAt: Date | string }[]
    >`
      INSERT INTO "NaturalFeature" ("id","type","name","slug","props","createdAt","updatedAt")
      VALUES (gen_random_uuid(), ${type}::"NaturalFeatureType", ${name}, ${slug}, ${JSON.stringify(f.properties ?? null)}::jsonb, NOW(), NOW())
      ON CONFLICT ("slug") DO UPDATE
      SET "name" = EXCLUDED."name",
          "props" = EXCLUDED."props",
          "updatedAt" = NOW()
      RETURNING "id","createdAt","updatedAt";
    `;
    const featureRow = rows[0];
    const featureId = featureRow.id;

    // Upsert geometry for this LOD (raw SQL)
    await prisma.$executeRaw`
      INSERT INTO "NaturalGeometry" ("id","featureId","lod","geojson","source")
      VALUES (gen_random_uuid(), ${featureId}, ${lodEnum}::"NaturalLod", ${JSON.stringify(f.geometry)}::jsonb, ${sourceLabel})
      ON CONFLICT ("featureId","lod") DO UPDATE
      SET "geojson" = EXCLUDED."geojson",
          "source" = EXCLUDED."source";
    `;

    // Accounting
    const cAt = new Date(featureRow.createdAt as any).getTime();
    const uAt = new Date(featureRow.updatedAt as any).getTime();
    if (cAt === uAt) {
      created++;
    } else {
      updated++;
    }
    geomUpserts++;
  }

  // eslint-disable-next-line no-console
  console.log(
    `✓ Imported ${folder}/${lod}: features(created/updated)=${created}/${updated}, geometries upserted=${geomUpserts}`
  );
}

async function main() {
  // Ensure required extension for gen_random_uuid
  try { await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto'); } catch {}
  // Ensure natural schema exists (enums, tables, indexes, fkeys)
  try {
    await prisma.$executeRawUnsafe(`CREATE TYPE "NaturalFeatureType" AS ENUM ('RIVER','MOUNTAIN_RANGE','PEAK');`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`CREATE TYPE "NaturalLod" AS ENUM ('LOW','MED','HIGH');`);
  } catch {}
  // NaturalFeature
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "NaturalFeature" (
      "id" TEXT PRIMARY KEY,
      "type" "NaturalFeatureType" NOT NULL,
      "name" TEXT,
      "slug" TEXT NOT NULL UNIQUE,
      "props" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    );
  `);
  // NaturalGeometry
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "NaturalGeometry" (
      "id" TEXT PRIMARY KEY,
      "featureId" TEXT NOT NULL,
      "lod" "NaturalLod" NOT NULL,
      "geojson" JSONB NOT NULL,
      "source" TEXT
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "NaturalGeometry_featureId_lod_key" ON "NaturalGeometry"("featureId","lod");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "NaturalGeometry_lod_idx" ON "NaturalGeometry"("lod");`);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NaturalGeometry_featureId_fkey'
      ) THEN
        ALTER TABLE "NaturalGeometry"
          ADD CONSTRAINT "NaturalGeometry_featureId_fkey"
          FOREIGN KEY ("featureId") REFERENCES "NaturalFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  // Resolve paths relative to repo root
  const repoRoot = path.resolve(__dirname, '../../..');
  const base = path.join(repoRoot, 'frontend', 'public', 'natural');
  const specs: Array<{ folder: 'rivers' | 'mountain_ranges' | 'peaks'; lod: 'low' | 'med' | 'high' }> = [
    { folder: 'rivers', lod: 'low' },
    { folder: 'rivers', lod: 'med' },
    { folder: 'rivers', lod: 'high' },
    { folder: 'mountain_ranges', lod: 'low' },
    { folder: 'mountain_ranges', lod: 'med' },
    { folder: 'mountain_ranges', lod: 'high' },
    { folder: 'peaks', lod: 'low' },
    { folder: 'peaks', lod: 'med' },
    { folder: 'peaks', lod: 'high' }
  ];

  for (const s of specs) {
    const fp = path.join(base, s.folder, s.lod, 'world.geojson');
    try {
      await fs.access(fp);
    } catch {
      // eslint-disable-next-line no-console
      console.warn(`Skipping missing file: ${fp}`);
      continue;
    }
    await importCollection(s.folder, s.lod, fp);
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


