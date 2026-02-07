# AI Context Documentation - WorldLore

> **Purpose:** This document serves as a comprehensive context injection for AI agents working on this codebase. It provides architectural understanding, data flow patterns, and coding standards without requiring deep file exploration.

---

## A. Project DNA

### High-Level Summary

**WorldLore** is a modern geospatial analytics platform for exploring geopolitical data, international conflicts, and country-level economic indicators. The application provides:

- **Interactive World Map**: Mapbox GL-powered 3D globe with choropleth visualizations (GDP, inflation, GINI, exports, life expectancy, military expenditure, democracy index, trade % GDP)
- **Country Analysis**: Deep-dive sections for Politics, Economy, Society, Defense, Technology, International Relations, and Culture
- **Conflict Tracker**: Real-time monitoring of international conflicts with WebSocket updates
- **Historical Mode**: Time-travel visualization of political boundaries (1900-2025, with plans for Roman Empire to post-Cold War)
- **Natural Features**: Rivers, mountain ranges, and peaks overlay
- **Predictive Analysis**: AI-powered forecasting using DeepSeek API
- **User Authentication**: JWT-based auth with favorites system

### Monorepo Structure

```
WL-/
├── backend/          # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── routes/       # Route definitions (REST endpoints)
│   │   ├── controllers/  # Request handlers (thin layer)
│   │   ├── services/     # Business logic (data fetching, processing)
│   │   ├── core/         # Utilities (errors, validation, logger, cache)
│   │   ├── db/           # Prisma client initialization
│   │   ├── websocket/    # Socket.io server for real-time events
│   │   └── middleware/   # Express middleware (auth, logging)
│   └── prisma/           # Database schema and migrations
│
└── frontend/        # React 19 + Vite + TypeScript SPA
    ├── src/
    │   ├── components/   # React components (sections, UI)
    │   ├── services/     # API client services
    │   ├── hooks/        # Custom React hooks (data fetching)
    │   ├── contexts/     # React Context API (global state)
    │   ├── types/        # TypeScript type definitions
    │   └── utils/        # Helper functions
    └── public/           # Static assets
```

**Key Separation:**
- **Backend** (`backend/src`): Pure API logic, no UI concerns
- **Frontend** (`frontend/src`): Pure UI logic, communicates via REST/WebSocket
- **Shared Types**: Currently duplicated (future: consider monorepo package)

---

## B. Backend Architecture (The "Brain")

### 1. Modular Layered Architecture

**Request Flow:**
```
HTTP Request → Route → Controller → Service → Database/External API → Response
```

#### Routes (`backend/src/routes/`)
- **Purpose**: Define REST endpoints and HTTP methods
- **Pattern**: Thin wrappers that delegate to controllers
- **Example Structure:**
```typescript
// country.routes.ts
router.get('/', listCountries);
router.get('/:countryName/basic-info', getCountryInfo);
```

**Available Route Modules:**
- `country.routes.ts` - Country data endpoints
- `conflict.routes.ts` - Conflict tracking
- `economy.routes.ts`, `politics.routes.ts`, `society.routes.ts`, etc. - Section-specific data
- `auth.routes.ts` - Authentication (login, register)
- `favorites.routes.ts` - User favorites management
- `prediction.routes.ts` - AI-powered predictions
- `history.routes.ts` - Historical boundary data
- `natural.routes.ts` - Natural features (rivers, mountains)

#### Controllers (`backend/src/controllers/`)
- **Purpose**: Handle HTTP request/response, validate input, call services
- **Pattern**: Async RequestHandler functions, minimal business logic
- **Error Handling**: Controllers catch service errors and format HTTP responses
- **Example:**
```typescript
export const getCountryInfo: RequestHandler = async (req, res) => {
  const { countryName } = req.params;
  const result = await getCountryBasicInfo(countryName);
  if (result.error) {
    res.status(404).json({ error: result.error });
    return;
  }
  res.json({ data: result.data });
};
```

#### Services (`backend/src/services/`)
- **Purpose**: Business logic, data fetching, external API calls, database queries
- **Pattern**: Pure functions, no Express dependencies
- **Data Sources:**
  - **Prisma ORM**: PostgreSQL database queries
  - **External APIs**: REST Countries API, World Bank API, News API
  - **File System**: Cached JSON files (`backend/public/data/`)
