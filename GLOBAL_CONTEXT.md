# Global Project Context

## 1. Project Overview

**WorldLore** is a modern, full-stack geospatial analytics platform for exploring and analyzing global geopolitical data, international conflicts, and country-level economic indicators.

### Purpose
- Provide interactive visualization of global geopolitical data
- Enable deep-dive analysis of countries across multiple dimensions (economy, politics, society, defense, technology, international relations, culture)
- Track and monitor international conflicts in real-time
- Visualize historical political boundaries and changes over time
- Support predictive analysis using AI-powered forecasting

### Capabilities
- **Interactive 3D World Map**: Mapbox GL-powered globe with multiple visualization modes
- **Choropleth Visualizations**: GDP, GDP per capita, inflation, GINI index, exports, life expectancy, military expenditure, democracy index, trade % GDP
- **Country Analysis**: Comprehensive sections covering 8+ analytical dimensions
- **Conflict Tracker**: Real-time conflict monitoring with WebSocket updates
- **History Mode**: Time-travel visualization of political boundaries (1900-2025, extensible to Roman Empire era)
- **Natural Features**: Rivers, mountain ranges, and peaks overlay
- **Predictive Analysis**: AI-powered forecasting using DeepSeek API
- **User System**: JWT-based authentication with favorites functionality
- **Organization Highlighting**: Visual highlighting of international organization member countries
- **Supported Organizations**: UN, WHO, UNESCO, UNICEF, WFP, NATO, EU, ASEAN, AU, OAS, ECOWAS, SADC, MERCOSUR, WTO, EFTA, USMCA, SCO, CSTO

### Target Users
- Geopolitical analysts and researchers
- International relations students and educators
- Policy makers and government officials
- Journalists covering global affairs
- General public interested in global data visualization

---

## 2. Tech Stack

### Frontend
- **Framework**: React 19.1.0 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Routing**: React Router DOM 6.30.2
- **Styling**: Tailwind CSS 4.1.8
- **Animations**: Framer Motion 12.16.0
- **Map Rendering**: Mapbox GL 3.12.0
- **Charts**: D3.js 7.9.0
- **Icons**: Lucide React 0.513.0
- **WebSocket Client**: Socket.io Client 4.8.1
- **State Management**: React Context API (no Redux/Zustand)

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 4.19.2
- **Language**: TypeScript 5.2.2
- **ORM**: Prisma 6.19.0
- **Database**: PostgreSQL 16 (via Docker)
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcryptjs 2.4.3
- **Validation**: Zod 4.1.13
- **Logging**: Winston 3.18.3
- **WebSocket**: Socket.io 4.8.1
- **HTTP Client**: Axios 1.11.0
- **Statistics**: simple-statistics 7.8.8

### Infrastructure
- **Database**: PostgreSQL 16 (Docker container)
- **Containerization**: Docker Compose
- **Development**: ts-node-dev (hot reload)

### External APIs & Services
- **REST Countries API**: Country metadata
- **World Bank API**: Economic and social indicators
- **Mapbox API**: Map tiles and geocoding
- **DeepSeek API**: AI-powered predictive analysis
- **News API**: Conflict-related news articles

---

## 3. Architecture Summary

### High-Level Architecture
```
┌─────────────────┐
│   Frontend      │  React SPA (Vite)
│   (Port 5173)   │
└────────┬────────┘
         │ HTTP/REST + WebSocket
         │
┌────────▼────────┐
│   Backend       │  Express API (Port 3001)
│   (Node.js)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│PostgreSQL│ │External│
│Database  │ │ APIs   │
└─────────┘ └────────┘
```

### Monorepo Structure
```
WL-/
├── backend/              # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── routes/      # REST endpoint definitions
│   │   ├── controllers/ # Request handlers (thin layer)
│   │   ├── services/     # Business logic & data fetching
│   │   ├── core/         # Utilities (errors, validation, logger, cache)
│   │   ├── db/           # Prisma client initialization
│   │   ├── websocket/    # Socket.io server
│   │   ├── middleware/   # Express middleware (auth, logging)
│   │   ├── modules/      # Domain modules
│   │   ├── scripts/       # Data ingestion scripts
│   │   └── types/        # TypeScript type definitions
│   ├── prisma/           # Database schema & migrations
│   └── public/data/      # Cached JSON files
│
└── frontend/            # React 19 + Vite + TypeScript SPA
    ├── src/
    │   ├── components/   # React components
    │   ├── services/     # API client services
    │   ├── hooks/        # Custom React hooks
    │   ├── contexts/     # React Context (global state)
    │   ├── pages/        # Page components
    │   ├── types/        # TypeScript types
    │   └── utils/         # Helper functions
    └── public/           # Static assets
```

### Architectural Patterns

#### Backend: Layered Architecture
```
HTTP Request
    ↓
Routes (endpoint definitions)
    ↓
Controllers (request/response handling)
    ↓
Services (business logic, data fetching)
    ↓
Database/External APIs
    ↓
Response
```

