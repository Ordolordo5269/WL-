import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

type Geometry = any;

interface Feature {
  type: 'Feature';
  properties?: Record<string, any>;
  geometry: Geometry;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

const prisma = new PrismaClient();

function normalizeString(input: string): string {
  try {
    return input
      .normalize('NFD')
      // @ts-ignore unicode property escapes supported in modern engines
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return input.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
  }
}

function canonicalizePolity(raw: string): string {
  const s = normalizeString(raw);
  const aliases: Record<string, string> = {
    // Core European sovereigns + empires
    'united kingdom of great britain and ireland': 'united kingdom',
    'united kingdom': 'united kingdom',
    'great britain': 'united kingdom',
    'britain': 'united kingdom',
    'england': 'united kingdom',
    'british empire': 'united kingdom',

    'french republic': 'france',
    'kingdom of france': 'france',
    'france': 'france',

    'spain': 'spain',
    'kingdom of spain': 'spain',

    'portugal': 'portugal',
    'kingdom of portugal': 'portugal',

    'netherlands': 'netherlands',
    'kingdom of the netherlands': 'netherlands',
    'holland': 'netherlands',
    'dutch east indies': 'netherlands',
    'netherlands indies': 'netherlands',

    'belgium': 'belgium',
    'kingdom of belgium': 'belgium',
    'belgian congo': 'belgium',
    'congo free state': 'belgium',

    'germany': 'germany',
    'german empire': 'germany',
    'prussia': 'germany',

    'austria': 'austria',
    'austrian empire': 'austria',
    'austria-hungary': 'austria',

    'italy': 'italy',
    'kingdom of italy': 'italy',

    'russia': 'russia',
    'russian empire': 'russia',
    'soviet union': 'russia',

    'sweden': 'sweden',
    'kingdom of sweden': 'sweden',

    'denmark': 'denmark',
    'kingdom of denmark': 'denmark',

    'ottoman empire': 'ottoman empire',
    'turkey': 'turkey',

    'roman empire': 'roman empire',

    'united states': 'united states',
    'usa': 'united states'
  };
  return aliases[s] ?? s;
}

function deriveSubjectFromName(name: string): string | null {
  const n = normalizeString(name);
  if (n.includes('french ')) return 'france';
  if (n.includes('british ') || n.includes('english ')) return 'united kingdom';
  if (n.includes('spanish ')) return 'spain';
  if (n.includes('portuguese ')) return 'portugal';
  if (n.includes('dutch ') || n.includes('netherlands') || n.includes('holland')) return 'netherlands';
  if (n.includes('belgian ') || n.includes('belgium')) return 'belgium';
  if (n.includes('russian ') || n.includes('soviet ')) return 'russia';
  if (n.includes('swedish ')) return 'sweden';
  if (n.includes('danish ')) return 'denmark';
  if (n.includes('italian ')) return 'italy';
  if (n.includes('german ') || n.includes('prussian ')) return 'germany';
  if (n.includes('austrian ') || n.includes('habsburg')) return 'austria';
  if (n.includes('ottoman ') || n.includes('turkish ')) return 'ottoman empire';
  if (n.includes('roman ')) return 'roman empire';
  if (n.includes('american ') || n.includes('united states')) return 'united states';
  return null;
}

type OverrideRule = { namePattern: RegExp; yearFrom: number; yearTo: number; subject: string };

const overrideRules: OverrideRule[] = [
  // Philippines under US ~1898-1946
  { namePattern: /\bphilippines\b/i, yearFrom: 1900, yearTo: 1945, subject: 'united states' },
  { namePattern: /\bpuerto rico\b/i, yearFrom: 1900, yearTo: 9999, subject: 'united states' },
  // Angola under Portugal
  { namePattern: /\bangola\b/i, yearFrom: 1600, yearTo: 1975, subject: 'portugal' },
  // Congo under Belgium
  { namePattern: /\b(congo|zaire|kinshasa)\b/i, yearFrom: 1908, yearTo: 1960, subject: 'belgium' },
  // India under UK
  { namePattern: /\bindia\b/i, yearFrom: 1757, yearTo: 1947, subject: 'united kingdom' },
  // Algeria under France
  { namePattern: /\balgeria\b/i, yearFrom: 1830, yearTo: 1962, subject: 'france' },
  // Tunisia under France (protectorate 1881–1956)
  { namePattern: /\btunisia\b/i, yearFrom: 1881, yearTo: 1956, subject: 'france' },
  // Egypt under UK influence/protectorate (approx 1882–1922/1952)
  { namePattern: /\begypt\b/i, yearFrom: 1882, yearTo: 1922, subject: 'united kingdom' },
  // Sudan under Anglo-Egyptian rule (1899–1956) – map uses Sudan
  { namePattern: /\bsudan\b/i, yearFrom: 1899, yearTo: 1956, subject: 'united kingdom' },
  // Nigeria (British) – colonial period roughly 1861–1960
  { namePattern: /\bnigeria\b/i, yearFrom: 1861, yearTo: 1960, subject: 'united kingdom' },
  // Ghana (Gold Coast) – 1821–1957
  { namePattern: /\bghana|gold coast\b/i, yearFrom: 1821, yearTo: 1957, subject: 'united kingdom' },
  // Kenya – 1895–1963
  { namePattern: /\bkenya\b/i, yearFrom: 1895, yearTo: 1963, subject: 'united kingdom' },
  // Tanzania (Tanganyika) – German then British mandates (simplify to UK post-1918)
  { namePattern: /\btanzania|tanganyika\b/i, yearFrom: 1919, yearTo: 1961, subject: 'united kingdom' },
  // Mozambique under Portugal – ~1500–1975
  { namePattern: /\bmozambique|portuguese east africa\b/i, yearFrom: 1500, yearTo: 1975, subject: 'portugal' },
  // Guinea-Bissau under Portugal – ~1500–1973
  { namePattern: /\bguinea[- ]?bissau|portuguese guinea\b/i, yearFrom: 1500, yearTo: 1973, subject: 'portugal' },
  // Namibia (German South West Africa) – 1884–1915 (German)
  { namePattern: /\bnamibia|german south[- ]?west africa\b/i, yearFrom: 1884, yearTo: 1915, subject: 'germany' },
  // Tanzania, Cameroon, Togo under Germany pre-1918 (schwerpunkt)
  { namePattern: /\bcameroon|kamerun\b/i, yearFrom: 1884, yearTo: 1916, subject: 'germany' },
  { namePattern: /\btogo|togoland\b/i, yearFrom: 1884, yearTo: 1916, subject: 'germany' },
  // Taiwan under Japan – 1895–1945
  { namePattern: /\btaiwan|formosa\b/i, yearFrom: 1895, yearTo: 1945, subject: 'japan' },
  // Korea under Japan – 1910–1945
  { namePattern: /\bkorea\b/i, yearFrom: 1910, yearTo: 1945, subject: 'japan' },
  // Manchuria (Manchukuo) under Japan – 1932–1945 (simplify to Japan)
  { namePattern: /\bmanchuria|manchukuo\b/i, yearFrom: 1932, yearTo: 1945, subject: 'japan' },
  // Papua under UK/Australia mandates – simplify: UK before 1914, Australia 1914–1975
  { namePattern: /\bpapua\b/i, yearFrom: 1900, yearTo: 1913, subject: 'united kingdom' },
  { namePattern: /\bpapua\b/i, yearFrom: 1914, yearTo: 1975, subject: 'australia' },
  // Alaska – Russia pre-1867, USA post-1867
  { namePattern: /\balaska\b/i, yearFrom: 1700, yearTo: 1867, subject: 'russia' },
  { namePattern: /\balaska\b/i, yearFrom: 1868, yearTo: 9999, subject: 'united states' },
];

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

async function ensureSchema() {
  // Extensions and enums
  try { await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto'); } catch {}
  try { await prisma.$executeRawUnsafe(`CREATE TYPE "HistoryLod" AS ENUM ('LOW','MED','HIGH');`); } catch {}
  // Tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HistoricalPolity" (
      "id" TEXT PRIMARY KEY,
      "canonicalKey" TEXT UNIQUE NOT NULL,
      "displayName" TEXT,
      "colorHex" TEXT,
      "validFromYear" INTEGER,
      "validToYear" INTEGER,
      "props" JSONB
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HistoricalArea" (
      "id" TEXT PRIMARY KEY,
      "year" INTEGER NOT NULL,
      "name" TEXT,
      "canonicalName" TEXT,
      "borderPrecision" SMALLINT,
      "props" JSONB,
      "polityId" TEXT,
      CONSTRAINT "HistoricalArea_polity_fkey"
        FOREIGN KEY ("polityId") REFERENCES "HistoricalPolity"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HistoricalAreaGeometry" (
      "id" TEXT PRIMARY KEY,
      "areaId" TEXT NOT NULL,
      "lod" "HistoryLod" NOT NULL,
      "geojson" JSONB NOT NULL,
      "source" TEXT,
      CONSTRAINT "HistoricalAreaGeometry_area_fkey"
        FOREIGN KEY ("areaId") REFERENCES "HistoricalArea"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HistoricalArea_year_idx" ON "HistoricalArea"("year");`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "HistoricalAreaGeometry_area_lod_key" ON "HistoricalAreaGeometry"("areaId","lod");`);
}

async function upsertPolity(canonical: string, displayName?: string | null): Promise<{ id: string }> {
  const key = canonicalizePolity(canonical);
  const disp = displayName || canonical;
  const color = colorFromKey(key);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "HistoricalPolity" ("id","canonicalKey","displayName","colorHex")
    VALUES (gen_random_uuid(), ${key}, ${disp}, ${color})
    ON CONFLICT ("canonicalKey") DO UPDATE
    SET "displayName" = COALESCE(EXCLUDED."displayName", "HistoricalPolity"."displayName"),
        "colorHex" = COALESCE("HistoricalPolity"."colorHex", EXCLUDED."colorHex")
    RETURNING "id";
  `;
  return rows[0];
}

async function importYear(year: number, filePath: string) {
  const raw = JSON.parse(await fs.readFile(filePath, 'utf-8')) as FeatureCollection;
  let count = 0;
  for (const f of raw.features) {
    if (!f || f.type !== 'Feature' || !f.geometry) continue;
    const props = f.properties || {};
    const rawName: string = String(props.NAME ?? props.name ?? 'Unknown');
    const subjectRaw: string = String(props.SUBJECTO ?? '');
    const borderPrec: number | null = props.BORDERPRECISION ? Number(props.BORDERPRECISION) : null;

    const derived = subjectRaw ? subjectRaw : deriveSubjectFromName(rawName) || rawName;
    let subject = canonicalizePolity(derived);

    // Apply overrides
    for (const rule of overrideRules) {
      if (year >= rule.yearFrom && year <= rule.yearTo && rule.namePattern.test(rawName)) {
        subject = canonicalizePolity(rule.subject);
        break;
      }
    }

    const polity = await upsertPolity(subject);

    // Insert area
    const areaRows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "HistoricalArea" ("id","year","name","canonicalName","borderPrecision","props","polityId")
      VALUES (gen_random_uuid(), ${year}, ${rawName}, ${normalizeString(rawName)}, ${borderPrec}, ${JSON.stringify(props)}::jsonb, ${polity.id})
      RETURNING "id";
    `;
    const areaId = areaRows[0].id;

    // Insert geometry at MED
    await prisma.$executeRaw`
      INSERT INTO "HistoricalAreaGeometry" ("id","areaId","lod","geojson","source")
      VALUES (gen_random_uuid(), ${areaId}, 'MED'::"HistoryLod", ${JSON.stringify(f.geometry)}::jsonb, 'historical-basemaps world_${year}.geojson')
      ON CONFLICT ("areaId","lod") DO UPDATE
      SET "geojson" = EXCLUDED."geojson", "source" = EXCLUDED."source";
    `;

    count++;
  }
  // eslint-disable-next-line no-console
  console.log(`✓ Imported year ${year}: areas=${count}`);
}

async function main() {
  await ensureSchema();
  const repoRoot = path.resolve(__dirname, '../../..');
  const base = path.join(repoRoot, 'frontend', 'public', 'historical-basemaps', 'geojson');
  const candidates = await fs.readdir(base);
  const yearFiles = candidates
    .filter((n) => /^world_\d+\.geojson$/i.test(n))
    .map((n) => ({ year: Number(n.replace(/\D+/g, '')), file: path.join(base, n) }))
    .filter((x) => Number.isFinite(x.year))
    .sort((a, b) => a.year - b.year);

  for (const yf of yearFiles) {
    await importYear(yf.year, yf.file);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


