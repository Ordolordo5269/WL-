import { useState, useEffect, useRef } from 'react';
import type { MigrationCorridor } from '../types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface CountryCorridorData {
  asOrigin: MigrationCorridor[];
  asDestination: MigrationCorridor[];
}

// In-memory LRU cache: avoids re-fetching when toggling the same country
// Key: `${iso3}:${year}`
const MAX_CACHE = 50;
const cacheKeys: string[] = [];
const cache = new Map<string, CountryCorridorData>();

function cacheGet(key: string) { return cache.get(key); }
function cacheSet(key: string, val: CountryCorridorData) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cacheKeys.shift();
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, val);
  cacheKeys.push(key);
}

export function useCountryCorridors(iso3: string | null, year?: number | null) {
  const [data, setData] = useState<CountryCorridorData | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!iso3 || year === undefined) { setData(null); return; }

    const key = `${iso3}:${year ?? 'latest'}`;
    const cached = cacheGet(key);
    if (cached) { setData(cached); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    (async () => {
      try {
        const params = year != null ? `?year=${year}` : '';
        const res = await fetch(`${API}/demographics/diaspora/country/${iso3}${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const result: CountryCorridorData = { asOrigin: json.asOrigin || [], asDestination: json.asDestination || [] };
        cacheSet(key, result);
        if (!controller.signal.aborted) setData(result);
      } catch (e: any) {
        if (e.name !== 'AbortError' && !controller.signal.aborted) setData(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => { controller.abort(); };
  }, [iso3, year]);

  return { data, loading };
}
