import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface DiasporaTotals {
  year: number;
  totalRefugees: number;
  totalAsylumSeekers: number;
  totalReturnedRefugees: number;
  totalIDPs: number;
  totalStateless: number;
  totalOtherOfConcern: number;
  totalHostCommunity: number;
  // From live UNHCR endpoints (may arrive later, null if still loading)
  resettlement: number | null;
  naturalisation: number | null;
  decRecognized: number | null;
  decRejected: number | null;
  decTotal: number | null;
  applied: number | null;
}

// year param is optional — when omitted the API uses the latest available year in the DB
export function useDiasporaTotals(year?: number | null) {
  const [data, setData] = useState<DiasporaTotals | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // undefined means "caller isn't ready yet" — skip
    if (year === undefined) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const params = year != null ? `?year=${year}` : '';

        // Phase 1: DB totals (fast)
        const res = await fetch(`${API}/demographics/diaspora/totals${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData({
            ...json,
            resettlement: null,
            naturalisation: null,
            decRecognized: null,
            decRejected: null,
            decTotal: null,
            applied: null,
          });
          setLoading(false);
        }

        // Phase 2: live UNHCR stats (slow, non-blocking)
        const gsRes = await fetch(`${API}/demographics/diaspora/global-stats${params}`, { signal: controller.signal });
        if (gsRes.ok) {
          const gs = await gsRes.json();
          if (!cancelled) {
            setData(prev => prev ? {
              ...prev,
              resettlement: gs.resettlement ?? null,
              naturalisation: gs.naturalisation ?? null,
              decRecognized: gs.decRecognized ?? null,
              decRejected: gs.decRejected ?? null,
              decTotal: gs.decTotal ?? null,
              applied: gs.applied ?? null,
            } : prev);
          }
        }
      } catch (e: any) {
        if (!cancelled && e.name !== 'AbortError') {
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [year]);

  return { data, loading };
}