#### Frontend: Component-Based with Hooks
```
App Router
    ↓
Page Components
    ↓
Feature Components
    ↓
Custom Hooks (data fetching)
    ↓
Services (API clients)
    ↓
Backend API
```

### Key Design Decisions
1. **Separation of Concerns**: Clear separation between routes, controllers, and services
2. **Type Safety**: Full TypeScript coverage on both frontend and backend
3. **Error Handling**: Centralized error handling with custom AppError class
4. **Validation**: Zod schemas for request validation
5. **Logging**: Structured logging with Winston
6. **State Management**: Context API for global state (no Redux needed)
7. **Real-time Updates**: WebSocket for conflict updates
8. **Data Caching**: In-memory cache + file-based cache for frequently accessed data

---

## 4. Frontend

### Component Hierarchy
```
AppRouter.tsx
  └── Routes
      ├── / → WorldMapView (App.tsx)
      ├── /dashboard → Dashboard
      ├── /login → LoginForm
      └── /register → RegisterForm

WorldMapView (App.tsx)
  ├── MenuToggleButton
  ├── LeftSidebar (controls, indicators, history mode)
  ├── WorldMap (map component)
  ├── CountrySidebar (country detail view)
  │   ├── BasicInfoSection
  │   ├── EconomySection
  │   ├── PoliticsSection
  │   ├── SocietySection
  │   ├── DefenseSection
  │   ├── TechnologySection
  │   ├── InternationalSection
  │   ├── CultureSection
  │   ├── HistoricalTrendsSection
  │   └── PredictiveAnalysisSection
  ├── ConflictTracker (conflict panel)
  └── CountryCard (floating card)
```

### Key Components

#### WorldMap (`components/WorldMap.tsx`)
- **Purpose**: Primary map rendering component
- **Features**:
  - 3D globe visualization
  - Choropleth layers (GDP, inflation, GINI, etc.)
  - Historical boundaries overlay
  - Natural features (rivers, mountains, peaks)
  - Conflict markers
  - Organization highlighting
- **Base Map Styles**: `night`, `light`, `outdoors`, `physical` (Mapbox styles)
- **Planet Presets**: `default`, `nebula`, `sunset`, `dawn` (atmospheric effects)
- **Terrain**: Configurable terrain rendering with exaggeration control (0-2x)
- **3D Buildings**: Toggleable 3D building layer
- **Auto-rotate**: Configurable globe auto-rotation with speed control
- **Minimal Mode**: Hide labels, roads, and borders for cleaner visualization
  - Terrain rendering with exaggeration control
  - 3D buildings
  - Auto-rotate globe
  - Minimal mode (hide labels/borders)

#### LeftSidebar (`components/LeftSidebar.tsx`)
- **Purpose**: Main control panel
- **Sections**:
  - Explore Countries (country search)
  - Statistics (choropleth toggles)
  - Natural Layers (rivers, mountains, peaks)
  - History Mode (time slider)
  - Organizations (member highlighting)
  - Settings (map style, terrain, 3D buildings, auto-rotate)

#### CountrySidebar (`components/CountrySidebar.tsx`)
- **Purpose**: Country detail view
- **Sections**: All analytical sections (Economy, Politics, Society, etc.)
- **Data Flow**: Uses custom hooks to fetch section-specific data

#### ConflictTracker (`components/ConflictTracker.tsx`)
- **Purpose**: Conflict monitoring panel
- **Features**:
  - List of active conflicts
  - Conflict details (factions, casualties, events, news)
  - Real-time updates via WebSocket
  - Map integration (center on conflict)
- **Conflict Status Types**: `WAR`, `WARM`, `IMPROVING`, `RESOLVED`, `FROZEN`
- **Conflict Data Model**:
  - **Conflict**: Core conflict info (name, country, region, type, status, dates, coordinates, involved ISO codes)
  - **ConflictFaction**: Factions involved (name, color, goals, allies)
  - **ConflictFactionSupport**: External support (supporter ISO, support type: military/diplomatic/economic, weapons, aid value)
  - **ConflictCasualty**: Casualty reports (date, military, civilian, total)
  - **ConflictEvent**: Timeline events (title, date, description, type, location)
  - **ConflictUpdate**: Status updates (date, status, description, source)
  - **ConflictNews**: News articles (title, source, URL, published date, description, image)

### State Management

#### AuthContext (`contexts/AuthContext.tsx`)
- **State**: `user`, `token`, `isLoading`, `isAuthenticated`
- **Methods**: `login()`, `register()`, `logout()`, `updateUser()`
- **Persistence**: Token stored in `localStorage`

#### Component State
- **Local State**: React `useState` for component-specific state
- **No Global Store**: Context API sufficient for current needs

### Custom Hooks Pattern

**Location**: `frontend/src/hooks/`

