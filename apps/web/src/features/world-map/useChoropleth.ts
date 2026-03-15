import { useState, useEffect, useCallback } from 'react';
import { fetchGdpLatestByIso3, buildGdpChoropleth } from './services/worldbank-gdp';
import { fetchGdpPerCapitaLatestByIso3, buildGdpPerCapitaChoropleth } from './services/worldbank-gdp-per-capita';
import { fetchInflationLatestByIso3, buildInflationChoropleth } from './services/worldbank-inflation';
import { buildQuantileChoropleth } from './services/indicator-generic';
import { fetchIndicatorLatestByIso3FromDb } from './services/indicators-db';
import type { MapRefType } from './types';

type LegendEntry = { color: string; min?: number; max?: number };

export function useChoropleth(mapRef: React.RefObject<MapRefType | null>) {
  const [gdpEnabled, setGdpEnabled] = useState(false);
  const [gdpLegend, setGdpLegend] = useState<LegendEntry[]>([]);
  const [gdpPerCapitaEnabled, setGdpPerCapitaEnabled] = useState(false);
  const [gdpPerCapitaLegend, setGdpPerCapitaLegend] = useState<LegendEntry[]>([]);
  const [inflationEnabled, setInflationEnabled] = useState(false);
  const [inflationLegend, setInflationLegend] = useState<LegendEntry[]>([]);
  const [giniEnabled, setGiniEnabled] = useState(false);
  const [giniLegend, setGiniLegend] = useState<LegendEntry[]>([]);
  const [exportsEnabled, setExportsEnabled] = useState(false);
  const [exportsLegend, setExportsLegend] = useState<LegendEntry[]>([]);
  const [lifeExpectancyEnabled, setLifeExpectancyEnabled] = useState(false);
  const [lifeExpectancyLegend, setLifeExpectancyLegend] = useState<LegendEntry[]>([]);
  const [militaryExpenditureEnabled, setMilitaryExpenditureEnabled] = useState(false);
  const [militaryExpenditureLegend, setMilitaryExpenditureLegend] = useState<LegendEntry[]>([]);
  const [democracyIndexEnabled, setDemocracyIndexEnabled] = useState(false);
  const [democracyIndexLegend, setDemocracyIndexLegend] = useState<LegendEntry[]>([]);
  const [tradeGdpEnabled, setTradeGdpEnabled] = useState(false);
  const [tradeGdpLegend, setTradeGdpLegend] = useState<LegendEntry[]>([]);
  // Raw Materials choropleths
  const [fuelExportsEnabled, setFuelExportsEnabled] = useState(false);
  const [fuelExportsLegend, setFuelExportsLegend] = useState<LegendEntry[]>([]);
  const [mineralRentsEnabled, setMineralRentsEnabled] = useState(false);
  const [mineralRentsLegend, setMineralRentsLegend] = useState<LegendEntry[]>([]);
  const [energyImportsEnabled, setEnergyImportsEnabled] = useState(false);
  const [energyImportsLegend, setEnergyImportsLegend] = useState<LegendEntry[]>([]);
  const [cerealProductionEnabled, setCerealProductionEnabled] = useState(false);
  const [cerealProductionLegend, setCerealProductionLegend] = useState<LegendEntry[]>([]);

  // GDP layer management
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!gdpEnabled) {
        mapRef.current?.setChoropleth?.('gdp', null);
        if (gdpPerCapitaEnabled) mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
        else if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else if (giniEnabled) mapRef.current?.setActiveChoropleth?.('gini');
        else if (exportsEnabled) mapRef.current?.setActiveChoropleth?.('exports');
        else mapRef.current?.setActiveChoropleth?.(null);
        setGdpLegend([]);
        return;
      }
      const byIso3 = await fetchGdpLatestByIso3();
      if (cancelled) return;
      const spec = buildGdpChoropleth(byIso3, { buckets: 7 });
      setGdpLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('gdp', spec as any);
      mapRef.current?.setActiveChoropleth?.('gdp');
    };
    run();
    return () => { cancelled = true; };
  }, [gdpEnabled, gdpPerCapitaEnabled, inflationEnabled]);

  // GDP per capita layer management
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!gdpPerCapitaEnabled) {
        mapRef.current?.setChoropleth?.('gdp-per-capita', null);
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
        else if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else if (giniEnabled) mapRef.current?.setActiveChoropleth?.('gini');
        else if (exportsEnabled) mapRef.current?.setActiveChoropleth?.('exports');
        else mapRef.current?.setActiveChoropleth?.(null);
        setGdpPerCapitaLegend([]);
        return;
      }
      const byIso3 = await fetchGdpPerCapitaLatestByIso3();
      if (cancelled) return;
      const spec = buildGdpPerCapitaChoropleth(byIso3, { buckets: 7 });
      setGdpPerCapitaLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('gdp-per-capita', spec as any);
      mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
    };
    run();
    return () => { cancelled = true; };
  }, [gdpPerCapitaEnabled, gdpEnabled, inflationEnabled]);

  // Inflation layer management
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!inflationEnabled) {
        mapRef.current?.setChoropleth?.('inflation', null);
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
        else if (gdpPerCapitaEnabled) mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
        else if (giniEnabled) mapRef.current?.setActiveChoropleth?.('gini');
        else if (exportsEnabled) mapRef.current?.setActiveChoropleth?.('exports');
        else mapRef.current?.setActiveChoropleth?.(null);
        return;
      }
      const byIso3 = await fetchInflationLatestByIso3({ yearWindow: '1960:2050' });
      if (cancelled) return;
      const spec = buildInflationChoropleth(byIso3, { buckets: 7 });
      setInflationLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('inflation', spec as any);
      mapRef.current?.setActiveChoropleth?.('inflation');
    };
    run();
    return () => { cancelled = true; };
  }, [inflationEnabled, gdpEnabled, gdpPerCapitaEnabled, giniEnabled, exportsEnabled]);

  // GINI layer management (0-100, linear) - Red (high inequality) to Green (low inequality)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!giniEnabled) {
        mapRef.current?.setChoropleth?.('gini', null);
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
        else if (gdpPerCapitaEnabled) mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
        else if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else if (exportsEnabled) mapRef.current?.setActiveChoropleth?.('exports');
        else mapRef.current?.setActiveChoropleth?.(null);
        setGiniLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('gini');
      if (cancelled) return;
      const giniPalette = ['#16a34a', '#4ade80', '#86efac', '#fca5a5', '#f87171', '#ef4444', '#dc2626'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => v.toFixed(1), palette: giniPalette });
      setGiniLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('gini', spec as any);
      mapRef.current?.setActiveChoropleth?.('gini');
    };
    run();
    return () => { cancelled = true; };
  }, [giniEnabled, gdpEnabled, gdpPerCapitaEnabled, inflationEnabled, exportsEnabled]);

  // Exports (USD, log)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!exportsEnabled) {
        mapRef.current?.setChoropleth?.('exports', null);
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
        else if (gdpPerCapitaEnabled) mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
        else if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else if (giniEnabled) mapRef.current?.setActiveChoropleth?.('gini');
        else mapRef.current?.setActiveChoropleth?.(null);
        setExportsLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('exports');
      if (cancelled) return;
      const fmtCurrency = (value: number): string => {
        if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
        return `$${value.toFixed(2)}`;
      };
      const exportsPalette = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#6366f1', '#4f46e5'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: true, formatter: fmtCurrency, palette: exportsPalette });
      setExportsLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('exports', spec as any);
      mapRef.current?.setActiveChoropleth?.('exports');
    };
    run();
    return () => { cancelled = true; };
  }, [exportsEnabled, gdpEnabled, gdpPerCapitaEnabled, inflationEnabled, giniEnabled]);

  // Life Expectancy layer (years, linear)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!lifeExpectancyEnabled) {
        mapRef.current?.setChoropleth?.('life-expectancy', null);
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
        else if (gdpPerCapitaEnabled) mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
        else if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else if (giniEnabled) mapRef.current?.setActiveChoropleth?.('gini');
        else if (exportsEnabled) mapRef.current?.setActiveChoropleth?.('exports');
        else mapRef.current?.setActiveChoropleth?.(null);
        setLifeExpectancyLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('life-expectancy');
      if (cancelled) return;
      const lifeExpectancyPalette = ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => `${v.toFixed(1)} yrs`, palette: lifeExpectancyPalette });
      setLifeExpectancyLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('life-expectancy', spec as any);
      mapRef.current?.setActiveChoropleth?.('life-expectancy');
    };
    run();
    return () => { cancelled = true; };
  }, [lifeExpectancyEnabled, gdpEnabled, gdpPerCapitaEnabled, inflationEnabled, giniEnabled, exportsEnabled]);

  // Military Expenditure layer (% GDP, linear)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!militaryExpenditureEnabled) {
        mapRef.current?.setChoropleth?.('military-expenditure', null);
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
        else if (gdpPerCapitaEnabled) mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
        else if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else if (giniEnabled) mapRef.current?.setActiveChoropleth?.('gini');
        else if (exportsEnabled) mapRef.current?.setActiveChoropleth?.('exports');
        else if (lifeExpectancyEnabled) mapRef.current?.setActiveChoropleth?.('life-expectancy');
        else mapRef.current?.setActiveChoropleth?.(null);
        setMilitaryExpenditureLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('military-expenditure');
      if (cancelled) return;
      const militaryPalette = ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => `${v.toFixed(2)}%`, palette: militaryPalette });
      setMilitaryExpenditureLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('military-expenditure', spec as any);
      mapRef.current?.setActiveChoropleth?.('military-expenditure');
    };
    run();
    return () => { cancelled = true; };
  }, [militaryExpenditureEnabled, gdpEnabled, gdpPerCapitaEnabled, inflationEnabled, giniEnabled, exportsEnabled, lifeExpectancyEnabled]);

  // Democracy Index layer (0-10, linear)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!democracyIndexEnabled) {
        mapRef.current?.setChoropleth?.('democracy-index', null);
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
        else if (gdpPerCapitaEnabled) mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
        else if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else if (giniEnabled) mapRef.current?.setActiveChoropleth?.('gini');
        else if (exportsEnabled) mapRef.current?.setActiveChoropleth?.('exports');
        else if (lifeExpectancyEnabled) mapRef.current?.setActiveChoropleth?.('life-expectancy');
        else if (militaryExpenditureEnabled) mapRef.current?.setActiveChoropleth?.('military-expenditure');
        else mapRef.current?.setActiveChoropleth?.(null);
        setDemocracyIndexLegend([]);
        return;
      }
      const byIso3Raw = await fetchIndicatorLatestByIso3FromDb('democracy-index');
      if (cancelled) return;
      // Normalize VA.EST (-2.5 to 2.5) to 0-10 scale
      const byIso3: Record<string, { iso3: string; value: number | null; year: number | null }> = {};
      Object.entries(byIso3Raw).forEach(([iso, entry]) => {
        if (entry.value !== null) {
          const normalized = ((entry.value + 2.5) / 5) * 10;
          const clamped = Math.max(0, Math.min(10, normalized));
          byIso3[iso] = { ...entry, value: Number(clamped.toFixed(2)) };
        } else {
          byIso3[iso] = entry;
        }
      });
      const democracyPalette = ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#86efac', '#4ade80', '#16a34a'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => v.toFixed(1), palette: democracyPalette });
      setDemocracyIndexLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('democracy-index', spec as any);
      mapRef.current?.setActiveChoropleth?.('democracy-index');
    };
    run();
    return () => { cancelled = true; };
  }, [democracyIndexEnabled, gdpEnabled, gdpPerCapitaEnabled, inflationEnabled, giniEnabled, exportsEnabled, lifeExpectancyEnabled, militaryExpenditureEnabled]);

  // Trade % GDP layer (percent, linear)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!tradeGdpEnabled) {
        mapRef.current?.setChoropleth?.('trade-gdp', null);
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
        else if (gdpPerCapitaEnabled) mapRef.current?.setActiveChoropleth?.('gdp-per-capita');
        else if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else if (giniEnabled) mapRef.current?.setActiveChoropleth?.('gini');
        else if (exportsEnabled) mapRef.current?.setActiveChoropleth?.('exports');
        else if (lifeExpectancyEnabled) mapRef.current?.setActiveChoropleth?.('life-expectancy');
        else if (militaryExpenditureEnabled) mapRef.current?.setActiveChoropleth?.('military-expenditure');
        else if (democracyIndexEnabled) mapRef.current?.setActiveChoropleth?.('democracy-index');
        else mapRef.current?.setActiveChoropleth?.(null);
        setTradeGdpLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('trade-gdp');
      if (cancelled) return;
      const tradePalette = ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#06b6d4', '#0891b2'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => `${v.toFixed(1)}%`, palette: tradePalette });
      setTradeGdpLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('trade-gdp', spec as any);
      mapRef.current?.setActiveChoropleth?.('trade-gdp');
    };
    run();
    return () => { cancelled = true; };
  }, [tradeGdpEnabled, gdpEnabled, gdpPerCapitaEnabled, inflationEnabled, giniEnabled, exportsEnabled, lifeExpectancyEnabled, militaryExpenditureEnabled, democracyIndexEnabled]);

  // Fuel Exports (% merchandise) layer - amber palette
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!fuelExportsEnabled) {
        mapRef.current?.setChoropleth?.('fuel-exports', null);
        if (!gdpEnabled && !gdpPerCapitaEnabled && !inflationEnabled && !giniEnabled && !exportsEnabled && !lifeExpectancyEnabled && !militaryExpenditureEnabled && !democracyIndexEnabled && !tradeGdpEnabled && !mineralRentsEnabled && !energyImportsEnabled && !cerealProductionEnabled) {
          mapRef.current?.setActiveChoropleth?.(null);
        }
        setFuelExportsLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('fuel-exports');
      if (cancelled) return;
      const palette = ['#fffbeb', '#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#92400e'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => `${v.toFixed(1)}%`, palette });
      setFuelExportsLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('fuel-exports', spec as any);
      mapRef.current?.setActiveChoropleth?.('fuel-exports');
    };
    run();
    return () => { cancelled = true; };
  }, [fuelExportsEnabled]);

  // Mineral Rents (% GDP) layer - violet palette
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!mineralRentsEnabled) {
        mapRef.current?.setChoropleth?.('mineral-rents', null);
        if (!gdpEnabled && !gdpPerCapitaEnabled && !inflationEnabled && !giniEnabled && !exportsEnabled && !lifeExpectancyEnabled && !militaryExpenditureEnabled && !democracyIndexEnabled && !tradeGdpEnabled && !fuelExportsEnabled && !energyImportsEnabled && !cerealProductionEnabled) {
          mapRef.current?.setActiveChoropleth?.(null);
        }
        setMineralRentsLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('mineral-rents');
      if (cancelled) return;
      const palette = ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#6d28d9'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => `${v.toFixed(2)}%`, palette });
      setMineralRentsLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('mineral-rents', spec as any);
      mapRef.current?.setActiveChoropleth?.('mineral-rents');
    };
    run();
    return () => { cancelled = true; };
  }, [mineralRentsEnabled]);

  // Energy Imports (% of energy use) layer - orange palette
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!energyImportsEnabled) {
        mapRef.current?.setChoropleth?.('energy-imports', null);
        if (!gdpEnabled && !gdpPerCapitaEnabled && !inflationEnabled && !giniEnabled && !exportsEnabled && !lifeExpectancyEnabled && !militaryExpenditureEnabled && !democracyIndexEnabled && !tradeGdpEnabled && !fuelExportsEnabled && !mineralRentsEnabled && !cerealProductionEnabled) {
          mapRef.current?.setActiveChoropleth?.(null);
        }
        setEnergyImportsLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('energy-imports');
      if (cancelled) return;
      const palette = ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#c2410c'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => `${v.toFixed(1)}%`, palette });
      setEnergyImportsLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('energy-imports', spec as any);
      mapRef.current?.setActiveChoropleth?.('energy-imports');
    };
    run();
    return () => { cancelled = true; };
  }, [energyImportsEnabled]);

  // Cereal Production (metric tons) layer - green palette
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cerealProductionEnabled) {
        mapRef.current?.setChoropleth?.('cereal-production', null);
        if (!gdpEnabled && !gdpPerCapitaEnabled && !inflationEnabled && !giniEnabled && !exportsEnabled && !lifeExpectancyEnabled && !militaryExpenditureEnabled && !democracyIndexEnabled && !tradeGdpEnabled && !fuelExportsEnabled && !mineralRentsEnabled && !energyImportsEnabled) {
          mapRef.current?.setActiveChoropleth?.(null);
        }
        setCerealProductionLegend([]);
        return;
      }
      const byIso3 = await fetchIndicatorLatestByIso3FromDb('cereal-production');
      if (cancelled) return;
      const fmtTonnes = (v: number) => {
        if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
        if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
        if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
        return v.toFixed(0);
      };
      const palette = ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#16a34a', '#166534'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: true, formatter: fmtTonnes, palette });
      setCerealProductionLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('cereal-production', spec as any);
      mapRef.current?.setActiveChoropleth?.('cereal-production');
    };
    run();
    return () => { cancelled = true; };
  }, [cerealProductionEnabled]);

  // Helper to disable all choropleth layers
  const disableAllChoropleths = useCallback(() => {
    setGdpEnabled(false);
    setGdpPerCapitaEnabled(false);
    setInflationEnabled(false);
    setGiniEnabled(false);
    setExportsEnabled(false);
    setLifeExpectancyEnabled(false);
    setMilitaryExpenditureEnabled(false);
    setDemocracyIndexEnabled(false);
    setTradeGdpEnabled(false);
    setFuelExportsEnabled(false);
    setMineralRentsEnabled(false);
    setEnergyImportsEnabled(false);
    setCerealProductionEnabled(false);
  }, []);

  // Toggle handlers with mutual exclusivity (using disableAllChoropleths helper)
  const handleToggleGdpLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setGdpEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleGdpPerCapitaLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setGdpPerCapitaEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleInflationLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setInflationEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleGiniLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setGiniEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleExportsLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setExportsEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleLifeExpectancyLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setLifeExpectancyEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleMilitaryExpenditureLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setMilitaryExpenditureEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleDemocracyIndexLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setDemocracyIndexEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleTradeGdpLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setTradeGdpEnabled(enabled);
  }, [disableAllChoropleths]);

  // Raw Materials choropleth toggles
  const handleToggleFuelExportsLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setFuelExportsEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleMineralRentsLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setMineralRentsEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleEnergyImportsLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setEnergyImportsEnabled(enabled);
  }, [disableAllChoropleths]);

  const handleToggleCerealProductionLayer = useCallback((enabled: boolean) => {
    if (enabled) disableAllChoropleths();
    setCerealProductionEnabled(enabled);
  }, [disableAllChoropleths]);

  return {
    gdpEnabled, gdpLegend, handleToggleGdpLayer,
    gdpPerCapitaEnabled, gdpPerCapitaLegend, handleToggleGdpPerCapitaLayer,
    inflationEnabled, inflationLegend, handleToggleInflationLayer,
    giniEnabled, giniLegend, handleToggleGiniLayer,
    exportsEnabled, exportsLegend, handleToggleExportsLayer,
    lifeExpectancyEnabled, lifeExpectancyLegend, handleToggleLifeExpectancyLayer,
    militaryExpenditureEnabled, militaryExpenditureLegend, handleToggleMilitaryExpenditureLayer,
    democracyIndexEnabled, democracyIndexLegend, handleToggleDemocracyIndexLayer,
    tradeGdpEnabled, tradeGdpLegend, handleToggleTradeGdpLayer,
    // Raw Materials
    fuelExportsEnabled, fuelExportsLegend, handleToggleFuelExportsLayer,
    mineralRentsEnabled, mineralRentsLegend, handleToggleMineralRentsLayer,
    energyImportsEnabled, energyImportsLegend, handleToggleEnergyImportsLayer,
    cerealProductionEnabled, cerealProductionLegend, handleToggleCerealProductionLayer,
  };
}
