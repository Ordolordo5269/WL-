# WorldLore

**Plataforma de análisis geopolítico** — conflictos, indicadores por país e insights generados por IA.

> **Somos 2 personas sin experiencia en programación.** Este documento está escrito para que nosotros entendamos qué hacer, y para que cualquier IA (Claude, ChatGPT, Copilot…) entienda exactamente qué construir cuando le copiemos una sección.

---

## Cómo usar este documento

1. **Lee la fase que te toca** (están marcadas con Persona A o Persona B)
2. **Copia el bloque técnico** (la caja gris) y pégalo a la IA
3. **Dile a la IA:** *"Estoy trabajando en WorldLore, hazme esto"*
4. **Nunca hagas una tarea que no sea tuya** — así no os pisáis

---

## Regla de oro: NO SOLAPARSE

```
PERSONA A = azul = trabaja en SUS archivos
PERSONA B = verde = trabaja en SUS archivos

Si los dos tocáis el mismo archivo -> CONFLICTO DE GIT -> dolor de cabeza

SOLUCION: cada fase dice EXACTAMENTE qué archivos toca cada uno.
                NO tocar NADA que no esté en tu lista.
```

---

## Setup del repo

**Stack:** Vite + React + TypeScript (frontend) · Express + TypeScript (API) · Prisma + PostgreSQL remoto (BD) · Zod (validación) · Pino (logs)

**NO usamos:** Docker, Redis, PgBouncer (innecesarios para MVP)

```
Repo: https://github.com/Ordolordo5269/WL-.git
```

### Estructura final objetivo

```
worldlore/
├── apps/
│   ├── web/                          # Frontend: Vite + React + TS
│   │   ├── src/
│   │   │   ├── app/                  # AppProviders, RouterProvider, layouts
│   │   │   ├── pages/                # Páginas con loaders/actions o Query
│   │   │   ├── features/             # map, conflicts, country, dashboard, insights
│   │   │   ├── lib/                  # http.ts, env.ts, query client, router utils
│   │   │   ├── styles/               # tokens.css, reset.css, globals.css
│   │   │   └── test/
│   │   ├── .env.example
│   │   └── package.json
│   └── api/                          # Backend: Express + TS (BFF)
│       ├── prisma/
│       │   ├── schema.prisma         # Modelos de BD
│       │   └── migrations/
│       ├── src/
│       │   ├── app.ts                # Express: helmet, cors, rate-limit, routes
│       │   ├── server.ts             # HTTP bootstrap
│       │   ├── config/               # env.ts, logger.ts
│       │   ├── middleware/            # validate.ts, error.ts, rate-limit.ts
│       │   ├── routes/               # index.ts, conflicts, countries, dashboard, insights
│       │   ├── modules/              # conflicts, countries, indicators, insights, auth
│       │   ├── integrations/         # Clientes: World Bank, ACLED, UCDP, LLMs
│       │   ├── websocket/            # Socket.IO server
│       │   ├── jobs/                 # Ingestion workers + scheduler + snapshots
│       │   ├── docs/                 # swagger.ts (OpenAPI spec)
│       │   ├── db/                   # Prisma client factory + tx helpers
│       │   └── types/
│       ├── .env.example
│       └── package.json
├── packages/
│   └── contracts/                    # Tipos + Zod schemas compartidos FE/BE
│       ├── src/
│       │   ├── conflict.contract.ts
│       │   ├── country.contract.ts
│       │   └── insight.contract.ts
│       └── package.json
├── .github/workflows/ci.yml         # CI: lint + typecheck + build
├── package.json                      # npm workspaces raíz
├── tsconfig.base.json
├── eslint.config.js
└── README.md
```

---

## Variables de entorno

**NUNCA subir `.env` a GitHub.** Solo subir `.env.example` (sin datos reales).

### apps/api/.env.example
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://usuario:password@host:5432/worldlore
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=cambiar_esto_por_algo_seguro
```

### apps/web/.env.example
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=pk.xxx
```

> Solo las variables `VITE_*` se exponen al navegador. El token de Mapbox debe tener restricción por URL en el dashboard de Mapbox.

---

## Git: cómo trabajamos

```bash
# 1. Antes de empezar SIEMPRE:
git checkout main
git pull origin main

# 2. Crear tu rama:
git checkout -b feature/nombre-de-mi-tarea

# 3. Trabajar, guardar cambios pequeños:
git add .
git commit -m "qué hice exactamente"

# 4. Subir tu rama:
git push origin feature/nombre-de-mi-tarea

# 5. Ir a GitHub.com -> Pull Requests -> New -> elegir tu rama
#    El otro revisa -> aprueba -> Merge

# 6. Después del merge:
git checkout main
git pull origin main
```