**Pattern**:
```typescript
export function useCountryBasicInfo(countryName: string | null) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (countryName) {
      fetchData(countryName);
    }
  }, [countryName]);
  
  return { data, isLoading, error, refetch };
}
```

**Available Hooks**:
- `useCountryBasicInfo` - Basic country metadata
- `useEconomyData` - Economic indicators
- `usePoliticsData` - Political indicators
- `useSocietyData` - Social indicators
- `useDefenseData` - Defense indicators
- `useTechnologyData` - Technology indicators
- `useInternationalData` - International relations
- `useCultureData` - Cultural data
- `useConflictWebSocket` - Real-time conflict updates

### Services Layer

**Location**: `frontend/src/services/`

**Pattern**: Each service module exports functions that:
1. Call backend API endpoints
2. Transform response data
3. Handle errors

**Key Services**:
- `country-basic-info.service.ts` - Country metadata
- `economy-service.ts`, `politics-service.ts`, etc. - Section-specific data
- `conflict-api.ts`, `conflict-service.ts` - Conflict data
- `worldbank-gdp.ts`, `worldbank-inflation.ts` - World Bank indicators
- `indicators-db.ts` - Database-backed indicators
- `auth.service.ts` - Authentication
- `favorites.service.ts` - User favorites
- `prediction.service.ts` - AI predictions
- `orgs-service.ts` - Organization highlighting

### Mapbox GL Integration

**Choropleth System**:
- Each metric has a `ChoroplethSpec` with `fillColor` expressions and `legend`
- Only one choropleth active at a time (mutually exclusive)
- Specs stored in `choroplethSpecRef` (Mapbox layer configuration)
- Metrics: `gdp`, `gdp-per-capita`, `inflation`, `gini`, `exports`, `life-expectancy`, `military-expenditure`, `democracy-index`, `trade-gdp`
- **ChoroplethSpec Structure**:
  ```typescript
  {
    iso3ToColor: Record<string, string>;  // ISO3 → hex color mapping
    legend: Array<{ label: string; color: string; min?: number; max?: number }>;
    defaultColor: string;  // Color for countries without data
  }
  ```
- **Quantile-based bucketing**: Most choropleths use quantile thresholds (5-9 buckets)
- **Color palettes**: Each metric has a semantic color palette (e.g., GDP: purple, Inflation: green→red, GINI: green→red)
- **Log scale**: GDP and exports use logarithmic scale for better visualization
- **Data source**: Latest available year per country from database

**History Mode**:
- Fetches historical boundaries for selected year
- Overlays GeoJSON on map
- Available years: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914, 1920, 1930, 1938, 1945, 1960, 1994, 2000, 2010
- Year snapping: Automatically snaps to nearest available year
- Data source: `HistoricalPolity`, `HistoricalArea`, `HistoricalAreaGeometry` models
- LOD support: `LOW`, `MED`, `HIGH` (Level of Detail)

**Natural Features**:
- Rivers, mountain ranges, peaks
- LOD (Level of Detail): `low`, `med`, `high`, `auto`

### D3.js Integration

**Location**: `components/TimeSeriesChart.tsx`

**Purpose**: Standalone chart rendering (not map overlays)
- Line charts for historical trends
- Projection scenarios (optimistic, base, pessimistic)
- Responsive sizing

**Coexistence**: Mapbox handles all map rendering; D3 handles standalone charts

### Styling

- **Framework**: Tailwind CSS 4.1.8
- **Custom CSS**: `src/styles/` for complex animations
- **Animations**: Framer Motion for component animations
- **Key Files**:
  - `index.css` - Global styles
  - `sidebar.css` - Sidebar animations
  - `conflict-tracker.css` - Conflict panel styles
  - `geocoder.css` - Mapbox Geocoder customization

---

## 5. Backend

### Request Flow
```
HTTP Request
    ↓
Express App (app.ts)
    ↓
Middleware (CORS, JSON parsing, logging, auth)
    ↓
Routes (route definitions)
    ↓
Controllers (request/response handling)
    ↓
Services (business logic)
    ↓
Database (Prisma) / External APIs
    ↓
Response
```

### Route Modules

**Location**: `backend/src/routes/`

**Available Routes**:
- `country.routes.ts` - `/api/countries/*`
- `conflict.routes.ts` - `/api/conflicts/*`
- `economy.routes.ts` - `/api/economy/*`
- `politics.routes.ts` - `/api/politics/*`
- `society.routes.ts` - `/api/society/*`
- `technology.routes.ts` - `/api/technology/*`
- `defense.routes.ts` - `/api/defense/*`
- `international.routes.ts` - `/api/international/*`
- `auth.routes.ts` - `/api/auth/*`
- `favorites.routes.ts` - `/api/favorites/*`
- `user.routes.ts` - `/api/user/*`
- `prediction.routes.ts` - `/api/prediction/*`
- `history.routes.ts` - `/api/history/*`
- `natural.routes.ts` - `/api/natural/*`
- `indicator.routes.ts` - `/api/indicators/*`
- `organization.routes.ts` - `/api/organizations/*`

