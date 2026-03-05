# WorldLore OSINT Frontend Plan

## Left Sidebar Structure

```
Conflict & Security
Governance & Diplomacy
Economic Coercion
Humanitarian & Disaster
Cyber & Info
───────────────────
Live Feeds              (YT cameras + news streams)
───────────────────
History Mode
Physical Layers
Statistics
International Orgs
Compare Countries
Dashboard
Settings
About
```

Each macro-layer opens its own panel with filtered events, active alerts, and a toggle to show/hide its markers on the map.

---

## 5 Macro-Layers (from 12 OSINT categories)

| Macro-layer             | Map purpose                                | Categories                                                                 | Color    | Icon suggestion     |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------------------- | -------- | ------------------- |
| Conflict & Security     | Kinetic events / physical coercion         | `COUP_REGIME_CHANGE`, `MILITARY_MOVEMENT`, `TERRORISM`, `BORDER_INCIDENT`  | Red      | Crosshair / Shield  |
| Governance & Diplomacy  | Institutional changes + formal diplomacy   | `ELECTION`, `TREATY`, `OFFICIAL_DECLARATION`                               | Blue     | Landmark / Scale    |
| Economic Coercion       | Economic measures with geopolitical impact | `SANCTIONS`, `EMBARGO`                                                     | Amber    | Ban / DollarSign    |
| Humanitarian & Disaster | Non-military shocks with regional impact   | `NATURAL_DISASTER`, `HUMANITARIAN_CRISIS`                                  | Teal     | Heart / AlertTriangle |
| Cyber & Info            | Attacks on state infrastructure (non-kinetic) | `CYBER_ATTACK`                                                          | Purple   | Wifi / ShieldAlert  |

---

## Zoom-Based Loading (anti-Christmas-tree)

Prevents visual overload by progressively loading events based on zoom level:

```
Zoom 0-3   (full globe):     CRITICAL only — large points, few markers
Zoom 4-6   (continent):      + HIGH — loaded by visible region
Zoom 7-9   (country/region): + ELEVATED — clustered by proximity
Zoom 10+   (local):          Everything — MODERATE + LOW appear
```

Implementation: use `map.getBounds()` on each viewport change to query only events within bounds + filter by severity based on current zoom level. This also reduces Supabase queries.

---

## Severity System (5 levels)

| Level    | When                                        | Example                                | Map marker           |
| -------- | ------------------------------------------- | -------------------------------------- | -------------------- |
| CRITICAL | Immediate threat, global impact             | Coup, invasion, NBC attack             | Red pulsing          |
| HIGH     | Significant escalation, regional impact     | Massive deployment, sanctions on power | Orange               |
| ELEVATED | Developing situation                        | Widespread protests, confirmed cyber   | Yellow               |
| MODERATE | Relevant event, localized                   | Disputed election, military exercise   | Blue                 |
| LOW      | Informational                               | Treaty signed, diplomatic statement    | Gray                 |

Auto-classification by: keywords, ACLED/GDELT type, reported casualties, countries involved (nuclear powers = +1 level), frequency in last 30 days.

---

## Live Feeds Section

### YouTube Live Cameras
Embedded via iframe with `?autoplay=1&mute=1`. Static config with channels:

- Kyiv, Ukraine
- Tel Aviv, Israel
- Tehran, Iran
- Taipei, Taiwan
- Gaza / Rafah border
- Moscow, Russia
- Seoul / DMZ area
- Strait of Hormuz (if available)

### Live News Streams
- Al Jazeera English
- France 24
- DW News
- Sky News
- WION
- Reuters TV (if available)

### UX Approach
**Picture-in-Picture floating window** over the map (draggable, resizable) + stream list in sidebar panel. Best balance between video visibility and map space.

---

## Panel Structure per Macro-Layer

Each macro-layer panel includes:

1. **Alert bar** — Active alerts (severity >= HIGH) for this layer, pulsing indicator
2. **Event feed** — Chronological list of osint_events filtered by this layer's categories
3. **Filters** — Severity, region, date range, source, text search
4. **Map toggle** — Show/hide this layer's markers on the globe
5. **Click interaction** — Click event card -> fly to location on map + popup

---

## Integration with Existing Conflict Tracker

The current Conflict Tracker (curated wars with factions, allies, timeline) becomes part of **Conflict & Security** layer:

- Curated conflicts remain as "pinned" items at the top of the panel
- OSINT events from the scraper appear below, linked by `country_iso3`
- ConflictDetailCard enriched with scraper events (replaces direct ACLED fetch)
- News tab replaced by scraper's RSS/NewsAPI events for that conflict

---

## Supabase DB Schema (Scraper Output)

### osint_events (main table)

