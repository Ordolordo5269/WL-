# Architecture & Data Decisions

Design choices that aren't obvious from reading the code. Keep this short and
append-only — each entry captures the reasoning so future us (and future new
contributors) don't have to reverse-engineer it.

---

## 2026-04-14 — P3 Fase B: World Bank Pink Sheet (commodity prices)

**Decisión:** Ingestar precios mensuales de 15 commodities core (Brent, WTI,
Henry Hub, TTF, coal, copper, nickel, aluminum, zinc, gold, silver, wheat,
maize, soybean, palm oil) desde el **World Bank "Pink Sheet"** — archivo XLSX
publicado mensualmente en `thedocs.worldbank.org`, licencia CC-BY 4.0, sin
API key. Guardar como medias anuales en la entidad WLD (patrón FAO FPI de A5),
con el último mes disponible preservado en `meta.latestMonth` / `meta.latestValue`.

**Por qué WB Pink Sheet (no FRED, no IMF):**
- Autoritativo — lo usan IMF, BIS, bancos centrales
- Amplitud en un solo archivo (~70 commodities; tomamos 15)
- Un solo source metadata entry, una sola cadencia mensual
- FRED habría requerido ~15 series IDs individuales + mapeos uno-a-uno
- IMF overlaps con WB; añadir ambos era sobre-ingeniería para Fase B

**Scope: 15 commodities core, no los 70 completos.**
- 70 chips en UI es imposible de digerir; la geopol no necesita phosphate rock DAP
- Selección cruza con P3 A3 (copper/nickel) y P3 A4 (wheat/maize/soy)

**Lithium / cobalt / grafito / rare earths NO están en Pink Sheet.**
- WB no publica precios de battery metals
- Opciones futuras: Fastmarkets / Benchmark Mineral Intelligence (ambos pagos),
  Trading Economics (free tier limitada)
- Para la narrativa actual: P3 A3 cubre la producción de esos minerales, y eso
  es suficiente para "dependencia". Precios de litio quedan explícitamente out
  of scope hasta que haya presupuesto o caso de uso claro

**Arquitectura `meta.latestValue` + `value = annualAverage`:**
Reutilizamos el patrón validado en A5 (FAO FPI). Una sola fila por
(entidad, indicador, año), pero el tick del mes más reciente vive en `meta`
para que la UI muestre ambos: trend año-a-año + precio actual. Evita crear un
schema de time-series monthly adicional (YAGNI).

**Nueva dependencia: `xlsx` (SheetJS Community Edition 0.18.5).**
El npm registry marca este paquete como deprecated. SheetJS movió releases a
`cdn.sheetjs.com` tras varias CVEs históricas de parseo de archivos maliciosos.
La más relevante es **CVE-2023-30533** (prototype pollution al procesar workbooks
con claves `__proto__` inyectadas) — explotable únicamente con XLSX maliciosos
diseñados para corromper el prototype chain en el proceso que los parsea.

**Por qué lo aceptamos en nuestro caso:**
1. **Input de fuente conocida** — parseamos el archivo oficial del World Bank
   (thedocs.worldbank.org, sirvido por CloudFront, TLS), no XLSX arbitrarios
   subidos por usuarios
2. **Solo en script manual** — `ingest-worldbank-pink-sheet.ts` no se importa
   desde ningún route/controller; grep `from 'xlsx'` retorna exactamente 1
   resultado (el propio script). No hay superficie de ataque per-user
3. **Proceso efímero** — el script corre, parsea, ingesta, y termina. El
   prototype pollution no persiste entre ejecuciones
4. `exceljs` como alternativa es 3× más pesado y tiene su propio historial
   de CVEs de parseo — el trade-off no vale

**Plan de mitigación futura (cuándo reemplazarlo):**
- Si alguna vez exponemos parseo XLSX a inputs de usuario (upload, API
  endpoint) → migrar inmediatamente a `@sheetjs/xlsx` desde cdn.sheetjs.com
  (versión mantenida) o a `exceljs` con sandbox
- Si Pink Sheet migra a CSV/JSON en el futuro → quitar la dep directamente
- Si WB publica una API JSON oficial → preferirla y borrar el parser

