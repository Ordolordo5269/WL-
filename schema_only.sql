--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 16.10 (Debian 16.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: ConflictStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConflictStatus" AS ENUM (
    'WAR',
    'WARM',
    'IMPROVING',
    'RESOLVED',
    'FROZEN'
);


--
-- Name: EntityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EntityType" AS ENUM (
    'COUNTRY',
    'REGION',
    'CITY',
    'COMPANY',
    'INVESTOR',
    'PERSON',
    'MINE',
    'RESOURCE',
    'FACILITY',
    'PROJECT',
    'ORGANIZATION',
    'SECTOR',
    'PIPELINE',
    'PORT',
    'RAILWAY',
    'TREATY'
);


--
-- Name: Frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Frequency" AS ENUM (
    'ANNUAL',
    'QUARTERLY',
    'MONTHLY',
    'ONE_OFF'
);


--
-- Name: HistoryLod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HistoryLod" AS ENUM (
    'LOW',
    'MED',
    'HIGH'
);


--
-- Name: NaturalFeatureType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NaturalFeatureType" AS ENUM (
    'RIVER',
    'MOUNTAIN_RANGE',
    'PEAK'
);


--
-- Name: NaturalLod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NaturalLod" AS ENUM (
    'LOW',
    'MED',
    'HIGH'
);


--
-- Name: RelationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RelationType" AS ENUM (
    'LOCATED_IN',
    'OWNS',
    'OPERATES',
    'INVESTS_IN',
    'EXTRACTS_RESOURCE',
    'SUPPLIES_TO',
    'TRANSPORTED_VIA',
    'PART_OF',
    'LICENSED_BY',
    'REGULATED_BY',
    'SANCTIONED_BY',
    'RELATED_TO',
    'MEMBER_OF',
    'OBSERVES',
    'SIGNATORY_TO',
    'RATIFIED',
    'APPLIES_TO',
    'DEPOSITORY',
    'COVERS_SECTOR'
);


--
-- Name: Boundary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Boundary" (
    id text NOT NULL,
    "entityId" uuid NOT NULL,
    name text NOT NULL
);


--
-- Name: BoundaryVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BoundaryVersion" (
    id text NOT NULL,
    "boundaryId" text NOT NULL,
    "validFrom" timestamp(3) without time zone,
    "validTo" timestamp(3) without time zone,
    geojson jsonb NOT NULL,
    source text
);


--
-- Name: CompanyProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompanyProfile" (
    "entityId" uuid NOT NULL,
    isin text,
    ticker text,
    "hqCountry" text,
    sector text
);


--
-- Name: Conflict; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Conflict" (
    slug text NOT NULL,
    name text NOT NULL,
    country text NOT NULL,
    region text NOT NULL,
    "conflictType" text NOT NULL,
    description text NOT NULL,
    status public."ConflictStatus" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "escalationDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    coordinates jsonb NOT NULL,
    "involvedISO" text[],
    sources text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    id uuid NOT NULL
);


--
-- Name: ConflictCasualty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConflictCasualty" (
    "conflictId" uuid NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    military integer,
    civilian integer,
    total integer NOT NULL,
    source text,
    notes text,
    id uuid NOT NULL
);


--
-- Name: ConflictEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConflictEvent" (
    "conflictId" uuid NOT NULL,
    title text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    description text,
    "eventType" text,
    location text,
    coordinates jsonb,
    id uuid NOT NULL
);


--
-- Name: ConflictFaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConflictFaction" (
    "conflictId" uuid NOT NULL,
    name text NOT NULL,
    color text,
    goals text[],
    allies text[],
    id uuid NOT NULL
);


--
-- Name: ConflictFactionSupport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConflictFactionSupport" (
    "factionId" uuid NOT NULL,
    "supporterISO" text NOT NULL,
    "supportType" text NOT NULL,
    weapons text[],
    "aidValue" text,
    "strategicAssets" text[],
    id uuid NOT NULL
);


--
-- Name: ConflictNews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConflictNews" (
    "conflictId" uuid NOT NULL,
    title text NOT NULL,
    source text NOT NULL,
    url text NOT NULL,
    "publishedAt" timestamp(3) without time zone NOT NULL,
    description text,
    "imageUrl" text,
    id uuid NOT NULL
);


