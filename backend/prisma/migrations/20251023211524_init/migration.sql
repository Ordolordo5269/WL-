-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('COUNTRY', 'REGION', 'CITY', 'COMPANY', 'INVESTOR', 'PERSON', 'MINE', 'RESOURCE', 'FACILITY', 'PROJECT', 'ORGANIZATION', 'SECTOR', 'PIPELINE', 'PORT', 'RAILWAY', 'TREATY');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('LOCATED_IN', 'OWNS', 'OPERATES', 'INVESTS_IN', 'EXTRACTS_RESOURCE', 'SUPPLIES_TO', 'TRANSPORTED_VIA', 'PART_OF', 'LICENSED_BY', 'REGULATED_BY', 'SANCTIONED_BY', 'RELATED_TO', 'MEMBER_OF', 'OBSERVES', 'SIGNATORY_TO', 'RATIFIED', 'APPLIES_TO', 'DEPOSITORY', 'COVERS_SECTOR');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('ANNUAL', 'QUARTERLY', 'MONTHLY', 'ONE_OFF');

-- CreateTable
CREATE TABLE "Entity" (
    "id" UUID NOT NULL,
    "type" "EntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iso2" VARCHAR(2),
    "iso3" VARCHAR(3),
    "isoNumeric" INTEGER,
    "unM49" TEXT,
    "wbCode" TEXT,
    "region" TEXT,
    "subregion" TEXT,
    "country" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relation" (
    "id" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,
    "fromId" UUID NOT NULL,
    "toId" UUID NOT NULL,
    "role" TEXT,
    "percent" DOUBLE PRECISION,
    "amount" DECIMAL(65,30),
    "currency" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "props" JSONB,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSpec" (
    "entityId" UUID NOT NULL,
    "orgType" TEXT NOT NULL,
    "founded" INTEGER,
    "hqCountry" TEXT,
    "website" TEXT,

    CONSTRAINT "OrganizationSpec_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "TreatySpec" (
    "entityId" UUID NOT NULL,
    "shortName" TEXT,
    "signedDate" TIMESTAMP(3),
    "entryIntoForce" TIMESTAMP(3),
    "status" TEXT,
    "topics" JSONB,
    "depository" TEXT,
    "referenceUrl" TEXT,

    CONSTRAINT "TreatySpec_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "MineSpec" (
    "entityId" UUID NOT NULL,
    "status" TEXT,
    "method" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "elevation" INTEGER,

    CONSTRAINT "MineSpec_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "ResourceSpec" (
    "entityId" UUID NOT NULL,
    "commodity" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "ResourceSpec_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "FacilitySpec" (
    "entityId" UUID NOT NULL,
    "facilityType" TEXT NOT NULL,
    "unitCapacity" TEXT,

    CONSTRAINT "FacilitySpec_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "entityId" UUID NOT NULL,
    "isin" TEXT,
    "ticker" TEXT,
    "hqCountry" TEXT,
    "sector" TEXT,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "Indicator" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT,
    "unit" TEXT,
    "frequency" "Frequency" NOT NULL DEFAULT 'ANNUAL',
    "source" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indicator_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "IndicatorValue" (
    "id" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "indicatorCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(65,30),
    "meta" JSONB,
    "source" TEXT,
    "revisedAt" TIMESTAMP(3),

    CONSTRAINT "IndicatorValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boundary" (
    "id" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Boundary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoundaryVersion" (
    "id" TEXT NOT NULL,
    "boundaryId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "geojson" JSONB NOT NULL,
    "source" TEXT,

    CONSTRAINT "BoundaryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeFlow" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "fromId" UUID NOT NULL,
    "toId" UUID NOT NULL,
    "hsCode" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "unit" TEXT,
    "valueUsd" DECIMAL(65,30),
    "route" TEXT,

    CONSTRAINT "TradeFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ownership" (
    "id" TEXT NOT NULL,
    "holderId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "percent" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sources" JSONB,

    CONSTRAINT "Ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfrastructureNode" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityId" UUID,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "capacity" DECIMAL(65,30),
    "unit" TEXT,
    "props" JSONB,

    CONSTRAINT "InfrastructureNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfrastructureEdge" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromNode" TEXT NOT NULL,
    "toNode" TEXT NOT NULL,
    "lengthKm" DOUBLE PRECISION,
    "capacity" DECIMAL(65,30),
    "unit" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "geojson" JSONB,
    "props" JSONB,

    CONSTRAINT "InfrastructureEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entity_slug_key" ON "Entity"("slug");

-- CreateIndex
CREATE INDEX "Entity_type_country_idx" ON "Entity"("type", "country");

-- CreateIndex
CREATE INDEX "Entity_name_idx" ON "Entity"("name");

-- CreateIndex
CREATE INDEX "Entity_iso3_idx" ON "Entity"("iso3");

-- CreateIndex
CREATE INDEX "Relation_type_fromId_idx" ON "Relation"("type", "fromId");

-- CreateIndex
CREATE INDEX "Relation_type_toId_idx" ON "Relation"("type", "toId");

-- CreateIndex
CREATE INDEX "Relation_startDate_endDate_idx" ON "Relation"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSpec_entityId_key" ON "OrganizationSpec"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "TreatySpec_entityId_key" ON "TreatySpec"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MineSpec_entityId_key" ON "MineSpec"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceSpec_entityId_key" ON "ResourceSpec"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilitySpec_entityId_key" ON "FacilitySpec"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_entityId_key" ON "CompanyProfile"("entityId");

-- CreateIndex
CREATE INDEX "IndicatorValue_entityId_indicatorCode_idx" ON "IndicatorValue"("entityId", "indicatorCode");

-- CreateIndex
CREATE INDEX "IndicatorValue_indicatorCode_year_idx" ON "IndicatorValue"("indicatorCode", "year");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorValue_entityId_indicatorCode_year_key" ON "IndicatorValue"("entityId", "indicatorCode", "year");

-- CreateIndex
CREATE INDEX "BoundaryVersion_validFrom_validTo_idx" ON "BoundaryVersion"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "TradeFlow_fromId_year_idx" ON "TradeFlow"("fromId", "year");

-- CreateIndex
CREATE INDEX "TradeFlow_toId_year_idx" ON "TradeFlow"("toId", "year");

-- CreateIndex
CREATE INDEX "TradeFlow_hsCode_year_idx" ON "TradeFlow"("hsCode", "year");

-- CreateIndex
CREATE INDEX "Ownership_holderId_idx" ON "Ownership"("holderId");

-- CreateIndex
CREATE INDEX "Ownership_targetId_idx" ON "Ownership"("targetId");

-- CreateIndex
CREATE INDEX "InfrastructureNode_type_idx" ON "InfrastructureNode"("type");

-- CreateIndex
CREATE INDEX "InfrastructureEdge_type_idx" ON "InfrastructureEdge"("type");

-- CreateIndex
CREATE INDEX "InfrastructureEdge_validFrom_validTo_idx" ON "InfrastructureEdge"("validFrom", "validTo");

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSpec" ADD CONSTRAINT "OrganizationSpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatySpec" ADD CONSTRAINT "TreatySpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MineSpec" ADD CONSTRAINT "MineSpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSpec" ADD CONSTRAINT "ResourceSpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitySpec" ADD CONSTRAINT "FacilitySpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorValue" ADD CONSTRAINT "IndicatorValue_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorValue" ADD CONSTRAINT "IndicatorValue_indicatorCode_fkey" FOREIGN KEY ("indicatorCode") REFERENCES "Indicator"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boundary" ADD CONSTRAINT "Boundary_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoundaryVersion" ADD CONSTRAINT "BoundaryVersion_boundaryId_fkey" FOREIGN KEY ("boundaryId") REFERENCES "Boundary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeFlow" ADD CONSTRAINT "TradeFlow_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeFlow" ADD CONSTRAINT "TradeFlow_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfrastructureNode" ADD CONSTRAINT "InfrastructureNode_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