- **Example:**
```typescript
// country.service.ts
export async function getCountryBasicInfo(countryName: string) {
  // 1. Try external API (REST Countries)
  // 2. Fallback to database (Prisma Entity model)
  // 3. Fallback to cache file
  // Returns: { data: CountryBasicInfo | null, error: string | null }
}
```

### 2. Core Utility Belt (`backend/src/core/`)

#### Error Handling (`core/errors/`)
- **AppError Class**: Custom error types with status codes
  - `AppError.badRequest()`, `AppError.notFound()`, `AppError.internal()`, etc.
- **Error Handler Middleware**: Centralized error processing
  - Converts Prisma errors to AppError
  - Logs errors with context
  - Returns JSON responses with error codes
- **Location**: `core/errors/errorHandler.ts`, `core/errors/AppError.ts`

#### Validation (`core/validation/`)
- **Zod Integration**: Type-safe schema validation
- **Pattern**: Middleware that validates `body`, `query`, and `params`
- **Usage:**
```typescript
const schema = z.object({
  body: z.object({ name: z.string().min(1) }),
  params: z.object({ id: z.string().uuid() })
});
router.post('/:id', validate(schema), controller);
```
- **Location**: `core/validation/validate.ts`, `core/validation/schemas/`

#### Logger (`core/logger/`)
- **Winston**: Structured logging with file rotation
- **Log Files**: `backend/logs/error.log`, `combined.log`, `exceptions.log`, `rejections.log`
- **Helpers**: `logRequest()`, `logApiError()`, `logDatabaseOperation()`, `logExternalApiCall()`
- **Location**: `core/logger/index.ts`

#### Cache (`core/cache/`)
- **Memory Cache**: In-memory caching for frequently accessed data
- **Location**: `core/cache/memoryCache.ts`

### 3. Database Schema (Prisma)

**Core Models:**

#### Entity-Relation Graph
- **Entity**: Universal entity model (countries, regions, cities, companies, organizations, etc.)
  - Fields: `id`, `type` (enum), `name`, `slug`, `iso2/iso3`, `lat/lng`, `props` (JSON)
- **Relation**: Relationships between entities (OWNS, OPERATES, INVESTS_IN, etc.)
- **Indicator**: Metadata for economic/social indicators (code, name, unit, frequency)
- **IndicatorValue**: Time-series data (entityId, indicatorCode, year, value)

#### Specialized Models
- **Boundary** + **BoundaryVersion**: GeoJSON boundaries with temporal validity
- **HistoricalPolity** + **HistoricalArea** + **HistoricalAreaGeometry**: Historical political maps
- **NaturalFeature** + **NaturalGeometry**: Rivers, mountain ranges, peaks with LOD (Level of Detail)
- **Conflict** + **ConflictCasualty** + **ConflictFaction** + **ConflictEvent** + **ConflictUpdate** + **ConflictNews**: Conflict tracking system
- **User** + **Favorite**: Authentication and user preferences
- **TradeFlow**: Trade data between entities
- **Ownership**: Ownership relationships (percentages, dates)

**Key Relationships:**
- `Entity` → `IndicatorValue[]` (one-to-many)
- `Entity` → `Boundary[]` (one-to-many)
- `Conflict` → `ConflictFaction[]`, `ConflictEvent[]`, etc. (one-to-many)
- `User` → `Favorite[]` (one-to-many)

**Location**: `backend/prisma/schema.prisma`

### 4. WebSocket Integration (Socket.io)

**Purpose**: Real-time conflict updates broadcast to all connected clients

**Implementation:**
- **Server**: `backend/src/websocket/conflict-socket.ts`
- **Path**: `/ws/conflicts`
- **Events**:
  - `conflict:update` (server → client): Broadcasts conflict changes
  - Payload: `{ id, type: 'created'|'updated'|'deleted'|'status-changed'|'casualty-updated', data? }`

**Usage in Controllers:**
```typescript
import { broadcastConflictUpdate } from '../index'; // Exported from index.ts
broadcastConflictUpdate({ id: conflictId, type: 'updated', data: conflict });
```