--
-- Name: ConflictUpdate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConflictUpdate" (
    "conflictId" uuid NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    status public."ConflictStatus",
    description text NOT NULL,
    source text,
    id uuid NOT NULL
);


--
-- Name: Entity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Entity" (
    id uuid NOT NULL,
    type public."EntityType" NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    iso2 character varying(2),
    iso3 character varying(3),
    "isoNumeric" integer,
    "unM49" text,
    "wbCode" text,
    region text,
    subregion text,
    country text,
    lat double precision,
    lng double precision,
    "validFrom" timestamp(3) without time zone,
    "validTo" timestamp(3) without time zone,
    props jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FacilitySpec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FacilitySpec" (
    "entityId" uuid NOT NULL,
    "facilityType" text NOT NULL,
    "unitCapacity" text
);


--
-- Name: Favorite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Favorite" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "countryIso3" character varying(3) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GeoCache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GeoCache" (
    id text NOT NULL,
    type text NOT NULL,
    iso2 character varying(2) NOT NULL,
    data jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HistoricalArea; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HistoricalArea" (
    id text NOT NULL,
    year integer NOT NULL,
    name text,
    "canonicalName" text,
    "borderPrecision" integer,
    props jsonb,
    "polityId" text
);


--
-- Name: HistoricalAreaGeometry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HistoricalAreaGeometry" (
    id text NOT NULL,
    "areaId" text NOT NULL,
    lod public."HistoryLod" NOT NULL,
    geojson jsonb NOT NULL,
    source text
);


--
-- Name: HistoricalPolity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HistoricalPolity" (
    id text NOT NULL,
    "canonicalKey" text NOT NULL,
    "displayName" text,
    "colorHex" text,
    "validFromYear" integer,
    "validToYear" integer,
    props jsonb
);


--
-- Name: Indicator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Indicator" (
    code text NOT NULL,
    name text NOT NULL,
    topic text,
    unit text,
    frequency public."Frequency" DEFAULT 'ANNUAL'::public."Frequency" NOT NULL,
    source text,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: IndicatorValue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."IndicatorValue" (
    id text NOT NULL,
    "entityId" uuid NOT NULL,
    "indicatorCode" text NOT NULL,
    year integer NOT NULL,
    value numeric(65,30),
    meta jsonb,
    source text,
    "revisedAt" timestamp(3) without time zone
);


--
-- Name: InfrastructureEdge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InfrastructureEdge" (
    id text NOT NULL,
    type text NOT NULL,
    "fromNode" text NOT NULL,
    "toNode" text NOT NULL,
    "lengthKm" double precision,
    capacity numeric(65,30),
    unit text,
    "validFrom" timestamp(3) without time zone,
    "validTo" timestamp(3) without time zone,
    geojson jsonb,
    props jsonb
);


--
-- Name: InfrastructureNode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InfrastructureNode" (
    id text NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    "entityId" uuid,
    lat double precision,
    lng double precision,
    capacity numeric(65,30),
    unit text,
    props jsonb
);


--
-- Name: MineSpec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MineSpec" (
    "entityId" uuid NOT NULL,
    status text,
    method text,
    "startYear" integer,
    "endYear" integer,
    elevation integer
);


--
-- Name: NaturalFeature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NaturalFeature" (
    id text NOT NULL,
    type public."NaturalFeatureType" NOT NULL,
    name text,
    slug text NOT NULL,
    props jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: NaturalFeatureCoverage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NaturalFeatureCoverage" (
    "featureId" text NOT NULL,
    "entityId" uuid NOT NULL
);


--
-- Name: NaturalGeometry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NaturalGeometry" (
    id text NOT NULL,
    "featureId" text NOT NULL,
    lod public."NaturalLod" NOT NULL,
    geojson jsonb NOT NULL,
    source text
);


--
-- Name: OrganizationSpec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrganizationSpec" (
    "entityId" uuid NOT NULL,
    "orgType" text NOT NULL,
    founded integer,
    "hqCountry" text,
    website text
);


--
-- Name: Ownership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Ownership" (
    id text NOT NULL,
    "holderId" uuid NOT NULL,
    "targetId" uuid NOT NULL,
    percent double precision,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    sources jsonb
);