**Proteger main:** GitHub -> Settings -> Branches -> Add rule -> "Require a pull request before merging"

---

## PLAN DE FASES

Cada fase tiene:
- **Qué hay que hacer** (para nosotros, en lenguaje normal)
- **Bloque técnico** (para copiar a la IA)
- **Quién lo hace** (A o B)
- **Qué archivos toca** (para no solaparse)

> **IMPORTANTE:** No empezar una fase hasta que la anterior esté mergeada en main.

---

### FASE 0 — Montar la base del proyecto

> *Hacer juntos en videollamada. Son archivos raíz que solo se tocan una vez.*

#### Persona A — Estructura monorepo

**Qué haces:** Crear las carpetas vacías y el archivo que conecta todo.

**Archivos que tocas:**
```
package.json (raíz)
tsconfig.base.json
eslint.config.js
```

**Rama:** `setup/monorepo-root`

```
BLOQUE PARA LA IA:

Estoy creando un monorepo con npm workspaces para un proyecto llamado WorldLore.
Necesito:
- package.json raíz con workspaces: ["apps/web", "apps/api", "packages/contracts"]
- tsconfig.base.json con configuración base TS (ES2022, strict, paths para @worldlore/contracts)
- eslint.config.js con flat config para TypeScript
- Crear las carpetas vacías: apps/web/, apps/api/, packages/contracts/
No usamos Docker ni Redis. La BD es PostgreSQL remota.
```

---

#### Persona B — README y configuración Git

**Qué haces:** Crear el README inicial y el .gitignore.

**Archivos que tocas:**
```
README.md
.gitignore
```

**Rama:** `setup/readme-gitignore`

```
BLOQUE PARA LA IA:

Crea un .gitignore para un monorepo Node.js/TypeScript que ignore:
node_modules, dist, .env (pero NO .env.example), .DS_Store, coverage, *.log, .turbo
También incluye las carpetas de build de Vite y los archivos de Prisma generados.
```

---

### FASE 1 — Contratos compartidos + esqueleto API

> *Persona A crea los tipos de datos. Persona B monta el servidor. No se pisan en ningún archivo.*

#### Persona A — Contratos Zod + archivos .env.example

**Qué haces:** Crear los "contratos" — son los tipos de datos que comparten el frontend y el backend. También los archivos .env.example.

**Archivos que tocas:**
```
packages/contracts/package.json
packages/contracts/src/conflict.contract.ts
packages/contracts/src/country.contract.ts
packages/contracts/src/insight.contract.ts
packages/contracts/src/index.ts
apps/api/.env.example
apps/web/.env.example
```

**Rama:** `feature/contracts-and-env`

```
BLOQUE PARA LA IA:

Estoy en el monorepo WorldLore. Necesito crear packages/contracts/ con:

1. package.json con nombre "@worldlore/contracts", main y types apuntando a src/index.ts

2. conflict.contract.ts con Zod schemas y tipos TS inferidos para:
   - ConflictSummary: id, name, region, country (iso3), severity (1-5), startDate, endDate?, lat, lng, casualties
   - ConflictDetail: lo anterior + timeline (array de ConflictEvent con date, description, source)
   - ConflictFilters: region?, from? (date), to? (date), severity? (1-5)

3. country.contract.ts:
   - CountryOverview: iso3, name, region, population, gdp, hdi, conflictCount, riskLevel (low/medium/high/critical)
   - CountryIndicator: indicatorCode, name, value, year, source

4. insight.contract.ts:
   - InsightRequest: entityType (conflict|country), entityId, question?
   - InsightResponse: summary, evidence (array con source, text, relevance), generatedAt

5. index.ts que re-exporta todo

También crear:
- apps/api/.env.example con: PORT=3000, NODE_ENV=development, DATABASE_URL=postgresql://user:pass@host:5432/worldlore, CORS_ORIGIN=http://localhost:5173, JWT_SECRET=replace_me
- apps/web/.env.example con: VITE_API_BASE_URL=http://localhost:3000, VITE_MAPBOX_TOKEN=pk.xxx

Usar Zod para schemas y z.infer<typeof schema> para los tipos TS.
```

---

#### Persona B — Esqueleto Express + middleware

**Qué haces:** Montar el servidor Express vacío con seguridad básica.