**Client Integration**: `frontend/src/hooks/useConflictWebSocket.ts`

---

## C. Frontend Architecture (The "Face")

### 1. Component Structure

#### Main Application Flow
```
AppRouter.tsx
  └── WorldMapView (App.tsx)
      ├── WorldMap (map component)
      ├── LeftSidebar (controls, indicators, history mode)
      ├── CountrySidebar (country detail view)
      └── ConflictTracker (conflict panel)
```

#### Section Components (`frontend/components/`)
Each section is a self-contained component that fetches its own data:

- **BasicInfoSection**: Country metadata (capital, population, area, flags)
- **EconomySection**: GDP, inflation, trade, economic indicators
- **PoliticsSection**: Government type, democracy index, political stability
- **SocietySection**: Demographics, education, health indicators
- **DefenseSection**: Military expenditure, defense indicators
- **TechnologySection**: R&D, innovation metrics
- **InternationalSection**: International organizations, treaties
- **CultureSection**: Cultural indicators
- **HistoricalTrendsSection**: Time-series charts (D3.js)
- **PredictiveAnalysisSection**: AI-powered forecasts

**Pattern**: Sections receive `countryName` prop and use custom hooks to fetch data.

### 2. Global State Management

#### Context API (`frontend/src/contexts/`)
- **AuthContext**: User authentication state
  - `user`, `token`, `isAuthenticated`, `login()`, `register()`, `logout()`
  - Persists token in `localStorage`
  - Location: `contexts/AuthContext.tsx`

**No Redux/Zustand**: Context API is sufficient for current needs.

### 3. Custom Hooks Pattern (`frontend/src/hooks/`)

**Purpose**: Encapsulate data fetching logic, provide loading/error states

**Pattern:**
```typescript
// useCountryBasicInfo.ts
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

**Available Hooks:**
- `useCountryBasicInfo` - Basic country metadata
- `useEconomyData` - Economic indicators
- `usePoliticsData` - Political indicators
- `useSocietyData` - Social indicators
- `useDefenseData` - Defense indicators
- `useTechnologyData` - Technology indicators
- `useInternationalData` - International relations
- `useCultureData` - Cultural data
- `useConflictWebSocket` - Real-time conflict updates

**Data Flow:**
```
Component → Hook → Service → API → Backend → Database/External API
```

### 4. Services Layer (`frontend/src/services/`)

**Purpose**: API client functions, data transformation

**Pattern**: Each service module exports functions that:
1. Call backend API endpoints
2. Transform response data
3. Handle errors

**Example:**
```typescript
// country-basic-info.service.ts
export const countryBasicInfoService = {
  async getCountryBasicInfo(countryName: string): Promise<CountryBasicInfo> {
    const response = await fetch(`/api/countries/${countryName}/basic-info`);
    const json = await response.json();
    return json.data;
  }
};
```

**Service Modules:**
- `country-basic-info.service.ts` - Country metadata
- `economy-service.ts`, `politics-service.ts`, etc. - Section-specific data
- `conflict-api.ts`, `conflict-service.ts` - Conflict data
- `worldbank-gdp.ts`, `worldbank-inflation.ts` - World Bank indicators
- `indicators-db.ts` - Database-backed indicators
- `auth.service.ts` - Authentication
- `favorites.service.ts` - User favorites
- `prediction.service.ts` - AI predictions

### 5. Mapbox GL + D3.js Integration

#### Mapbox GL (`frontend/components/WorldMap.tsx`)
- **Primary Role**: Map rendering, 3D globe, choropleth layers, terrain, 3D buildings
- **Features**:
  - Multiple base map styles (night, light, outdoors, physical)
  - Planet presets (default, nebula, sunset, dawn)
  - Choropleth layers (GDP, inflation, GINI, etc.) via Mapbox `fill` layers
  - Historical boundaries overlay (History Mode)
  - Natural features (rivers, mountain ranges, peaks)
  - Conflict markers
  - Organization highlighting
  - Auto-rotate globe
  - Minimal mode (hide labels/borders)

**Choropleth System:**
- Each metric has a `ChoroplethSpec` with `fillColor` expressions and `legend`
- Only one choropleth active at a time (mutually exclusive)
- Specs stored in `choroplethSpecRef` (Mapbox layer configuration)

#### D3.js Integration
- **Primary Role**: Chart rendering (time-series, projections)
- **Location**: `frontend/components/TimeSeriesChart.tsx`
- **Usage**: Standalone SVG charts, not overlays on map
- **Features**:
  - Line charts for historical trends
  - Projection scenarios (optimistic, base, pessimistic)
  - Responsive sizing

**Coexistence Strategy:**
- **Mapbox**: Handles all map rendering (layers, interactions, 3D)
- **D3.js**: Handles standalone charts in sidebars/sections
- **No Overlap**: D3 is not used for map overlays; Mapbox handles all geographic visualization

### 6. Styling (Tailwind CSS 4)

**Configuration**: `frontend/tailwind.config.js`

**Patterns:**
- Utility-first classes
- Custom CSS files in `frontend/src/styles/` for complex animations
- Framer Motion for component animations (not CSS animations)

**Key Style Files:**
- `index.css` - Global styles
- `sidebar.css` - Sidebar animations
- `conflict-tracker.css` - Conflict panel styles
- `geocoder.css` - Mapbox Geocoder customization

---

## D. Development Rules & Patterns

### 1. Type Safety

#### Shared Types
- **Current State**: Types duplicated between frontend and backend
- **Frontend Types**: `frontend/src/types/index.ts`
- **Backend Types**: `backend/src/types/` (e.g., `country.types.ts`)

**Pattern:**
- Frontend defines interfaces for API responses
- Backend defines types for service returns
- No shared package (monorepo could benefit from `@worldlore/types` package)

#### TypeScript Configuration
- **Backend**: `backend/tsconfig.json` (Node.js target)
- **Frontend**: `frontend/tsconfig.json`, `tsconfig.app.json` (ES2020, React)

### 2. Validation (Zod)

**Backend Pattern:**
```typescript
// 1. Define schema
const createSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    status: z.enum(['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN'])
  })
});