--
-- Name: Relation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Relation" (
    id text NOT NULL,
    type public."RelationType" NOT NULL,
    "fromId" uuid NOT NULL,
    "toId" uuid NOT NULL,
    role text,
    percent double precision,
    amount numeric(65,30),
    currency text,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    props jsonb,
    sources jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ResourceSpec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ResourceSpec" (
    "entityId" uuid NOT NULL,
    commodity text NOT NULL,
    unit text NOT NULL
);


--
-- Name: TradeFlow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TradeFlow" (
    id text NOT NULL,
    year integer NOT NULL,
    "fromId" uuid NOT NULL,
    "toId" uuid NOT NULL,
    "hsCode" text NOT NULL,
    quantity numeric(65,30),
    unit text,
    "valueUsd" numeric(65,30),
    route text
);


--
-- Name: TreatySpec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TreatySpec" (
    "entityId" uuid NOT NULL,
    "shortName" text,
    "signedDate" timestamp(3) without time zone,
    "entryIntoForce" timestamp(3) without time zone,
    status text,
    topics jsonb,
    depository text,
    "referenceUrl" text
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id uuid NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: BoundaryVersion BoundaryVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BoundaryVersion"
    ADD CONSTRAINT "BoundaryVersion_pkey" PRIMARY KEY (id);


--
-- Name: Boundary Boundary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Boundary"
    ADD CONSTRAINT "Boundary_pkey" PRIMARY KEY (id);


--
-- Name: CompanyProfile CompanyProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompanyProfile"
    ADD CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("entityId");


--
-- Name: ConflictCasualty ConflictCasualty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictCasualty"
    ADD CONSTRAINT "ConflictCasualty_pkey" PRIMARY KEY (id);


--
-- Name: ConflictEvent ConflictEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictEvent"
    ADD CONSTRAINT "ConflictEvent_pkey" PRIMARY KEY (id);


--
-- Name: ConflictFactionSupport ConflictFactionSupport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictFactionSupport"
    ADD CONSTRAINT "ConflictFactionSupport_pkey" PRIMARY KEY (id);


--
-- Name: ConflictFaction ConflictFaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictFaction"
    ADD CONSTRAINT "ConflictFaction_pkey" PRIMARY KEY (id);


--
-- Name: ConflictNews ConflictNews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictNews"
    ADD CONSTRAINT "ConflictNews_pkey" PRIMARY KEY (id);


--
-- Name: ConflictUpdate ConflictUpdate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictUpdate"
    ADD CONSTRAINT "ConflictUpdate_pkey" PRIMARY KEY (id);


--
-- Name: Conflict Conflict_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Conflict"
    ADD CONSTRAINT "Conflict_pkey" PRIMARY KEY (id);


--
-- Name: Entity Entity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Entity"
    ADD CONSTRAINT "Entity_pkey" PRIMARY KEY (id);


--
-- Name: FacilitySpec FacilitySpec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FacilitySpec"
    ADD CONSTRAINT "FacilitySpec_pkey" PRIMARY KEY ("entityId");


--
-- Name: Favorite Favorite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_pkey" PRIMARY KEY (id);


--
-- Name: GeoCache GeoCache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GeoCache"
    ADD CONSTRAINT "GeoCache_pkey" PRIMARY KEY (id);


--
-- Name: HistoricalAreaGeometry HistoricalAreaGeometry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricalAreaGeometry"
    ADD CONSTRAINT "HistoricalAreaGeometry_pkey" PRIMARY KEY (id);


--
-- Name: HistoricalArea HistoricalArea_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricalArea"
    ADD CONSTRAINT "HistoricalArea_pkey" PRIMARY KEY (id);


--
-- Name: HistoricalPolity HistoricalPolity_canonicalKey_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricalPolity"
    ADD CONSTRAINT "HistoricalPolity_canonicalKey_key" UNIQUE ("canonicalKey");


--
-- Name: HistoricalPolity HistoricalPolity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricalPolity"
    ADD CONSTRAINT "HistoricalPolity_pkey" PRIMARY KEY (id);


--
-- Name: IndicatorValue IndicatorValue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IndicatorValue"
    ADD CONSTRAINT "IndicatorValue_pkey" PRIMARY KEY (id);


--
-- Name: Indicator Indicator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Indicator"
    ADD CONSTRAINT "Indicator_pkey" PRIMARY KEY (code);


--
-- Name: InfrastructureEdge InfrastructureEdge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InfrastructureEdge"
    ADD CONSTRAINT "InfrastructureEdge_pkey" PRIMARY KEY (id);