### Controller Pattern

**Location**: `backend/src/controllers/`

**Pattern**:
```typescript
export const getCountryInfo: RequestHandler = async (req, res) => {
  const { countryName } = req.params;
  try {
    const result = await getCountryBasicInfo(countryName);
    if (result.error) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json({ data: result.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch country information' });
  }
};
```

**Responsibilities**:
- Extract request parameters/body
- Call service functions
- Handle errors
- Format HTTP responses

### Service Layer

**Location**: `backend/src/services/`

**Pattern**: Pure functions, no Express dependencies

**Data Sources**:
- **Prisma ORM**: PostgreSQL database queries
- **External APIs**: REST Countries API, World Bank API, News API
- **File System**: Cached JSON files (`backend/public/data/`)

**Key Services**:
- `country.service.ts` - Country data fetching (API → DB → cache fallback)
- `indicator.service.ts` - Economic/social indicators from database
- `conflict.service.ts` - Conflict CRUD operations
- `history.service.ts` - Historical boundary data
- `natural.service.ts` - Natural features (rivers, mountains)
- `prediction.service.ts` - AI-powered predictions (DeepSeek)
- `news-cache.service.ts` - News article caching

### Core Utilities

#### Error Handling (`core/errors/`)
- **AppError Class**: Custom error types with status codes
  - `AppError.badRequest()`, `AppError.notFound()`, `AppError.internal()`, etc.
- **Error Handler Middleware**: Centralized error processing
  - Converts Prisma errors to AppError
  - Logs errors with context
  - Returns JSON responses with error codes

#### Validation (`core/validation/`)
- **Zod Integration**: Type-safe schema validation
- **Pattern**: Middleware that validates `body`, `query`, and `params`
```typescript
const schema = z.object({
  body: z.object({ name: z.string().min(1) }),
  params: z.object({ id: z.string().uuid() })
});
router.post('/:id', validate(schema), controller);
```

#### Logger (`core/logger/`)
- **Winston**: Structured logging with file rotation
- **Log Files**: `backend/logs/error.log`, `combined.log`, `exceptions.log`, `rejections.log`
- **Helpers**: `logRequest()`, `logApiError()`, `logDatabaseOperation()`, `logExternalApiCall()`

#### Cache (`core/cache/`)
- **Memory Cache**: In-memory caching for frequently accessed data

### Database Schema (Prisma)

**Location**: `backend/prisma/schema.prisma`

#### Core Models

**Entity-Relation Graph**:
- **Entity**: Universal entity model (countries, regions, cities, companies, organizations, etc.)
  - Fields: `id`, `type` (enum), `name`, `slug`, `iso2/iso3`, `lat/lng`, `props` (JSON)
- **Relation**: Relationships between entities (OWNS, OPERATES, INVESTS_IN, etc.)
- **Indicator**: Metadata for economic/social indicators (code, name, unit, frequency)
- **IndicatorValue**: Time-series data (entityId, indicatorCode, year, value)

**Specialized Models**:
- **Boundary** + **BoundaryVersion**: GeoJSON boundaries with temporal validity
- **HistoricalPolity** + **HistoricalArea** + **HistoricalAreaGeometry**: Historical political maps
- **NaturalFeature** + **NaturalGeometry**: Rivers, mountain ranges, peaks with LOD
- **Conflict** + **ConflictCasualty** + **ConflictFaction** + **ConflictEvent** + **ConflictUpdate** + **ConflictNews**: Conflict tracking system
- **User** + **Favorite**: Authentication and user preferences
- **TradeFlow**: Trade data between entities
- **Ownership**: Ownership relationships (percentages, dates)
- **OrganizationSpec**, **TreatySpec**, **MineSpec**, **ResourceSpec**, **FacilitySpec**, **CompanyProfile**: Entity type-specific data

**Key Relationships**:
- `Entity` → `IndicatorValue[]` (one-to-many)
- `Entity` → `Boundary[]` (one-to-many)
- `Conflict` → `ConflictFaction[]`, `ConflictEvent[]`, etc. (one-to-many)
- `User` → `Favorite[]` (one-to-many)

### WebSocket Integration

**Location**: `backend/src/websocket/conflict-socket.ts`

**Purpose**: Real-time conflict updates broadcast to all connected clients

**Implementation**:
- **Server**: Socket.io server on `/ws/conflicts` path
- **Events**: `conflict:update` (server → client)
- **Payload**: `{ id, type: 'created'|'updated'|'deleted'|'status-changed'|'casualty-updated', data? }`

**Usage in Controllers**:
```typescript
import { broadcastConflictUpdate } from '../index';
broadcastConflictUpdate({ id: conflictId, type: 'updated', data: conflict });
```

### Middleware

**Location**: `backend/src/middleware/`