// 2. Apply middleware
router.post('/', validate(createSchema), createController);
```

**Frontend**: No runtime validation (TypeScript compile-time only). Consider adding Zod for form validation.

### 3. Error Handling

#### Backend
- **Controllers**: Catch service errors, return appropriate HTTP status
- **Services**: Return `{ data, error }` objects (never throw for business logic)
- **Global Handler**: `errorHandler` middleware catches all unhandled errors

#### Frontend
- **Hooks**: Set `error` state, components display error messages
- **Services**: Throw errors, hooks catch and set error state

### 4. API Conventions

**REST Endpoints:**
- `/api/countries/:countryName/basic-info` - Country data
- `/api/economy/:countryName` - Economic indicators
- `/api/politics/:countryName` - Political indicators
- `/api/conflicts` - Conflict list
- `/api/auth/login`, `/api/auth/register` - Authentication
- `/api/favorites` - User favorites

**Response Format:**
```typescript
// Success
{ data: T, total?: number }

// Error
{ error: string, code?: string, details?: any }
```

### 5. Code Organization

#### Backend
- **One file per route module**: `country.routes.ts`, `conflict.routes.ts`
- **One file per controller module**: `country.controller.ts`, `conflict.controller.ts`
- **One file per service module**: `country.service.ts`, `conflict.service.ts`

#### Frontend
- **One component per file**: `CountrySidebar.tsx`, `EconomySection.tsx`
- **One hook per file**: `useCountryBasicInfo.ts`, `useEconomyData.ts`
- **One service per domain**: `country-basic-info.service.ts`, `economy-service.ts`

### 6. Naming Conventions

- **Files**: `kebab-case.ts` / `PascalCase.tsx` (components)
- **Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE` or `camelCase` (context-dependent)

---

## E. Key Data Flows

### 1. Country Selection Flow
```
User clicks country on map
  → WorldMap.onCountrySelect(countryName)
  → App.tsx.handleCountrySelect()
  → setSelectedCountry(countryName)
  → CountrySidebar receives countryName
  → Sections use hooks (useEconomyData, etc.)
  → Hooks call services
  → Services fetch from backend
  → Backend queries database/external APIs
  → Data flows back through chain
  → Components render
```

