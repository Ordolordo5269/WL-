import { useState, useEffect } from 'react';
import type { MigrationCorridor } from '../types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useDiasporaCorridors(year?: number | null) {
  const [data, setData] = useState<MigrationCorridor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (year === undefined) return; // wait for year to be resolved
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const yearParam = year != null ? `year=${year}&` : '';
        const url = `${API}/demographics/diaspora?${yearParam}minRefugees=50000`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json.data || []);
      } catch (e: any) {
        if (!cancelled && e.name !== 'AbortError') setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [year]);

  return { data, loading, error };
}