**Nomenclatura: P3 Fase B (NO P1 Fase A).**
Decisión consciente tras evaluar la alternativa. Los precios de commodities
físicos cierran el stack iniciado en P3 Fase A (extracción/producción) —
pertenecen semánticamente al mismo bloque. P1 Financieros queda reservado
para **instrumentos financieros** (equities, FX, crypto, prediction markets),
que son categorías distintas de activos con fuentes, cadencias y UX diferentes.
Si dentro de tres meses la pregunta es "¿dónde están los precios de Brent?",
la respuesta clara es "en P3" (commodities), no "en P1" (finanzas).

**Volumen:** 15 commodities × 36 años (1990-2025) = 540 registros. Pequeño pero
denso en serie temporal — base sólida para features ML de régimen de precios.

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

## 2026-04-14 — Cron jobs de ingesta diferidos a producción

**Estado actual:** Todos los scripts de ingesta corren **manualmente**. Los
datos en DB solo se actualizan cuando alguien ejecuta
`npx tsx src/scripts/ingest-XXX.ts` en su máquina local.

**Consecuencia:** Si nadie corre los scripts, los datos en DB quedan
"congelados" en la fecha del último run. El widget de Dashboard seguirá
mostrando la última fecha disponible sin indicación explícita de que hay
datos nuevos upstream.

**Por qué no automatizamos ahora:** Seguimos en fase de desarrollo, no hay
usuarios reales, y montar crons es infra que se hace una vez al desplegar
producción (todas las fuentes de golpe, coherente).

**Calendario de refresh manual** (en orden cronológico del año):

| Mes | Fuente | Script |
|-----|--------|--------|
| Enero (fines) | Transparency CPI | `ingest-transparency-cpi.ts` |
| Enero | OWID Energy Data | `ingest-energy-owid.ts` |
| Enero | ND-GAIN | `ingest-nd-gain.ts` |
| Febrero | Freedom House | `ingest-freedom-house.ts` |
| Febrero-Marzo | FAO Crops (via OWID) | `ingest-faostat-crops.ts` |
| Marzo | V-Dem | `ingest-vdem.ts` |
| Marzo-Abril | World Bank (trimestral) | scripts worldbank-* |
| Abril | Global Forest Watch | `ingest-global-forest-watch.ts` |
| Mayo-Junio | Fragile States Index | `ingest-fragile-states.ts` |
| Junio | Global Peace Index | `ingest-global-peace-index.ts` |
| Septiembre | World Risk Index | `ingest-world-risk-index.ts` |
| Noviembre | Global Carbon Project | `ingest-global-carbon-project.ts` |
| **Mensual** (día 10) | **FAO Food Price Index** | `ingest-fao-fpi.ts` |
| Continuo (cuando queramos snapshot) | OpenAQ, OpenSanctions | sus scripts respectivos |

**Plan en 3 niveles (no "todo o nada"):**

### Nivel 1 — Documentación (hoy, zero trabajo técnico)
- Este documento con la tabla de cadencias. Evita perder la lógica.
- Estado: ✅ hecho.

### Nivel 2 — Scaffold mínimo (al cerrar P3 Fase A, 30-60 min)
- Montar 1 GitHub Actions workflow que corra **solo** `ingest-fao-fpi.ts`
  el día 10 de cada mes a las 2am UTC.
- FAO es el más urgente porque es **mensual**; todas las otras fuentes
  son anuales y perdonan más.
- Validar el pipeline end-to-end: secrets, permisos DB, logs, rollback si
  falla.
- Dejar los YAMLs de las otras fuentes comentados pero listos para
  descomentar. Así el patrón queda probado antes de escalar.

### Nivel 3 — Producción real (cuando WorldLore esté listo para compartir con alguien externo, 2-3 sesiones)
- Activar crons para todas las fuentes en sus fechas respectivas.
- Monitoring básico: ¿cuándo fue el último run exitoso por fuente?
- Alertas: si una fuente lleva >30 días sin actualizar, avisar.
- "Producción real" = decisión del usuario de mostrar la plataforma a
  analistas externos, profesores, inversores. No necesariamente despliegue
  comercial.

**Opciones técnicas (para nivel 2 y 3):**
- **GitHub Actions** scheduled workflows → recomendado. Gratis, integrado,
  secrets nativos.
- Cron en servidor de producción → cuando haya servidor propio
- Servicio externo tipo Inngest / Quirrel → over-engineering hoy

**Por qué el trade-off importa:**
Si en 6 meses WorldLore tiene usuarios reales (aunque sean 10 analistas
ESG) y el Dashboard muestra FAO FPI de marzo 2026 en septiembre, pierde
credibilidad difícil de recuperar. Para una plataforma posicionada como
rigurosa, mostrar datos obsoletos es peor que no mostrar el indicador.
Y "acordarse manualmente" no escala a 15 fuentes con calendarios distintos.