### 2. Choropleth Toggle Flow
```
User toggles GDP layer in LeftSidebar
  → handleToggleGdpLayer(true)
  → setGdpEnabled(true)
  → useEffect detects change
  → fetchGdpLatestByIso3() (service)
  → buildGdpChoropleth() (transform data)
  → mapRef.current.setChoropleth('gdp', spec)
  → WorldMap updates Mapbox fill layer
  → Map displays choropleth
```

### 3. Conflict Update Flow (WebSocket)
```
Backend conflict controller updates conflict
  → broadcastConflictUpdate({ id, type: 'updated', data })
  → Socket.io server emits 'conflict:update'
  → Frontend useConflictWebSocket hook receives event
  → Updates local conflict state
  → ConflictTracker re-renders with new data
  → WorldMap updates conflict markers if needed
```

### 4. History Mode Flow
```
User enables History Mode in LeftSidebar
  → handleToggleHistoryMode(true)
  → mapRef.current.setHistoryEnabled(true)
  → WorldMap fetches historical boundaries for year
  → Backend history service queries HistoricalArea/HistoricalAreaGeometry
  → Returns GeoJSON for selected year
  → WorldMap adds overlay layer
  → Map displays historical boundaries
```

---

## F. External Dependencies

### Backend
- **express**: Web framework
- **@prisma/client**: ORM
- **socket.io**: WebSocket server
- **zod**: Validation
- **winston**: Logging
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **axios**: HTTP client for external APIs

### Frontend
- **react** (19.1.0): UI framework
- **react-dom**: React rendering
- **mapbox-gl**: Map rendering
- **d3**: Chart visualization
- **framer-motion**: Animations
- **socket.io-client**: WebSocket client
- **react-router-dom**: Routing
- **lucide-react**: Icons
- **tailwindcss**: Styling

---

## G. Environment Variables

### Backend (`backend/.env`)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: `development` | `production`
- `LOG_LEVEL`: Winston log level

### Frontend (`frontend/.env`)
- `VITE_API_URL`: Backend API URL (default: `http://localhost:3001`)

---

## H. Database Migrations

**Location**: `backend/prisma/migrations/`

**Commands:**
```bash
npm run prisma:migrate    # Create migration
npm run prisma:generate  # Generate Prisma Client
npm run prisma:studio    # Open Prisma Studio
npm run db:seed          # Seed database
```

---

## I. Testing Strategy

**Current State**: Minimal testing infrastructure
- `frontend/tests/`: Basic API/service tests
- **No E2E tests**: Consider Playwright (already in devDependencies)

**Recommendation**: Add unit tests for services, integration tests for API endpoints.

---

## J. Deployment Considerations

### Backend
- **Build**: `npm run build` (TypeScript → JavaScript in `dist/`)
- **Start**: `npm start` (runs `dist/index.js`)
- **Database**: Requires PostgreSQL instance
- **Environment**: Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`

### Frontend
- **Build**: `npm run build` (Vite production build)
- **Output**: `frontend/dist/` (static files)
- **Serve**: Any static file server (Nginx, Vercel, Netlify)

---

## K. Current Session Goals

<!-- This section should be updated by AI agents at the start of each session -->

### Active Tasks
- [ ] _No active tasks logged_

### Completed Tasks
- [ ] _No completed tasks logged_

### Blocked/Issues
- [ ] _No blockers logged_

---

## L. Quick Reference

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
cd backend && npm run dev          # Development server
cd backend && npm run build        # Build TypeScript
cd backend && npm run prisma:studio # Database GUI

# Frontend
cd frontend && npm run dev         # Development server
cd frontend && npm run build        # Production build

# Root
./start-servers.sh                  # Start both servers (Unix)
./start-servers.ps1                # Start both servers (Windows)
```

### Key Endpoints
- `GET /api/countries/:countryName/basic-info` - Country metadata
- `GET /api/economy/:countryName` - Economic indicators
- `GET /api/conflicts` - Conflict list
- `POST /api/auth/login` - User login
- `GET /db/health` - Database health check

---

**Last Updated**: Generated during initial analysis
**Maintainer**: Update this file when architectural changes occur


