--
-- Name: InfrastructureNode InfrastructureNode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InfrastructureNode"
    ADD CONSTRAINT "InfrastructureNode_pkey" PRIMARY KEY (id);


--
-- Name: MineSpec MineSpec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MineSpec"
    ADD CONSTRAINT "MineSpec_pkey" PRIMARY KEY ("entityId");


--
-- Name: NaturalFeatureCoverage NaturalFeatureCoverage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NaturalFeatureCoverage"
    ADD CONSTRAINT "NaturalFeatureCoverage_pkey" PRIMARY KEY ("featureId", "entityId");


--
-- Name: NaturalFeature NaturalFeature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NaturalFeature"
    ADD CONSTRAINT "NaturalFeature_pkey" PRIMARY KEY (id);


--
-- Name: NaturalGeometry NaturalGeometry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NaturalGeometry"
    ADD CONSTRAINT "NaturalGeometry_pkey" PRIMARY KEY (id);


--
-- Name: OrganizationSpec OrganizationSpec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrganizationSpec"
    ADD CONSTRAINT "OrganizationSpec_pkey" PRIMARY KEY ("entityId");


--
-- Name: Ownership Ownership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ownership"
    ADD CONSTRAINT "Ownership_pkey" PRIMARY KEY (id);


--
-- Name: Relation Relation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Relation"
    ADD CONSTRAINT "Relation_pkey" PRIMARY KEY (id);


--
-- Name: ResourceSpec ResourceSpec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResourceSpec"
    ADD CONSTRAINT "ResourceSpec_pkey" PRIMARY KEY ("entityId");


--
-- Name: TradeFlow TradeFlow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TradeFlow"
    ADD CONSTRAINT "TradeFlow_pkey" PRIMARY KEY (id);