Pero montar crons hoy mientras se añaden fuentes casi a diario (cada
script de ingesta nuevo requeriría añadir su cron) es fricción duplicada.
Por eso el plan en niveles: la documentación evita olvido, el scaffold
valida el patrón, y la activación completa ocurre cuando el coste de
no tenerla ya es visible.

---

## 2026-04-14 — P3 Paso A3 (USGS Critical Minerals) — fuente unificada + decisiones de diseño

**Contexto:** Último paso de P3 Fase A — minerales críticos. El plan original
del mentor decía "el más difícil, parser XLSX no uniforme entre minerales,
60-90 min realistas". Al explorar antes de codear, descubrimos que USGS
publica un **único CSV unificado** (Data Release 2025, DOI 10.5066/P13XCP3R)
con 77 commodities × ~30 países productores cada uno, formato consistente.
Eso convierte A3 en uno de los pasos más rápidos de Fase A en lugar del más
difícil.

**Decisión de fuente:** ingestar via USGS único, no híbrido OWID+USGS. Razones:
- USGS cubre los 6 minerales críticos en el mismo formato
- USGS aporta **proven reserves**, que OWID no tiene
- Mantener un script en lugar de dos reduce mantenimiento

**Indicadores ingestados (12):**
- 6 minerales × 2 métricas (production + reserves)
- Topic: `Raw Materials` · Source: `USGS` · sourceVersion: `MCS 2025`
- Volumen: 219 registros realistas (concentración natural de productores)

**Filtro TYPE = "mine production" (NO refinery): dos dimensiones distintas de poder.**

USGS incluye también "Refinery production" para algunos minerales (Cu, Co, Ni, rare earths). Son dos tipos de poder geopolítico diferentes:

- **Mine production** → quién **extrae** el mineral del suelo. Poder de recurso natural: DR Congo con cobalto (~70% extracción), Indonesia con níquel, Australia con litio, China con rare earths (extracción).
- **Refinery production** → quién **procesa** el mineral (puede importar materia prima). Poder industrial: China domina aún más extremo — refina ~70% del cobalto mundial aunque extrae ~1%.

Capturar solo **mine production** es la elección correcta para la narrativa actual "dependencia de países productores". Si aparece China arriba en cobalto y se pregunta "¿por qué no es #1?", la respuesta es: China domina el procesamiento, no la extracción. Filtramos por `TYPE.startsWith("mine production")` antes de ingestar.

**Queda abierto como extensión futura:** capa separada de *refinery dependency* (quién depende de quién para procesar) merece su propio tratamiento con indicadores dedicados (`COBALT_REFINERY_T`, etc.) para no mezclar semánticas. No hacerlo en A3 para mantener scope limpio.

**Uranium intencionalmente fuera de scope:**
USGS MCS 2025 no incluye uranium en el Data Release. Opciones futuras si se
necesita:
- World Nuclear Association (datos estructurados, licencia más restrictiva)
- OECD NEA Red Book (PDF cada 2 años con tablas parseables)
Ninguna urgente. Documentado para no preguntar "¿por qué falta uranium?".

**Rankings globales: cálculo al vuelo, NO almacenado (decisión arquitectónica):**
Rankings son cálculos derivados, no datos en sí. Almacenarlos como
indicadores en `IndicatorValue` causa inconsistencia cuando los datos
upstream se actualizan (lección aprendida de WRI_RANK y FSI_RANK eliminados
en sesiones anteriores).

