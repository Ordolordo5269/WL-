import { useState, useEffect, useMemo } from 'react';
import type { DiasporaOrigin } from '../types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useDiasporaData(search?: string, year?: number | null) {
  const [allData, setAllData] = useState<DiasporaOrigin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch once on mount or when year changes — no dependency on search
  useEffect(() => {
    if (year === undefined) return; // wait for year to be resolved
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const params = year != null ? `?year=${year}` : '';
        const url = `${API}/demographics/diaspora/top-origins${params}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items: DiasporaOrigin[] = (json.data || []).map((d: any) => ({
          iso3: d.iso3,
          name: d.name,
          refugees: d.refugees ?? 0,
          asylumSeekers: d.asylumSeekers ?? 0,
          idps: d.idps ?? 0,
          stateless: d.stateless ?? 0,
          returnedRefugees: d.returnedRefugees ?? 0,
          hostCommunity: d.hostCommunity ?? 0,
        }));

        if (!cancelled) setAllData(items);
      } catch (e: any) {
        if (!cancelled && e.name !== 'AbortError') setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [year]);

  // Client-side search filter (no re-fetch)
  const data = useMemo(() => {
    if (!search) return allData;
    const q = search.toLowerCase();
    return allData.filter(d =>
      d.name?.toLowerCase().includes(q) || d.iso3.toLowerCase().includes(q)
    );
  }, [allData, search]);

  return { data, loading, error };
}