**Archivos que tocas:**
```
apps/api/package.json
apps/api/tsconfig.json
apps/api/src/app.ts
apps/api/src/server.ts
apps/api/src/config/env.ts
apps/api/src/config/logger.ts
apps/api/src/middleware/validate.ts
apps/api/src/middleware/error.ts
apps/api/src/middleware/rate-limit.ts
apps/api/src/routes/index.ts
```

**Rama:** `feature/api-scaffold`

```
BLOQUE PARA LA IA:

Estoy en WorldLore, carpeta apps/api/. Necesito montar un servidor Express + TypeScript:

1. package.json con dependencias:
   - express, cors, helmet, zod, pino, pino-http, swagger-ui-express, swagger-jsdoc, express-rate-limit
   - devDeps: typescript, tsx, @types/node, @types/express, @types/cors, @types/swagger-ui-express

2. tsconfig.json que extiende de ../../tsconfig.base.json

3. src/config/env.ts: parsear process.env con Zod (PORT, DATABASE_URL, CORS_ORIGIN, JWT_SECRET, NODE_ENV). Fail fast si falta algo.

4. src/config/logger.ts: instancia de Pino con nivel según NODE_ENV.

5. src/app.ts: Express app con helmet(), cors({ origin: env.CORS_ORIGIN }), express.json(), pino-http logger, rate-limit global (100 req/15min), ruta GET /api/health que devuelve { status: "ok" }, mount de routes/index.ts en /api, y global error handler al final.

6. src/server.ts: importa app, escucha en env.PORT, log de inicio.

7. src/middleware/validate.ts: middleware genérico que recibe Zod schemas para body/params/query y devuelve 400 si falla.

8. src/middleware/error.ts: global error handler que loguea con Pino y devuelve JSON { error, message } sin stack traces al cliente.

9. src/middleware/rate-limit.ts: presets de rate-limit (general: 100/15min, auth: 5/15min).

10. src/routes/index.ts: router vacío que importará las rutas de cada módulo (dejar comentarios placeholder).

NO usar console.log, solo Pino. NO usar wildcard CORS.
```

---

### FASE 2 — Modelos OSINT en Prisma + módulo de conflictos

> **Estado del schema:** El schema base de Prisma (Entity, Conflict, ConflictEvent, ConflictFaction, ConflictCasualty, ConflictNews, ConflictUpdate, ConflictFactionSupport, Indicator, IndicatorValue, User, etc.) **ya está implementado** en `apps/api/prisma/schema.prisma`. Esta fase ahora se centra en extenderlo con los modelos OSINT del scraper.

> *Persona A extiende el schema con los modelos OSINT + crea rutas API OSINT. Persona B crea la lógica del módulo de conflictos curados. B depende de que A termine primero.*

> **Orden de merge:** Primero mergear la rama de A (prisma-osint), luego B puede empezar.

#### Persona A — Modelos OSINT en Prisma + módulo API OSINT

**Qué haces:** Añadir las tablas del scraper OSINT al schema de Prisma existente y crear las rutas API para que el frontend consuma esos datos. Las 12 categorías OSINT se agrupan en 5 macro-layers para el mapa (ver OSINT_FRONTEND_PLAN.md).

**Archivos que tocas:**
```
apps/api/prisma/schema.prisma          (añadir modelos OSINT al final)
apps/api/src/modules/osint/schemas.ts  (nuevo)
apps/api/src/modules/osint/types.ts    (nuevo)
apps/api/src/modules/osint/repo.ts     (nuevo)
apps/api/src/modules/osint/service.ts  (nuevo)
apps/api/src/modules/osint/controller.ts (nuevo)
apps/api/src/routes/osint.routes.ts    (nuevo)
apps/api/src/routes/index.ts           (añadir mount de osint)
```

**Rama:** `feature/prisma-osint`

