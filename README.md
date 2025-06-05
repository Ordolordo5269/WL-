# Worldlore

This project contains a simple Express backend and a React + TypeScript frontend using Vite and Tailwind CSS.

## Requirements
- Node.js 18+

## Setup

```bash
npm install
cd public && npm install
```

## Development

### Backend
Run the backend with ts-node-dev:
```bash
npm run dev
```

### Frontend
In another terminal:
```bash
npm run client
```

Then open [http://localhost:5173](http://localhost:5173).

## Mapbox
The Mapbox token is stored in `.env` and `public/.env` for the frontend. The map style uses `mapbox://styles/mapbox/navigation-night-v1`.

## Features
- Interactive 3D globe built with Mapbox GL JS.
- Search bar to locate countries in English using the Mapbox Geocoding API.