**Available Middleware**:
- `auth.ts` - JWT authentication (adds `req.user`)
- `requestLogger.ts` - Request logging
- Error handler (in `core/errors/errorHandler.ts`)

### Data Ingestion Scripts

**Location**: `backend/src/scripts/`

**Available Scripts**:
- `ingest-worldbank-gdp.ts` - Import GDP data from World Bank
- `ingest-worldbank-gdp-per-capita.ts` - Import GDP per capita
- `ingest-worldbank-economy.ts` - Import economic indicators
- `ingest-worldbank-society.ts` - Import social indicators
- `ingest-worldbank-all-sections.ts` - Import all World Bank data
- `ingest-restcountries-and-wb-indicators.ts` - Import countries and World Bank indicators
- `import-natural-geojson.ts` - Import natural features (rivers, mountains, peaks)
- `import-history-geojson.ts` - Import historical boundaries
- `migrate-conflicts-to-db.ts` - Migrate conflicts to database
- `check-seed.ts` - Check database seed status
- `delete-gdp.ts` - Delete GDP data (utility)
- `query-gdp.ts` - Query GDP data (utility)
- `report-indicator-coverage.ts` - Report indicator data coverage

**Usage**:
```bash
npm run wb:ingest:gdp
npm run natural:import
npm run history:import
```

---

## 6. Data Flow

### Country Selection Flow
```
User clicks country on map
    ↓
WorldMap.onCountrySelect(countryName)
    ↓
App.tsx.handleCountrySelect()
    ↓
setSelectedCountry(countryName)
    ↓
CountrySidebar receives countryName
    ↓
Sections use hooks (useEconomyData, etc.)
    ↓
Hooks call services
    ↓
Services fetch from backend
    ↓
Backend queries database/external APIs
    ↓
Data flows back through chain
    ↓
Components render
```

### Choropleth Toggle Flow
```
User toggles GDP layer in LeftSidebar
    ↓
handleToggleGdpLayer(true)
    ↓
setGdpEnabled(true)
    ↓
useEffect detects change
    ↓
fetchGdpLatestByIso3() (service)
    ↓
buildGdpChoropleth() (transform data)
    ↓
mapRef.current.setChoropleth('gdp', spec)
    ↓
WorldMap updates Mapbox fill layer
    ↓
Map displays choropleth
```

### Conflict Update Flow (WebSocket)
```
Backend conflict controller updates conflict
    ↓
broadcastConflictUpdate({ id, type: 'updated', data })
    ↓
Socket.io server emits 'conflict:update'
    ↓
Frontend useConflictWebSocket hook receives event
    ↓
Updates local conflict state
    ↓
ConflictTracker re-renders with new data
    ↓
WorldMap updates conflict markers if needed
```

### History Mode Flow
```
User enables History Mode in LeftSidebar
    ↓
handleToggleHistoryMode(true)
    ↓
mapRef.current.setHistoryEnabled(true)
    ↓
WorldMap fetches historical boundaries for year
    ↓
Backend history service queries HistoricalArea/HistoricalAreaGeometry
    ↓
Returns GeoJSON for selected year
    ↓
WorldMap adds overlay layer
    ↓
Map displays historical boundaries
```

### Authentication Flow
```
User submits login form
    ↓
AuthService.login() (frontend)
    ↓
POST /api/auth/login
    ↓
AuthController.login() (backend)
    ↓
Verify password with bcrypt
    ↓
Generate JWT token
    ↓
Return token + user data
    ↓
Store token in localStorage
    ↓
Update AuthContext
    ↓
User is authenticated
```

### Data Ingestion Flow
```
Script runs (e.g., ingest-worldbank-gdp.ts)
    ↓
Fetch data from World Bank API
    ↓
Transform data to Prisma format
    ↓
Upsert Indicator records
    ↓
Upsert IndicatorValue records
    ↓
Data available via API endpoints
```

---

## 7. Config / Environment

### Backend Environment Variables (`backend/.env`)
```bash
# Database
DATABASE_URL=postgresql://worldlore:worldlore@localhost:5432/worldlore?schema=public

# Server
PORT=3001
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# External APIs
MAPBOX_TOKEN=tu_token_de_mapbox_aqui
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Frontend Environment Variables (`frontend/.env`)
```bash
# Mapbox
VITE_MAPBOX_TOKEN=tu_token_de_mapbox_aqui

# Backend API
VITE_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

### Docker Configuration (`docker-compose.yml`)
```yaml
services:
  postgres:
    image: postgres:16
    container_name: wl_postgres
    environment:
      POSTGRES_USER: worldlore
      POSTGRES_PASSWORD: worldlore
      POSTGRES_DB: worldlore
    ports:
      - "5432:5432"
    volumes:
      - ./pgdata:/var/lib/postgresql/data
```

### TypeScript Configuration
- **Backend**: `backend/tsconfig.json` (Node.js target, ES2020)
- **Frontend**: `frontend/tsconfig.json`, `tsconfig.app.json` (ES2020, React, JSX)