```
BLOQUE PARA LA IA:

En apps/api/ del proyecto WorldLore, necesito EXTENDER el schema.prisma existente (NO reemplazarlo).
El schema ya tiene modelos para Entity, Conflict, ConflictEvent, ConflictFaction, etc.

PARTE 1: Añadir al final de schema.prisma estos nuevos modelos y enums:

Enums:
- OsintSeverity: CRITICAL, HIGH, ELEVATED, MODERATE, LOW
- OsintMacroLayer: CONFLICT_SECURITY, GOVERNANCE_DIPLOMACY, ECONOMIC_COERCION, HUMANITARIAN_DISASTER, CYBER_INFO

Modelos:
- OsintEvent: id (uuid PK), source (text), sourceId (text?), category (text — una de 12 categorías),
  macroLayer (OsintMacroLayer — precomputado desde category), title (text), summary (text?),
  severity (OsintSeverity), countryIso3 (varchar 3?), countryIso2 (varchar 2?), countryName (text?),
  region (text?), lat (float?), lng (float?), eventDate (timestamptz), url (text?),
  rawData (jsonb?), tags (text[]), isAlert (boolean default false), hash (text unique — SHA256 dedup),
  createdAt (timestamptz default now()).
  Relación: hasMany OsintAlert.
  Índices: (severity, eventDate), (countryIso3, category), (macroLayer, severity), (eventDate).

- OsintAlert: id (uuid PK), eventId (uuid FK -> OsintEvent onDelete Cascade), alertType (text),
  severity (OsintSeverity), title (text), description (text?), affectedCountries (text[]),
  isActive (boolean default true), createdAt (timestamptz default now()), resolvedAt (timestamptz?).
  Índices: (severity, isActive), (eventId).

- OsintSource: id (text PK — nombre de la fuente), lastFetch (timestamptz?), status (text default "ok"),
  eventsCount (int default 0), errorLog (text?).

- OsintScrapeLog: id (uuid PK), startedAt (timestamptz default now()), finishedAt (timestamptz?),
  eventsFetched (int default 0), eventsInserted (int default 0), eventsDuplicated (int default 0),
  errors (jsonb?).

NO hay FK de OsintEvent a Conflict ni a Entity. La unión es por countryIso3 en queries.

Después de añadir: npx prisma migrate dev --name add-osint-models

PARTE 2: Crear módulo API OSINT en apps/api/src/modules/osint/ con patrón CQS:

1. modules/osint/schemas.ts: Zod schemas para:
   - osintEventFiltersSchema: macroLayer? (enum), severity? (enum o array), countryIso3? (string),
     region? (string), from? (date ISO), to? (date ISO), bounds? ({ north, south, east, west } para viewport)
   - osintAlertFiltersSchema: isActive? (boolean), severity? (enum)
   - osintEventParamsSchema: id (uuid)

2. modules/osint/types.ts: tipos TS derivados de los schemas.

3. modules/osint/repo.ts: funciones Prisma:
   - findEvents(filters): query con where condicional por macroLayer, severity, country, dateRange,
     bounds (lat/lng entre north/south/east/west). OrderBy eventDate desc. Limit 200.
   - findEventById(id): findUnique.
   - findAlerts(filters): query osintAlerts con where isActive, severity. Include event. OrderBy createdAt desc.
   - getSourcesHealth(): findMany de OsintSource.

4. modules/osint/service.ts: llama al repo, transforma datos.

5. modules/osint/controller.ts:
   - listEvents(req, res): valida query, llama service, responde JSON.
   - getEvent(req, res): valida params, llama service, 404 si no existe.
   - listAlerts(req, res): alertas activas.
   - sourcesHealth(req, res): estado de las fuentes del scraper.

6. routes/osint.routes.ts: Router Express:
   - GET /api/osint/events -> controller.listEvents
   - GET /api/osint/events/:id -> controller.getEvent
   - GET /api/osint/alerts -> controller.listAlerts
   - GET /api/osint/sources -> controller.sourcesHealth

7. Registrar en routes/index.ts (montar /api/osint).

Mapeo de categorías a macro-layers (para el campo macroLayer precomputado):
- CONFLICT_SECURITY: COUP_REGIME_CHANGE, MILITARY_MOVEMENT, TERRORISM, BORDER_INCIDENT
- GOVERNANCE_DIPLOMACY: ELECTION, TREATY, OFFICIAL_DECLARATION
- ECONOMIC_COERCION: SANCTIONS, EMBARGO
- HUMANITARIAN_DISASTER: NATURAL_DISASTER, HUMANITARIAN_CRISIS
- CYBER_INFO: CYBER_ATTACK
```

---

#### Persona B — Módulo conflicts curados (lógica + rutas)

**Qué haces:** Crear la lógica para listar y ver los conflictos curados (guerras con facciones, aliados, timeline). Estos son los conflictos editoriales de WorldLore, NO los eventos automáticos del scraper. Los datos OSINT del scraper se pueden vincular opcionalmente por `countryIso3` para enriquecer la vista de detalle.

**Archivos que tocas:**
```
apps/api/src/modules/conflicts/schemas.ts
apps/api/src/modules/conflicts/types.ts
apps/api/src/modules/conflicts/repo.ts
apps/api/src/modules/conflicts/service.ts
apps/api/src/modules/conflicts/controller.ts
apps/api/src/routes/conflicts.routes.ts
```

