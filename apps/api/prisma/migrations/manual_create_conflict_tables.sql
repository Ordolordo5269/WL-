-- Manual migration: Create Conflict tables without affecting AcledConflict/AcledEvent
-- Safe to run: uses IF NOT EXISTS

-- Create the enum first
DO $$ BEGIN
  CREATE TYPE "ConflictStatus" AS ENUM ('WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Conflict
CREATE TABLE IF NOT EXISTS "Conflict" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "slug"           TEXT         NOT NULL,
  "name"           TEXT         NOT NULL,
  "country"        TEXT         NOT NULL,
  "region"         TEXT         NOT NULL,
  "conflictType"   TEXT         NOT NULL,
  "description"    TEXT         NOT NULL,
  "status"         "ConflictStatus" NOT NULL,
  "startDate"      TIMESTAMP(3) NOT NULL,
  "escalationDate" TIMESTAMP(3),
  "endDate"        TIMESTAMP(3),
  "coordinates"    JSONB        NOT NULL,
  "involvedISO"    TEXT[]       NOT NULL DEFAULT '{}',
  "sources"        TEXT[]       NOT NULL DEFAULT '{}',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conflict_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Conflict_slug_key" ON "Conflict"("slug");
CREATE INDEX IF NOT EXISTS "Conflict_status_idx" ON "Conflict"("status");
CREATE INDEX IF NOT EXISTS "Conflict_region_idx" ON "Conflict"("region");
CREATE INDEX IF NOT EXISTS "Conflict_startDate_idx" ON "Conflict"("startDate");
CREATE INDEX IF NOT EXISTS "Conflict_country_idx" ON "Conflict"("country");

-- ConflictCasualty
CREATE TABLE IF NOT EXISTS "ConflictCasualty" (
  "id"         UUID    NOT NULL DEFAULT gen_random_uuid(),
  "conflictId" UUID    NOT NULL,
  "date"       TIMESTAMP(3) NOT NULL,
  "military"   INTEGER,
  "civilian"   INTEGER,
  "total"      INTEGER NOT NULL,
  "source"     TEXT,
  "notes"      TEXT,
  CONSTRAINT "ConflictCasualty_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConflictCasualty_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "Conflict"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConflictCasualty_conflictId_date_idx" ON "ConflictCasualty"("conflictId", "date");

-- ConflictFaction
CREATE TABLE IF NOT EXISTS "ConflictFaction" (
  "id"         UUID   NOT NULL DEFAULT gen_random_uuid(),
  "conflictId" UUID   NOT NULL,
  "name"       TEXT   NOT NULL,
  "color"      TEXT,
  "goals"      TEXT[] NOT NULL DEFAULT '{}',
  "allies"     TEXT[] NOT NULL DEFAULT '{}',
  CONSTRAINT "ConflictFaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConflictFaction_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "Conflict"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConflictFaction_conflictId_idx" ON "ConflictFaction"("conflictId");

-- ConflictFactionSupport
CREATE TABLE IF NOT EXISTS "ConflictFactionSupport" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "factionId"       UUID NOT NULL,
  "supporterISO"    TEXT NOT NULL,
  "supportType"     TEXT NOT NULL,
  "weapons"         TEXT[] NOT NULL DEFAULT '{}',
  "aidValue"        TEXT,
  "strategicAssets" TEXT[] NOT NULL DEFAULT '{}',
  CONSTRAINT "ConflictFactionSupport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConflictFactionSupport_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "ConflictFaction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConflictFactionSupport_factionId_idx" ON "ConflictFactionSupport"("factionId");

-- ConflictEvent
CREATE TABLE IF NOT EXISTS "ConflictEvent" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "conflictId"  UUID NOT NULL,
  "title"       TEXT NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "eventType"   TEXT,
  "location"    TEXT,
  "coordinates" JSONB,
  CONSTRAINT "ConflictEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConflictEvent_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "Conflict"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConflictEvent_conflictId_date_idx" ON "ConflictEvent"("conflictId", "date");

-- ConflictUpdate
CREATE TABLE IF NOT EXISTS "ConflictUpdate" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "conflictId"  UUID NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "status"      "ConflictStatus",
  "description" TEXT NOT NULL,
  "source"      TEXT,
  CONSTRAINT "ConflictUpdate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConflictUpdate_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "Conflict"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConflictUpdate_conflictId_date_idx" ON "ConflictUpdate"("conflictId", "date");

-- ConflictNews
CREATE TABLE IF NOT EXISTS "ConflictNews" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "conflictId"  UUID NOT NULL,
  "title"       TEXT NOT NULL,
  "source"      TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "imageUrl"    TEXT,
  CONSTRAINT "ConflictNews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConflictNews_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "Conflict"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConflictNews_conflictId_publishedAt_idx" ON "ConflictNews"("conflictId", "publishedAt");