```sql
id              uuid PRIMARY KEY,
source          text,           -- gdelt, acled, newsapi, reliefweb, rss, ofac, eu_sanctions, wikidata
source_id       text,           -- original ID (for dedup)
category        text,           -- one of 12 categories
title           text,
summary         text,
severity        text,           -- CRITICAL / HIGH / ELEVATED / MODERATE / LOW
country_iso3    text,           -- maps to Entity.iso3 in WorldLore
country_iso2    text,
country_name    text,
region          text,
lat             float8,
lng             float8,
event_date      timestamptz,
url             text,           -- link to original source
raw_data        jsonb,          -- full payload
tags            text[],
is_alert        boolean,
created_at      timestamptz,
hash            text UNIQUE     -- SHA256 for dedup
```

### osint_alerts (severity >= HIGH)

```sql
id                  uuid PRIMARY KEY,
event_id            uuid REFERENCES osint_events(id),
alert_type          text,
severity            text,
title               text,
description         text,
affected_countries  text[],
is_active           boolean,
created_at          timestamptz,
resolved_at         timestamptz NULL
```

### osint_sources (source health)

```sql
id              text PRIMARY KEY,   -- source name
last_fetch      timestamptz,
status          text,               -- ok / error / rate_limited
events_count    int,
error_log       text NULL
```

### osint_scrape_logs (run history)

```sql
id                  uuid PRIMARY KEY,
started_at          timestamptz,
finished_at         timestamptz,
events_fetched      int,
events_inserted     int,
events_duplicated   int,
errors              jsonb
```

---

## DB Schema Review Notes

The schema is solid. Suggestions for future consideration:

1. **Add `macro_layer` column** to `osint_events` — precomputed from category, avoids frontend mapping logic on every query. Values: `conflict_security`, `governance_diplomacy`, `economic_coercion`, `humanitarian_disaster`, `cyber_info`.

2. **Add index on `(severity, event_date)`** — the zoom-based loading queries will filter by severity constantly.

3. **Add index on `(country_iso3, category)`** — for linking events to existing conflicts.

4. **Add spatial index** — if Supabase/PostGIS is enabled, use `geography` type for lat/lng instead of separate float8 columns. Enables `ST_DWithin` queries for viewport-based loading.

5. **Consider `expires_at` on osint_alerts** — some alerts auto-resolve (elections end, exercises conclude). A TTL field avoids stale alerts.

6. **Add `confidence` float to osint_events** — the classifier's certainty score. Useful for filtering noise later.

7. **Partition `osint_events` by month** — if volume grows (GDELT alone can push thousands/day), time-based partitioning keeps queries fast.

---

## Data Flow: Scraper -> Frontend

```
Scraper (Python, every 6h)
    |
    v
Supabase (PostgreSQL)
    |  osint_events, osint_alerts, osint_sources, osint_scrape_logs
    |
    v
Frontend Service (osint-api.ts)
    |  Queries via Supabase JS client (anon key)
    |  Filters: macro_layer, severity, bounds (viewport), date range
    |  Caching: 5-min TTL for feeds, 1-min for alerts
    |
    v
React Components
    |  5 macro-layer panels + map layers
    |
    v
Mapbox GL
    |  GeoJSON sources per macro-layer
    |  Zoom-interpolated visibility
    |  Click -> popup + panel highlight
```

---

## Implementation Phases

### Phase 1: Types + Supabase Service
- New `OsintEvent`, `OsintAlert` types in `types/index.ts`
- New `osint-api.ts` service with Supabase client
- Viewport-aware query function (bounds + severity filter)

### Phase 2: First Macro-Layer Panel (Conflict & Security)
- Panel component with event feed, filters, alert bar
- Map layer with red markers, zoom-based visibility
- Integration with existing ConflictTracker (curated conflicts as pinned items)

### Phase 3: Remaining 4 Macro-Layer Panels
- Governance & Diplomacy, Economic Coercion, Humanitarian & Disaster, Cyber & Info
- Each with its own color scheme and map layer
- Shared component structure (extract base panel)

### Phase 4: Live Feeds
- YouTube embed panel with PiP floating window
- Channel config (cameras + news streams)
- Mute/unmute, channel switching, minimize

### Phase 5: Left Sidebar Integration
- Add 5 macro-layer items + Live Feeds to sidebar menu
- Toggle map layers per macro-layer
- Breaking alert banner for CRITICAL events

### Phase 6: Enrich Existing Features
- Replace ACLED direct fetch with scraper data in ConflictDetailCard
- Replace News tab with scraper RSS/NewsAPI events
- Add counter bar (total events, active alerts, countries affected)
- Source health indicator (from osint_sources table)
