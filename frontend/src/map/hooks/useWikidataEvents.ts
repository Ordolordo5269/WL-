import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type EventType = 'protest' | 'riot' | 'conflict' | 'battle';

export interface EventProps {
  id: string;
  title: string;
  type: EventType;
  country: string | null;
  source: 'wikidata';
  time?: string;
  range?: { start?: string; end?: string };
  wp_en?: string | null;
}

export interface EventFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: EventProps;
}

export interface EventFC {
  type: 'FeatureCollection';
  features: EventFeature[];
}

export interface UseWikidataEventsOptions {
  days: number;
  types: EventType[];
  bbox?: [number, number, number, number];
}

export function useWikidataEvents(opts: UseWikidataEventsOptions) {
  const [data, setData] = useState<EventFC | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set('days', String(Math.max(1, Math.min(30, Math.floor(opts.days)))));
    if (opts.types.length > 0) params.set('types', opts.types.join(','));
    if (opts.bbox) params.set('bbox', opts.bbox.join(','));
    return `/api/events/wikidata?${params.toString()}`;
  }, [opts.days, opts.types, opts.bbox, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setLoading(true);
    setError(null);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/geo+json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as EventFC;
        setData(json);
      } catch (err: any) {
        setError(err?.message || 'Failed to load events');
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [url]);

  return { data, error, loading, refresh } as const;
}

