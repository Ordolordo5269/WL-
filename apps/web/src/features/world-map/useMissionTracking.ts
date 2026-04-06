import { useState, useCallback, useRef, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ───────────────────────────────────────────────────────────
export interface MissionCrewMember {
  name: string;
  role: string;
  agency: string;
  photo: string | null;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  agency: string;
  agencyLogo: string | null;
  agencyCountryCode: string;
  status: 'in-flight' | 'upcoming' | 'completed';
  statusDescription: string;
  missionType: string;
  launchDate: string | null;
  landingDate: string | null;
  crew: MissionCrewMember[];
  missionPatch: string | null;
  image: string | null;
  vehicle: string | null;
  launchPad: {
    name: string;
    lat: number | null;
    lng: number | null;
  } | null;
  landingPad: {
    name: string;
    lat: number | null;
    lng: number | null;
  } | null;
  orbit: string | null;
  // Extended LL2 fields
  webcastLive: boolean;
  vidUrls: { title: string; url: string }[];
  infoUrls: { title: string; url: string }[];
  probability: number | null;
  hashtag: string | null;
  infographic: string | null;
  padDescription: string | null;
  padWikiUrl: string | null;
  agencySuccessRate: number | null;
  agencyConsecutiveSuccesses: number | null;
  agencyTotalLaunches: number | null;
  padCountryCode: string | null;
  padLocationName: string | null;
}

// ─── Display helpers ────────────────────────────────────────────────
export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

const ORBIT_COLORS: Record<string, string> = {
  'Low Earth Orbit': '#4488ff',
  'Sun-Synchronous Orbit': '#ff8844',
  'Geostationary Transfer Orbit': '#ffaa22',
  'Geostationary Orbit': '#ffaa22',
  'Geosynchronous Orbit': '#ffaa22',
  'Medium Earth Orbit': '#44aa88',
  'Lunar Orbit': '#aa44ff',
  'Trans-Lunar Injection': '#aa44ff',
  'Polar Orbit': '#44ddff',
};
const DEFAULT_ORBIT_COLOR = '#888888';

export function getOrbitColor(orbit: string | null): string {
  if (!orbit) return DEFAULT_ORBIT_COLOR;
  return ORBIT_COLORS[orbit] ?? DEFAULT_ORBIT_COLOR;
}

export function getOrbitShortName(orbit: string | null): string {
  if (!orbit) return '';
  if (orbit.includes('Low Earth')) return 'LEO';
  if (orbit.includes('Sun-Synchronous')) return 'SSO';
  if (orbit.includes('Geostationary Transfer')) return 'GTO';
  if (orbit.includes('Geostationary') || orbit.includes('Geosynchronous')) return 'GEO';
  if (orbit.includes('Medium Earth')) return 'MEO';
  if (orbit.includes('Lunar')) return 'LUN';
  if (orbit.includes('Trans-Lunar')) return 'TLI';
  if (orbit.includes('Polar')) return 'POL';
  return orbit.length > 5 ? orbit.slice(0, 4) : orbit;
}

// ─── Time helpers ────────────────────────────────────────────────────
export function getMissionTimeInfo(mission: Mission): {
  isLive: boolean;
  dayOfMission: number;
  totalDays: number | null;
  countdown: string | null;
  elapsed: string | null;
  progress: number; // 0-1
} {
  const now = Date.now();
  const launch = mission.launchDate ? new Date(mission.launchDate).getTime() : null;
  const landing = mission.landingDate ? new Date(mission.landingDate).getTime() : null;

  if (mission.status === 'in-flight' && launch) {
    const elapsedMs = now - launch;
    const dayOfMission = Math.max(1, Math.ceil(elapsedMs / (24 * 60 * 60 * 1000)));
    const totalDays = landing ? Math.ceil((landing - launch) / (24 * 60 * 60 * 1000)) : null;
    const progress = landing ? Math.min(1, Math.max(0, (now - launch) / (landing - launch))) : 0;
    return {
      isLive: true,
      dayOfMission,
      totalDays,
      countdown: null,
      elapsed: formatDuration(elapsedMs),
      progress,
    };
  }

  if (mission.status === 'upcoming' && launch) {
    const diff = launch - now;
    return {
      isLive: false,
      dayOfMission: 0,
      totalDays: null,
      countdown: diff > 0 ? formatCountdown(diff) : 'Imminent',
      elapsed: null,
      progress: 0,
    };
  }

  return { isLive: false, dayOfMission: 0, totalDays: null, countdown: null, elapsed: null, progress: 0 };
}

function formatCountdown(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  if (days > 0) return `T-${days}d ${hours}h`;
  if (hours > 0) return `T-${hours}h ${minutes}m`;
  if (minutes > 0) return `T-${minutes}m ${seconds}s`;
  return `T-${seconds}s`;
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

// ─── Launch event types ─────────────────────────────────────────────
export interface LaunchEvent {
  id: string;
  mission: Mission;
  type: 'launch' | 'webcast' | 't-zero';
  timestamp: number;
}

// ─── Hook ────────────────────────────────────────────────────────────
export function useMissionTracking() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [tick, setTick] = useState(0); // forces re-render for countdowns
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [launchEvents, setLaunchEvents] = useState<LaunchEvent[]>([]);
  const prevStatusRef = useRef<Record<string, { status: string; webcastLive: boolean }>>({});
  const t0FiredRef = useRef<Set<string>>(new Set()); // track T-0 alerts already fired

  const dismissEvent = useCallback((eventId: string) => {
    setLaunchEvents(prev => prev.filter(e => e.id !== eventId));
  }, []);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_URL}/api/satellite/missions`, { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: Mission[] = await resp.json();
      const filtered = data.filter(m => m.status === 'in-flight' || m.status === 'upcoming');

      // Detect status changes → launch events
      const prev = prevStatusRef.current;
      const newEvents: LaunchEvent[] = [];
      for (const m of filtered) {
        const old = prev[m.id];
        if (old) {
          if (old.status === 'upcoming' && m.status === 'in-flight') {
            newEvents.push({ id: `launch-${m.id}`, mission: m, type: 'launch', timestamp: Date.now() });
          }
          if (!old.webcastLive && m.webcastLive) {
            newEvents.push({ id: `webcast-${m.id}`, mission: m, type: 'webcast', timestamp: Date.now() });
          }
        }
      }
      if (newEvents.length > 0) {
        setLaunchEvents(prev => [...prev, ...newEvents]);
      }

      // Update prev status
      const next: Record<string, { status: string; webcastLive: boolean }> = {};
      for (const m of filtered) {
        next[m.id] = { status: m.status, webcastLive: m.webcastLive };
      }
      prevStatusRef.current = next;

      setMissions(filtered);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[missions] Failed to fetch:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start countdown timer when active
  const startTimer = useCallback(() => {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => setTick(t => t + 1), 1_000); // every second
  }, []);

  const stopTimer = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Build GeoJSON for launch pad markers with countdown data
  const getMissionMarkers = useCallback((): { points: GeoJSON.FeatureCollection; arcs: GeoJSON.FeatureCollection } => {
    const features: GeoJSON.Feature[] = [];
    // Shorten agency names for map labels
    const shortAgency = (name: string): string => {
      if (name.length <= 15) return name;
      if (/spacex/i.test(name)) return 'SpaceX';
      if (/nasa|national aeronautics/i.test(name)) return 'NASA';
      if (/roscosmos/i.test(name)) return 'Roscosmos';
      if (/china aerospace/i.test(name)) return 'CASC';
      if (/isro/i.test(name)) return 'ISRO';
      if (/jaxa/i.test(name)) return 'JAXA';
      if (/arianespace/i.test(name)) return 'Arianespace';
      if (/northrop/i.test(name)) return 'Northrop Grumman';
      if (/rocket lab/i.test(name)) return 'Rocket Lab';
      if (/avio/i.test(name)) return 'Avio';
      if (/china rocket/i.test(name)) return 'CALT';
      return name.slice(0, 15);
    };
    for (const m of missions) {
      const timeInfo = getMissionTimeInfo(m);
      const countdown = timeInfo.isLive
        ? `Day ${timeInfo.dayOfMission}${timeInfo.totalDays ? '/' + timeInfo.totalDays : ''} · IN FLIGHT`
        : timeInfo.countdown || '';

      if (m.launchPad?.lat != null && m.launchPad?.lng != null) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [m.launchPad.lng, m.launchPad.lat] },
          properties: {
            id: m.id,
            name: m.name,
            type: 'launch-pad',
            status: m.status,
            agency: shortAgency(m.agency),
            agencyCountryCode: m.agencyCountryCode,
            countdown,
            webcastLive: m.webcastLive,
          },
        });
      }
      if (m.landingPad?.lat != null && m.landingPad?.lng != null) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [m.landingPad.lng, m.landingPad.lat] },
          properties: {
            id: m.id,
            name: m.name,
            type: 'landing-zone',
            status: m.status,
            agency: shortAgency(m.agency),
            agencyCountryCode: m.agencyCountryCode,
            countdown,
            webcastLive: m.webcastLive,
          },
        });
      }
    }
    // Build arc features for missions with both launch and landing pads
    const arcFeatures: GeoJSON.Feature[] = [];
    for (const m of missions) {
      if (m.launchPad?.lat != null && m.launchPad?.lng != null &&
          m.landingPad?.lat != null && m.landingPad?.lng != null) {
        arcFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [m.launchPad.lng, m.launchPad.lat],
              [m.landingPad.lng, m.landingPad.lat],
            ],
          },
          properties: {
            id: m.id,
            status: m.status,
            agencyCountryCode: m.agencyCountryCode,
          },
        });
      }
    }

    return {
      points: { type: 'FeatureCollection' as const, features },
      arcs: { type: 'FeatureCollection' as const, features: arcFeatures },
    };
  }, [missions, tick]); // tick dependency to refresh countdowns

  // T-0 detection — fires once per mission when countdown reaches zero
  useEffect(() => {
    const now = Date.now();
    for (const m of missions) {
      if (m.status !== 'upcoming' || !m.launchDate) continue;
      const launchTime = new Date(m.launchDate).getTime();
      // Fire T-0 alert when launch window opens (within 5 seconds of T-0)
      if (launchTime <= now && launchTime > now - 5000 && !t0FiredRef.current.has(m.id)) {
        t0FiredRef.current.add(m.id);
        setLaunchEvents(prev => [...prev, {
          id: `t0-${m.id}`,
          mission: m,
          type: 't-zero',
          timestamp: Date.now(),
        }]);
      }
    }
  }, [missions, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clear events after 60 seconds
  useEffect(() => {
    if (launchEvents.length === 0) return;
    const timer = setTimeout(() => {
      const cutoff = Date.now() - 60_000;
      setLaunchEvents(prev => prev.filter(e => e.timestamp > cutoff));
    }, 60_000);
    return () => clearTimeout(timer);
  }, [launchEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return {
    missions,
    loading,
    error,
    selectedMission,
    setSelectedMission,
    fetchMissions,
    startTimer,
    stopTimer,
    getMissionMarkers,
    tick,
    launchEvents,
    dismissEvent,
  };
}
