import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface CountryMapEntry { iso3: string; total: number; }

export interface CountryMap {
  origins: CountryMapEntry[];      // all countries that send migrants
  destinations: CountryMapEntry[]; // all countries that receive migrants
}

export function useCountryMap(year?: number | null) {
  const [data, setData] = useState<CountryMap | null>(null);

  useEffect(() => {
    if (year === undefined) return;
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const params = year != null ? `?year=${year}` : '';
        const res = await fetch(`${API}/demographics/diaspora/country-map${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData({ origins: json.origins || [], destinations: json.destinations || [] });
      } catch {}
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [year]);

  return data;
}
