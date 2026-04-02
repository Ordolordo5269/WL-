import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface DiasporaYears {
  years: number[];
  // undefined = still loading; null = loaded but no data; number = latest year
  latest: number | null | undefined;
}

export function useDiasporaYears(): DiasporaYears & { loading: boolean } {
  const [data, setData] = useState<DiasporaYears>({ years: [], latest: undefined });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/demographics/diaspora/years`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData({ years: json.years || [], latest: json.latest ?? null });
      } catch {
        // On error return null so hooks can still fallback to API default
        if (!cancelled) setData({ years: [], latest: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { ...data, loading };
}