Implementación: `buildCriticalMineralsBlock()` en `apps/api/src/modules/indicators/service.ts`.
Para cada mineral con producción del país, query SQL al endpoint:
```sql
SELECT e.iso3, iv.value FROM "IndicatorValue" iv
JOIN "Entity" e ON e.id = iv."entityId"
WHERE iv."indicatorCode" = $1 AND iv.year = $latestYear
ORDER BY iv.value DESC LIMIT 10
```
Se busca el iso3 del país en esa lista y se determina rank tier:
`top1` (#1), `top3` (#2-3), `top10` (#4-10), o `null` (fuera).

Costo: hasta 6 queries adicionales por request (una por mineral con producción).
Despreciable para tráfico actual. Si WorldLore escala, migrar a vista
materializada `mineral_rankings` refrescada al correr el script de ingesta.

**Badges escalonados (no solo "#1"):**
La UI muestra `#1 global producer` (verde), `#N global producer` para top-3
(verde), `Top N global producer` para 4-10 (amber), o sin badge si fuera
del top 10. Da matices sin ruido — Argentina y Chile en litio merecen badge
aunque no sean #1.

**Years of supply:** mostrado pero con nota a pie explicando que "proven
reserves" según USGS son las económicamente extraíbles HOY con tecnología
y precios actuales. Crece con descubrimientos y subidas de precio. NO es
"fecha de fin del recurso" — es un ratio de proporción. Sin esta nota un
usuario puede leer "10 años de cobalto en Congo" como "el mineral se acaba
en 10 años", lo cual es empíricamente falso.

**Defensive `.trim()`:** USGS es famoso por inconsistencias con espacios
finales en COMMODITY ("Copper " vs "Copper") y COUNTRY. Aplicado .trim()
en parsing antes de matchear contra los lookups.

---

## 2026-04-14 — P3 Paso A2 (EIA) scope reducido: solo petróleo

**Contexto:** El plan original de A2 apuntaba a ingestar, desde la EIA US
Energy Information Administration, reservas probadas (oil/gas/coal),
capacidad eléctrica instalada por tipo, y consumo global. Era el paso de
P3 Fase A con más valor proyectado vs las otras fuentes públicas.

**Hallazgo al registrar la API key y explorar la API v2:**

| Endpoint | Cobertura real | Lo que esperábamos |
|----------|----------------|--------------------|
| `/v2/international` | Solo petroleum (18 productIds, todos crude/refined) | Todos los combustibles global |
| `/v2/natural-gas` | Solo US (filtra por `stateId`) | Gas global |
| `/v2/coal` | Solo US (`reserves-capacity` es per state) | Coal + reservas global |
| `/v2/electricity` | Solo US | Capacidad instalada global |

EIA **no expone** reservas, capacidad instalada, ni consumo de
gas/coal/electric a nivel internacional en su API pública. Esos datasets
existen como XLSX descargables en eia.gov pero no en la API.

**Decisión:** ingestar **solamente** lo que EIA sí ofrece a nivel global:
- `OIL_PROD_TBPD` — producción de crudo+NGPL+otros líquidos (kbbl/día)
- `OIL_CONSUMPTION_TBPD` — consumo de petróleo (kbbl/día)

Total: **2 indicadores** (vs ~13 proyectados), ~17K registros ingestados.

**Por qué NO parseamos XLSX de eia.gov:**
- Violaría el patrón establecido "script → API pública estructurada → DB"
- Los XLSX de EIA tienen formato no uniforme entre reportes (BP Statistical
  Review vía Energy Institute, ya en A1 vía OWID, es más limpio)
- Over-engineering para datos que ya están mayormente cubiertos por A1

**Por qué el subset aporta valor aunque sea pequeño:**
Production y consumption en **misma unidad (TBPD)** permite calcular
directamente el ratio producción/consumo en la UI ("oil self-sufficiency").
A1 tiene producción en TWh, no comparable con consumo sin conversión.
La narrativa "Arabia exporta 2.99× lo que consume, Japón depende en 0.00×"
es un diferencial visible que ninguna otra plataforma muestra tan claro.

**Opciones futuras de expansión (si alguna vez se necesitan):**
1. **Parser XLSX de EIA STEO / Annual Energy Outlook** — si priorizamos
   reservas globales, aceptar el coste de mantener parser de XLSX anual.
2. **BP Statistical Review directo** — ya lo consume OWID, podríamos
   saltarnos el intermediario.
3. **USGS Mineral Commodity Summaries (A3)** — para minerales (litio, cobalto,
   tierras raras) que EIA no cubre, siguiente paso del roadmap.

**Trigger para revisar esta decisión:**
- Si un feature necesita reservas de gas/coal global y no hay otra fuente
- Si la EIA abre su endpoint internacional a otros combustibles (verificar
  anual con `GET /v2` y buscar rutas nuevas)

**Archivos afectados:**
- `apps/api/src/scripts/ingest-eia-international.ts` (header con razonamiento
  completo)
- `apps/api/src/modules/indicators/service.ts` (bloque `oilFlow` en response)
- `apps/web/src/features/country-sidebar/sections/CommoditiesSection.tsx`
  (sub-sección "Oil Self-Sufficiency" en la card Energy Mix)

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
