-- Safe creation of enums and tables for historical basemaps

DO $$ BEGIN
  CREATE TYPE "HistoryLod" AS ENUM ('LOW','MED','HIGH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "HistoricalPolity" (
  "id" TEXT PRIMARY KEY,
  "canonicalKey" TEXT UNIQUE NOT NULL,
  "displayName" TEXT,
  "colorHex" TEXT,
  "validFromYear" INTEGER,
  "validToYear" INTEGER,
  "props" JSONB
);

CREATE TABLE IF NOT EXISTS "HistoricalArea" (
  "id" TEXT PRIMARY KEY,
  "year" INTEGER NOT NULL,
  "name" TEXT,
  "canonicalName" TEXT,
  "borderPrecision" INTEGER,
  "props" JSONB,
  "polityId" TEXT,
  CONSTRAINT "HistoricalArea_polity_fkey"
    FOREIGN KEY ("polityId") REFERENCES "HistoricalPolity"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "HistoricalAreaGeometry" (
  "id" TEXT PRIMARY KEY,
  "areaId" TEXT NOT NULL,
  "lod" "HistoryLod" NOT NULL,
  "geojson" JSONB NOT NULL,
  "source" TEXT,
  CONSTRAINT "HistoricalAreaGeometry_area_fkey"
    FOREIGN KEY ("areaId") REFERENCES "HistoricalArea"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "HistoricalArea_year_idx" ON "HistoricalArea"("year");
CREATE UNIQUE INDEX IF NOT EXISTS "HistoricalAreaGeometry_area_lod_key" ON "HistoricalAreaGeometry"("areaId","lod");






















