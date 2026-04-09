/**
 * Web Worker for air traffic position interpolation.
 * Receives snapshots from OpenSky (every 15s) and dead-reckons positions every 2s.
 */

// ─── Types ──────────────────────────────────────────────────────────
interface AircraftRecord {
  lon: number;
  lat: number;
  altitude: number;
  velocity: number;   // m/s
  heading: number;    // degrees clockwise from north
  callsign: string;
  origin_country: string;
  icao24: string;
  lastUpdate: number; // ms timestamp
  trail: [number, number][]; // recent positions [lon, lat]
}

interface SnapshotMessage {
  type: 'snapshot';
  features: any[];
}

interface TickMessage {
  type: 'tick';
}

type WorkerMessage = SnapshotMessage | TickMessage;

// ─── State ──────────────────────────────────────────────────────────
const aircraft = new Map<string, AircraftRecord>();
const MAX_TRAIL_POINTS = 8;
const EARTH_RADIUS = 6_371_000; // meters
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
// Stale threshold: remove aircraft not seen in 60 seconds
const STALE_MS = 60_000;

// ─── Helpers ────────────────────────────────────────────────────────

function interpolatePositions(): void {
  const now = Date.now();
  const features: any[] = [];
  const trails: any[] = [];

  for (const [key, ac] of aircraft) {
    // Remove stale aircraft
    if (now - ac.lastUpdate > STALE_MS) {
      aircraft.delete(key);
      continue;
    }

    // Dead-reckoning: extrapolate from last known position
    const dt = (now - ac.lastUpdate) / 1000; // seconds
    const headingRad = ac.heading * DEG2RAD;
    const latRad = ac.lat * DEG2RAD;

    const dLat = (ac.velocity * Math.cos(headingRad) * dt) / EARTH_RADIUS * RAD2DEG;
    const dLon = (ac.velocity * Math.sin(headingRad) * dt) / (EARTH_RADIUS * Math.cos(latRad)) * RAD2DEG;

    const newLat = ac.lat + dLat;
    const newLon = ac.lon + dLon;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [newLon, newLat] },
      properties: {
        callsign: ac.callsign,
        origin_country: ac.origin_country,
        altitude: ac.altitude,
        velocity: ac.velocity,
        heading: ac.heading,
        icao24: ac.icao24,
        type: 'aircraft',
      },
    });

    // Build trail LineString if we have enough points
    if (ac.trail.length >= 2) {
      // Add current interpolated position to trail for rendering
      const trailCoords = [...ac.trail, [newLon, newLat]];
      trails.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: trailCoords },
        properties: { callsign: ac.callsign, altitude: ac.altitude },
      });
    }
  }

  self.postMessage({ type: 'positions', features });
  if (trails.length > 0) {
    self.postMessage({ type: 'trails', features: trails });
  }
}

// ─── Message handler ────────────────────────────────────────────────
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'snapshot': {
      const now = Date.now();
      const seenKeys = new Set<string>();

      for (const f of msg.features) {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;

        const key = props.icao24 || props.callsign || `${coords[0]},${coords[1]}`;
        seenKeys.add(key);

        const existing = aircraft.get(key);
        if (existing) {
          // Push previous position to trail before updating
          existing.trail.push([existing.lon, existing.lat]);
          if (existing.trail.length > MAX_TRAIL_POINTS) {
            existing.trail.shift();
          }
          // Update with fresh data
          existing.lon = coords[0];
          existing.lat = coords[1];
          existing.altitude = props.altitude ?? existing.altitude;
          existing.velocity = props.velocity ?? existing.velocity;
          existing.heading = props.heading ?? existing.heading;
          existing.callsign = props.callsign ?? existing.callsign;
          existing.origin_country = props.origin_country ?? existing.origin_country;
          existing.lastUpdate = now;
        } else {
          aircraft.set(key, {
            lon: coords[0],
            lat: coords[1],
            altitude: props.altitude ?? 0,
            velocity: props.velocity ?? 0,
            heading: props.heading ?? 0,
            callsign: props.callsign ?? '',
            origin_country: props.origin_country ?? '',
            icao24: key,
            lastUpdate: now,
            trail: [],
          });
        }
      }

      // Remove aircraft no longer in snapshot (landed or out of range)
      for (const key of aircraft.keys()) {
        if (!seenKeys.has(key)) {
          aircraft.delete(key);
        }
      }

      // Immediately emit current positions after snapshot
      interpolatePositions();
      break;
    }

    case 'tick': {
      interpolatePositions();
      break;
    }
  }
};
