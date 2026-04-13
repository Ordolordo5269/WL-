# Architecture & Data Decisions

Design choices that aren't obvious from reading the code. Keep this short and
append-only — each entry captures the reasoning so future us (and future new
contributors) don't have to reverse-engineer it.

---

## 2026-04-13 — OpenAQ ingestion is a snapshot, not a time series

**Decision:** `AQ_STATIONS_COUNT` is ingested with `year = current_year`, not as
an annual historical series. Re-running `ingest-openaq-annual.ts` in the future
will **overwrite** the existing row (unique key is `(entityId, indicatorCode, year)`).

**Consequence:** We do **not** preserve historical station-count evolution.
If in April 2027 Chad has 3 stations and today has 1, we will lose the "had 1
station in April 2026" datapoint. The `ingestedAt` and `sourceVersion` metadata
will still trace *when* the snapshot was taken.

**Why accept it (v1):**
- The OpenAQ network changes continuously; there is no "official annual release".
- We use station count as a **data reliability signal** for PM2.5 display, not
  as an analytic variable on its own.
- Building a station-count time series adds complexity (separate table or
  composite key) without a clear use case.

**How to change this later (if needed):**
- Option A: Append-only with `year = current_year` each run → accumulates an
  implicit annual series (risk: silent data quality issues if re-run twice in
  the same year).
- Option B: Add a separate table `AirQualityCoverageSnapshot(entityId, snapshotAt, stationsCount)`
  — proper time series without touching `IndicatorValue`.

**Trigger to revisit:** if we start advertising "track how monitoring capacity
evolves" as a feature, or if ML wants coverage trends as a feature.

---

## 2026-04-13 — GFW API deferred for tabular data; reserved for spatial features

**Decision:** For country-level annual tree cover loss, we ingest via the
public OWID mirror (`ourworldindata.org/grapher/tree-cover-loss`), not via
Global Forest Watch's authenticated Data API.

**Why:**
- OWID mirror provides the same Hansen/UMD dataset, already ISO3-normalized
  and pre-aggregated by country. Zero auth friction.
- We tested `data-api.globalforestwatch.org/.../query`: it returns "API key
  required" despite the OpenAPI spec marking it without `security`. Hard
  requirement in practice.
- For what we need right now (sidebar tabular, ML country-level risk), the
  two sources are equivalent.

**When to switch to GFW API directly:**
- Globe 3D visualizations (need coordinates, not just country aggregates).
- Near-real-time alerts (GLAD daily/weekly — not in OWID).
- Subnational granularity (municipio, ADM1, ADM2).
- ML for supply-chain/ESG risk (cross vendor coordinates with fresh alerts).

**Resources already prepared:**
- Full OpenAPI spec saved at `docs/reference/gfw-data-api-openapi.json`
  (51 endpoints, 375 datasets catalogued).
- `.env.example` has `GFW_API_KEY=` placeholder commented.
- `sourceVersion` for current GFW data is `"Hansen v1.12 via OWID 2025-03"` so
  upstream version + mirror vintage are both preserved.

---

## 2026-04-13 — Badge / Detail UI components duplicated intentionally

**Decision:** `Badge` and `Detail` components are duplicated between
`PoliticsSection.tsx` and `EnvironmentSection.tsx`. We do **not** extract them
to a shared module yet.

**Rule:** extract to `apps/web/src/features/country-sidebar/components/BadgeDetail.tsx`
when a **third** section adopts the same pattern (likely candidates: Economy or
Defense).

**Why not refactor now:**
- Two byte-identical copies cost almost nothing; a premature shared component
  locks in an API before we know how the third use case will use it.
- The refactor is mechanical when the trigger hits (move file + 3 imports).

---

## 2026-04-12 — Politics sidebar hides ML-only indicators

**Decision:** V-Dem indices, Polity5, and WGI raw scores (-2.5 to +2.5) are
in the database but NOT rendered in the Politics sidebar. What users see is
Freedom House + Corruption + Fragility + Peace + Sanctions + Elections +
Government + Leaders, each with colored badges and plain-language
interpretation.

**Why:** these indicators are ML features, not user-facing content. A
"V-Dem Electoral Democracy Index 0.82" means nothing to a non-specialist.
The sidebar is for comprehension; the DB is for prediction.

---

## 2026-04-11 — Data versioning via 3 fields + central source-metadata