--
-- Name: TreatySpec TreatySpec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TreatySpec"
    ADD CONSTRAINT "TreatySpec_pkey" PRIMARY KEY ("entityId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: BoundaryVersion_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BoundaryVersion_validFrom_validTo_idx" ON public."BoundaryVersion" USING btree ("validFrom", "validTo");


--
-- Name: CompanyProfile_entityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompanyProfile_entityId_key" ON public."CompanyProfile" USING btree ("entityId");


--
-- Name: ConflictCasualty_conflictId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConflictCasualty_conflictId_date_idx" ON public."ConflictCasualty" USING btree ("conflictId", date);


--
-- Name: ConflictEvent_conflictId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConflictEvent_conflictId_date_idx" ON public."ConflictEvent" USING btree ("conflictId", date);


--
-- Name: ConflictFactionSupport_factionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConflictFactionSupport_factionId_idx" ON public."ConflictFactionSupport" USING btree ("factionId");


--
-- Name: ConflictFaction_conflictId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConflictFaction_conflictId_idx" ON public."ConflictFaction" USING btree ("conflictId");


--
-- Name: ConflictNews_conflictId_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConflictNews_conflictId_publishedAt_idx" ON public."ConflictNews" USING btree ("conflictId", "publishedAt");


--
-- Name: ConflictUpdate_conflictId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConflictUpdate_conflictId_date_idx" ON public."ConflictUpdate" USING btree ("conflictId", date);


--
-- Name: Conflict_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Conflict_country_idx" ON public."Conflict" USING btree (country);


--
-- Name: Conflict_region_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Conflict_region_idx" ON public."Conflict" USING btree (region);


--
-- Name: Conflict_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Conflict_slug_key" ON public."Conflict" USING btree (slug);


--
-- Name: Conflict_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Conflict_startDate_idx" ON public."Conflict" USING btree ("startDate");


--
-- Name: Conflict_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Conflict_status_idx" ON public."Conflict" USING btree (status);


--
-- Name: Entity_iso3_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Entity_iso3_idx" ON public."Entity" USING btree (iso3);


--
-- Name: Entity_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Entity_name_idx" ON public."Entity" USING btree (name);


--
-- Name: Entity_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Entity_slug_key" ON public."Entity" USING btree (slug);


--
-- Name: Entity_type_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Entity_type_country_idx" ON public."Entity" USING btree (type, country);


--
-- Name: FacilitySpec_entityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FacilitySpec_entityId_key" ON public."FacilitySpec" USING btree ("entityId");


--
-- Name: Favorite_countryIso3_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Favorite_countryIso3_idx" ON public."Favorite" USING btree ("countryIso3");


--
-- Name: Favorite_userId_countryIso3_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Favorite_userId_countryIso3_key" ON public."Favorite" USING btree ("userId", "countryIso3");


--
-- Name: Favorite_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Favorite_userId_idx" ON public."Favorite" USING btree ("userId");


--
-- Name: GeoCache_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GeoCache_expiresAt_idx" ON public."GeoCache" USING btree ("expiresAt");


--
-- Name: GeoCache_iso2_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GeoCache_iso2_idx" ON public."GeoCache" USING btree (iso2);


--
-- Name: GeoCache_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GeoCache_type_idx" ON public."GeoCache" USING btree (type);


--
-- Name: HistoricalAreaGeometry_areaId_lod_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HistoricalAreaGeometry_areaId_lod_key" ON public."HistoricalAreaGeometry" USING btree ("areaId", lod);


--
-- Name: HistoricalAreaGeometry_area_lod_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HistoricalAreaGeometry_area_lod_key" ON public."HistoricalAreaGeometry" USING btree ("areaId", lod);


--
-- Name: HistoricalArea_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HistoricalArea_year_idx" ON public."HistoricalArea" USING btree (year);


--
-- Name: IndicatorValue_entityId_indicatorCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IndicatorValue_entityId_indicatorCode_idx" ON public."IndicatorValue" USING btree ("entityId", "indicatorCode");


--
-- Name: IndicatorValue_entityId_indicatorCode_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IndicatorValue_entityId_indicatorCode_year_key" ON public."IndicatorValue" USING btree ("entityId", "indicatorCode", year);


--
-- Name: IndicatorValue_indicatorCode_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IndicatorValue_indicatorCode_year_idx" ON public."IndicatorValue" USING btree ("indicatorCode", year);


--
-- Name: InfrastructureEdge_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InfrastructureEdge_type_idx" ON public."InfrastructureEdge" USING btree (type);


--
-- Name: InfrastructureEdge_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InfrastructureEdge_validFrom_validTo_idx" ON public."InfrastructureEdge" USING btree ("validFrom", "validTo");


--
-- Name: InfrastructureNode_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InfrastructureNode_type_idx" ON public."InfrastructureNode" USING btree (type);


--
-- Name: MineSpec_entityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MineSpec_entityId_key" ON public."MineSpec" USING btree ("entityId");


--
-- Name: NaturalFeatureCoverage_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NaturalFeatureCoverage_entityId_idx" ON public."NaturalFeatureCoverage" USING btree ("entityId");


--
-- Name: NaturalFeature_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NaturalFeature_slug_key" ON public."NaturalFeature" USING btree (slug);


--
-- Name: NaturalFeature_type_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NaturalFeature_type_name_idx" ON public."NaturalFeature" USING btree (type, name);


--
-- Name: NaturalGeometry_featureId_lod_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NaturalGeometry_featureId_lod_key" ON public."NaturalGeometry" USING btree ("featureId", lod);


--
-- Name: NaturalGeometry_lod_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NaturalGeometry_lod_idx" ON public."NaturalGeometry" USING btree (lod);


--
-- Name: OrganizationSpec_entityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrganizationSpec_entityId_key" ON public."OrganizationSpec" USING btree ("entityId");


--
-- Name: Ownership_holderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Ownership_holderId_idx" ON public."Ownership" USING btree ("holderId");


--
-- Name: Ownership_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Ownership_targetId_idx" ON public."Ownership" USING btree ("targetId");


--
-- Name: Relation_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Relation_startDate_endDate_idx" ON public."Relation" USING btree ("startDate", "endDate");


--
-- Name: Relation_type_fromId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Relation_type_fromId_idx" ON public."Relation" USING btree (type, "fromId");


--
-- Name: Relation_type_toId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Relation_type_toId_idx" ON public."Relation" USING btree (type, "toId");


--
-- Name: ResourceSpec_entityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ResourceSpec_entityId_key" ON public."ResourceSpec" USING btree ("entityId");


--
-- Name: TradeFlow_fromId_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TradeFlow_fromId_year_idx" ON public."TradeFlow" USING btree ("fromId", year);


--
-- Name: TradeFlow_hsCode_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TradeFlow_hsCode_year_idx" ON public."TradeFlow" USING btree ("hsCode", year);


--
-- Name: TradeFlow_toId_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TradeFlow_toId_year_idx" ON public."TradeFlow" USING btree ("toId", year);


--
-- Name: TreatySpec_entityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TreatySpec_entityId_key" ON public."TreatySpec" USING btree ("entityId");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: BoundaryVersion BoundaryVersion_boundaryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BoundaryVersion"
    ADD CONSTRAINT "BoundaryVersion_boundaryId_fkey" FOREIGN KEY ("boundaryId") REFERENCES public."Boundary"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Boundary Boundary_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Boundary"
    ADD CONSTRAINT "Boundary_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanyProfile CompanyProfile_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompanyProfile"
    ADD CONSTRAINT "CompanyProfile_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConflictCasualty ConflictCasualty_conflictId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictCasualty"
    ADD CONSTRAINT "ConflictCasualty_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES public."Conflict"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConflictEvent ConflictEvent_conflictId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictEvent"
    ADD CONSTRAINT "ConflictEvent_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES public."Conflict"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConflictFactionSupport ConflictFactionSupport_factionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictFactionSupport"
    ADD CONSTRAINT "ConflictFactionSupport_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES public."ConflictFaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConflictFaction ConflictFaction_conflictId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictFaction"
    ADD CONSTRAINT "ConflictFaction_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES public."Conflict"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConflictNews ConflictNews_conflictId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictNews"
    ADD CONSTRAINT "ConflictNews_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES public."Conflict"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConflictUpdate ConflictUpdate_conflictId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConflictUpdate"
    ADD CONSTRAINT "ConflictUpdate_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES public."Conflict"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FacilitySpec FacilitySpec_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FacilitySpec"
    ADD CONSTRAINT "FacilitySpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Favorite Favorite_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HistoricalAreaGeometry HistoricalAreaGeometry_areaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricalAreaGeometry"
    ADD CONSTRAINT "HistoricalAreaGeometry_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES public."HistoricalArea"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HistoricalArea HistoricalArea_polityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HistoricalArea"
    ADD CONSTRAINT "HistoricalArea_polityId_fkey" FOREIGN KEY ("polityId") REFERENCES public."HistoricalPolity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: IndicatorValue IndicatorValue_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IndicatorValue"
    ADD CONSTRAINT "IndicatorValue_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: IndicatorValue IndicatorValue_indicatorCode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IndicatorValue"
    ADD CONSTRAINT "IndicatorValue_indicatorCode_fkey" FOREIGN KEY ("indicatorCode") REFERENCES public."Indicator"(code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InfrastructureNode InfrastructureNode_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InfrastructureNode"
    ADD CONSTRAINT "InfrastructureNode_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MineSpec MineSpec_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MineSpec"
    ADD CONSTRAINT "MineSpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NaturalFeatureCoverage NaturalFeatureCoverage_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NaturalFeatureCoverage"
    ADD CONSTRAINT "NaturalFeatureCoverage_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NaturalFeatureCoverage NaturalFeatureCoverage_featureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NaturalFeatureCoverage"
    ADD CONSTRAINT "NaturalFeatureCoverage_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES public."NaturalFeature"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NaturalGeometry NaturalGeometry_featureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NaturalGeometry"
    ADD CONSTRAINT "NaturalGeometry_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES public."NaturalFeature"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrganizationSpec OrganizationSpec_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrganizationSpec"
    ADD CONSTRAINT "OrganizationSpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ownership Ownership_holderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ownership"
    ADD CONSTRAINT "Ownership_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ownership Ownership_targetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ownership"
    ADD CONSTRAINT "Ownership_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Relation Relation_fromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Relation"
    ADD CONSTRAINT "Relation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Relation Relation_toId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Relation"
    ADD CONSTRAINT "Relation_toId_fkey" FOREIGN KEY ("toId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ResourceSpec ResourceSpec_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResourceSpec"
    ADD CONSTRAINT "ResourceSpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TradeFlow TradeFlow_fromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TradeFlow"
    ADD CONSTRAINT "TradeFlow_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TradeFlow TradeFlow_toId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TradeFlow"
    ADD CONSTRAINT "TradeFlow_toId_fkey" FOREIGN KEY ("toId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TreatySpec TreatySpec_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TreatySpec"
    ADD CONSTRAINT "TreatySpec_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