**Rama:** `feature/conflicts-module`

> Esperar a que A haya mergeado `feature/prisma-osint` antes de empezar.

```
BLOQUE PARA LA IA:

En apps/api/src/ del proyecto WorldLore, crear el módulo de conflictos curados con patrón CQS.

IMPORTANTE: El schema de Prisma ya tiene estos modelos (NO crearlos, solo usarlos):
- Conflict: slug, name, country, region, conflictType, description, status (WAR/WARM/IMPROVING/RESOLVED/FROZEN),
  startDate, escalationDate?, endDate?, coordinates (Json {lat,lng}), involvedISO (String[]), sources (String[])
- ConflictCasualty: date, military?, civilian?, total, source?, notes?
- ConflictFaction: name, color?, goals (String[]), allies (String[])
- ConflictFactionSupport: supporterISO, supportType, weapons (String[]), aidValue?, strategicAssets (String[])
- ConflictEvent: title, date, description?, eventType?, location?, coordinates? (Json)
- ConflictUpdate: date, status?, description, source?
- ConflictNews: title, source, url, publishedAt, description?, imageUrl?

1. modules/conflicts/schemas.ts: Zod schemas para:
   - conflictFiltersSchema: region? (string), status? (ConflictStatus enum), country? (string),
     from? (date ISO), to? (date ISO)
   - conflictParamsSchema: id o slug (string)

2. modules/conflicts/types.ts: tipos TS derivados de los schemas + tipos de respuesta.

3. modules/conflicts/repo.ts: funciones Prisma:
   - findMany(filters): query Conflict con where condicional por region, status, country, dateRange.
     Include: { casualties: true, factions: { include: { support: true } }, _count: { select: { events: true } } }.
     OrderBy startDate desc.
   - findBySlug(slug): findUnique con include COMPLETO: casualties, factions (con support),
     events (orderBy date desc), updates (orderBy date desc), news (orderBy publishedAt desc, take 20).
   - findById(id): igual que findBySlug pero por id.

4. modules/conflicts/service.ts: capa de dominio que llama al repo y transforma datos.
   - Para el detalle: opcionalmente enriquecer con OsintEvents vinculados por countryIso3
     (query a OsintEvent WHERE countryIso3 IN conflict.involvedISO, macroLayer = CONFLICT_SECURITY).

5. modules/conflicts/controller.ts:
   - list(req, res): valida query, llama service, responde JSON.
   - getBySlug(req, res): valida params, llama service, 404 si no existe.

6. routes/conflicts.routes.ts: Router Express:
   - GET /api/conflicts -> controller.list
   - GET /api/conflicts/:slug -> controller.getBySlug

Registrar en routes/index.ts (A ya habrá montado /api/osint, tú montas /api/conflicts).

Patrón: controller (thin HTTP mapping) -> service (lógica de dominio) -> repo (queries Prisma).
Validar con Zod en cada endpoint, devolver 400 si falla.
```

---

### FASE 3 — Más módulos API + OpenAPI

> *Cada persona coge módulos distintos. No hay archivos compartidos.*

#### Persona A — Módulo countries + módulo auth

**Archivos que tocas:**
```
apps/api/src/modules/countries/*    (controller, service, repo, schemas, types)
apps/api/src/modules/auth/*         (controller, service, schemas, middleware)
apps/api/src/routes/countries.routes.ts
apps/api/src/routes/auth.routes.ts
```

**Rama 1:** `feature/countries-module`
**Rama 2:** `feature/auth-module` (después de mergear countries)

```
BLOQUE PARA LA IA (countries):

Crear módulo countries en apps/api/src/modules/countries/ siguiendo el mismo patrón CQS que conflicts:

- schemas.ts: iso3ParamsSchema (string exactamente 3 caracteres)
- repo.ts: findByIso3(iso3) que trae Entity con sus conflicts (count), últimos IndicatorValues agrupados por indicator
- service.ts: transforma a CountryOverview del contrato (calcula riskLevel según número de conflictos y severity media)
- controller.ts: getOverview(req, res)
- routes/countries.routes.ts: GET /api/countries/:iso3/overview

Añadir cache headers: Cache-Control con stale-while-revalidate para que el frontend pueda cachear.
```