**Decision:** Every `IndicatorValue` row carries `sourceVersion` (native ID
from the source like `"ND-GAIN 2026"` or `"Hansen v1.12 via OWID 2025-03"`),
`sourceReleaseDate` (when the source published), and `ingestedAt` (when we
loaded it). All sources and their current versions live in
`apps/api/src/scripts/lib/source-metadata.ts` — updating a version means
changing one line.

**Why:** without this, an upstream revision (e.g., Transparency International
republishes CPI 2023 in 2027 with methodology corrections) silently overwrites
our row and we lose reproducibility. This gives traceability for backtesting
and for explaining "why did country X's score change between March and April".

**Not implemented (deferred):** full history table (Option B from the original
plan). If we ever need point-in-time reproducibility (dashboard as-of a given
date), that's a schema addition on top of the current foundation.

---

## 2026-04-14 — Indicadores globales vía entity WLD (type=REGION)

**Contexto:** FAO Food Price Index (P3 A5) es un indicador global mensual,
no por país. Nuestro schema `IndicatorValue(entityId, indicatorCode, year, value)`
está diseñado para datos country-year.

**Decisión:** Crear entidad especial **`WLD`** de tipo **`REGION`** (name='World',
slug='world') que sirve como "ancla" para todos los indicadores globales futuros.
No introducir una tabla separada `GlobalIndicators` — esto duplicaría infra.

**Regla (para indicadores globales futuros):**
- Si el indicador no tiene dimensión de país (precios globales, índices
  compuestos IPCC, métricas a nivel mundo del World Bank, etc.) → guardarlo
  con `entityId = WLD`.
- Si el indicador tiene dimensión temporal sub-anual (mensual, diario), agregarlo
  a nivel anual en `value` y guardar el detalle en `meta` JSON como
  `{latestMonth, latestValue, monthsCount}`.
- `type=REGION` (no COUNTRY) asegura que queries de ranking/promedios que
  filtran `WHERE e.type = 'COUNTRY'` ignoren WLD automáticamente — no hay
  que hardcodear iso3='WLD' en cada query defensiva.

**Trade-off aceptado:** perdemos la granularidad mensual en la tabla principal,
pero el `meta` lo preserva para las UIs que lo necesiten. Si algún día
pintamos charts mensuales de FPI, se renderiza desde meta o se crea una
tabla `MonthlyIndicatorValue` dedicada a series sub-anuales.

**Endpoint:** `GET /api/dashboard/global-indicators` devuelve el FPI agregado
con trend vs año anterior. **Nota de diseño:** el nombre es genérico a
propósito. Cuando aparezca el segundo indicador global, decidir entre
(a) expandir el mismo endpoint con más campos o (b) pasar a rutas por
categoría (`/global-indicators/food-prices`, `/global-indicators/commodities`,
etc). Decidir cuando haya evidencia del patrón de uso — no ahora.

---

## 2026-04-13 — Rate limiting de sidebar endpoints (pendiente)

**Estado actual:** Solo `/api/countries` y `/api/geo` tienen `dataLimiter` aplicado
(120 req/min). El resto de endpoints de secciones de sidebar (`/environment`,
`/economy`, `/defense`, `/politics`, `/society`, `/technology`, `/international`,
`/commodities`, `/health`, `/infrastructure`) usan el limiter global (100 req/15min).

**Riesgo:** para un usuario que abra la sidebar de varios países rápido puede
ser lento. Para un crawler hostil es una oportunidad.

**Por qué no arreglarlo en Fase B:** aplicar `dataLimiter` solo a `/environment`
sería inconsistente con los 9 endpoints hermanos. El fix correcto es un barrido
coherente de todos los endpoints del sidebar.

**Trigger para revisarlo:** antes de producción real, o si aparece un
comportamiento anómalo de consumo.

**Acción:** refactorizar los 10 endpoints de sidebar para usar `dataLimiter`
de manera coherente, en un commit dedicado de "hardening".

---

## 2026-04-11 — No `prisma migrate` — direct SQL ALTER on remote DB

**Decision:** Schema changes (adding `sourceVersion`, `sourceReleaseDate`,
`ingestedAt` columns) were applied directly to the remote PostgreSQL via
`ALTER TABLE`, not via `prisma migrate dev`.

**Why:** Prisma migration history has drift with the remote DB (legacy
migrations were modified after apply). Running `prisma migrate dev` would
prompt to reset, which would destroy data.

**Rule:** **never run `prisma migrate dev` or `prisma db push`** on this
project. Schema changes = SQL + update `schema.prisma` + `prisma generate`.

**Trigger to revisit:** if we ever need to reset the drift cleanly — do it
deliberately in a maintenance window, not accidentally during a dev command.
