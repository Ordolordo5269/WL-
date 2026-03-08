# WorldLore — Plan de Eliminación de Código Legacy

> **Somos 2 personas sin experiencia en programación.**
> Este documento explica EXACTAMENTE qué borrar, qué mover y qué modificar
> para eliminar el código viejo que quedó dentro de `apps/api/` y `apps/web/`.
> Cada paso tiene la lista exacta de archivos. No improvises — sigue el plan.

---

## Clave de colores/personas

```
┌───────────────────────────────────────────────┐
│  PERSONA A (Andrés)  = hace los pasos  "xA"  │
│  PERSONA B (Fabri)   = hace los pasos  "xB"  │
│                                               │
│  Orden ESTRICTO:                              │
│  1A → 1B → 2A → 2B → 3A → 3B → 4A → 4B      │
│       → 5A → 5B → 6A → 6B                    │
│                                               │
│  NUNCA empezar B sin que A esté mergeado.     │
└───────────────────────────────────────────────┘
```

---

## Qué es "código legacy" (explicación simple)

Piensa en una casa que fue remodelada. La cocina nueva ya funciona,
pero la cocina vieja sigue ahí al lado, conectada a los mismos caños.
El plan es **desconectar la cocina vieja tubo por tubo** sin dejar de tener agua.

```
CÓDIGO LEGACY (cocina vieja)          CÓDIGO NUEVO (cocina nueva)
─────────────────────────────         ──────────────────────────
controllers/  ← lógica HTTP vieja    modules/  ← lógica HTTP nueva
services/     ← lógica negocio vieja (cada módulo tiene su service)
core/         ← logger Winston,      config/   ← logger Pino, env
              validación vieja        middleware/ ← validación nueva
index.ts      ← entrada vieja        server.ts ← entrada nueva
```

**Meta:** que al final SOLO quede la cocina nueva.

---

## Situación actual del backend

```
apps/api/src/
│
├── app.ts                    ✅ NUEVO (se queda)
├── server.ts                 ✅ NUEVO (se queda)
├── index.ts                  ❌ LEGACY (entry point viejo — nadie lo usa)
│
├── config/                   ✅ NUEVO
│   ├── env.ts
│   ├── env.example.ts
│   └── logger.ts             (Pino — el logger bueno)
│
├── middleware/                ✅ NUEVO
│   ├── auth.ts
│   ├── error.ts
│   ├── logger.ts
│   ├── rate-limit.ts
│   ├── requestLogger.ts      ❌ DEAD CODE (nadie lo importa)
│   └── validate.ts           (validación nueva con Zod)
│
├── modules/                  ✅ NUEVO (patrón CQS)
│   ├── auth/
│   ├── conflicts/
│   ├── countries/
│   ├── insights/
│   └── osint/
│
├── controllers/              ❌ LEGACY (16 archivos — reemplazar por modules/)
│   ├── auth.controller.ts         → ya existe modules/auth/
│   ├── conflict.controller.ts     → ya existe modules/conflicts/ (parcial)
│   ├── country.controller.ts      → ya existe modules/countries/
│   ├── defense.controller.ts      ┐
│   ├── economy.controller.ts      │
│   ├── indicator.controller.ts    │→ se unificarán en modules/indicators/
│   ├── international.controller.ts│
│   ├── politics.controller.ts     │
│   ├── society.controller.ts      │
│   ├── technology.controller.ts   ┘
│   ├── favorites.controller.ts    ┐
│   ├── geo.controller.ts          │
│   ├── history.controller.ts      │→ cada uno tendrá su módulo
│   ├── natural.controller.ts      │
│   ├── prediction.controller.ts   │
│   └── user.controller.ts         ┘
│
├── services/                 ❌ LEGACY (11 archivos)
│   ├── acled.service.ts
│   ├── conflict.service.ts
│   ├── country.service.ts
│   ├── deepseek.service.ts
│   ├── geodb.service.ts
│   ├── history.service.ts
│   ├── indicator.service.ts
│   ├── natural.service.ts
│   ├── news-api.service.ts
│   ├── news-cache.service.ts
│   └── prediction.service.ts
│
├── core/                     ❌ LEGACY (mixto: algo se usa, algo no)
│   ├── cache/
│   │   └── memoryCache.ts         (solo lo usa indicator.controller.ts)
│   ├── errors/
│   │   ├── AppError.ts            (solo lo usan 2 controllers legacy)
│   │   └── errorHandler.ts        (DEAD — no registrado en app.ts)
│   ├── http/
│   │   └── httpClient.ts          (DEAD — 0 imports)
│   ├── logger/
│   │   ├── index.ts               (Winston — reemplazado por config/logger.ts)
│   │   └── logger.example.ts      (ejemplo, no código real)
│   └── validation/
│       ├── validate.ts            (reemplazado por middleware/validate.ts)
│       ├── validate.example.ts    (ejemplo)
│       └── schemas/
│           ├── auth.schemas.ts
│           ├── common.ts
│           └── conflict.schemas.ts (usado por conflict.routes.ts hasta Fase 3)
│
├── utils/                    ❌ LEGACY
│   ├── asyncHandler.ts            (se moverá a middleware/)
│   ├── asyncHandler.example.ts    (ejemplo)
│   └── index.ts                   (DEAD — solo exporta noop())
│
├── routes/                   ⚠️  MIXTO (algunos legacy, algunos nuevos)
├── integrations/             ✅ NUEVO
├── jobs/                     ✅ NUEVO
├── websocket/                ✅ NUEVO
├── docs/                     ✅ NUEVO
├── scripts/                  ⚠️  Tiene paths viejos que corregir
├── db/                       ✅ NUEVO
└── types/                    ✅ NUEVO
```

---

## Situación actual del frontend — INVENTARIO COMPLETO

### App.tsx (964 líneas) — el monolito que se descompone

App.tsx es el componente central. Controla el mapa mundial, los sidebars,
y TODOS los modos del LeftSidebar. Importa directamente de components/ y services/.

```
App.tsx importa directamente:
│
├── COMPONENTES (de components/)
│   ├── WorldMap.tsx                    → irá a features/world-map/
│   ├── LeftSidebar.tsx (868 líneas)   → irá a features/world-map/
│   ├── MenuToggleButton.tsx           → irá a features/world-map/
│   ├── CountrySidebar.tsx             → irá a features/country-sidebar/
│   ├── CountryCard.tsx                → irá a features/country/
│   ├── ConflictTracker.tsx            → irá a features/conflicts/
│   ├── CompareCountriesPopup.tsx      → irá a features/compare/
│   └── CompareCountriesView.tsx       → irá a features/compare/
│
├── SERVICIOS (de services/ — para el mapa coroplético "Statistics")
│   ├── worldbank-gdp.ts              → irá a features/world-map/services/
│   ├── worldbank-gdp-per-capita.ts   → irá a features/world-map/services/
│   ├── worldbank-inflation.ts        → irá a features/world-map/services/
│   ├── indicator-generic.ts          → irá a features/world-map/services/
│   └── indicators-db.ts             → irá a features/world-map/services/
│
└── DATOS
    └── data/conflicts-data.ts         (se queda)
```

### LeftSidebar.tsx (868 líneas) — los 9 modos

```
LeftSidebar tiene 9 modos. Cada uno usa componentes/servicios específicos:

┌─────────────────────────────────────────────────────────────────────────────────┐
│  MODO 1: Conflict Tracker (icono rojo)                                         │
│  Abre: components/ConflictTracker.tsx                                          │
│  Usa:  services/conflict-service.ts                                            │
│        services/conflict-api.ts                                                │
│        services/conflict-websocket.ts                                          │
│        services/conflict-tracker/ (3 archivos)                                 │
│        hooks/useConflictWebSocket.ts                                           │
│  Todo → features/conflicts/                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODO 2: History Mode (icono cyan)                                             │
│  Controles: selector de año (1880+), toggle on/off                             │
│  Usa:  utils/historical-years.ts (AVAILABLE_HISTORY_YEARS, snapToAvailableYear)│
│        services/historical-indicators.service.ts                               │
│  utils/ se queda. El service → features/world-map/services/                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODO 3: Physical Layers (icono verde)                                         │
│  Controles: toggles para Rivers, Mountain Ranges, Peaks + LOD selector         │
│  Usa:  WorldMap.tsx (las capas se renderizan en el mapa)                        │
│        No tiene servicios propios — los datos vienen del mapa/API backend       │
│  Todo inline en LeftSidebar → se mueve con LeftSidebar a features/world-map/   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODO 4: Statistics (icono azul) — 9 indicadores económicos                    │
│  Controles: 9 toggles mutuamente excluyentes, cada uno con leyenda             │
│  Indicadores:                                                                  │
│    a) GDP (nominal)            — services/worldbank-gdp.ts                     │
│    b) GDP per Capita           — services/worldbank-gdp-per-capita.ts          │
│    c) Inflation (annual %)     — services/worldbank-inflation.ts               │
│    d) GINI Index               ┐                                               │
│    e) Exports (US$)            │                                               │
│    f) Life Expectancy          │— services/indicator-generic.ts                │
│    g) Military Expenditure     │  services/indicators-db.ts                    │
│    h) Democracy Index          │  (construyen coroplético genérico)            │
│    i) Trade (% of GDP)         ┘                                               │
│  Todo → features/world-map/services/                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODO 5: International Organizations (icono amarillo)                          │
│  Sub-componente: components/InternationalOrganizationsPanel.tsx                 │
│  Usa:  services/orgs-config.ts (datos de organizaciones)                       │
│        services/orgs-service.ts (buildOrgHighlight)                            │
│  Todo → features/world-map/                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODO 6: Compare Countries (icono púrpura)                                     │
│  Abre: components/CompareCountriesPopup.tsx (selección)                        │
│        components/CompareCountriesView.tsx (vista comparación)                  │
│  Usa:  hooks/useCountryBasicInfo.ts, hooks/useEconomyData.ts,                  │
│        hooks/usePoliticsData.ts, hooks/useSocietyData.ts                       │
│        services/historical-indicators.service.ts                               │
│  Componentes → features/compare/                                               │
│  Los hooks/services los comparte con country-sidebar (ya se mueven ahí)        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODO 7: Dashboard (icono indigo)                                              │
│  Solo navegación: navega a /dashboard (o /login si no está autenticado)        │
│  No tiene componentes propios en LeftSidebar                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODO 8: Settings (icono gris) — 6 grupos de configuración del mapa           │
│  Todo inline en LeftSidebar (no usa componentes externos)                      │
│    a) Base map:     Night / Light / Outdoors                                   │
│    b) Planet preset: Default / Nebula / Sunset / Dawn                          │
│    c) Terrain:      Toggle + slider exaggeration (0-5×)                        │
│    d) 3D Buildings: Toggle                                                     │
│    e) Labels:       Show/Hide                                                  │
│    f) Rotation:     Toggle + slider speed (0-10°/sec)                          │
│  Se mueve con LeftSidebar a features/world-map/                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODO 9: About (icono rosa)                                                    │
│  Link externo a landing/about. No tiene componentes.                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### CountrySidebar.tsx (components/) — panel derecho de país

```
CountrySidebar (el ACTIVO, en components/) importa:
│
├── SECCIONES (de components/)
│   ├── BasicInfoSection.tsx              ┐
│   ├── CountryHeaderSticky.tsx           │
│   ├── CountryKPIs.tsx                   │
│   ├── CountryStaticData.tsx             │ Todo → features/country-sidebar/sections/
│   ├── EconomySection.tsx                │
│   ├── DefenseSection.tsx                │
│   ├── PoliticsSection.tsx               │
│   ├── SocietySection.tsx                │
│   ├── TechnologySection.tsx             │
│   ├── InternationalSection.tsx          │
│   ├── CultureSection.tsx                │
│   └── HistoricalTrendsSection.tsx        ┘
│
├── HOOKS (de hooks/)
│   ├── useEconomyData.ts                ┐
│   ├── useDefenseData.ts                │
│   ├── usePoliticsData.ts               │
│   ├── useSocietyData.ts                │ Todo → features/country-sidebar/hooks/
│   ├── useTechnologyData.ts             │
│   ├── useInternationalData.ts          │
│   ├── useCultureData.ts                │
│   ├── useCountryBasicInfo.ts           │
│   └── useGeoData.ts                    ┘
│
└── SERVICIOS (usados por los hooks ↑)
    ├── economy-service.ts                ┐
    ├── defense-service.ts                │
    ├── politics-service.ts               │
    ├── society-service.ts                │ Todo → features/country-sidebar/services/
    ├── technology-service.ts             │
    ├── international-service.ts          │
    ├── culture-service.ts                │
    ├── country-basic-info.service.ts     │
    └── geo.service.ts                    ┘
