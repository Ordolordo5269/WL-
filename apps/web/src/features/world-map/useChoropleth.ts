import { useState, useEffect, useCallback } from 'react';
import { buildQuantileChoropleth } from './services/indicator-generic';
import { fetchIndicatorLatestByIso3FromDb } from './services/indicators-db';
import { INDICATOR_CONFIGS, INDICATOR_BY_ID } from './services/indicator-config';
import type { MetricId, MapRefType } from './types';

export type LegendEntry = { color: string; min?: number; max?: number };

export interface ChoroplethState {
  activeIndicator: MetricId | null;
  activeLegend: LegendEntry[];
  isLoading: boolean;
  activeSourceCode: string | null;
  handleToggleIndicator: (id: MetricId) => void;
  handleHideAll: () => void;
}

export function useChoropleth(mapRef: React.RefObject<MapRefType | null>): ChoroplethState {
  const [activeIndicator, setActiveIndicator] = useState<MetricId | null>(null);
  const [activeLegend, setActiveLegend] = useState<LegendEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!activeIndicator) {
      for (const cfg of INDICATOR_CONFIGS) {
        mapRef.current?.setChoropleth?.(cfg.id, null);
      }
      mapRef.current?.setActiveChoropleth?.(null);
      setActiveLegend([]);
      setIsLoading(false);
      return;
    }

    const cfg = INDICATOR_BY_ID.get(activeIndicator);
    if (!cfg) return;

    setIsLoading(true);

    const run = async () => {
      try {
        let spec: any;

        if (cfg.customFetch && cfg.customBuild) {
          const byIso3 = await cfg.customFetch();
          if (cancelled) return;
          spec = cfg.customBuild(byIso3, { buckets: 7 });
        } else {
          let byIso3 = await fetchIndicatorLatestByIso3FromDb(cfg.slug);
          if (cancelled) return;
          if (cfg.transformData) {
            byIso3 = cfg.transformData(byIso3);
          }
          spec = buildQuantileChoropleth(byIso3, {
            buckets: 7,
            useLog: cfg.useLog,
            formatter: cfg.formatter,
            palette: cfg.palette,
          });
        }

        if (cancelled) return;

        setActiveLegend(spec.legend.map((l: any) => ({ color: l.color, min: l.min, max: l.max })));

        // Clear all other choropleths, set new one
        for (const c of INDICATOR_CONFIGS) {
          if (c.id !== activeIndicator) {
            mapRef.current?.setChoropleth?.(c.id, null);
          }
        }
        mapRef.current?.setChoropleth?.(activeIndicator, spec);
        mapRef.current?.setActiveChoropleth?.(activeIndicator);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [activeIndicator]);

  const handleToggleIndicator = useCallback((id: MetricId) => {
    setActiveIndicator(prev => prev === id ? null : id);
  }, []);

  const handleHideAll = useCallback(() => {
    setActiveIndicator(null);
  }, []);

  const activeConfig = activeIndicator ? INDICATOR_BY_ID.get(activeIndicator) : null;

  return {
    activeIndicator,
    activeLegend,
    isLoading,
    activeSourceCode: activeConfig?.sourceCode ?? null,
    handleToggleIndicator,
    handleHideAll,
  };
}