### Build Configuration
- **Backend**: TypeScript compilation to `dist/` directory
- **Frontend**: Vite build to `dist/` directory

---

## 8. Key Constraints

### Technical Constraints
1. **Single Choropleth Active**: Only one choropleth layer can be active at a time (mutually exclusive)
2. **History Mode Limitations**: Supports years 100 AD to 2010 AD (specific years available, see History Mode section)
3. **Database Dependency**: All indicator data must be ingested via scripts before use
4. **Mapbox Token Required**: Map rendering requires valid Mapbox access token
5. **WebSocket Path**: Fixed at `/ws/conflicts` (not configurable)
6. **JWT Expiration**: Tokens expire in 7 days (hardcoded)
7. **No Shared Types Package**: Types duplicated between frontend and backend
8. **Choropleth Buckets**: Quantile-based bucketing uses 5-9 buckets (default: 7)
9. **Natural Features LOD**: Only one LOD level per feature type (LOW, MED, HIGH)

### Data Constraints
1. **ISO3 Required**: Country identification primarily uses ISO 3166-1 alpha-3 codes
2. **Indicator Codes**: Must match database indicator codes (see `SLUG_TO_CODE` mapping below)
3. **Year Range**: Indicator data spans various years depending on source
4. **Cache Fallback**: Some endpoints fall back to cached JSON files if database is unavailable

### Indicator Code Mapping

**Location**: `backend/src/services/indicator.service.ts`

**SLUG_TO_CODE Mapping** (frontend slug → database indicator code):
```typescript
{
  'gdp': 'GDP_USD',
  'gdp-per-capita': 'GDP_PC_USD',
  'inflation': 'INFLATION_CPI_YOY_PCT',
  'gini': 'GINI_INDEX',
  'exports': 'EXPORTS_USD',
  'imports': 'IMPORTS_USD',
  'unemployment': 'UNEMPLOYMENT_RATE_PERCENT',
  'debt': 'EXTERNAL_DEBT_USD',
  'life-expectancy': 'LIFE_EXPECTANCY',
  'population-density': 'POPULATION_DENSITY',
  'population-growth': 'POPULATION_GROWTH',
  'military-expenditure': 'MILITARY_EXPENDITURE_PCT_GDP',
  'democracy-index': 'WGI_VOICE_ACCOUNTABILITY',  // Normalized to 0-10 in frontend
  'trade-gdp': 'TRADE_PERCENT_GDP'
}
```

**Note**: The `democracy-index` uses `WGI_VOICE_ACCOUNTABILITY` from World Bank Governance Indicators, which ranges from -2.5 to 2.5. The frontend normalizes this to a 0-10 scale for visualization.

### Architectural Constraints
1. **No Redux**: Context API used for global state (no Redux/Zustand)
2. **No SSR**: Frontend is pure SPA (no server-side rendering)
3. **Monolithic Backend**: Single Express app (no microservices)
4. **File-Based Cache**: Some data cached in JSON files (not Redis)

### External API Constraints
1. **Rate Limits**: External APIs (World Bank, REST Countries) may have rate limits
2. **API Keys Required**: Mapbox and DeepSeek require API keys
3. **Network Dependency**: Application requires internet connection for external APIs

### Development Constraints
1. **Windows Support**: Scripts available for both Windows (`.ps1`) and Unix (`.sh`)
2. **Node.js Version**: Requires Node.js 18 or higher
3. **PostgreSQL Required**: Database must be running (Docker or local)

---

## 9. Additional Notes for AI

### Code Organization Principles
1. **One File Per Module**: Each route, controller, service, component, hook, and service is in its own file
2. **Naming Conventions**:
   - Files: `kebab-case.ts` / `PascalCase.tsx` (components)
   - Functions: `camelCase`
   - Types/Interfaces: `PascalCase`
   - Constants: `UPPER_SNAKE_CASE` or `camelCase` (context-dependent)
3. **Separation of Concerns**: Clear boundaries between layers (routes → controllers → services)

