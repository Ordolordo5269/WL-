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

// ─── Physics constants ──────────────────────────────────────────────
const RE = 6371;             // Earth radius km
const GM = 398600.4418;      // Earth gravitational parameter km³/s²
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Approximate Sun position in ECI (simplified solar model, ~1° accuracy) */
function sunPositionEci(date: Date): { x: number; y: number; z: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
  const gR = g * DEG2RAD;
  const eclipticLon = (L + 1.915 * Math.sin(gR) + 0.020 * Math.sin(2 * gR)) * DEG2RAD;
  const obliquity = 23.439 * DEG2RAD;
  const AU = 149597870.7;
  return {
    x: AU * Math.cos(eclipticLon),
    y: AU * Math.cos(obliquity) * Math.sin(eclipticLon),
    z: AU * Math.sin(obliquity) * Math.sin(eclipticLon),
  };
}

/** Cylindrical shadow model — returns true if satellite is sunlit */
function isSunlit(satEci: satellite.EciVec3<number>, sunEci: { x: number; y: number; z: number }): boolean {
  const sunDist = Math.sqrt(sunEci.x ** 2 + sunEci.y ** 2 + sunEci.z ** 2);
  const ux = sunEci.x / sunDist, uy = sunEci.y / sunDist, uz = sunEci.z / sunDist;
  const dot = satEci.x * ux + satEci.y * uy + satEci.z * uz;
  if (dot > 0) return true; // sunward side
  const px = satEci.x - dot * ux, py = satEci.y - dot * uy, pz = satEci.z - dot * uz;
  return Math.sqrt(px ** 2 + py ** 2 + pz ** 2) > RE;
}

// ─── Helpers ────────────────────────────────────────────────────────
function propagateAll(): PositionResult {
  const now = new Date();
  const gmst = satellite.gstime(now);
  const features: any[] = [];

  // Propagate +1s for heading calculation
  const future = new Date(now.getTime() + 1000);
  const gmstFuture = satellite.gstime(future);

  // Sun position for shadow calculation (same for all sats this tick)
  const sunEci = sunPositionEci(now);

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    try {
      const pv = satellite.propagate(rec.satrec, now);
      if (!pv.position || typeof pv.position === 'boolean') continue;
      const posEci = pv.position as satellite.EciVec3<number>;
      const gd = satellite.eciToGeodetic(posEci, gmst);
      const lon = satellite.degreesLong(gd.longitude);
      const lat = satellite.degreesLat(gd.latitude);
      const alt = gd.height;

      // Skip invalid coordinates
      if (isNaN(lon) || isNaN(lat)) continue;

      // Calculate heading from current → +1s position
      let heading = 0;
      try {
        const pv2 = satellite.propagate(rec.satrec, future);
        if (pv2.position && typeof pv2.position !== 'boolean') {
          const gd2 = satellite.eciToGeodetic(pv2.position as satellite.EciVec3<number>, gmstFuture);
          const lon2 = satellite.degreesLong(gd2.longitude);
          const lat2 = satellite.degreesLat(gd2.latitude);
          if (!isNaN(lon2) && !isNaN(lat2)) {
            const dLon = (lon2 - lon) * DEG2RAD;
            const lat1R = lat * DEG2RAD;
            const lat2R = lat2 * DEG2RAD;
            const y = Math.sin(dLon) * Math.cos(lat2R);
            const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon);
            heading = ((Math.atan2(y, x) * RAD2DEG) + 360) % 360;
          }
        }
      } catch { /* use default heading 0 */ }

      // Real velocity from ECI velocity vector (km/s)
      let velocity = 0;
      if (pv.velocity && typeof pv.velocity !== 'boolean') {
        const vel = pv.velocity as satellite.EciVec3<number>;
        velocity = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
      }

      // Specific orbital energy: ε = v²/2 - GM/r (km²/s²)
      const r = RE + alt;
      const energy = (velocity ** 2) / 2 - GM / r;

      // Solar visibility
      const sunlit = isSunlit(posEci, sunEci);

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
          heading: Math.round(heading),
          period: Math.round((2 * Math.PI) / rec.satrec.no),
          inclination: +(rec.satrec.inclo * RAD2DEG).toFixed(1),
          apogee: Math.round(rec.satrec.alta * RE),
          perigee: Math.round(rec.satrec.altp * RE),
          velocity: +velocity.toFixed(2),
          energy: +energy.toFixed(1),
          sunlit,
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
