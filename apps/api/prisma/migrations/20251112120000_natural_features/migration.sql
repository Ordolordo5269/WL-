-- Enums
CREATE TYPE "NaturalFeatureType" AS ENUM ('RIVER', 'MOUNTAIN_RANGE', 'PEAK');
CREATE TYPE "NaturalLod" AS ENUM ('LOW', 'MED', 'HIGH');

-- Tables
CREATE TABLE "NaturalFeature" (
  "id" TEXT NOT NULL,
  "type" "NaturalFeatureType" NOT NULL,
  "name" TEXT,
  "slug" TEXT NOT NULL,
  "props" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NaturalFeature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NaturalGeometry" (
  "id" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "lod" "NaturalLod" NOT NULL,
  "geojson" JSONB NOT NULL,
  "source" TEXT,
  CONSTRAINT "NaturalGeometry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NaturalFeatureCoverage" (
  "featureId" TEXT NOT NULL,
  "entityId" UUID NOT NULL,
  CONSTRAINT "NaturalFeatureCoverage_pkey" PRIMARY KEY ("featureId","entityId")
);

-- Indexes
CREATE UNIQUE INDEX "NaturalFeature_slug_key" ON "NaturalFeature"("slug");
CREATE INDEX "NaturalFeature_type_name_idx" ON "NaturalFeature"("type", "name");
CREATE UNIQUE INDEX "NaturalGeometry_featureId_lod_key" ON "NaturalGeometry"("featureId", "lod");
CREATE INDEX "NaturalGeometry_lod_idx" ON "NaturalGeometry"("lod");
CREATE INDEX "NaturalFeatureCoverage_entityId_idx" ON "NaturalFeatureCoverage"("entityId");

-- Foreign Keys
ALTER TABLE "NaturalGeometry"
  ADD CONSTRAINT "NaturalGeometry_featureId_fkey"
  FOREIGN KEY ("featureId") REFERENCES "NaturalFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NaturalFeatureCoverage"
  ADD CONSTRAINT "NaturalFeatureCoverage_featureId_fkey"
  FOREIGN KEY ("featureId") REFERENCES "NaturalFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NaturalFeatureCoverage"
  ADD CONSTRAINT "NaturalFeatureCoverage_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;






