```
BLOQUE PARA LA IA (auth):

Crear módulo auth en apps/api/src/modules/auth/:

- schemas.ts: loginSchema (email + password con Zod), refreshSchema (refreshToken string)
- service.ts: login(email, password) que verifica con bcrypt contra User.passwordHash, genera JWT access token (15min) + refresh token (7d). refresh(token) que verifica y rota.
- controller.ts: login(req, res), refresh(req, res)
- middleware.ts: authMiddleware que verifica JWT del header Authorization: Bearer <token>, adjunta user a req.
- routes/auth.routes.ts: POST /api/auth/login, POST /api/auth/refresh

Deps adicionales: jsonwebtoken, bcrypt (+ sus @types)
Rate-limit especial para /auth: 5 intentos / 15 min.
```

---

#### Persona B — Módulo insights + OpenAPI docs

**Archivos que tocas:**
```
apps/api/src/modules/insights/*     (controller, service, schemas, types)
apps/api/src/routes/insights.routes.ts
apps/api/src/docs/swagger.ts
apps/api/src/routes/dashboard.routes.ts
```

**Rama 1:** `feature/insights-module`
**Rama 2:** `feature/openapi-docs` (después de mergear insights)

```
BLOQUE PARA LA IA (insights):

Crear módulo insights en apps/api/src/modules/insights/:

- schemas.ts: insightRequestSchema con Zod (entityType: "conflict"|"country", entityId: uuid, question?: string)
- service.ts: generateInsight(request) que:
  1. Busca el entity en la BD (conflict o country según tipo)
  2. Recopila datos relevantes (eventos recientes, indicadores)
  3. Llama a un LLM adapter (por ahora dejar interfaz abstracta con un mock que devuelve respuesta de ejemplo)
  4. Devuelve InsightResponse del contrato (summary, evidence array, generatedAt)
- controller.ts: create(req, res) -> POST
- routes/insights.routes.ts: POST /api/insights (proteger con authMiddleware)

La idea es que el LLM adapter sea intercambiable (OpenAI, Anthropic, etc). Por ahora crear un MockLLMAdapter que devuelva datos de prueba.
```

```
BLOQUE PARA LA IA (OpenAPI docs):

Crear apps/api/src/docs/swagger.ts:

- Configurar swagger-jsdoc con info del proyecto WorldLore
- Definir los schemas de OpenAPI basándose en los Zod schemas de cada módulo
- Incluir todas las rutas: /api/conflicts, /api/conflicts/:id, /api/countries/:iso3/overview, /api/auth/login, /api/auth/refresh, /api/insights

En app.ts, montar swagger-ui-express en /api/docs.

También crear routes/dashboard.routes.ts:
- GET /api/dashboard/summary -> devuelve stats globales: totalConflicts, activeConflicts, countriesAffected, avgSeverity
  (query simple con Prisma count/aggregate)
```

---

### FASE 4 — Frontend web

> *Persona A monta la estructura React. Persona B crea las páginas con datos. A debe mergear primero para que B tenga la base.*

> **Orden de merge:** Primero A (web-scaffold), luego B puede empezar.

#### Persona A — Scaffold React + dashboard + país

**Archivos que tocas:**
```
apps/web/package.json
apps/web/tsconfig.json
apps/web/vite.config.ts
apps/web/index.html
apps/web/src/app/*               (providers, router, layouts)
apps/web/src/lib/*               (http.ts, env.ts, queryClient.ts)
apps/web/src/styles/*            (tokens.css, reset.css, globals.css)
apps/web/src/features/dashboard/*
apps/web/src/features/country/*
apps/web/src/pages/Dashboard.tsx
apps/web/src/pages/Country.tsx
```

**Rama 1:** `feature/web-scaffold`
**Rama 2:** `feature/web-dashboard-country` (después de mergear scaffold)

```
BLOQUE PARA LA IA (scaffold):

Crear apps/web/ como app Vite + React + TypeScript:

1. package.json con deps: react, react-dom, react-router-dom, @tanstack/react-query, mapbox-gl
   devDeps: vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom

2. vite.config.ts con plugin react y proxy de /api a localhost:3000 en dev

3. src/lib/env.ts: exportar VITE_API_BASE_URL y VITE_MAPBOX_TOKEN desde import.meta.env
4. src/lib/http.ts: wrapper de fetch con baseURL, manejo de errores, headers JSON
5. src/lib/queryClient.ts: instancia de QueryClient con defaults razonables (staleTime: 5min, retry: 1)

6. src/app/AppProviders.tsx: wraps QueryClientProvider + BrowserRouter
7. src/app/RouterProvider.tsx: rutas -> /, /conflicts, /conflicts/:id, /countries/:iso3, /insights
8. src/app/layouts/MainLayout.tsx: layout con sidebar/nav + outlet

9. src/styles/tokens.css: CSS custom properties (colores, spacing, border-radius, font)
10. src/styles/reset.css: CSS reset mínimo
11. src/styles/globals.css: importa tokens + reset, estilos base de body

Solo VITE_* envs se exponen al cliente. Nunca secrets.
```