```

### Componentes de charts (compartidos por varios features)

```
Estos componentes los usan VARIAS secciones del CountrySidebar y CompareCountries.
No pertenecen a un solo feature — van a components/ui/ (compartidos):

components/FullscreenChartModal.tsx        → investigar: ¿quién lo importa?
components/HexagonalPerformanceChart.tsx   → investigar: ¿quién lo importa?
components/OverlaidTimeSeriesChart.tsx     → usa historical-indicators.service.ts
components/RadarChartRecharts.tsx          → investigar: ¿quién lo importa?
components/SelectableComparisonChart.tsx   → usa historical-indicators.service.ts, society-service.ts
components/TimeSeriesChart.tsx             → usa historical-indicators.service.ts, prediction.service.ts
components/TimeSeriesChartRecharts.tsx     → usa historical-indicators.service.ts

Si un chart solo lo usa 1 feature → moverlo a ese feature
Si lo usan 2+ features → moverlo a components/ui/
Verificar con: grep -r "NombreComponente" apps/web/src/
```

### Archivos MUERTOS (eliminar, no mover)

```
❌ ELIMINAR (duplicados o nunca importados):
components/ConflictFilters.tsx               ← duplicado de features/conflicts/ConflictFilters.tsx
components/ConflictTimeline.tsx              ← duplicado de features/conflicts/ConflictTimeline.tsx
components/CountrySelector.tsx               ← 0 importadores
features/country-sidebar/CountrySidebar.tsx  ← nunca importado (versión muerta)
```

### Otros componentes y servicios

```
components/DashboardLayout.tsx          → features/dashboard/         (lo usa pages/Dashboard.tsx)
components/ProfileSection.tsx           → features/dashboard/         (lo usa pages/Dashboard.tsx)
components/FavoritesSection.tsx         → features/dashboard/         (lo usa pages/Dashboard.tsx)
components/PredictiveAnalysisSection.tsx→ features/dashboard/         (lo usa pages/Dashboard.tsx)

components/LoginForm.tsx                → features/auth/              (lo usa AppRouter.tsx)
components/RegisterForm.tsx             → features/auth/              (lo usa AppRouter.tsx)
components/ProtectedRoute.tsx           → features/auth/              (lo usa Dashboard, Insights)

components/DynamicSunOverlay.tsx        → features/world-map/         (overlay visual del mapa)
components/map/mapAppearance.ts         → features/world-map/map/     (lo usa WorldMap, DynamicSunOverlay)
components/map/terrain.ts               → features/world-map/map/     (lo usa WorldMap)

components/UkraineAPIDemo.tsx           → features/demos/ (o eliminar si no se usa)

