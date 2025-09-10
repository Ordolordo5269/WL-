# WorldLore Server (Wikidata Events)

## Run

1. Install deps
```
npm install
```
2. Env
```
PORT=3001
WIKIDATA_USER_AGENT="WorldLore/1.0 (contact@example.com)"
CACHE_TTL_SECONDS=600
LOG_LEVEL=info
```
3. Start
```
npm run dev
```

## Endpoint
- GET `/api/events/wikidata?days=7&types=protest,conflict&bbox=minLon,minLat,maxLon,maxLat`
- Returns GeoJSON FeatureCollection

## Notes
- Uses SQLite (better-sqlite3) cache or memory fallback
- Subscribes to Wikimedia EventStreams to invalidate cache on edits
- Strict zod validation, 15s timeout, retries with backoff