```
BLOQUE PARA LA IA (dashboard + country):

En apps/web/src/:

1. features/dashboard/: componentes para la página principal
   - DashboardStats.tsx: muestra totalConflicts, activeConflicts, countriesAffected, avgSeverity
   - useDashboardSummary.ts: hook con useQuery que llama GET /api/dashboard/summary
   - RecentConflicts.tsx: lista los 5 conflictos más recientes

2. features/country/: componentes para vista de país
   - CountryOverview.tsx: muestra KPIs del país (population, gdp, hdi, riskLevel)
   - CountryIndicators.tsx: tabla/lista de indicadores
   - useCountryOverview.ts: hook con useQuery que llama GET /api/countries/:iso3/overview

3. pages/Dashboard.tsx: compone DashboardStats + RecentConflicts
4. pages/Country.tsx: lee :iso3 de la URL, compone CountryOverview + CountryIndicators

Usar TanStack Query para data fetching. Importar http.ts de lib/ para las llamadas.
```

---

#### Persona B — Mapa + conflictos + insights

**Archivos que tocas:**
```
apps/web/src/features/map/*
apps/web/src/features/conflicts/*
apps/web/src/features/insights/*
apps/web/src/pages/Conflicts.tsx
apps/web/src/pages/ConflictDetail.tsx
apps/web/src/pages/Insights.tsx
```

**Rama 1:** `feature/web-map-conflicts`
**Rama 2:** `feature/web-insights` (después de mergear map-conflicts)

> Esperar a que A haya mergeado `feature/web-scaffold`.

```
BLOQUE PARA LA IA (mapa + conflictos):

En apps/web/src/:

1. features/map/: mapa interactivo
   - ConflictMap.tsx: componente Mapbox GL JS que muestra marcadores de conflictos en un mapa mundial
   - useMapbox.ts: hook que inicializa el mapa con el token de VITE_MAPBOX_TOKEN
   - Los marcadores deben tener color según severity (verde=1, amarillo=2-3, rojo=4-5)

2. features/conflicts/: lista y filtros
   - ConflictList.tsx: lista de conflictos con nombre, región, severity, fecha
   - ConflictFilters.tsx: filtros por región, rango de fechas, severity
   - ConflictTimeline.tsx: timeline de eventos para la vista de detalle
   - useConflicts.ts: hook con useQuery -> GET /api/conflicts con filtros como query params
   - useConflictDetail.ts: hook -> GET /api/conflicts/:id

3. pages/Conflicts.tsx: ConflictMap arriba + ConflictFilters + ConflictList abajo
4. pages/ConflictDetail.tsx: lee :id, muestra detalle + ConflictTimeline

Token Mapbox debe estar URL-restricted en el dashboard de Mapbox.
```

```
BLOQUE PARA LA IA (insights):

En apps/web/src/:

1. features/insights/:
   - InsightForm.tsx: formulario para pedir un insight (select entityType, select entityId, textarea para question opcional)
   - InsightResult.tsx: muestra el summary + lista de evidence (source, text, relevance badge)
   - useGenerateInsight.ts: hook con useMutation -> POST /api/insights

2. pages/Insights.tsx: InsightForm + InsightResult cuando hay respuesta

La petición debe incluir el JWT token en el header Authorization (el usuario debe estar logueado).
```

---

### FASE 5 — Jobs de datos + WebSocket + CI/CD

> *Última fase. Persona A hace los jobs automáticos. Persona B hace WebSocket simple y el pipeline de CI.*

#### Persona A — Ingestion jobs + integraciones

**Archivos que tocas:**
```
apps/api/src/jobs/scheduler.ts
apps/api/src/jobs/worldbank/*     (fetch.ts, normalize.ts, upsert.ts)
apps/api/src/jobs/ucdp/*
apps/api/src/jobs/acled/*
apps/api/src/jobs/snapshots/*
apps/api/src/integrations/worldbank.ts
apps/api/src/integrations/acled.ts
apps/api/src/integrations/ucdp.ts
```

**Rama:** `feature/ingestion-jobs`

