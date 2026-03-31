import { useState, useCallback, useRef, useEffect } from 'react';

export type SatCategory = 'starlink' | 'military' | 'navigation' | 'weather' | 'stations' | 'classified';

const SAT_CATEGORIES: SatCategory[] = ['military', 'classified', 'navigation', 'weather', 'stations', 'starlink'];

const STORAGE_KEY = 'wl-satellite-tracking';
function saveCatState(cat: SatCategory, v: boolean) {
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, [cat]: v }));
  } catch {}
}

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

export function useSatelliteTracking() {
  const [categories, setCategories] = useState<Record<SatCategory, boolean>>({
    military: false,
    classified: false,
    navigation: false,
    weather: false,
    stations: false,
    starlink: false,
  });
  const [loading, setLoading] = useState<Record<SatCategory, boolean>>({
    military: false,
    classified: false,
    navigation: false,
    weather: false,
    stations: false,
    starlink: false,
  });
  const [selectedSatellite, setSelectedSatellite] = useState<number | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<SatCategory, number | null>>({
    military: null, classified: null, navigation: null, weather: null, stations: null, starlink: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPositionsRef = useRef<((features: any[]) => void) | null>(null);
  const onGroundTrackRef = useRef<((noradId: number, coords: [number, number][], category: string, country: string, constellation: string) => void) | null>(null);
  const categoryDataRef = useRef<Record<SatCategory, any[] | null>>({ military: null, classified: null, navigation: null, weather: null, stations: null, starlink: null });

  // Initialize worker
  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    console.log('[satellite] Creating Web Worker...');
    const w = new Worker(
      new URL('./workers/satellite-propagation.worker.ts', import.meta.url),
      { type: 'module' },
    );
    w.onmessage = (e) => {
      if (e.data.type === 'positions') {
        console.log('[satellite] Received', e.data.features.length, 'positions from worker');
        onPositionsRef.current?.(e.data.features);
      } else if (e.data.type === 'groundtrack') {
        const cat = findCategoryForNorad(e.data.noradId);
        const country = findCountryForNorad(e.data.noradId);
        const constellation = findConstellationForNorad(e.data.noradId);
        onGroundTrackRef.current?.(e.data.noradId, e.data.coordinates, cat, country, constellation);
      }
    };
    w.onerror = (err) => {
      console.error('[satellite] Worker error:', err);
    };
    workerRef.current = w;
    return w;
  }, []);

  const findCategoryForNorad = (noradId: number): string => {
    for (const cat of SAT_CATEGORIES) {
      const data = categoryDataRef.current[cat];
      if (data?.some((d: any) => d.NORAD_CAT_ID === noradId)) return cat;
    }
    return 'military';
  };

  const findCountryForNorad = (noradId: number): string => {
    for (const cat of SAT_CATEGORIES) {
      const data = categoryDataRef.current[cat];
      const sat = data?.find((d: any) => d.NORAD_CAT_ID === noradId);
      if (sat) return sat.COUNTRY || '';
    }
    return '';
  };

  const findConstellationForNorad = (noradId: number): string => {
    const data = categoryDataRef.current['navigation'];
    const sat = data?.find((d: any) => d.NORAD_CAT_ID === noradId);
    return sat?.CONSTELLATION || '';
  };

  // Start tick interval
  const startTicking = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      workerRef.current?.postMessage({ type: 'tick' });
    }, 2000);
  }, []);

  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Fetch TLE data for a category
  const fetchTLE = useCallback(async (cat: SatCategory): Promise<any[]> => {
    console.log('[satellite] Fetching TLE for', cat, '...');
    const res = await fetch(`${API_URL}/api/satellite/tle?group=${cat}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('[satellite] Got', data.length, 'entries for', cat, '- first:', data[0]?.OBJECT_NAME, 'has TLE:', !!data[0]?.TLE_LINE1);
    return data;
  }, []);

  // Toggle a category on/off
  const toggleCategory = useCallback(async (cat: SatCategory, enabled: boolean) => {
    console.log('[satellite] toggleCategory', cat, enabled);
    setCategories(prev => ({ ...prev, [cat]: enabled }));
    saveCatState(cat, enabled);

    const worker = ensureWorker();

    if (enabled) {
      setLoading(prev => ({ ...prev, [cat]: true }));
      try {
        let data = categoryDataRef.current[cat];
        if (!data) {
          data = await fetchTLE(cat);
          categoryDataRef.current[cat] = data;
        }
        setCategoryCounts(prev => ({ ...prev, [cat]: data!.length }));
        console.log('[satellite] Sending', data.length, 'entries to worker for', cat);
        worker.postMessage({ type: 'add', category: cat, ommData: data });
        startTicking();
        setTrackingActive(true);
      } catch (err) {
        console.error(`[satellite] Failed to fetch ${cat}:`, err);
        setCategories(prev => ({ ...prev, [cat]: false }));
        saveCatState(cat, false);
      } finally {
        setLoading(prev => ({ ...prev, [cat]: false }));
      }
    } else {
      worker.postMessage({ type: 'remove', category: cat });
      // Keep categoryDataRef cached — avoids re-fetch on Show→Hide→Show

      // Check if any category is still active
      setCategories(prev => {
        const next = { ...prev, [cat]: false };
        const anyActive = Object.values(next).some(Boolean);
        if (!anyActive) {
          stopTicking();
          setTrackingActive(false);
        }
        return next;
      });
    }
  }, [ensureWorker, fetchTLE, startTicking, stopTicking]);

  // Request ground track for a satellite
  const requestGroundTrack = useCallback((noradId: number) => {
    setSelectedSatellite(noradId);
    workerRef.current?.postMessage({ type: 'groundtrack', noradId });
  }, []);

  // Cleanup — called explicitly, NOT on unmount (worker must survive re-renders)
  const cleanup = useCallback(() => {
    stopTicking();
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    categoryDataRef.current = { military: null, classified: null, navigation: null, weather: null, stations: null, starlink: null };
    setCategories({ military: false, classified: false, navigation: false, weather: false, stations: false, starlink: false });
    setTrackingActive(false);
    setSelectedSatellite(null);
  }, [stopTicking]);

  // Only cleanup on actual unmount (empty deps to avoid re-running)
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  return {
    categories,
    loading,
    trackingActive,
    selectedSatellite,
    toggleCategory,
    requestGroundTrack,
    cleanup,
    setOnPositions: (cb: (features: any[]) => void) => { onPositionsRef.current = cb; },
    setOnGroundTrack: (cb: (noradId: number, coords: [number, number][], category: string, country: string, constellation: string) => void) => { onGroundTrackRef.current = cb; },
    categoryCounts,
    getCategoryCount: (cat: SatCategory): number | null => categoryCounts[cat],
    getConstellationCounts: (): Record<string, number> => {
      const data = categoryDataRef.current['navigation'];
      if (!data) return {};
      const counts: Record<string, number> = {};
      for (const s of data) {
        const c = (s as any).CONSTELLATION || 'sbas';
        counts[c] = (counts[c] || 0) + 1;
      }
      return counts;
    },
    getWeatherProgramCounts: (): Record<string, number> => {
      const data = categoryDataRef.current['weather'];
      if (!data) return {};
      const counts: Record<string, number> = {};
      for (const s of data) {
        const c = (s as any).CONSTELLATION || 'other';
        counts[c] = (counts[c] || 0) + 1;
      }
      return counts;
    },
    getCountryCounts: (cat: SatCategory): Record<string, number> => {
      const data = categoryDataRef.current[cat];
      if (!data) return {};
      const counts: Record<string, number> = {};
      for (const s of data) {
        const c = (s as any).COUNTRY || '?';
        counts[c] = (counts[c] || 0) + 1;
      }
      return counts;
    },
    SAT_CATEGORIES,
  };
}