services/auth.service.ts                → features/auth/              (lo usan ProfileSection, AuthContext)
services/favorites.service.ts           → features/dashboard/         (lo usan CountrySidebar, FavoritesSection)
services/prediction.service.ts          → features/dashboard/         (lo usan PredictiveAnalysis, TimeSeriesChart)
services/news-api.ts                    → features/news/              (lo usa conflict-service.ts)
services/acled-api.ts                   → features/conflicts/services/ (lo usa ConflictDetailCard)
services/conflict-actions.ts            → features/conflicts/services/ (acciones sobre conflictos)
services/ukraine-api.ts                 → features/demos/ (o eliminar)
services/russian-warship-api.ts         → features/demos/ (o eliminar)
```

### Archivos que SE QUEDAN donde están

```
✅ NO SE MUEVEN:
├── AppRouter.tsx              (ya nuevo)
├── main.tsx                   (ya nuevo)
├── contexts/AuthContext.tsx    (ya nuevo — lo usan 10+ archivos)
├── data/conflicts-data.ts     (datos estáticos)
├── data/countries-cache.json  (datos estáticos)
├── lib/http.ts                (ya nuevo — lo usan todos los hooks de features/)
├── lib/queryClient.ts         (ya nuevo)
├── utils/historical-years.ts  (lo usa LeftSidebar para History Mode)
├── utils/sunPosition.ts       (lo usa DynamicSunOverlay)
├── utils/errorHandler.js      (utilidad general)
├── utils/errorHandler.d.ts    (tipos)
├── pages/* (6 páginas)        (ya nuevas)
├── features/conflicts/*       (ya nuevos — hooks y componentes del módulo)
├── features/country/*         (ya nuevos)
├── features/dashboard/*       (ya nuevos)
├── features/insights/*        (ya nuevos)
└── features/map/*             (ya nuevos)
```

---

## TABLA MAESTRA DE MIGRACIÓN — Cada archivo legacy → su destino

> Esta tabla es la fuente de verdad. Si hay conflicto con las instrucciones de una fase, esta tabla manda.

### components/ → destinos

| # | Archivo origen | Destino | Fase | Importado por |
|---|----------------|---------|------|---------------|
| 1 | components/WorldMap.tsx | features/world-map/WorldMap.tsx | 6A | App.tsx |
| 2 | components/LeftSidebar.tsx | features/world-map/LeftSidebar.tsx | 6B | App.tsx |
| 3 | components/MenuToggleButton.tsx | features/world-map/MenuToggleButton.tsx | 6B | App.tsx |
| 4 | components/DynamicSunOverlay.tsx | features/world-map/DynamicSunOverlay.tsx | 6A | App.tsx |
| 5 | components/map/mapAppearance.ts | features/world-map/map/mapAppearance.ts | 6A | WorldMap, DynamicSunOverlay |
| 6 | components/map/terrain.ts | features/world-map/map/terrain.ts | 6A | WorldMap |
| 7 | components/InternationalOrganizationsPanel.tsx | features/world-map/InternationalOrganizationsPanel.tsx | 5B | LeftSidebar |
| 8 | components/CountrySidebar.tsx | features/country-sidebar/CountrySidebar.tsx | 5A | App.tsx |
| 9 | components/BasicInfoSection.tsx | features/country-sidebar/sections/BasicInfoSection.tsx | 5A | CountrySidebar |
| 10 | components/CountryHeaderSticky.tsx | features/country-sidebar/sections/CountryHeaderSticky.tsx | 5A | CountrySidebar |
| 11 | components/CountryKPIs.tsx | features/country-sidebar/sections/CountryKPIs.tsx | 5A | CountrySidebar |
| 12 | components/CountryStaticData.tsx | features/country-sidebar/sections/CountryStaticData.tsx | 5A | CountrySidebar |
| 13 | components/HistoricalTrendsSection.tsx | features/country-sidebar/sections/HistoricalTrendsSection.tsx | 5A | CountrySidebar |
| 14 | components/EconomySection.tsx | features/country-sidebar/sections/EconomySection.tsx | 5A | CountrySidebar |
| 15 | components/DefenseSection.tsx | features/country-sidebar/sections/DefenseSection.tsx | 5A | CountrySidebar |
| 16 | components/PoliticsSection.tsx | features/country-sidebar/sections/PoliticsSection.tsx | 5A | CountrySidebar |
| 17 | components/SocietySection.tsx | features/country-sidebar/sections/SocietySection.tsx | 5B | CountrySidebar |
| 18 | components/TechnologySection.tsx | features/country-sidebar/sections/TechnologySection.tsx | 5B | CountrySidebar |
| 19 | components/InternationalSection.tsx | features/country-sidebar/sections/InternationalSection.tsx | 5B | CountrySidebar |
| 20 | components/CultureSection.tsx | features/country-sidebar/sections/CultureSection.tsx | 5B | CountrySidebar |
| 21 | components/ConflictTracker.tsx | features/conflicts/ConflictTracker.tsx | 5B | App.tsx |
| 22 | components/ConflictDetailCard.tsx | features/conflicts/ConflictDetailCard.tsx | 5B | — |
| 23 | components/ConflictFactions.tsx | features/conflicts/ConflictFactions.tsx | 5B | — |
| 24 | components/ConflictStats.tsx | features/conflicts/ConflictStats.tsx | 5B | — |
| 25 | components/ConflictSearchBar.tsx | features/conflicts/ConflictSearchBar.tsx | 5B | — |
| 26 | components/CountryCard.tsx | features/country/CountryCard.tsx | 6B | App.tsx |
| 27 | components/CompareCountriesPopup.tsx | features/compare/CompareCountriesPopup.tsx | 6B | App.tsx |
| 28 | components/CompareCountriesView.tsx | features/compare/CompareCountriesView.tsx | 6B | App.tsx |
| 29 | components/LoginForm.tsx | features/auth/LoginForm.tsx | 6B | AppRouter.tsx |
| 30 | components/RegisterForm.tsx | features/auth/RegisterForm.tsx | 6B | AppRouter.tsx |
| 31 | components/ProtectedRoute.tsx | features/auth/ProtectedRoute.tsx | 6B | Dashboard, Insights |
| 32 | components/DashboardLayout.tsx | features/dashboard/DashboardLayout.tsx | 6A | pages/Dashboard.tsx |
| 33 | components/ProfileSection.tsx | features/dashboard/ProfileSection.tsx | 6A | pages/Dashboard.tsx |
| 34 | components/FavoritesSection.tsx | features/dashboard/FavoritesSection.tsx | 6A | pages/Dashboard.tsx |
| 35 | components/PredictiveAnalysisSection.tsx | features/dashboard/PredictiveAnalysisSection.tsx | 6A | pages/Dashboard.tsx |
| 36 | components/UkraineAPIDemo.tsx | features/demos/ o ELIMINAR | 6B | — |
| 37 | components/FullscreenChartModal.tsx | components/ui/ o feature que lo use | 6B | investigar |
| 38 | components/HexagonalPerformanceChart.tsx | components/ui/ o feature que lo use | 6B | investigar |
| 39 | components/OverlaidTimeSeriesChart.tsx | components/ui/ o feature que lo use | 6B | investigar |
| 40 | components/RadarChartRecharts.tsx | components/ui/ o feature que lo use | 6B | investigar |
| 41 | components/SelectableComparisonChart.tsx | components/ui/ o feature que lo use | 6B | investigar |
| 42 | components/TimeSeriesChart.tsx | components/ui/ o feature que lo use | 6B | investigar |
| 43 | components/TimeSeriesChartRecharts.tsx | components/ui/ o feature que lo use | 6B | investigar |
| 44 | components/ConflictFilters.tsx | **ELIMINAR** (duplicado) | 1B | — |
| 45 | components/ConflictTimeline.tsx | **ELIMINAR** (duplicado) | 1B | — |
| 46 | components/CountrySelector.tsx | **ELIMINAR** (0 importadores) | 6B | — |

### hooks/ → destinos

| # | Archivo origen | Destino | Fase | Importado por |
|---|----------------|---------|------|---------------|
| 1 | hooks/useEconomyData.ts | features/country-sidebar/hooks/ | 5A | CountrySidebar, CompareCountriesView |
| 2 | hooks/useDefenseData.ts | features/country-sidebar/hooks/ | 5A | CountrySidebar |
| 3 | hooks/usePoliticsData.ts | features/country-sidebar/hooks/ | 5A | CountrySidebar, CompareCountriesView |
| 4 | hooks/useGeoData.ts | features/country-sidebar/hooks/ | 5A | — |
| 5 | hooks/useCountryBasicInfo.ts | features/country-sidebar/hooks/ | 5A | CountrySidebar, CompareCountriesView |
| 6 | hooks/useSocietyData.ts | features/country-sidebar/hooks/ | 5B | CountrySidebar, CompareCountriesView, SocietySection |
| 7 | hooks/useTechnologyData.ts | features/country-sidebar/hooks/ | 5B | CountrySidebar |
| 8 | hooks/useInternationalData.ts | features/country-sidebar/hooks/ | 5B | CountrySidebar |
| 9 | hooks/useCultureData.ts | features/country-sidebar/hooks/ | 5B | CountrySidebar |
| 10 | hooks/useConflictWebSocket.ts | features/conflicts/ | 5B | ConflictTracker |

### services/ → destinos

| # | Archivo origen | Destino | Fase | Importado por |
|---|----------------|---------|------|---------------|
| 1 | services/worldbank-gdp.ts | features/world-map/services/ | 6A | App.tsx, WorldMap (type) |
| 2 | services/worldbank-gdp-per-capita.ts | features/world-map/services/ | 6A | App.tsx, WorldMap (type) |
| 3 | services/worldbank-inflation.ts | features/world-map/services/ | 6A | App.tsx |
| 4 | services/indicator-generic.ts | features/world-map/services/ | 6A | App.tsx, indicators-db |
| 5 | services/indicators-db.ts | features/world-map/services/ | 6A | App.tsx |
| 6 | services/historical-indicators.service.ts | features/world-map/services/ | 6A | CompareView, KPIs, HistTrends, charts |
| 7 | services/orgs-config.ts | features/world-map/services/ | 5B | InternationalOrganizationsPanel |
| 8 | services/orgs-service.ts | features/world-map/services/ | 5B | InternationalOrganizationsPanel |
| 9 | services/economy-service.ts | features/country-sidebar/services/ | 5A | EconomySection, CountryKPIs, hook |
| 10 | services/defense-service.ts | features/country-sidebar/services/ | 5A | DefenseSection, hook |
| 11 | services/politics-service.ts | features/country-sidebar/services/ | 5A | PoliticsSection, hook |
| 12 | services/geo.service.ts | features/country-sidebar/services/ | 5A | hook useGeoData |
| 13 | services/country-basic-info.service.ts | features/country-sidebar/services/ | 5A | BasicInfo, HeaderSticky, KPIs, StaticData, hook |
| 14 | services/society-service.ts | features/country-sidebar/services/ | 5B | SocietySection, KPIs, charts, hook |
| 15 | services/technology-service.ts | features/country-sidebar/services/ | 5B | TechnologySection, hook |
| 16 | services/international-service.ts | features/country-sidebar/services/ | 5B | InternationalSection, hook |
| 17 | services/culture-service.ts | features/country-sidebar/services/ | 5B | CultureSection, hook |
| 18 | services/conflict-service.ts | features/conflicts/services/ | 6B | ConflictTracker |
| 19 | services/conflict-api.ts | features/conflicts/services/ | 6B | ConflictTracker, conflict-service |
| 20 | services/conflict-actions.ts | features/conflicts/services/ | 6B | — |
| 21 | services/conflict-websocket.ts | features/conflicts/services/ | 6B | hook useConflictWebSocket |
| 22 | services/conflict-tracker/ (3 archivos) | features/conflicts/services/conflict-tracker/ | 6B | WorldMap |
| 23 | services/acled-api.ts | features/conflicts/services/ | 6B | ConflictDetailCard |
| 24 | services/auth.service.ts | features/auth/ | 6B | ProfileSection, AuthContext |
| 25 | services/favorites.service.ts | features/dashboard/ | 6B | CountrySidebar, FavoritesSection, HeaderSticky, Selector |
| 26 | services/prediction.service.ts | features/dashboard/ | 6B | PredictiveAnalysis, TimeSeriesChart |
| 27 | services/news-api.ts | features/news/ | 6B | conflict-service |
| 28 | services/ukraine-api.ts | features/demos/ o ELIMINAR | 6B | — |
| 29 | services/russian-warship-api.ts | features/demos/ o ELIMINAR | 6B | ukraine-api |

---

## Estructura final objetivo

Después de las 6 fases, el código quedará así:

### Backend — apps/api/src/

```
apps/api/src/
├── app.ts
├── server.ts
├── config/          (env, logger Pino)
├── db/              (Prisma client)
├── docs/            (swagger)
├── integrations/    (worldbank, acled, ucdp)
├── jobs/            (scheduler, pipelines)
├── lib/             (AppError, asyncHandler)
├── middleware/      (auth, error, rate-limit, validate)
├── modules/         ← TODA la lógica de negocio aquí
│   ├── auth/
│   ├── conflicts/   (list + detail + CRUD + stats + search)
│   ├── countries/
│   ├── geo/
│   ├── history/
│   ├── indicators/  (economy, defense, politics, society, tech, international)
│   ├── insights/
│   ├── natural/
│   ├── news/
│   ├── osint/
│   ├── predictions/
│   └── users/
├── routes/          (solo monta módulos — 0 imports de controllers/)
├── scripts/
├── types/
└── websocket/

  ❌ NO existen:  controllers/  services/  core/  utils/  index.ts
```

### Frontend — apps/web/src/

```
apps/web/src/
├── App.tsx             (reducido — usa hooks de features/world-map/)
├── AppRouter.tsx
├── main.tsx
├── app/
│   └── layouts/
│       └── MainLayout.tsx
├── contexts/
│   └── AuthContext.tsx
├── data/
│   ├── conflicts-data.ts
│   └── countries-cache.json
│
├── features/           ← TODA la UI organizada por funcionalidad
│   │
│   ├── world-map/                              ← Mapa mundial + LeftSidebar + todos sus modos
│   │   ├── WorldMap.tsx
│   │   ├── LeftSidebar.tsx                      (9 modos: conflict, history, layers, stats, orgs, compare, dash, settings, about)
│   │   ├── MenuToggleButton.tsx
│   │   ├── DynamicSunOverlay.tsx
│   │   ├── InternationalOrganizationsPanel.tsx  (sub-componente del modo "International Orgs")
│   │   ├── useChoropleth.ts                     (extraído de App.tsx — lógica Statistics)
│   │   ├── useMapControls.ts                    (extraído de App.tsx — estado controles)
│   │   ├── map/
│   │   │   ├── mapAppearance.ts
│   │   │   └── terrain.ts
│   │   └── services/
│   │       ├── worldbank-gdp.ts                 (GDP choropleth)
│   │       ├── worldbank-gdp-per-capita.ts      (GDP per capita choropleth)
│   │       ├── worldbank-inflation.ts           (Inflation choropleth)
│   │       ├── indicator-generic.ts             (GINI, exports, life exp, etc.)
│   │       ├── indicators-db.ts                 (indicators from DB)
│   │       ├── historical-indicators.service.ts (History Mode data)
│   │       ├── orgs-config.ts                   (org definitions)
│   │       └── orgs-service.ts                  (org highlighting)
│   │
│   ├── country-sidebar/                         ← Panel derecho de detalle de país
│   │   ├── CountrySidebar.tsx
│   │   ├── sections/
│   │   │   ├── BasicInfoSection.tsx
│   │   │   ├── CountryHeaderSticky.tsx
│   │   │   ├── CountryKPIs.tsx
│   │   │   ├── CountryStaticData.tsx
│   │   │   ├── HistoricalTrendsSection.tsx
│   │   │   ├── EconomySection.tsx
│   │   │   ├── DefenseSection.tsx
│   │   │   ├── PoliticsSection.tsx
│   │   │   ├── SocietySection.tsx
│   │   │   ├── TechnologySection.tsx
│   │   │   ├── InternationalSection.tsx
│   │   │   └── CultureSection.tsx
│   │   ├── hooks/
│   │   │   ├── useEconomyData.ts
│   │   │   ├── useDefenseData.ts
│   │   │   ├── usePoliticsData.ts
│   │   │   ├── useSocietyData.ts
│   │   │   ├── useTechnologyData.ts
│   │   │   ├── useInternationalData.ts
│   │   │   ├── useCultureData.ts
│   │   │   ├── useCountryBasicInfo.ts
│   │   │   └── useGeoData.ts
│   │   └── services/
│   │       ├── economy-service.ts
│   │       ├── defense-service.ts
│   │       ├── politics-service.ts
│   │       ├── society-service.ts
│   │       ├── technology-service.ts
│   │       ├── international-service.ts
│   │       ├── culture-service.ts
│   │       ├── country-basic-info.service.ts
│   │       └── geo.service.ts
│   │
│   ├── conflicts/                               ← Tracker + detalle + WebSocket
│   │   ├── ConflictTracker.tsx
│   │   ├── ConflictDetailCard.tsx
│   │   ├── ConflictFactions.tsx
│   │   ├── ConflictStats.tsx
│   │   ├── ConflictSearchBar.tsx
│   │   ├── ConflictFilters.tsx                  (ya existía en features/)
│   │   ├── ConflictList.tsx                     (ya existía en features/)
│   │   ├── ConflictTimeline.tsx                 (ya existía en features/)
│   │   ├── types.ts                             (ya existía en features/)
│   │   ├── useConflicts.ts                      (ya existía en features/)
│   │   ├── useConflictDetail.ts                 (ya existía en features/)
│   │   ├── useConflictWebSocket.ts
│   │   └── services/
│   │       ├── conflict-service.ts
│   │       ├── conflict-api.ts
│   │       ├── conflict-actions.ts
│   │       ├── conflict-websocket.ts
│   │       ├── acled-api.ts
│   │       └── conflict-tracker/
│   │           ├── conflict-data-manager.ts
│   │           ├── conflict-visualization.ts
│   │           └── country-conflict-mapper.ts
│   │
│   ├── compare/                                 ← Comparación de países
│   │   ├── CompareCountriesPopup.tsx
│   │   └── CompareCountriesView.tsx
│   │
│   ├── country/                                 ← Vista de país (ya existente + CountryCard)
│   │   ├── CountryCard.tsx
│   │   ├── CountryOverview.tsx                  (ya existía en features/)
│   │   ├── CountryIndicators.tsx                (ya existía en features/)
│   │   └── useCountryOverview.ts                (ya existía en features/)
│   │
│   ├── auth/                                    ← Login, registro, protección
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── auth.service.ts
│   │
│   ├── dashboard/                               ← Dashboard + favoritos + predicción
│   │   ├── DashboardLayout.tsx
│   │   ├── ProfileSection.tsx
│   │   ├── FavoritesSection.tsx
│   │   ├── PredictiveAnalysisSection.tsx
│   │   ├── DashboardStats.tsx                   (ya existía en features/)
│   │   ├── RecentConflicts.tsx                  (ya existía en features/)
│   │   ├── useDashboardSummary.ts               (ya existía en features/)
│   │   ├── useRecentConflicts.ts                (ya existía en features/)
│   │   ├── favorites.service.ts
│   │   └── prediction.service.ts
│   │
│   ├── news/                                    ← Noticias
│   │   └── news-api.ts
│   │
│   ├── demos/                                   ← Demos (opcional — eliminar si no se usa)
│   │   ├── UkraineAPIDemo.tsx
│   │   ├── ukraine-api.ts
│   │   └── russian-warship-api.ts
│   │
│   ├── insights/                                (ya existía en features/)
│   │   ├── InsightForm.tsx
│   │   ├── InsightResult.tsx
│   │   ├── useCountryEntities.ts
│   │   └── useGenerateInsight.ts
│   │
│   └── map/                                     (ya existía en features/)
│       ├── ConflictMap.tsx
│       └── useMapbox.ts
│
├── components/
│   └── ui/              (solo charts compartidos por 2+ features)
│       ├── FullscreenChartModal.tsx
│       ├── TimeSeriesChart.tsx
│       └── ... (otros charts compartidos)
│
├── lib/
│   ├── env.ts
│   ├── http.ts
│   └── queryClient.ts
├── pages/               (6 páginas — ya existentes)
├── styles/              (CSS — ya existente)
└── utils/               (historical-years, sunPosition, errorHandler)

  ❌ NO existen:  services/  hooks/
  ⚠️  components/ solo tiene ui/ (charts compartidos), NO componentes sueltos
```

---

## Reglas generales

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. SIEMPRE verificar después de cada fase:                        │
│     cd apps/api && npx tsc --noEmit                                │
│     cd apps/web && npx tsc --noEmit                                │
│     Si falla → NO mergear. Arreglar primero.                       │
│                                                                    │
│  2. Las respuestas JSON del API deben ser IDÉNTICAS.               │
│     El frontend NO debe notar ningún cambio.                       │
│                                                                    │
│  3. En apps/api/, usar import con .js al final:                    │
│     import { logger } from '../config/logger.js';                  │
│     (Esto es porque el backend usa ESM)                            │
│                                                                    │
│  4. Usar siempre / en imports (nunca \)                            │
│                                                                    │
│  5. Respetar mayúsculas/minúsculas en nombres de archivo           │
│     AppError.ts ≠ apperror.ts                                      │
│                                                                    │
│  6. Usar bash/zsh para comandos, nunca PowerShell                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Compatibilidad multiplataforma

Antes de empezar, ambos deben ejecutar en la raíz del repo:

```bash
# Forzar fin de línea correcto
git config core.autocrlf input    # macOS/Linux (Fabri)
git config core.autocrlf true     # Windows (Andrés)

# Verificar Node 20+
node -v
```

---

## Mapa visual de las 6 fases

```
FASE 1: Limpiar código muerto + unificar logger
  ┌─────────┐     ┌─────────┐
  │   1A    │────→│   1B    │
  │ Andrés  │     │ Fabri   │
  │ Logger  │     │ Valid.  │
  └─────────┘     └─────────┘
        │
        ▼
FASE 2: Migrar controllers de indicadores → modules/indicators/
  ┌─────────┐     ┌─────────┐
  │   2A    │────→│   2B    │
  │ Andrés  │     │ Fabri   │
  │ eco,def │     │ soc,tec │
  │ pol,ind │     │ intl    │
  └─────────┘     └─────────┘
        │
        ▼
FASE 3: Migrar controllers de datos → módulos propios
  ┌─────────┐     ┌─────────┐
  │   3A    │────→│   3B    │
  │ Andrés  │     │ Fabri   │
  │ geo,his │     │ nat,pre │
  │ confCRUD│     │ news,usr│
  └─────────┘     └─────────┘
        │
        ▼
FASE 4: Borrar directorios legacy vacíos
  ┌─────────┐     ┌─────────┐
  │   4A    │────→│   4B    │
  │ Andrés  │     │ Fabri   │
  │ rm dirs │     │ routes  │
  └─────────┘     └─────────┘
        │
        ▼
FASE 5: Frontend — mover components → features/
  ┌─────────┐     ┌─────────┐
  │   5A    │────→│   5B    │
  │ Andrés  │     │ Fabri   │
  │ sidebar │     │ sidebar │
  │ A + map │     │ B + rest│
  └─────────┘     └─────────┘
        │
        ▼
FASE 6: Frontend — descomponer App.tsx + limpieza final
  ┌─────────┐     ┌─────────┐
  │   6A    │────→│   6B    │
  │ Andrés  │     │ Fabri   │
  │ map+dash│     │ rest+rm │
  └─────────┘     └─────────┘
        │
        ▼
      ✅ LIMPIO
```

---
---

# FASE 1 — Eliminar código muerto + unificar logger

> **Riesgo: BAJO.** Solo se borra código que nadie usa y se cambian 3 imports de logger.

```
¿Qué cambia en esta fase?

ANTES                              DESPUÉS
─────                              ──────
core/logger/ (Winston) ──USADO──→  config/logger.ts (Pino) ← ÚNICO logger
index.ts (entry viejo) ──EXISTE──→ ELIMINADO
2 controllers muertos  ──EXISTEN─→ ELIMINADOS
requestLogger.ts       ──EXISTE──→ ELIMINADO (nadie lo importa)
```

---

## 1A — Andrés: Dead code backend + logger Winston → Pino

**Qué haces:** Eliminar archivos que nadie importa y cambiar los imports de Winston a Pino.

### Archivos que ELIMINAS

```
apps/api/src/index.ts                              ← entry point viejo (server.ts es el nuevo)
apps/api/src/controllers/auth.controller.ts        ← reemplazado por modules/auth/
apps/api/src/controllers/country.controller.ts     ← reemplazado por modules/countries/
apps/api/src/routes/country.routes.ts              ← no se importa en routes/index.ts
apps/api/src/core/errors/errorHandler.ts           ← dead (no registrado en app.ts)
apps/api/src/core/logger/logger.example.ts         ← ejemplo, no código real
apps/api/src/core/validation/validate.example.ts   ← ejemplo, no código real
apps/api/src/middleware/requestLogger.ts            ← DEAD CODE (exporta pero nadie lo importa)
apps/api/src/utils/index.ts                        ← DEAD CODE (solo exporta noop())
```

### Archivos que MODIFICAS

Solo 3 archivos necesitan cambiar el import del logger.
El cambio es simple — solo cambia la línea del import:

```typescript
// ANTES (Winston — el logger viejo)
import { logger } from '../core/logger';

// DESPUÉS (Pino — el logger nuevo)
import { logger } from '../config/logger.js';
```

> **NOTA:** `config/logger.ts` solo exporta `logger`.
> Los 3 archivos siguientes solo usan `logger`, así que el cambio funciona directo.

```
apps/api/src/controllers/geo.controller.ts         ← cambiar import logger
apps/api/src/services/country.service.ts           ← cambiar import logger
apps/api/src/services/geodb.service.ts             ← cambiar import logger
```

### Después de cambiar todos los imports, ELIMINAR

```
apps/api/src/core/logger/                          ← directorio entero (index.ts ya no tiene importadores)
```

### Verificación

```bash
cd apps/api && npx tsc --noEmit
grep -r "core/logger" src/           # debe dar 0 resultados
grep -r "requestLogger" src/         # debe dar 0 resultados (lo borramos)
```

**Rama:** `cleanup/dead-code-and-logger`

---

## 1B — Fabri: Dead code frontend + validación backend

> **Esperar a que Andrés haya mergeado `cleanup/dead-code-and-logger`.**

**Qué haces:** Eliminar componentes frontend duplicados. Cambiar el import de validación en una ruta del backend.

### Archivos FRONTEND que ELIMINAS

```
apps/web/src/components/ConflictFilters.tsx         ← duplicado de features/conflicts/ConflictFilters.tsx
apps/web/src/components/ConflictTimeline.tsx         ← duplicado de features/conflicts/ConflictTimeline.tsx
apps/web/src/features/country-sidebar/CountrySidebar.tsx  ← nunca importado por nadie
```

### Archivo FRONTEND que CREAS

```
apps/web/src/lib/env.ts
```

Contenido:

```typescript
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN as string,
} as const;
```

### Archivos BACKEND que MODIFICAS

`apps/api/src/routes/conflict.routes.ts` tiene DOS imports del core viejo:

```typescript
// ANTES
import { validate } from '../core/validation/validate';
// y también:
import { ... } from '../core/validation/schemas/conflict.schemas';

// DESPUÉS — cambiar SOLO el validate:
import { validate } from '../middleware/validate.js';
// Los schemas se quedan igual por ahora (se eliminarán en Fase 3A junto con este archivo)
```

> **IMPORTANTE:** El middleware nuevo (`middleware/validate.ts`) usa un formato
> diferente al viejo. Si la llamada a `validate()` falla, adaptar la llamada al
> formato nuevo: `validate({ body: schema, query: schema, params: schema })`.

### Después de cambiar el import de validate, ELIMINAR

```
apps/api/src/core/validation/validate.ts           ← reemplazado por middleware/validate.ts
```

> **NO eliminar `core/validation/schemas/` todavía** — `conflict.routes.ts` aún
> los necesita. Se eliminarán en Fase 3A cuando `conflict.routes.ts` sea eliminado.

### Verificación

```bash
cd apps/api && npx tsc --noEmit
cd ../web && npx tsc --noEmit
grep -r "core/validation/validate'" apps/api/src/    # debe dar 0 resultados
grep -r "core/logger" apps/api/src/                  # debe dar 0 resultados (verificar Fase 1A)
```

**Rama:** `cleanup/dead-frontend-and-validation`

---
---

# FASE 2 — Migrar controllers de indicadores → módulo indicators

> **Riesgo: MEDIO.** Se crea un módulo nuevo y se actualizan rutas.
> Las respuestas HTTP deben ser IDÉNTICAS.

```
¿Qué cambia en esta fase?

ANTES                                    DESPUÉS
─────                                    ──────
controllers/economy.controller.ts   ┐
controllers/defense.controller.ts   │
controllers/politics.controller.ts  │──→  modules/indicators/  (1 módulo unificado)
controllers/society.controller.ts   │     ├── schemas.ts
controllers/technology.controller.ts│     ├── types.ts
controllers/international.controller│     ├── repo.ts
controllers/indicator.controller.ts ┘     ├── service.ts
services/indicator.service.ts       ──→   └── controller.ts
```

Estos 7 controllers siguen el mismo patrón: llaman a `indicator.service.ts`
con códigos de indicadores para un ISO3. Se unifican en un solo módulo.

---

## 2A — Andrés: Crear módulo indicators + migrar economy, defense, politics, indicator

**Qué haces:** Crear `modules/indicators/` con el patrón CQS y migrar los primeros 4 controllers.

### Archivos que CREAS

```
apps/api/src/modules/indicators/schemas.ts         ← Zod schemas para params (iso3) y query
apps/api/src/modules/indicators/types.ts           ← tipos derivados
apps/api/src/modules/indicators/repo.ts            ← queries Prisma a IndicatorValue
apps/api/src/modules/indicators/service.ts         ← lógica de negocio
apps/api/src/modules/indicators/controller.ts      ← handlers HTTP
```

### CÓMO migrar cada controller (receta paso a paso)

```
PASO 1: Leer el controller viejo (ej: controllers/economy.controller.ts)
PASO 2: Entender qué indicadores usa y cómo llama a services/indicator.service.ts
PASO 3: Mover esa lógica a modules/indicators/service.ts como función
         (ej: getEconomyByIso3)
PASO 4: Crear handler en modules/indicators/controller.ts que llame al service
PASO 5: Actualizar el archivo de rutas para importar del nuevo módulo
PASO 6: COMPARAR la respuesta JSON del endpoint viejo vs nuevo — deben ser IDÉNTICAS
PASO 7: Eliminar el controller viejo
```

> **NOTA sobre cache:** `indicator.controller.ts` usa `memoryCache` de `core/cache/memoryCache`.
> En el módulo nuevo, puedes usar un `Map` simple o reimplementar el cache dentro del módulo.
> NO importar de `core/cache/` — se borrará en Fase 4.

### Archivos que MODIFICAS (rutas)

```
apps/api/src/routes/economy.routes.ts              ← cambiar import a modules/indicators/controller
apps/api/src/routes/defense.routes.ts              ← cambiar import a modules/indicators/controller
apps/api/src/routes/politics.routes.ts             ← cambiar import a modules/indicators/controller
apps/api/src/routes/indicator.routes.ts            ← cambiar import a modules/indicators/controller
```

### Archivos que ELIMINAS (después de migrar y verificar)

```
apps/api/src/controllers/economy.controller.ts
apps/api/src/controllers/defense.controller.ts
apps/api/src/controllers/politics.controller.ts
apps/api/src/controllers/indicator.controller.ts
apps/api/src/services/indicator.service.ts
```

### Verificación

```bash
cd apps/api && npx tsc --noEmit
# Iniciar servidor y probar que las respuestas son idénticas:
# GET /api/economy/USA
# GET /api/defense/USA
# GET /api/politics/USA
# GET /api/indicators/latest?code=gdp
```

**Rama:** `refactor/indicators-module`

---

## 2B — Fabri: Migrar society, technology, international al módulo indicators

> **Esperar a que Andrés haya mergeado `refactor/indicators-module`.**

**Qué haces:** Añadir los 3 controllers restantes al módulo indicators/ creado por Andrés.

### Archivos que MODIFICAS

```
apps/api/src/modules/indicators/controller.ts      ← añadir handlers para society, technology, international
apps/api/src/modules/indicators/service.ts         ← añadir getSocietyByIso3, getTechnologyByIso3, getInternationalByIso3
apps/api/src/routes/society.routes.ts              ← cambiar import
apps/api/src/routes/technology.routes.ts           ← cambiar import
apps/api/src/routes/international.routes.ts        ← cambiar import
```

### Archivos que ELIMINAS

```
apps/api/src/controllers/society.controller.ts
apps/api/src/controllers/technology.controller.ts
apps/api/src/controllers/international.controller.ts
```

### Verificación

```bash
cd apps/api && npx tsc --noEmit
# GET /api/society/USA
# GET /api/technology/USA
# GET /api/international/USA
```

**Rama:** `refactor/section-controllers`

---
---

# FASE 3 — Migrar controllers de datos (geo, history, conflict CRUD, natural, prediction, news)

> **Riesgo: MEDIO-ALTO.** La Fase 3A es la más delicada de todo el plan
> porque unifica el CRUD de conflictos y quita el prefijo `/v2`.

```
¿Qué cambia en esta fase?

ANTES                                    DESPUÉS
─────                                    ──────
controllers/geo.controller.ts       ──→  modules/geo/
controllers/history.controller.ts   ──→  modules/history/
controllers/conflict.controller.ts  ──→  modules/conflicts/ (expandido con CRUD)
services/conflict.service.ts        ──→  modules/conflicts/service.ts
conflict.routes.ts (legacy)         ──→  ELIMINADA (conflicts.routes.ts absorbe todo)
/api/conflicts/v2/*                 ──→  /api/conflicts/* (sin v2)

controllers/natural.controller.ts   ──→  modules/natural/
controllers/prediction.controller.ts──→  modules/predictions/
controllers/user.controller.ts      ──→  modules/users/
+ services asociados                ──→  modules/news/
```

---

## 3A — Andrés: geo + history + conflict CRUD (⚠️ MÁS DELICADA)

**Qué haces:** Crear módulos `geo/` y `history/`, y expandir `modules/conflicts/` para incluir CRUD completo.

### Archivos que CREAS

```
apps/api/src/modules/geo/controller.ts
apps/api/src/modules/geo/service.ts
apps/api/src/modules/geo/schemas.ts

apps/api/src/modules/history/controller.ts
apps/api/src/modules/history/service.ts
apps/api/src/modules/history/schemas.ts
```

### Archivos que MODIFICAS (conflicts — MERGE CRUD)

```
apps/api/src/modules/conflicts/controller.ts       ← añadir create, update, delete, stats, search
apps/api/src/modules/conflicts/service.ts          ← absorber lógica de services/conflict.service.ts
apps/api/src/modules/conflicts/repo.ts             ← añadir create/update/delete queries
apps/api/src/modules/conflicts/schemas.ts          ← añadir schemas de creación/actualización
apps/api/src/routes/conflicts.routes.ts            ← añadir rutas POST, PUT, DELETE
```

> **IMPORTANTE para conflicts:**
>
> - El módulo v2 actual solo tiene `list` y `getBySlug` (lectura)
> - Hay que añadir `create`, `update`, `delete`, `stats`, `search` del legacy
> - El WebSocket broadcast ya usa el nuevo tipo `ConflictUpdatePayload` — mantenerlo
> - **Eliminar el prefijo `/v2`** → que las rutas queden en `/api/conflicts`

### Archivos que MODIFICAS (rutas backend)

```
apps/api/src/routes/index.ts        ← quitar conflict.routes (legacy) y quitar /v2 de conflictsModuleRoutes
apps/api/src/routes/geo.routes.ts   ← cambiar imports a modules/geo/controller
apps/api/src/routes/history.routes.ts ← cambiar imports a modules/history/controller
```

Cambio específico en `routes/index.ts`:

```typescript
// ANTES
router.use('/conflicts/v2', conflictsModuleRoutes);  // línea 30
router.use('/conflicts', conflictRoutes);            // línea 38

// DESPUÉS
router.use('/conflicts', conflictsModuleRoutes);     // SIN /v2, sin legacy
// (eliminar la línea de conflictRoutes y su import)
```

### Archivos FRONTEND que MODIFICAS (⚠️ 3 archivos, no 2)

Al quitar `/v2`, actualizar TODOS los hooks que lo usan:

```
apps/web/src/features/conflicts/useConflicts.ts          ← /api/conflicts/v2  →  /api/conflicts
apps/web/src/features/conflicts/useConflictDetail.ts     ← /api/conflicts/v2/ →  /api/conflicts/
apps/web/src/features/dashboard/useRecentConflicts.ts    ← /api/conflicts/v2  →  /api/conflicts
```

### Archivos que ELIMINAS

```
apps/api/src/controllers/conflict.controller.ts
apps/api/src/controllers/geo.controller.ts
apps/api/src/controllers/history.controller.ts
apps/api/src/services/conflict.service.ts
apps/api/src/services/geodb.service.ts
apps/api/src/services/history.service.ts
apps/api/src/routes/conflict.routes.ts              ← la ruta legacy
apps/api/src/core/validation/schemas/               ← directorio entero (último consumidor eliminado)
apps/api/src/core/validation/                       ← directorio entero (ya vacío)
```

### Verificación

```bash
cd apps/api && npx tsc --noEmit
cd ../web && npx tsc --noEmit
grep -r "core/validation" apps/api/src/    # debe dar 0 resultados
grep -r "conflicts/v2" apps/web/src/       # debe dar 0 resultados
# Probar CRUD: POST/PUT/DELETE /api/conflicts
# Probar: GET /api/conflicts, GET /api/conflicts/:slug
# Probar: GET /api/geo/cities, /api/history/borders
```

**Rama:** `refactor/geo-history-conflicts`

---

## 3B — Fabri: natural + prediction + news + user/favorites

> **Esperar a que Andrés haya mergeado `refactor/geo-history-conflicts`.**

**Qué haces:** Crear módulos para los controllers restantes.

### Archivos que CREAS

```
apps/api/src/modules/natural/controller.ts
apps/api/src/modules/natural/service.ts
apps/api/src/modules/natural/schemas.ts

apps/api/src/modules/predictions/controller.ts
apps/api/src/modules/predictions/service.ts        ← absorbe deepseek.service + prediction.service
apps/api/src/modules/predictions/schemas.ts

apps/api/src/modules/news/controller.ts
apps/api/src/modules/news/service.ts               ← absorbe news-api.service + news-cache.service + acled.service
apps/api/src/modules/news/schemas.ts

apps/api/src/modules/users/controller.ts
apps/api/src/modules/users/service.ts
apps/api/src/modules/users/schemas.ts
```

### Archivos que MODIFICAS (rutas)

```
apps/api/src/routes/natural.routes.ts
apps/api/src/routes/prediction.routes.ts
apps/api/src/routes/news.routes.ts
apps/api/src/routes/acled.routes.ts
apps/api/src/routes/user.routes.ts
apps/api/src/routes/favorites.routes.ts
```

### Archivos que ELIMINAS

```
apps/api/src/controllers/natural.controller.ts
apps/api/src/controllers/prediction.controller.ts
apps/api/src/controllers/user.controller.ts
apps/api/src/controllers/favorites.controller.ts
apps/api/src/services/natural.service.ts
apps/api/src/services/prediction.service.ts
apps/api/src/services/deepseek.service.ts
apps/api/src/services/news-api.service.ts
apps/api/src/services/news-cache.service.ts
apps/api/src/services/acled.service.ts
apps/api/src/services/country.service.ts           ← modules/countries/ tiene su propio repo
```

### Verificación

```bash
cd apps/api && npx tsc --noEmit
# GET /api/natural/rivers
# GET /api/prediction/:iso3
# GET /api/news/headlines
# GET /api/user/profile
# GET /api/favorites
```

**Rama:** `refactor/natural-predictions-news-users`

---
---

# FASE 4 — Limpieza total del backend

> **Riesgo: BAJO.** Solo se eliminan directorios que ya deben estar vacíos
> y se reubican los pocos archivos útiles que quedan.

```
¿Qué cambia en esta fase?

ANTES                                    DESPUÉS
─────                                    ──────
controllers/  (vacío)               ──→  ELIMINADO
services/     (vacío)               ──→  ELIMINADO
core/cache/   (sin importadores)    ──→  ELIMINADO
core/http/    (sin importadores)    ──→  ELIMINADO
core/errors/AppError.ts             ──→  lib/AppError.ts (por si se necesita)
utils/asyncHandler.ts               ──→  middleware/asyncHandler.ts
utils/        (resto)               ──→  ELIMINADO
scripts/      (paths viejos)        ──→  paths corregidos
```

---

## 4A — Andrés: Eliminar directorios legacy + fix scripts

**Qué haces:** Borrar directorios vacíos, mover los pocos archivos útiles, arreglar paths en scripts.

### Archivos/directorios que ELIMINAS

```
apps/api/src/controllers/                          ← debe estar vacío (todos migrados)
apps/api/src/services/                             ← debe estar vacío (todos migrados)
apps/api/src/core/cache/memoryCache.ts             ← DEAD CODE (0 importadores desde Fase 2A)
apps/api/src/core/http/httpClient.ts               ← DEAD CODE (0 importadores — nunca se usó)
apps/api/src/core/                                 ← directorio entero (ya todo eliminado/movido)
apps/api/src/utils/asyncHandler.example.ts         ← ejemplo, no código real
```

### Archivos que REUBICAS

```
apps/api/src/core/errors/AppError.ts        →  apps/api/src/lib/AppError.ts
apps/api/src/utils/asyncHandler.ts          →  apps/api/src/middleware/asyncHandler.ts
```

> Al mover archivos, actualizar TODOS los imports que los referencian.
> Buscar con:
> ```bash
> grep -r "core/errors/AppError" src/
> grep -r "utils/asyncHandler" src/
> ```

> **NOTA:** Si `AppError` ya no tiene importadores (los controllers legacy que lo usaban
> ya están eliminados y los módulos nuevos no lo usan), se puede ELIMINAR en vez de mover.
> Verificar con grep antes de decidir.

Si `utils/` queda vacío, eliminarlo.

### Archivos que MODIFICAS (scripts con paths viejos)

```
apps/api/src/scripts/import-history-geojson.ts     ← línea 293: 'frontend' → 'apps/web'
apps/api/src/scripts/import-natural-geojson.ts     ← línea 211: 'frontend' → 'apps/web'
apps/api/src/scripts/migrate-conflicts-to-db.ts    ← comentario línea 4: cambiar path
```

### Verificación

```bash
cd apps/api && npx tsc --noEmit
grep -r "core/" src/ --include="*.ts"    # debe dar 0 resultados
grep -r "/controllers/" src/              # debe dar 0 resultados
grep -r "/services/" src/                 # debe dar 0 (excepto dentro de modules/)
ls src/controllers 2>/dev/null            # no debe existir
ls src/services 2>/dev/null               # no debe existir
ls src/core 2>/dev/null                   # no debe existir
```

**Rama:** `cleanup/backend-legacy-dirs`

---

## 4B — Fabri: Reescribir routes/index.ts + verificación completa

> **Esperar a que Andrés haya mergeado `cleanup/backend-legacy-dirs`.**

**Qué haces:** Reescribir `routes/index.ts` para que SOLO importe de módulos. Verificar todo.

### Archivo que REESCRIBES

`apps/api/src/routes/index.ts` — debe quedar limpio, sin imports de `controllers/`:

```typescript
import { Router } from 'express';

// Módulos CQS (nuevos desde el inicio)
import conflictsRoutes from './conflicts.routes.js';
import osintRoutes from './osint.routes.js';
import insightsRoutes from './insights.routes.js';
import dashboardRoutes from './dashboard.routes.js';

// Módulos migrados (cada route file importa de modules/)
import countryRoutes from '../modules/countries/routes.js';
import economyRoutes from './economy.routes.js';
import defenseRoutes from './defense.routes.js';
import politicsRoutes from './politics.routes.js';
import societyRoutes from './society.routes.js';
import technologyRoutes from './technology.routes.js';
import internationalRoutes from './international.routes.js';
import indicatorRoutes from './indicator.routes.js';
import geoRoutes from './geo.routes.js';
import historyRoutes from './history.routes.js';
import naturalRoutes from './natural.routes.js';
import predictionRoutes from './prediction.routes.js';
import newsRoutes from './news.routes.js';
import acledRoutes from './acled.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import favoritesRoutes from './favorites.routes.js';
import organizationRoutes from './organization.routes.js';

const router = Router();

// Módulos CQS
router.use('/conflicts', conflictsRoutes);
router.use('/osint', osintRoutes);
router.use('/insights', insightsRoutes);
router.use('/dashboard', dashboardRoutes);

// Módulos migrados
router.use('/countries', countryRoutes);
router.use('/economy', economyRoutes);
router.use('/defense', defenseRoutes);
router.use('/politics', politicsRoutes);
router.use('/society', societyRoutes);
router.use('/technology', technologyRoutes);
router.use('/international', internationalRoutes);
router.use('/indicators', indicatorRoutes);
router.use('/geo', geoRoutes);
router.use('/history', historyRoutes);
router.use('/natural', naturalRoutes);
router.use('/prediction', predictionRoutes);
router.use('/news', newsRoutes);
router.use('/acled', acledRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/organizations', organizationRoutes);

export default router;
```

### Verificación COMPLETA

```bash
cd apps/api && npx tsc --noEmit
npm run build

# Iniciar servidor (npm run dev) y probar CADA grupo:

# Auth:
#   POST /api/auth/login
#   POST /api/auth/refresh

# Countries:
#   GET /api/countries
#   GET /api/countries/USA/overview

# Conflicts (SIN /v2):
#   GET /api/conflicts
#   GET /api/conflicts/:slug
#   POST /api/conflicts
#   PUT /api/conflicts/:id
#   DELETE /api/conflicts/:id

# Indicators:
#   GET /api/economy/USA
#   GET /api/defense/USA
#   GET /api/politics/USA
#   GET /api/society/USA
#   GET /api/technology/USA
#   GET /api/international/USA
#   GET /api/indicators/latest?code=gdp

# Data:
#   GET /api/geo/cities
#   GET /api/history/borders
#   GET /api/natural/rivers

# Other:
#   GET /api/prediction/USA
#   GET /api/news/headlines
#   GET /api/osint/events
#   GET /api/dashboard/summary
#   GET /api/user/profile
#   GET /api/favorites

# Docs:
#   GET /api/docs (Swagger UI)
```

**Rama:** `cleanup/routes-cleanup`

---
---

# FASE 5 — Frontend: Reorganizar components/ → features/

> **Riesgo: ALTO.** Se mueven archivos que están importados en muchos lugares.
> Cada movimiento requiere actualizar imports. Mover de a uno y verificar.

```
¿Qué cambia en esta fase?

ANTES (todo plano en components/)        DESPUÉS (organizado por feature)
─────────────────────────────────        ──────────────────────────────

components/                              features/
├── EconomySection.tsx                   ├── country-sidebar/
├── DefenseSection.tsx                   │   ├── sections/
├── PoliticsSection.tsx                  │   │   ├── EconomySection.tsx
├── SocietySection.tsx                   │   │   ├── DefenseSection.tsx
├── TechnologySection.tsx                │   │   ├── PoliticsSection.tsx
├── InternationalSection.tsx             │   │   ├── SocietySection.tsx
├── CultureSection.tsx                   │   │   ├── TechnologySection.tsx
├── BasicInfoSection.tsx                 │   │   ├── InternationalSection.tsx
├── ...etc                               │   │   └── ...etc
│                                        │   ├── hooks/
hooks/                                   │   │   ├── useEconomyData.ts
├── useEconomyData.ts                    │   │   ├── useDefenseData.ts
├── useDefenseData.ts                    │   │   └── ...etc
├── ...etc                               │   └── services/
│                                        │       ├── economy-service.ts
services/                                │       └── ...etc
├── economy-service.ts                   │
├── defense-service.ts                   ├── conflicts/
├── ...etc                               │   ├── ConflictTracker.tsx
                                         │   ├── ConflictDetailCard.tsx
                                         │   └── ...etc
                                         │
                                         ├── world-map/
                                         │   ├── WorldMap.tsx
                                         │   └── ...etc
                                         │
                                         └── auth/
                                             ├── LoginForm.tsx
                                             └── RegisterForm.tsx
```

---

## 5A — Andrés: CountrySidebar + sections A + hooks/services A

**Qué haces:** Mover CountrySidebar.tsx y las secciones parte A (con sus hooks y servicios)
a `features/country-sidebar/`.

> **OJO:** `features/country-sidebar/CountrySidebar.tsx` ya existe pero es DEAD CODE
> (se eliminó en Fase 1B). El archivo que movemos aquí es `components/CountrySidebar.tsx`
> (el activo, importado por App.tsx).

### CountrySidebar que MUEVES

```
components/CountrySidebar.tsx         →  features/country-sidebar/CountrySidebar.tsx
```

### Secciones que MUEVES (crear `features/country-sidebar/sections/`)

```
components/EconomySection.tsx         →  features/country-sidebar/sections/EconomySection.tsx
components/DefenseSection.tsx         →  features/country-sidebar/sections/DefenseSection.tsx
components/PoliticsSection.tsx        →  features/country-sidebar/sections/PoliticsSection.tsx
components/BasicInfoSection.tsx       →  features/country-sidebar/sections/BasicInfoSection.tsx
components/CountryKPIs.tsx            →  features/country-sidebar/sections/CountryKPIs.tsx
components/CountryStaticData.tsx      →  features/country-sidebar/sections/CountryStaticData.tsx
components/CountryHeaderSticky.tsx    →  features/country-sidebar/sections/CountryHeaderSticky.tsx
components/HistoricalTrendsSection.tsx→  features/country-sidebar/sections/HistoricalTrendsSection.tsx
```

### Hooks que MUEVES (crear `features/country-sidebar/hooks/`)

```
hooks/useEconomyData.ts              →  features/country-sidebar/hooks/useEconomyData.ts
hooks/useDefenseData.ts              →  features/country-sidebar/hooks/useDefenseData.ts
hooks/usePoliticsData.ts             →  features/country-sidebar/hooks/usePoliticsData.ts
hooks/useGeoData.ts                  →  features/country-sidebar/hooks/useGeoData.ts
hooks/useCountryBasicInfo.ts         →  features/country-sidebar/hooks/useCountryBasicInfo.ts
```

### Services que MUEVES (crear `features/country-sidebar/services/`)

```
services/economy-service.ts          →  features/country-sidebar/services/economy-service.ts
services/defense-service.ts          →  features/country-sidebar/services/defense-service.ts
services/politics-service.ts         →  features/country-sidebar/services/politics-service.ts
services/geo.service.ts              →  features/country-sidebar/services/geo.service.ts
services/country-basic-info.service.ts → features/country-sidebar/services/country-basic-info.service.ts
```

### Cadena de dependencias (para entender qué actualizar)

```
App.tsx
 └── importa CountrySidebar de components/  → CAMBIAR a features/country-sidebar/
      │
      ├── CountrySidebar importa secciones de components/
      │   ├── EconomySection ← useEconomyData ← economy-service
      │   ├── DefenseSection ← useDefenseData ← defense-service
      │   ├── PoliticsSection ← usePoliticsData ← politics-service
      │   ├── BasicInfoSection ← country-basic-info.service
      │   ├── CountryKPIs ← economy-service, society-service, country-basic-info
      │   ├── CountryHeaderSticky ← country-basic-info.service, favorites.service
      │   ├── CountryStaticData ← country-basic-info.service
      │   └── HistoricalTrendsSection ← historical-indicators.service
      │
      └── CountrySidebar importa hooks de hooks/
          ├── useEconomyData, useDefenseData, usePoliticsData
          ├── useCountryBasicInfo, useGeoData
          └── (los de society, tech, intl, culture se mueven en 5B)
```

> **NOTA:** `CountryKPIs` y `HistoricalTrendsSection` importan de
> `services/society-service.ts` y `services/historical-indicators.service.ts`.
> Esos servicios se mueven en Fase 5B y 6A respectivamente.
> En Fase 5A, dejar los imports apuntando a `../../services/` temporalmente.
> Se actualizarán cuando se muevan en su fase correspondiente.

### Archivos que MODIFICAS (actualizar imports)

Después de mover CADA archivo, buscar todos los que lo importan y actualizar:

```bash
# Ejemplo para EconomySection:
grep -r "EconomySection" apps/web/src/ --include="*.tsx" --include="*.ts"
```

```
App.tsx                                ← cambiar import de CountrySidebar
components/CompareCountriesView.tsx    ← usa useEconomyData, usePoliticsData, useCountryBasicInfo, useSocietyData
                                         (actualizar paths de los hooks movidos)
```

### Verificación

```bash
cd apps/web && npx tsc --noEmit
npm run build
```

**Rama:** `refactor/frontend-sidebar-a`

---

## 5B — Fabri: Sidebar sections B + remaining components

> **Esperar a que Andrés haya mergeado `refactor/frontend-sidebar-a`.**

### Secciones que MUEVES a `features/country-sidebar/sections/`

```
components/SocietySection.tsx          →  features/country-sidebar/sections/SocietySection.tsx
components/TechnologySection.tsx       →  features/country-sidebar/sections/TechnologySection.tsx
components/InternationalSection.tsx    →  features/country-sidebar/sections/InternationalSection.tsx
components/CultureSection.tsx          →  features/country-sidebar/sections/CultureSection.tsx
```

### Componente del LeftSidebar que MUEVES a `features/world-map/`

```
components/InternationalOrganizationsPanel.tsx → features/world-map/InternationalOrganizationsPanel.tsx
                                                  (lo usa LeftSidebar modo "International Orgs", NO CountrySidebar)
```

### Hooks que MUEVES a `features/country-sidebar/hooks/`

```
hooks/useSocietyData.ts               →  features/country-sidebar/hooks/useSocietyData.ts
hooks/useTechnologyData.ts            →  features/country-sidebar/hooks/useTechnologyData.ts
hooks/useInternationalData.ts         →  features/country-sidebar/hooks/useInternationalData.ts
hooks/useCultureData.ts               →  features/country-sidebar/hooks/useCultureData.ts
```

### Services que MUEVES (a 2 destinos diferentes)

```
A features/country-sidebar/services/:
  services/society-service.ts          →  features/country-sidebar/services/society-service.ts
  services/technology-service.ts       →  features/country-sidebar/services/technology-service.ts
  services/international-service.ts    →  features/country-sidebar/services/international-service.ts
  services/culture-service.ts          →  features/country-sidebar/services/culture-service.ts

A features/world-map/services/ (los usa InternationalOrganizationsPanel → LeftSidebar):
  services/orgs-service.ts             →  features/world-map/services/orgs-service.ts
  services/orgs-config.ts              →  features/world-map/services/orgs-config.ts
```

### Archivos que MUEVES a `features/conflicts/`

```
components/ConflictTracker.tsx         →  features/conflicts/ConflictTracker.tsx
components/ConflictDetailCard.tsx      →  features/conflicts/ConflictDetailCard.tsx
components/ConflictFactions.tsx        →  features/conflicts/ConflictFactions.tsx
components/ConflictStats.tsx           →  features/conflicts/ConflictStats.tsx
components/ConflictSearchBar.tsx       →  features/conflicts/ConflictSearchBar.tsx
hooks/useConflictWebSocket.ts          →  features/conflicts/useConflictWebSocket.ts
```

### Archivos que MODIFICAS (actualizar imports)

```
features/country-sidebar/CountrySidebar.tsx    ← actualizar imports de secciones society, tech, intl, culture
App.tsx                                         ← actualizar import de ConflictTracker
components/CompareCountriesView.tsx             ← actualizar import de useSocietyData (movido)
```

> **NOTA:** Después de mover `society-service.ts`, actualizar TAMBIÉN
> `features/country-sidebar/sections/CountryKPIs.tsx` y
> `components/HistoricalTrendsSection.tsx` (ya en sections/) que lo importan.

### Verificación

```bash
cd apps/web && npx tsc --noEmit
npm run build
```

**Rama:** `refactor/frontend-sidebar-b`

---
---

# FASE 6 — Frontend: Descomponer App.tsx + limpieza final

> **Riesgo: ALTO.** Se toca el componente más grande (964 líneas).
> Hacer cambios pequeños y verificar después de cada uno.

```
¿Qué cambia en esta fase?

ANTES                                    DESPUÉS
─────                                    ──────
App.tsx (964 líneas, todo junto)    ──→  App.tsx (reducido, usa hooks de features/)
                                         features/world-map/useChoropleth.ts
                                         features/world-map/useMapControls.ts
                                         app/layouts/MainLayout.tsx

components/WorldMap.tsx             ──→  features/world-map/WorldMap.tsx
components/LoginForm.tsx            ──→  features/auth/LoginForm.tsx
services/auth.service.ts            ──→  features/auth/auth.service.ts
... (todos los restantes)

components/  (vacío)                ──→  ELIMINADO
services/    (vacío)                ──→  ELIMINADO
hooks/       (vacío)                ──→  ELIMINADO
```

---

## 6A — Andrés: Extraer lógica del mapa + dashboard + layout

**Qué haces:** Sacar lógica del mapa de App.tsx a hooks. Mover componentes del dashboard. Crear MainLayout.

### Archivos que CREAS

```
apps/web/src/features/world-map/useChoropleth.ts      ← extraer lógica de choropleth de App.tsx
apps/web/src/features/world-map/useMapControls.ts      ← extraer estado de controles del mapa
apps/web/src/app/layouts/MainLayout.tsx                 ← layout con nav + outlet
```

### Archivos que MUEVES (servicios del mapa)

```
services/worldbank-gdp.ts              →  features/world-map/services/worldbank-gdp.ts
services/worldbank-gdp-per-capita.ts   →  features/world-map/services/worldbank-gdp-per-capita.ts
services/worldbank-inflation.ts        →  features/world-map/services/worldbank-inflation.ts
services/indicator-generic.ts          →  features/world-map/services/indicator-generic.ts
services/indicators-db.ts             →  features/world-map/services/indicators-db.ts
services/historical-indicators.service.ts → features/world-map/services/historical-indicators.service.ts
```

### Archivos que MUEVES (componentes del mapa)

```
components/WorldMap.tsx                →  features/world-map/WorldMap.tsx
components/DynamicSunOverlay.tsx       →  features/world-map/DynamicSunOverlay.tsx
components/map/                        →  features/world-map/map/
```

### Archivos que MUEVES (dashboard)

```
components/ProfileSection.tsx          →  features/dashboard/ProfileSection.tsx
components/FavoritesSection.tsx        →  features/dashboard/FavoritesSection.tsx
components/PredictiveAnalysisSection.tsx → features/dashboard/PredictiveAnalysisSection.tsx
components/DashboardLayout.tsx         →  features/dashboard/DashboardLayout.tsx
```

### Archivos que MODIFICAS

```
App.tsx                ← actualizar imports a las nuevas rutas
pages/Dashboard.tsx    ← actualizar imports de features/dashboard/
```

### Verificación

```bash
cd apps/web && npx tsc --noEmit
npm run build
```

**Rama:** `refactor/extract-map-dashboard`

---

## 6B — Fabri: Mover remaining + limpiar directorios vacíos + verificación final

> **Esperar a que Andrés haya mergeado `refactor/extract-map-dashboard`.**

### Archivos que MUEVES (componentes restantes)

```
components/LeftSidebar.tsx             →  features/world-map/LeftSidebar.tsx
components/MenuToggleButton.tsx        →  features/world-map/MenuToggleButton.tsx
components/CountryCard.tsx             →  features/country/CountryCard.tsx
components/CompareCountriesPopup.tsx   →  features/compare/CompareCountriesPopup.tsx
components/CompareCountriesView.tsx    →  features/compare/CompareCountriesView.tsx
components/LoginForm.tsx               →  features/auth/LoginForm.tsx
components/RegisterForm.tsx            →  features/auth/RegisterForm.tsx
components/ProtectedRoute.tsx          →  features/auth/ProtectedRoute.tsx
components/UkraineAPIDemo.tsx          →  features/demos/UkraineAPIDemo.tsx (o eliminar si no se usa)
```

### Archivos que ELIMINAS (dead code confirmado)

```
components/CountrySelector.tsx         ← 0 importadores en todo el código
```

### Componentes de charts (decidir destino)

Estos son componentes de gráficos que pueden ser usados por varios features.
**Antes de moverlos, verificar quién los importa:**

```bash
# Ejecutar CADA uno:
grep -r "FullscreenChartModal" apps/web/src/ --include="*.tsx" --include="*.ts"
grep -r "HexagonalPerformanceChart" apps/web/src/ --include="*.tsx" --include="*.ts"
grep -r "OverlaidTimeSeriesChart" apps/web/src/ --include="*.tsx" --include="*.ts"
grep -r "RadarChartRecharts" apps/web/src/ --include="*.tsx" --include="*.ts"
grep -r "SelectableComparisonChart" apps/web/src/ --include="*.tsx" --include="*.ts"
grep -r "TimeSeriesChart" apps/web/src/ --include="*.tsx" --include="*.ts"
grep -r "TimeSeriesChartRecharts" apps/web/src/ --include="*.tsx" --include="*.ts"
```

Regla:
- **0 importadores** → ELIMINAR (dead code)
- **1 importador** → mover al feature que lo usa
- **2+ importadores** → mover a `components/ui/`

```
components/FullscreenChartModal.tsx       → verificar
components/HexagonalPerformanceChart.tsx  → verificar
components/OverlaidTimeSeriesChart.tsx    → verificar (usa historical-indicators.service)
components/RadarChartRecharts.tsx         → verificar
components/SelectableComparisonChart.tsx  → verificar (usa historical-indicators.service, society-service)
components/TimeSeriesChart.tsx            → verificar (usa historical-indicators.service, prediction.service)
components/TimeSeriesChartRecharts.tsx    → verificar (usa historical-indicators.service)
```

### Servicios restantes que MUEVES

```
services/conflict-service.ts           →  features/conflicts/services/conflict-service.ts
services/conflict-api.ts               →  features/conflicts/services/conflict-api.ts
services/conflict-actions.ts           →  features/conflicts/services/conflict-actions.ts
services/conflict-websocket.ts         →  features/conflicts/services/conflict-websocket.ts
services/conflict-tracker/             →  features/conflicts/services/conflict-tracker/
services/auth.service.ts               →  features/auth/auth.service.ts
services/favorites.service.ts          →  features/dashboard/favorites.service.ts
services/prediction.service.ts         →  features/dashboard/prediction.service.ts
services/news-api.ts                   →  features/news/news-api.ts
services/acled-api.ts                  →  features/conflicts/services/acled-api.ts
services/ukraine-api.ts                →  features/demos/ukraine-api.ts (o eliminar)
services/russian-warship-api.ts        →  features/demos/russian-warship-api.ts (o eliminar)
```

### Archivos que MODIFICAS

```
App.tsx               ← actualizar imports finales
AppRouter.tsx         ← actualizar imports de LoginForm, RegisterForm, ProtectedRoute
```

### Directorios que ELIMINAS (deben estar vacíos o casi)

```
apps/web/src/services/                ← todo movido a features/
apps/web/src/hooks/                   ← todo movido a features/
```

> `components/` solo se elimina si quedó vacío. Si quedan los componentes UI
> compartidos, renombrar a `components/ui/` para dejarlo organizado.

### VERIFICACIÓN FINAL (AMBAS PLATAFORMAS)

```bash
# Backend
cd apps/api && npx tsc --noEmit && npm run build

# Frontend
cd apps/web && npx tsc --noEmit && npm run build

# Full monorepo (si hay script)
cd /ruta/al/repo && npm run build --workspaces --if-present

# Buscar imports rotos
grep -r "from.*'/components/" apps/web/src/ --include="*.ts" --include="*.tsx"
# ↑ debe dar 0 resultados (o solo componentes UI en components/ui/)

grep -r "from.*'/services/" apps/web/src/ --include="*.ts" --include="*.tsx"
grep -r "from.*'/hooks/" apps/web/src/ --include="*.ts" --include="*.tsx"
# ↑ ambos deben dar 0 resultados
```

### Probar en ambas plataformas

```
Andrés: Windows 11 → npm run dev → abrir TODAS las páginas
Fabri:  macOS      → npm run dev → abrir TODAS las páginas

Páginas a probar:
- /                  (mapa mundial)
- /dashboard         (dashboard)
- /countries/USA     (detalle país)
- /conflicts         (lista conflictos)
- /conflicts/:slug   (detalle conflicto)
- /insights          (insights IA)
- /login             (login)
- /register          (registro)
```

**Rama:** `refactor/frontend-final-cleanup`

---
---

# Checklist resumen

```
┌────┬─────────────────────────────────────────────────────────┬────────┬───────┬────────────────────────────────────┐
│  # │ Tarea                                                   │ Quién  │ Fase  │ Rama                               │
├────┼─────────────────────────────────────────────────────────┼────────┼───────┼────────────────────────────────────┤
│ 1A │ Dead code backend + Logger Winston→Pino                │ Andrés │  1    │ cleanup/dead-code-and-logger       │
│ 1B │ Dead code frontend + Validación                        │ Fabri  │  1    │ cleanup/dead-frontend-and-validation│
│ 2A │ Crear modules/indicators + economy,defense,politics    │ Andrés │  2    │ refactor/indicators-module         │
│ 2B │ Migrar society, technology, international              │ Fabri  │  2    │ refactor/section-controllers       │
│ 3A │ Módulos geo, history + unificar conflict CRUD + rm /v2 │ Andrés │  3    │ refactor/geo-history-conflicts     │
│ 3B │ Módulos natural, predictions, news, users              │ Fabri  │  3    │ refactor/natural-predictions-news  │
│ 4A │ Eliminar dirs legacy + reubicar lib + fix scripts      │ Andrés │  4    │ cleanup/backend-legacy-dirs        │
│ 4B │ Reescribir routes/index.ts + verificación completa     │ Fabri  │  4    │ cleanup/routes-cleanup             │
│ 5A │ Sidebar sections A + hooks/services del sidebar        │ Andrés │  5    │ refactor/frontend-sidebar-a        │
│ 5B │ Sidebar sections B + conflict components               │ Fabri  │  5    │ refactor/frontend-sidebar-b        │
│ 6A │ Extraer mapa de App.tsx + dashboard + MainLayout       │ Andrés │  6    │ refactor/extract-map-dashboard     │
│ 6B │ Mover remaining + eliminar dirs vacíos + test final    │ Fabri  │  6    │ refactor/frontend-final-cleanup    │
└────┴─────────────────────────────────────────────────────────┴────────┴───────┴────────────────────────────────────┘
```

---

# Errores corregidos vs plan original

Este documento ya tiene incorporadas las siguientes correcciones:

| # | Error en el plan original | Corrección aplicada |
|---|---------------------------|---------------------|
| 1 | Fase 1A no mencionaba `middleware/requestLogger.ts` (dead code) | Añadido a la lista de eliminación |
| 2 | Fase 1A no mencionaba `utils/index.ts` (solo exporta noop) | Añadido a la lista de eliminación |
| 3 | Fase 1A decía "modificar routes/index.ts para quitar import de country.routes" pero ese import NO EXISTE (ya importa de modules/countries/) | Instrucción eliminada |
| 4 | Fase 1B decía "eliminar core/validation/ entero" pero `conflict.routes.ts` aún usa `core/validation/schemas/` | Corregido: solo eliminar validate.ts, mantener schemas/ hasta Fase 3A |
| 5 | Fase 1B no mencionaba el segundo import de `conflict.routes.ts` (schemas) | Añadida nota sobre ambos imports |
| 6 | Fase 3A solo listaba 2 archivos frontend con `/v2` | Corregido: son 3 (añadido `useRecentConflicts.ts`) |
| 7 | Fase 4A decía reubicar `core/cache/` y `core/http/` a `lib/` | Corregido: son DEAD CODE (0 importadores), se eliminan |
| 8 | Fase 4B le faltaba `osintRoutes` en el routes/index.ts propuesto | Incluido en el archivo corregido |
| 9 | Fase 6B no mencionaba componentes UI compartidos (charts, modals) | Añadida sección para decidir si mover a feature o a components/ui/ |
| 10 | Fase 5B ponía `InternationalOrganizationsPanel`, `orgs-service`, `orgs-config` en `country-sidebar/` | Corregido: los usa LeftSidebar, no CountrySidebar → van a `features/world-map/` |

---

# Notas técnicas importantes

### Diferencia entre los dos validates

```
core/validation/validate.ts  (VIEJO)        middleware/validate.ts  (NUEVO)
─────────────────────────────                ──────────────────────────────
- Lanza AppError si falla                    - Devuelve JSON 400 si falla
- Usa schema.parse() directo                 - Usa schema.safeParse()
- Formato: validate(schema)                  - Formato: validate({ body, query, params })
```

Si al migrar una ruta de validate viejo a validate nuevo la llamada falla,
adaptar el formato de la llamada según el middleware nuevo.

### Diferencia entre los dos loggers

```
core/logger/ (Winston — VIEJO)               config/logger.ts (Pino — NUEVO)
──────────────────────────────               ─────────────────────────────────
Exporta: logger, logRequest,                 Exporta: SOLO logger
         logApiError,
         logDatabaseOperation,
         logExternalApiCall

logger.info('msg', { meta })                 logger.info({ meta }, 'msg')
                                              ↑ Pino pone el objeto ANTES del string
```

> Los 3 archivos que migran en Fase 1A solo usan `logger`, así que el cambio
> es un simple cambio de import. Pero si el formato de la llamada es
> `logger.info('msg', { meta })`, Pino lo acepta también (solo pierde las meta
> como child logger fields — funcional pero no óptimo).