```
BLOQUE PARA LA IA:

Crear el sistema de ingestion jobs en apps/api/src/jobs/:

1. integrations/worldbank.ts: cliente HTTP para World Bank API v2
   - fetchIndicators(iso3, indicators[]): trae datos de indicadores (GDP, population, HDI, etc)
   - URL base: https://api.worldbank.org/v2/

2. integrations/acled.ts: cliente para ACLED API (conflict events)
3. integrations/ucdp.ts: cliente para UCDP API (conflict data)

4. jobs/worldbank/: fetch.ts (llama al cliente) -> normalize.ts (transforma al formato de la BD) -> upsert.ts (prisma upsert de IndicatorValues)
5. jobs/ucdp/ y jobs/acled/: mismo patrón fetch -> normalize -> upsert para ConflictEvents

6. jobs/snapshots/: materializa "read models" desnormalizados
   - snapshotCountryOverview.ts: precalcula la vista de country overview y la guarda en una tabla snapshot

7. jobs/scheduler.ts: usa setInterval o node-cron para:
   - World Bank: cada 24h
   - UCDP/ACLED: cada 15 min
   - Snapshots: cada 30 min

IMPORTANTE: Los jobs corren fuera del request path (no bloquean peticiones HTTP).
Loguear con Pino cada ejecución (inicio, fin, errores).
```

---

#### Persona B — WebSocket + CI/CD

**Archivos que tocas:**
```
apps/api/src/websocket/server.ts
apps/api/src/websocket/handlers.ts
.github/workflows/ci.yml
```

**Rama 1:** `feature/websocket`
**Rama 2:** `feature/ci-pipeline`

```
BLOQUE PARA LA IA (websocket):

Crear WebSocket simple en apps/api/src/websocket/:

1. server.ts: configurar Socket.IO server adjunto al HTTP server de Express.
   - CORS: misma config que Express
   - Namespace: /conflicts

2. handlers.ts: handler para broadcast de conflict:update
   - Cuando un job de ingestion actualiza un conflicto, emitir evento a todos los clientes conectados
   - Evento: { type: "conflict:update", data: { conflictId, changes } }

NO usar Redis adapter por ahora (single server). Dejar un comentario TODO para añadirlo cuando se escale.

Deps: socket.io
```

```
BLOQUE PARA LA IA (CI/CD):

Crear .github/workflows/ci.yml para GitHub Actions:

- Trigger: push y pull_request a main
- Jobs:
  1. lint: ejecutar eslint en todo el monorepo
  2. typecheck: tsc --noEmit en apps/api y apps/web
  3. build: npm run build en apps/api y apps/web

- Node 20
- Cache de node_modules
- Fail fast: si cualquier job falla, el PR no se puede mergear

Configurar en GitHub: Settings -> Branches -> Require status checks to pass -> seleccionar los jobs del CI.
```

---

## Checklist resumen

| # | Tarea | Quién | Fase |
|---|-------|-------|------|
| 1 | Monorepo raíz (package.json, tsconfig, eslint) | A | 0 |
| 2 | README + .gitignore | B | 0 |
| 3 | Contratos Zod + .env.examples | A | 1 |
| 4 | Express scaffold + middleware | B | 1 |
| 5 | ~~Prisma schema base~~ (HECHO) + Modelos OSINT en Prisma + módulo API OSINT | A | 2 |
| 6 | Módulo conflicts curados (rutas + lógica con schema real) | B | 2 |
| 7 | Módulo countries | A | 3 |
| 8 | Módulo auth (JWT) | A | 3 |
| 9 | Módulo insights | B | 3 |
| 10 | OpenAPI docs + dashboard route | B | 3 |
| 11 | Web scaffold (Vite + React + router) | A | 4 |
| 12 | Web dashboard + country pages | A | 4 |
| 13 | Web mapa + conflictos pages | B | 4 |
| 14 | Web insights page | B | 4 |
| 15 | Ingestion jobs + integraciones | A | 5 |
| 16 | WebSocket básico | B | 5 |
| 17 | CI/CD pipeline | B | 5 |

---

## Seguridad (para no olvidar)

- **Helmet** activado por defecto en Express (headers HTTP seguros)
- **CORS** con whitelist explícita, nunca wildcard `*` en producción
- **Rate-limit** global + especial para `/auth`
- **Zod** valida TODA entrada en cada endpoint (devuelve 400 si falla)
- **JWT_SECRET** fuerte y rotado periódicamente
- **Mapbox token** restringido por URL en el dashboard de Mapbox
- **`.env` NUNCA en Git** — solo `.env.example`
- **Pino** para logs, nunca `console.log` — nunca enviar stack traces al cliente
