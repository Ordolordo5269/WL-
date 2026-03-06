# WorldLore

Plataforma de análisis geopolítico — conflictos, indicadores por país e insights generados por IA.

## Stack

- **Frontend:** Vite + React + TypeScript + Mapbox GL
- **Backend:** Express + TypeScript (BFF)
- **Base de datos:** Prisma + PostgreSQL (remoto)
- **Validación:** Zod (compartida frontend/backend)
- **Logs:** Pino

## Estructura del proyecto

```
worldlore/
├── apps/
│   ├── web/                 # Frontend: Vite + React + TS
│   │   ├── src/
│   │   │   ├── app/         # Providers, router, layouts
│   │   │   ├── pages/       # Páginas
│   │   │   ├── features/    # map, conflicts, country, dashboard, insights
│   │   │   ├── lib/         # http, env, query client
│   │   │   └── styles/      # tokens, reset, globals
│   │   └── package.json
│   └── api/                 # Backend: Express + TS
│       ├── prisma/          # Schema y migraciones
│       ├── src/
│       │   ├── config/      # env, logger
│       │   ├── middleware/   # validate, error, rate-limit
│       │   ├── routes/      # Rutas HTTP
│       │   ├── modules/     # conflicts, countries, indicators, insights, auth
│       │   ├── integrations/# World Bank, ACLED, UCDP, LLMs
│       │   ├── websocket/   # Socket.IO
│       │   ├── jobs/        # Ingestion workers + scheduler
│       │   └── db/          # Prisma client + helpers
│       └── package.json
├── packages/
│   └── contracts/           # Tipos + Zod schemas compartidos FE/BE
├── .github/workflows/ci.yml
├── package.json             # npm workspaces raíz
├── tsconfig.base.json
├── eslint.config.js
└── README.md
```

## Prerrequisitos

- **Node.js** 20 o superior — [nodejs.org](https://nodejs.org/)
- **npm** (viene con Node.js)
- Acceso a una base de datos **PostgreSQL** remota

## Instalación

```bash
git clone https://github.com/Ordolordo5269/WL-.git
cd WL-
npm install
```

## Variables de entorno

Copiar los archivos de ejemplo y rellenar con datos reales:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Ver cada `.env.example` para las variables necesarias. **Nunca subir `.env` a Git.**

## Desarrollo

```bash
# Iniciar backend + frontend
npm run dev

# O por separado:
npm run dev:api      # Backend  → http://localhost:3000
npm run dev:web      # Frontend → http://localhost:5173
```

| Servicio  | URL                    |
|-----------|------------------------|
| Frontend  | http://localhost:5173  |
| API       | http://localhost:3000  |
| API Docs  | http://localhost:3000/api/docs |
| Health    | http://localhost:3000/api/health |

## Scripts útiles

**Desde la raíz:**

```bash
npm run dev          # Backend + frontend en paralelo
npm run build        # Compila todos los workspaces
npm run lint         # Lint en todo el monorepo
```

**Backend** (`apps/api`):

```bash
npm run dev          # Desarrollo con recarga automática
npm run build        # Compilar
npm start            # Ejecutar build
npm run prisma:studio # Interfaz visual de la BD
```

**Frontend** (`apps/web`):

```bash
npm run dev          # Desarrollo
npm run build        # Build para producción
npm run preview      # Previsualizar la build
```

## Git workflow

```bash
# 1. Siempre partir de main actualizado
git checkout main
git pull origin main

# 2. Crear rama para tu tarea
git checkout -b feature/nombre-de-la-tarea

# 3. Commits pequeños y claros
git add .
git commit -m "qué hiciste exactamente"

# 4. Subir y abrir Pull Request en GitHub
git push origin feature/nombre-de-la-tarea
```

**Regla:** nunca trabajar en `main` directamente. Siempre PR + revisión.

## Seguridad

- Helmet activado (headers HTTP seguros)
- CORS con whitelist explícita (nunca `*` en producción)
- Rate-limit global + especial para `/auth`
- Zod valida toda entrada en cada endpoint
- JWT_SECRET fuerte y rotado
- Mapbox token restringido por URL
- `.env` nunca en Git
- Pino para logs, nunca `console.log`

## Licencia

MIT
