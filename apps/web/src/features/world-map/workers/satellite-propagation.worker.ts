/**
 * Web Worker for SGP4 satellite position propagation.
 * Offloads heavy computation (~7000 satellites every 2s) from the main thread.
 */
import * as satellite from 'satellite.js';

// ─── Types ──────────────────────────────────────────────────────────
export type SatCategory = 'starlink' | 'military' | 'navigation' | 'weather' | 'stations' | 'classified';

interface SatRecord {
  satrec: satellite.SatRec;
  name: string;
  noradId: number;
  category: SatCategory;
  objectId: string;
  country: string;
  constellation: string;
}

interface AddMessage {
  type: 'add';
  category: SatCategory;
  ommData: any[];
}

interface RemoveMessage {
  type: 'remove';
  category: SatCategory;
}

interface TickMessage {
  type: 'tick';
}

interface GroundTrackMessage {
  type: 'groundtrack';
  noradId: number;
}

type WorkerMessage = AddMessage | RemoveMessage | TickMessage | GroundTrackMessage;

interface PositionResult {
  type: 'positions';
  features: any[];
}

interface GroundTrackResult {
  type: 'groundtrack';
  noradId: number;
  coordinates: [number, number][];
}

// ─── State ──────────────────────────────────────────────────────────
const records: SatRecord[] = [];

// ─── Helpers ────────────────────────────────────────────────────────
function propagateAll(): PositionResult {
  const now = new Date();
  const gmst = satellite.gstime(now);
  const features: any[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    try {
      const pv = satellite.propagate(rec.satrec, now);
      if (!pv.position || typeof pv.position === 'boolean') continue;
      const gd = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
      const lon = satellite.degreesLong(gd.longitude);
      const lat = satellite.degreesLat(gd.latitude);
      const alt = gd.height;

      // Skip invalid coordinates
      if (isNaN(lon) || isNaN(lat)) continue;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          name: rec.name,
          noradId: rec.noradId,
          category: rec.category,
          alt: Math.round(alt),
          objectId: rec.objectId,
          country: rec.country,
          constellation: rec.constellation,
        },
      });
    } catch {
      // Skip satellites with propagation errors (decayed, bad TLE, etc.)
    }
  }

  return { type: 'positions', features };
}

function computeGroundTrack(noradId: number): GroundTrackResult {
  const rec = records.find((r) => r.noradId === noradId);
  const coordinates: [number, number][] = [];

  if (!rec) return { type: 'groundtrack', noradId, coordinates };

  // Compute mean motion to get orbital period
  // Mean motion is in rev/day in OMM data, satrec stores it in rad/min
  const meanMotionRadMin = rec.satrec.no; // rad/min
  const periodMin = (2 * Math.PI) / meanMotionRadMin; // minutes
  const periodMs = periodMin * 60 * 1000;

  // Sample 1.5 orbits centered on now — ensures full visible coverage with overlap
  const now = Date.now();
  const sampleInterval = 20_000; // 20s for smoother curve
  const span = periodMs * 1.5;
  const startTime = now - span / 2;
  const totalSamples = Math.ceil(span / sampleInterval) + 2;

  for (let i = 0; i < totalSamples; i++) {
    const t = new Date(startTime + i * sampleInterval);
    try {
      const gmst = satellite.gstime(t);
      const pv = satellite.propagate(rec.satrec, t);
      if (!pv.position || typeof pv.position === 'boolean') continue;
      const gd = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
      const lon = satellite.degreesLong(gd.longitude);
      const lat = satellite.degreesLat(gd.latitude);
      if (!isNaN(lon) && !isNaN(lat)) {
        coordinates.push([lon, lat]);
      }
    } catch {
      // skip
    }
  }

  return { type: 'groundtrack', noradId, coordinates };
}

// ─── Message handler ────────────────────────────────────────────────
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'add': {
      // Remove existing records for this category first
      for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].category === msg.category) records.splice(i, 1);
      }
      // Build set of NORAD IDs already present from OTHER categories (dedup)
      const existingIds = new Set(records.map(r => r.noradId));
      // Parse TLE lines into satrecs
      for (const entry of msg.ommData) {
        try {
          if (!entry.TLE_LINE1 || !entry.TLE_LINE2) continue;
          const nid = entry.NORAD_CAT_ID || 0;
          // Skip if this satellite already exists in another category
          if (existingIds.has(nid)) continue;
          const satrec = satellite.twoline2satrec(entry.TLE_LINE1, entry.TLE_LINE2);
          records.push({
            satrec,
            name: entry.OBJECT_NAME || 'UNKNOWN',
            noradId: nid,
            category: msg.category,
            objectId: entry.OBJECT_ID || '',
            country: entry.COUNTRY || '',
            constellation: entry.CONSTELLATION || '',
          });
        } catch {
          // Skip unparseable TLEs
        }
      }
      // Immediately propagate and send positions after adding
      self.postMessage(propagateAll());
      break;
    }

    case 'remove': {
      for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].category === msg.category) records.splice(i, 1);
      }
      self.postMessage(propagateAll());
      break;
    }

    case 'tick': {
      self.postMessage(propagateAll());
      break;
    }

    case 'groundtrack': {
      self.postMessage(computeGroundTrack(msg.noradId));
      break;
    }
  }
};
