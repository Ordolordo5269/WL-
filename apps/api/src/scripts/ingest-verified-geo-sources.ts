/**
 * WorldLore: Verified Geo Sources Ingestion
 *
 * Ingests ONLY sources with verified working endpoints (tested 2026-03-09):
 *
 * ✅ Tectonic Plates (robiningelbrecht) - 257 KB
 * ✅ NE Coastlines - 1.7 MB
 * ✅ NE Marine Polys - 10.1 MB
 * ✅ NE Geographic Lines - 61 KB
 * ✅ Fraxen Tectonic Plates (PB2002) - 689 KB
 * ✅ Marine Regions EEZ (REST API)
 *
 * ❌ USGS MRDS WFS - 404 (all variants)
 * ❌ Oil Pipelines (soilus) - 404
 * ❌ Protected Planet - 500
 * ❌ HumData datasets - 404
 * ❌ World Bank Gas Flaring - 404
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Utilities ───────────────────────────────────────────────

function normalizeName(s: string | null | undefined): string | null {
  if (!s || typeof s !== 'string') return null;
  try {
    return s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  } catch {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s\-_]/g, '').replace(/\s+/g, '-');
  }
}

function flattenCoords(geom: any): [number, number][] {
  if (!geom || !geom.type) return [];
  switch (geom.type) {
    case 'Point': return [geom.coordinates];
    case 'MultiPoint': return geom.coordinates;
    case 'LineString': return geom.coordinates;
    case 'MultiLineString': return geom.coordinates.flat();
    case 'Polygon': return geom.coordinates.flat();
    case 'MultiPolygon': return geom.coordinates.flat(2);
    default: return [];
  }
}

function computeCentroid(geom: any): [number, number] {
  const pts = flattenCoords(geom);
  if (pts.length === 0) return [0, 0];
  let sx = 0, sy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; }
  return [
    Math.round((sx / pts.length) * 100) / 100,
    Math.round((sy / pts.length) * 100) / 100
  ];
}

function deriveName(props: Record<string, any> | undefined): string | null {
  if (!props) return null;
  return props.name_en || props.name || props.NAME || props.Name || null;
}

async function fetchGeoJSON(url: string, label: string): Promise<any | null> {
  console.log(`  Fetching ${label}...`);
  try {
    const { data } = await axios.get(url, {
      timeout: 60000,
      maxContentLength: 50 * 1024 * 1024, // 50MB max
      headers: { 'Accept': 'application/json' }
    });
    const features = data?.features || [];
    console.log(`  ✓ Got ${features.length} features from ${label}`);
    return data;
  } catch (error) {
    console.error(`  ✗ Failed to fetch ${label}: ${(error as Error).message}`);
    return null;
  }
}

// ─── Ensure enum values exist ────────────────────────────────

async function ensureEnumValues() {
  const values = ['TECTONIC_PLATE', 'VOLCANO', 'COASTLINE', 'EEZ', 'PROTECTED_AREA', 'ADMIN_BOUNDARY'];
  for (const val of values) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "NaturalFeatureType" ADD VALUE IF NOT EXISTS '${val}'`);
    } catch (e) {
      // Value already exists
    }
  }
  console.log('✓ Enum values ensured');
}

// ─── Generic NaturalFeature upsert ──────────────────────────

async function upsertNaturalFeature(
  type: string,
  name: string | null,
  slug: string,
  props: any,
  geometry: any,
  source: string
): Promise<{ created: boolean }> {
  const rows = await prisma.$queryRaw<{ id: string; createdAt: Date; updatedAt: Date }[]>`
    INSERT INTO "NaturalFeature" ("id","type","name","slug","props","createdAt","updatedAt")
    VALUES (gen_random_uuid(), ${type}::"NaturalFeatureType", ${name}, ${slug}, ${JSON.stringify(props ?? null)}::jsonb, NOW(), NOW())
    ON CONFLICT ("slug") DO UPDATE
    SET "name" = EXCLUDED."name",
        "props" = EXCLUDED."props",
        "updatedAt" = NOW()
    RETURNING "id","createdAt","updatedAt";
  `;

  const row = rows[0];
  const featureId = row.id;

  await prisma.$executeRaw`
    INSERT INTO "NaturalGeometry" ("id","featureId","lod","geojson","source")
    VALUES (gen_random_uuid(), ${featureId}, 'MED'::"NaturalLod", ${JSON.stringify(geometry)}::jsonb, ${source})
    ON CONFLICT ("featureId","lod") DO UPDATE
    SET "geojson" = EXCLUDED."geojson",
        "source" = EXCLUDED."source";
  `;

  const cAt = new Date(row.createdAt).getTime();
  const uAt = new Date(row.updatedAt).getTime();
  return { created: cAt === uAt };
}

// ─── 1. TECTONIC PLATES ─────────────────────────────────────

async function ingestTectonicPlates() {
  console.log('\n── Tectonic Plates ──');

  const data = await fetchGeoJSON(
    'https://raw.githubusercontent.com/robiningelbrecht/geojson-tectonic-plates/main/tectonic-plates.geojson',
    'robiningelbrecht/tectonic-plates'
  );
  if (!data) return { created: 0, updated: 0, errors: 0 };

  let created = 0, updated = 0, errors = 0;

  for (const f of data.features) {
    if (!f || f.type !== 'Feature' || !f.geometry) continue;
    try {
      const name = deriveName(f.properties) || f.properties?.plate || f.properties?.PlateName || 'Unknown Plate';
      const [cx, cy] = computeCentroid(f.geometry);
      const slug = `tectonic_plate:${normalizeName(name) || 'unnamed'}:${cy}_${cx}`;

      const result = await upsertNaturalFeature(
        'TECTONIC_PLATE', name, slug,
        { ...f.properties, source: 'robiningelbrecht' },
        f.geometry,
        'robiningelbrecht tectonic-plates'
      );

      if (result.created) created++; else updated++;
    } catch (error) {
      errors++;
      console.error(`  ✗ Error: ${(error as Error).message}`);
    }
  }

  // Also try Fraxen as supplementary data
  const fraxen = await fetchGeoJSON(
    'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_plates.json',
    'fraxen/PB2002_plates'
  );

  if (fraxen?.features) {
    for (const f of fraxen.features) {
      if (!f || f.type !== 'Feature' || !f.geometry) continue;
      try {
        const name = f.properties?.PlateName || f.properties?.plate || deriveName(f.properties) || 'Unknown Boundary';
        const [cx, cy] = computeCentroid(f.geometry);
        const slug = `tectonic_plate:fraxen:${normalizeName(name) || 'unnamed'}:${cy}_${cx}`;

        const result = await upsertNaturalFeature(
          'TECTONIC_PLATE', name, slug,
          { ...f.properties, source: 'fraxen-pb2002' },
          f.geometry,
          'fraxen PB2002 tectonic plates'
        );

        if (result.created) created++; else updated++;
      } catch (error) {
        errors++;
      }
    }
  }

  console.log(`  Summary: created=${created}, updated=${updated}, errors=${errors}`);
  return { created, updated, errors };
}

// ─── 2. COASTLINES ──────────────────────────────────────────

async function ingestCoastlines() {
  console.log('\n── Coastlines ──');

  const data = await fetchGeoJSON(
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson',
    'NE 10m coastline'
  );
  if (!data) return { created: 0, updated: 0, errors: 0 };

  let created = 0, updated = 0, errors = 0;

  for (const f of data.features) {
    if (!f || f.type !== 'Feature' || !f.geometry) continue;
    try {
      const name = deriveName(f.properties) || `Coastline Segment`;
      const [cx, cy] = computeCentroid(f.geometry);
      const slug = `coastline:${normalizeName(name) || 'segment'}:${cy}_${cx}`;

      const result = await upsertNaturalFeature(
        'COASTLINE', name, slug,
        { ...f.properties, source: 'natural-earth-10m' },
        f.geometry,
        'natural-earth 10m coastline'
      );

      if (result.created) created++; else updated++;
    } catch (error) {
      errors++;
    }
  }

  console.log(`  Summary: created=${created}, updated=${updated}, errors=${errors}`);
  return { created, updated, errors };
}

// ─── 3. MARINE POLYGONS ─────────────────────────────────────

async function ingestMarinePolys() {
  console.log('\n── Marine Polygons ──');

  const data = await fetchGeoJSON(
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_marine_polys.geojson',
    'NE 10m marine polys'
  );
  if (!data) return { created: 0, updated: 0, errors: 0 };

  let created = 0, updated = 0, errors = 0;

  for (const f of data.features) {
    if (!f || f.type !== 'Feature' || !f.geometry) continue;
    try {
      const name = deriveName(f.properties) || 'Marine Area';
      const [cx, cy] = computeCentroid(f.geometry);
      const slug = `eez:marine:${normalizeName(name) || 'area'}:${cy}_${cx}`;

      const result = await upsertNaturalFeature(
        'EEZ', name, slug,
        { ...f.properties, source: 'natural-earth-10m', featureType: 'marine_poly' },
        f.geometry,
        'natural-earth 10m marine polys'
      );

      if (result.created) created++; else updated++;
    } catch (error) {
      errors++;
    }
  }

  console.log(`  Summary: created=${created}, updated=${updated}, errors=${errors}`);
  return { created, updated, errors };
}

// ─── 4. MARINE REGIONS EEZ (REST API) ───────────────────────

async function ingestMarineRegionsEEZ() {
  console.log('\n── Marine Regions EEZ (REST API) ──');

  let created = 0, updated = 0, errors = 0;
  const batchSize = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `https://www.marineregions.org/rest/getGazetteerRecordsByType.json/EEZ/?offset=${offset}&count=${batchSize}`;
      const { data } = await axios.get(url, { timeout: 30000 });

      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
        break;
      }

      for (const record of data) {
        try {
          const name = record.preferredGazetteerName || record.placeName || `EEZ ${record.MRGID}`;
          const lat = record.latitude;
          const lng = record.longitude;

          if (lat == null || lng == null) continue;

          const slug = `eez:mr:${record.MRGID || `${lat}_${lng}`}`;

          // Marine Regions API returns point data, not full polygon boundaries
          // Store as point feature with metadata
          const geometry = {
            type: 'Point',
            coordinates: [lng, lat]
          };

          const props = {
            mrgid: record.MRGID,
            placeType: record.placeType,
            minLat: record.minLatitude,
            minLng: record.minLongitude,
            maxLat: record.maxLatitude,
            maxLng: record.maxLongitude,
            source: 'marine-regions-api'
          };

          const result = await upsertNaturalFeature(
            'EEZ', name, slug, props, geometry,
            'marine-regions REST API'
          );

          if (result.created) created++; else updated++;
        } catch (error) {
          errors++;
        }
      }

      console.log(`  Batch offset=${offset}: processed ${data.length} records`);
      offset += batchSize;

      // Limit to 1000 records to avoid overloading
      if (offset >= 1000) {
        console.log('  Reached 1000 record limit');
        hasMore = false;
      }
    } catch (error) {
      console.error(`  ✗ API error at offset ${offset}: ${(error as Error).message}`);
      hasMore = false;
    }
  }

  console.log(`  Summary: created=${created}, updated=${updated}, errors=${errors}`);
  return { created, updated, errors };
}

// ─── MAIN ───────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  WorldLore: Verified Geo Sources Ingestion       ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Ensure pgcrypto for gen_random_uuid
  try { await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto'); } catch {}

  // Ensure enum values
  await ensureEnumValues();

  const results: Record<string, { created: number; updated: number; errors: number }> = {};

  // Run all ingestions
  results['Tectonic Plates'] = await ingestTectonicPlates();
  results['Coastlines'] = await ingestCoastlines();
  results['Marine Polygons'] = await ingestMarinePolys();
  results['Marine Regions EEZ'] = await ingestMarineRegionsEEZ();

  // Final summary
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  INGESTION SUMMARY                               ║');
  console.log('╠══════════════════════════════════════════════════╣');

  let totalCreated = 0, totalUpdated = 0, totalErrors = 0;
  for (const [name, r] of Object.entries(results)) {
    console.log(`║  ${name.padEnd(25)} C:${String(r.created).padStart(5)} U:${String(r.updated).padStart(5)} E:${String(r.errors).padStart(4)} ║`);
    totalCreated += r.created;
    totalUpdated += r.updated;
    totalErrors += r.errors;
  }

  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  TOTAL                    C:${String(totalCreated).padStart(5)} U:${String(totalUpdated).padStart(5)} E:${String(totalErrors).padStart(4)} ║`);
  console.log('╚══════════════════════════════════════════════════╝');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
