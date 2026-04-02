import { useState, useEffect } from 'react';
import type { Language } from '../types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useLanguages(search?: string, family?: string) {
  const [data, setData] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (family) params.set('family', family);
        const url = `${API}/demographics/languages?${params}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json.data || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [search, family]);

  return { data, loading, error };
}
