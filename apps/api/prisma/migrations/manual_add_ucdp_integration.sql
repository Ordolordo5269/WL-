-- Add UCDP integration fields to Conflict table
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "ucdpConflictId" INTEGER;
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "dyadName" TEXT;
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "sideA" TEXT;
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "sideB" TEXT;
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "typeOfViolence" INTEGER;
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "ucdpCountryId" INTEGER;
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "adminRegion" TEXT;
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "dataSource" TEXT DEFAULT 'manual';
ALTER TABLE "Conflict" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP;

-- Add indexes for UCDP fields
CREATE INDEX IF NOT EXISTS "Conflict_ucdpConflictId_idx" ON "Conflict" ("ucdpConflictId");
CREATE INDEX IF NOT EXISTS "Conflict_dataSource_idx" ON "Conflict" ("dataSource");

-- Add ONE_SIDED to ConflictStatus enum
ALTER TYPE "ConflictStatus" ADD VALUE IF NOT EXISTS 'ONE_SIDED';

-- Create UcdpGedEvent table
CREATE TABLE IF NOT EXISTS "UcdpGedEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ucdpEventId" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "conflictName" TEXT NOT NULL,
  "dyadName" TEXT NOT NULL,
  "sideA" TEXT NOT NULL,
  "sideB" TEXT NOT NULL,
  "dateStart" TIMESTAMP NOT NULL,
  "dateEnd" TIMESTAMP NOT NULL,
  "deathsA" INTEGER NOT NULL DEFAULT 0,
  "deathsB" INTEGER NOT NULL DEFAULT 0,
  "deathsCivilians" INTEGER NOT NULL DEFAULT 0,
  "deathsUnknown" INTEGER NOT NULL DEFAULT 0,
  "bestEstimate" INTEGER NOT NULL DEFAULT 0,
  "highEstimate" INTEGER NOT NULL DEFAULT 0,
  "lowEstimate" INTEGER NOT NULL DEFAULT 0,
  "country" TEXT NOT NULL,
  "countryId" INTEGER NOT NULL,
  "region" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "whereDescription" TEXT,
  "adm1" TEXT,
  "adm2" TEXT,
  "typeOfViolence" INTEGER NOT NULL,
  "sourceArticle" TEXT,
  "sourceHeadline" TEXT,
  "conflictNewId" INTEGER,
  "dyadNewId" INTEGER,
  "conflictId" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "UcdpGedEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UcdpGedEvent_ucdpEventId_key" UNIQUE ("ucdpEventId"),
  CONSTRAINT "UcdpGedEvent_conflictId_fkey" FOREIGN KEY ("conflictId")
    REFERENCES "Conflict" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indexes for UcdpGedEvent
CREATE INDEX IF NOT EXISTS "UcdpGedEvent_conflictId_idx" ON "UcdpGedEvent" ("conflictId");
CREATE INDEX IF NOT EXISTS "UcdpGedEvent_dateStart_idx" ON "UcdpGedEvent" ("dateStart");
CREATE INDEX IF NOT EXISTS "UcdpGedEvent_country_idx" ON "UcdpGedEvent" ("country");
CREATE INDEX IF NOT EXISTS "UcdpGedEvent_typeOfViolence_idx" ON "UcdpGedEvent" ("typeOfViolence");
CREATE INDEX IF NOT EXISTS "UcdpGedEvent_year_idx" ON "UcdpGedEvent" ("year");
CREATE INDEX IF NOT EXISTS "UcdpGedEvent_conflictName_idx" ON "UcdpGedEvent" ("conflictName");

-- Mark all existing conflicts as manual source
UPDATE "Conflict" SET "dataSource" = 'manual' WHERE "dataSource" IS NULL;