### Error Handling Patterns
1. **Backend**: Services return `{ data, error }` objects (don't throw for business logic)
2. **Frontend**: Hooks set `error` state; components display error messages
3. **Global Handler**: Backend `errorHandler` middleware catches all unhandled errors

### API Response Format
```typescript
// Success
{ data: T, total?: number }

// Error
{ error: string, code?: string, details?: any }
```

### Testing Strategy
- **Current State**: Minimal testing infrastructure
- **Location**: `frontend/tests/` (basic API/service tests)
- **Recommendation**: Add unit tests for services, integration tests for API endpoints
- **E2E**: Consider Playwright (already in devDependencies)

### Deployment Considerations
- **Backend**: Build with `npm run build`, start with `npm start` (runs `dist/index.js`)
- **Frontend**: Build with `npm run build` (Vite production build), serve static files
- **Database**: Requires PostgreSQL instance
- **Environment**: Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`

### Common File Locations
- **Backend entry**: `backend/src/index.ts`
- **Frontend entry**: `frontend/src/main.tsx`
- **App component**: `frontend/src/App.tsx`
- **Router**: `frontend/src/AppRouter.tsx`
- **Map component**: `frontend/components/WorldMap.tsx`
- **Database schema**: `backend/prisma/schema.prisma`
- **Error handler**: `backend/src/core/errors/errorHandler.ts`
- **Validation**: `backend/src/core/validation/validate.ts`
- **Logger**: `backend/src/core/logger/index.ts`

### Common Commands
```bash
# Backend
cd backend && npm run dev              # Development server
cd backend && npm run build            # Build TypeScript
cd backend && npm run prisma:studio   # Database GUI
cd backend && npm run wb:ingest:gdp    # Ingest GDP data

# Frontend
cd frontend && npm run dev             # Development server
cd frontend && npm run build            # Production build

# Root
./start-servers.sh                     # Start both servers (Unix)
./start-servers.ps1                   # Start both servers (Windows)
```

### Complete API Endpoints Reference

#### Countries (`/api/countries`)
- `GET /api/countries` - List all countries
- `GET /api/countries/all` - Get all countries with full metadata
- `GET /api/countries/search?q=...` - Search countries by name
- `GET /api/countries/code/:code` - Get country by ISO code
- `GET /api/countries/:countryName/basic-info` - Get country basic information

#### Indicators (`/api/indicators`)
- `GET /api/indicators/gdp/latest` - Latest GDP for all countries
- `GET /api/indicators/gdp/:iso3` - GDP time series for country
- `GET /api/indicators/gdp-per-capita/latest` - Latest GDP per capita
- `GET /api/indicators/gdp-per-capita/:iso3` - GDP per capita time series
- `GET /api/indicators/inflation/latest` - Latest inflation rates
- `GET /api/indicators/inflation/:iso3` - Inflation time series
- `GET /api/indicators/:slug/latest` - Latest value for any indicator by slug
- `GET /api/indicators/:slug/timeseries/:iso3` - Time series for indicator

#### Section Endpoints (Aggregated Indicators)
- `GET /api/economy/:iso3` - Economic indicators (GDP, inflation, exports, etc.)
- `GET /api/politics/:iso3` - Political indicators (democracy index, etc.)
- `GET /api/society/:iso3` - Social indicators (life expectancy, GINI, etc.)
- `GET /api/defense/:iso3` - Defense indicators (military expenditure, etc.)
- `GET /api/technology/:iso3` - Technology indicators
- `GET /api/international/:iso3` - International relations data
- `GET /api/society/:iso3/worldbank/:indicator` - World Bank specific indicator

#### Conflicts (`/api/conflicts`)
- `GET /api/conflicts` - List all conflicts (with filters: status, region, country)
- `GET /api/conflicts/stats` - Conflict statistics
- `GET /api/conflicts/search?q=...` - Search conflicts
- `GET /api/conflicts/slug/:slug` - Get conflict by slug
- `GET /api/conflicts/:id` - Get conflict by ID
- `POST /api/conflicts` - Create new conflict (authenticated)
- `PUT /api/conflicts/:id` - Update conflict (authenticated)
- `DELETE /api/conflicts/:id` - Delete conflict (authenticated)
- `GET /api/conflicts/:id/news` - Get conflict news articles
- `POST /api/conflicts/:id/news` - Cache conflict news (authenticated)
- `DELETE /api/conflicts/:id/news/:newsId` - Delete news article (authenticated)

#### History (`/api/history`)
- `GET /api/history?year=...` - Get historical boundaries for year

#### Natural Features (`/api/natural`)
- `GET /api/natural/:type` - Get natural features (rivers, mountain_ranges, peaks)
- `GET /api/natural/search/q?q=...` - Search natural features

#### Organizations (`/api/organizations`)
- `GET /api/organizations/:org/members` - Get organization members by ISO3 codes

#### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (authenticated)

#### User (`/api/user`)
- `PUT /api/user/profile` - Update user profile (authenticated)

#### Favorites (`/api/favorites`)
- `GET /api/favorites` - Get user favorites (authenticated)
- `POST /api/favorites` - Add favorite country (authenticated)
- `DELETE /api/favorites/:countryIso3` - Remove favorite (authenticated)

#### Predictions (`/api/prediction`)
- `GET /api/prediction/:slug/:iso3` - Get AI prediction for indicator (authenticated)
- `POST /api/prediction/insights` - Get AI insights (authenticated)

#### Health
- `GET /db/health` - Database health check
- `GET /test` - Server health check

### Future Considerations
1. **Shared Types Package**: Consider creating `@worldlore/types` package for shared types
2. **Redis Cache**: Replace file-based cache with Redis for better performance
3. **API Rate Limiting**: Add rate limiting middleware
4. **GraphQL**: Consider GraphQL for more flexible queries
5. **Microservices**: Consider splitting backend into microservices if scale requires
6. **SSR**: Consider Next.js for SSR if SEO becomes important
7. **Testing**: Expand test coverage (unit, integration, E2E)

---

---

## 10. Additional Technical Details

### Mapbox Configuration

**Base Map Styles**:
- `night`: Dark theme with city lights
- `light`: Light theme with minimal colors
- `outdoors`: Topographic style
- `physical`: Physical geography emphasis

**Planet Presets** (atmospheric effects):
- `default`: Standard atmosphere
- `nebula`: Purple/blue nebula effect
- `sunset`: Warm orange/red sunset
- `dawn`: Cool blue/purple dawn

**Terrain Configuration**:
- Exaggeration: 0.0 to 2.0 (default: 1.0)
- Enabled via Mapbox terrain API
- Persisted in localStorage

### Organization System

**Location**: `frontend/src/services/orgs-config.ts`

**Organization Categories**:
- `Defense`: NATO, CSTO
- `Regional Union`: EU, ASEAN, AU, OAS, ECOWAS, SADC, MERCOSUR
- `Economic`: WTO, EFTA, USMCA
- `Security`: SCO, CSTO
- `Political`: UN, WHO, UNESCO, UNICEF, WFP

**Organization Data Structure**:
```typescript
{
  key: string;        // Canonical slug (e.g., 'nato')
  name: string;        // Display name
  color: string;       // Hex color for highlighting
  category: OrgCategory;
  aliases: string[];   // Search terms (multilingual)
}
```

**Member Highlighting**: 
- Frontend queries `/api/organizations/:org/members` to get ISO3 codes
- Map highlights countries using `highlightIso3List()` or `highlightIso3ToColorMap()`
- Supports custom colors per organization

### Conflict Tracker Details

**Conflict Status Enum**:
- `WAR`: Active war
- `WARM`: Warm conflict (escalating)
- `IMPROVING`: Situation improving
- `RESOLVED`: Conflict resolved
- `FROZEN`: Frozen conflict

**Support Types** (ConflictFactionSupport):
- `military`: Military support
- `diplomatic`: Diplomatic support
- `economic`: Economic support

**Event Types** (ConflictEvent):
- `battle`: Battle event
- `ceasefire`: Ceasefire agreement
- `agreement`: Peace agreement
- Other custom types

### Choropleth Color Palettes

**GDP**: Purple gradient (`#f3e8ff` → `#581c87`)
**GDP Per Capita**: Blue gradient (custom)
**Inflation**: Green → Red (`#16a34a` → `#dc2626`) - low is good
**GINI**: Green → Red (`#16a34a` → `#dc2626`) - low inequality is good
**Exports**: Blue → Purple (`#dbeafe` → `#4f46e5`)
**Life Expectancy**: Green gradient (`#dcfce7` → `#15803d`)
**Military Expenditure**: Orange/Red (`#fff7ed` → `#ea580c`)
**Democracy Index**: Red → Green (`#fee2e2` → `#16a34a`) - inverted (low to high)
**Trade % GDP**: Blue → Cyan (`#e0f2fe` → `#0891b2`)

### Historical Years Reference

**Available Years** (from `frontend/src/utils/historical-years.ts`):
```
100, 200, 300, 400, 500, 600, 700, 800, 900,
1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600, 1650,
1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914, 1920, 1930, 1938,
1945, 1960, 1994, 2000, 2010
```

**Year Snapping**: User-selected years automatically snap to nearest available year using `snapToAvailableYear()` function.

### Entity Types (Database)

**EntityType Enum**:
- `COUNTRY`, `REGION`, `CITY`, `COMPANY`, `INVESTOR`, `PERSON`
- `MINE`, `RESOURCE`, `FACILITY`, `PROJECT`, `ORGANIZATION`
- `SECTOR`, `PIPELINE`, `PORT`, `RAILWAY`, `TREATY`

**RelationType Enum**:
- `LOCATED_IN`, `OWNS`, `OPERATES`, `INVESTS_IN`, `EXTRACTS_RESOURCE`
- `SUPPLIES_TO`, `TRANSPORTED_VIA`, `PART_OF`, `LICENSED_BY`
- `REGULATED_BY`, `SANCTIONED_BY`, `RELATED_TO`, `MEMBER_OF`
- `OBSERVES`, `SIGNATORY_TO`, `RATIFIED`, `APPLIES_TO`
- `DEPOSITORY`, `COVERS_SECTOR`

### Natural Features

**Types**: `RIVER`, `MOUNTAIN_RANGE`, `PEAK`

**LOD Levels**: `LOW`, `MED`, `HIGH`

**Coverage**: Natural features can be associated with countries via `NaturalFeatureCoverage` model.

---

**Last Updated**: Generated during comprehensive repository analysis
**Maintainer**: Update this file when architectural changes occur

