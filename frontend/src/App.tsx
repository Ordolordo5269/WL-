import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WorldMap from '../components/WorldMap';
import LeftSidebar from '../components/LeftSidebar';
import { fetchGdpLatestByIso3, buildGdpChoropleth } from '../services/worldbank-gdp';
import { fetchGdpPerCapitaLatestByIso3, buildGdpPerCapitaChoropleth } from '../services/worldbank-gdp-per-capita';
import { fetchInflationLatestByIso3, buildInflationChoropleth } from '../services/worldbank-inflation';
import { buildQuantileChoropleth } from '../services/indicator-generic';
import { fetchIndicatorLatestByIso3FromDb } from '../services/indicators-db';
import CountrySidebar from '../components/CountrySidebar';
import ConflictTracker from '../components/ConflictTracker';
import CountryCard from '../components/CountryCard';
import MenuToggleButton from '../components/MenuToggleButton';
import CompareCountriesPopup from '../components/CompareCountriesPopup';
import CompareCountriesView from '../components/CompareCountriesView';
import { conflictsDatabase } from '../data/conflicts-data';
import './index.css';
import './styles/sidebar.css';
import "./styles/conflict-tracker.css";
import "./styles/compare-countries.css";
import { normalizeOrgQuery, buildOrgHighlight } from '../services/orgs-service';
import { findOrgByQuery } from '../services/orgs-config';

// ✅ MEJORADO: Interfaces específicas para evitar tipos 'any'
interface Country {
  name: string;
  capital: string;
  region: string;
}

interface CountryBasicInfo {
  name: {
    common: string;
    official: string;
  };
  cca3: string;
  cca2: string;
  flags?: {
    png?: string;
    svg?: string;
  };
}

interface CountrySelectorCountry {
  iso3: string;
  name: string;
  flagUrl?: string;
}

interface WindowWithResetMapView extends Window {
  resetMapView?: () => void;
}

function WorldMapView() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesForSelector, setCountriesForSelector] = useState<CountrySelectorCountry[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
type MapEaseToOptionsApp = { center?: [number, number]; zoom?: number; duration?: number; easing?: (t: number) => number; pitch?: number; bearing?: number };
type MetricId = 'gdp' | 'inflation' | 'gdp-per-capita' | 'gini' | 'exports' | 'life-expectancy' | 'military-expenditure' | 'democracy-index' | 'trade-gdp';

const mapRef = useRef<{ easeTo: (options: MapEaseToOptionsApp) => void; getMap: () => any; setBaseMapStyle?: (next: 'night' | 'light' | 'outdoors') => void; setPlanetPreset?: (preset: 'default' | 'nebula' | 'sunset' | 'dawn') => void; setBuildings3DEnabled?: (v: boolean) => void; setMinimalMode?: (v: boolean) => void; setAutoRotate?: (v: boolean) => void; setRotateSpeed?: (v: number) => void; setChoropleth?: (metric: MetricId, spec: any | null) => void; setActiveChoropleth?: (metric: MetricId | null) => void; setHistoryEnabled?: (enabled: boolean) => void; setHistoryYear?: (year: number) => void; highlightIso3List?: (iso: string[], colorHex?: string) => void; highlightIso3ToColorMap?: (isoToColor: Record<string,string>) => void; setTerrainEnabled?: (v: boolean) => void; setTerrainExaggeration?: (n: number) => void; flyToCity?: (lat: number, lng: number, cityName?: string) => void; setCitiesData?: (cities: any[]) => void; setCitiesVisible?: (visible: boolean) => void } | null>(null);

  // Callback ref to expose map ref when it's ready
  const mapRefCallback = useCallback((node: typeof mapRef.current) => {
    mapRef.current = node;
    (document as any).__wl_map_comp = node;
  }, []);

  // Add unified sidebars state
  const [sidebars, setSidebars] = useState({
    country: false, // right sidebar for countries
    menu: false,    // left menu sidebar
    conflict: false // conflict tracker
  });

  const [gdpEnabled, setGdpEnabled] = useState<boolean>(false);
  const [gdpLegend, setGdpLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const [gdpPerCapitaEnabled, setGdpPerCapitaEnabled] = useState<boolean>(false);
  const [gdpPerCapitaLegend, setGdpPerCapitaLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const [inflationEnabled, setInflationEnabled] = useState<boolean>(false);
  const [inflationLegend, setInflationLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const [giniEnabled, setGiniEnabled] = useState<boolean>(false);
  const [giniLegend, setGiniLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const [exportsEnabled, setExportsEnabled] = useState<boolean>(false);
  const [exportsLegend, setExportsLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  
  // New indicators
  const [lifeExpectancyEnabled, setLifeExpectancyEnabled] = useState<boolean>(false);
  const [lifeExpectancyLegend, setLifeExpectancyLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const [militaryExpenditureEnabled, setMilitaryExpenditureEnabled] = useState<boolean>(false);
  const [militaryExpenditureLegend, setMilitaryExpenditureLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const [democracyIndexEnabled, setDemocracyIndexEnabled] = useState<boolean>(false);
  const [democracyIndexLegend, setDemocracyIndexLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const [tradeGdpEnabled, setTradeGdpEnabled] = useState<boolean>(false);
  const [tradeGdpLegend, setTradeGdpLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);

  // History Mode state
  const [historyEnabled, setHistoryEnabled] = useState<boolean>(false);
  const [historyYear, setHistoryYear] = useState<number>(1880);
  const [orgIsoFilter, setOrgIsoFilter] = useState<string[]>([]);
  const [orgColor, setOrgColor] = useState<string | null>(null);
  // Natural layers state
  const [riversEnabled, setRiversEnabled] = useState<boolean>(false);
  const [mountainRangesEnabled, setMountainRangesEnabled] = useState<boolean>(false);
  const [peaksEnabled, setPeaksEnabled] = useState<boolean>(false);
  const [naturalLod, setNaturalLod] = useState<'auto' | 'low' | 'med' | 'high'>('auto');
  
  // Compare Countries state
  const [compareCountries, setCompareCountries] = useState({
    popupOpen: false,
    viewOpen: false,
    country1Iso3: null as string | null,
    country2Iso3: null as string | null
  });

  // Unified sidebars handler
  const toggleSidebar = useCallback((type: 'country' | 'menu' | 'conflict', open: boolean) => {
    setSidebars(prev => ({ ...prev, [type]: open }));
  }, []);


  useEffect(() => {
    // Load countries cache (lightweight local JSON)
    const load = async () => {
      try {
        const res = await fetch('/data/countries-cache.json');
        const data = await res.json();
        setCountries(data);
      } catch (error) {
        console.error(error);
      }
      // NOTE: isLoading is now controlled by onMapReady callback from WorldMap,
      // so the overlay stays visible until map tiles are actually rendered.
    };
    load();
  }, []);

  // Called by WorldMap when map.on('load') fires — tiles + style are ready
  const handleMapReady = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Load countries for selector (from API)
  useEffect(() => {
    const loadCountriesForSelector = async () => {
      setCountriesLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/countries/all`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            // Remove duplicates by cca3 code
            const uniqueCountries = Array.from(
              new Map(data.data.map((country: CountryBasicInfo) => [country.cca3, country])).values()
            );
            
            // Transform to CountrySelector format
            const selectorCountries: CountrySelectorCountry[] = uniqueCountries.map((country: CountryBasicInfo) => ({
              iso3: country.cca3,
              name: country.name.common,
              flagUrl: country.flags?.png || country.flags?.svg
            }));
            
            setCountriesForSelector(selectorCountries);
          }
        }
      } catch (error) {
        console.error('Failed to load countries for selector:', error);
      } finally {
        setCountriesLoading(false);
      }
    };
    
    loadCountriesForSelector();
    // Indicator data is fetched on-demand when the user toggles a choropleth layer.
    // No prefetch here — keeps initial load fast and network free for map tiles.
  }, []);

  // GDP layer management
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!gdpEnabled) {
        // Ensure spec is cleared so style reloads don't recreate the layer
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
        // Clear spec when toggled off
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
        // Clear spec when toggled off
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
      // GINI: Green (low inequality) to Red (high inequality)
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
      // Exports: Blue to Purple gradient
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
      // Life Expectancy: Green gradient (health indicator)
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
      // Military Expenditure: Orange/Red gradient (military spending)
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
      // Democracy Index: Red (low) to Green (high) - inverted palette
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
      // Trade % GDP: Blue to Cyan gradient (trade/commerce)
      const tradePalette = ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#06b6d4', '#0891b2'];
      const spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v) => `${v.toFixed(1)}%`, palette: tradePalette });
      setTradeGdpLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('trade-gdp', spec as any);
      mapRef.current?.setActiveChoropleth?.('trade-gdp');
    };
    run();
    return () => { cancelled = true; };
  }, [tradeGdpEnabled, gdpEnabled, gdpPerCapitaEnabled, inflationEnabled, giniEnabled, exportsEnabled, lifeExpectancyEnabled, militaryExpenditureEnabled, democracyIndexEnabled]);

  // Country selection handler
  const handleCountrySelect = useCallback((countryName: string) => {
    setSelectedCountry(countryName);
    toggleSidebar('country', true);
  }, [toggleSidebar]);

  const handleCloseSidebar = useCallback(() => {
    toggleSidebar('country', false);
    setSelectedCountry(null);
    // Hide city markers
    mapRef.current?.setCitiesVisible?.(false);
    // Reset map view back to the globe
    (window as WindowWithResetMapView).resetMapView?.();
  }, [toggleSidebar]);

  const handleResetView = useCallback(() => {
    // Esta función se pasa al WorldMap para exponer resetMapView
  }, []);

  // Left sidebar handlers
  const handleToggleLeftSidebar = useCallback(() => {
    toggleSidebar('menu', !sidebars.menu);
  }, [sidebars.menu, toggleSidebar]);

  const handleCloseLeftSidebar = useCallback(() => {
    toggleSidebar('menu', false);
  }, [toggleSidebar]);

  const handleOpenConflictTracker = useCallback(() => {
    toggleSidebar('conflict', true);
    // Close History Mode to avoid interaction overlap
    if (historyEnabled) {
      setHistoryEnabled(false);
      mapRef.current?.setHistoryEnabled?.(false);
      mapRef.current?.setMinimalMode?.(false);
    }
  }, [toggleSidebar]);

  const handleCloseConflictTracker = useCallback(() => {
    toggleSidebar('conflict', false);
    setSelectedConflictId(null);
  }, [toggleSidebar]);


  // New: map style callbacks for Settings section
  const handleSetBaseMapStyle = useCallback((next: 'night' | 'light' | 'outdoors') => {
    mapRef.current?.setBaseMapStyle?.(next);
  }, []);
  const handleSetPlanetPreset = useCallback((preset: 'default' | 'nebula' | 'sunset' | 'dawn') => {
    mapRef.current?.setPlanetPreset?.(preset);
  }, []);
  const handleSetTerrain = useCallback((v: boolean) => {
    mapRef.current?.setTerrainEnabled?.(v);
  }, []);
  const handleSetTerrainExaggeration = useCallback((n: number) => {
    mapRef.current?.setTerrainExaggeration?.(n);
  }, []);
  const handleSetBuildings3D = useCallback((v: boolean) => {
    mapRef.current?.setBuildings3DEnabled?.(v);
  }, []);
  const handleSetMinimalMode = useCallback((v: boolean) => {
    mapRef.current?.setMinimalMode?.(v);
  }, []);

  // Natural layers handlers
  const handleToggleRiversLayer = useCallback((enabled: boolean) => {
    setRiversEnabled(enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('rivers', enabled);
  }, []);
  const handleToggleMountainRangesLayer = useCallback((enabled: boolean) => {
    setMountainRangesEnabled(enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('ranges', enabled);
  }, []);
  const handleTogglePeaksLayer = useCallback((enabled: boolean) => {
    setPeaksEnabled(enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('peaks', enabled);
  }, []);
  const handleSetNaturalLod = useCallback((lod: 'auto' | 'low' | 'med' | 'high') => {
    setNaturalLod(lod);
    (document as any).__wl_map_comp?.setNaturalLod?.(lod);
  }, []);

  const handleSetAutoRotate = useCallback((v: boolean) => {
    mapRef.current?.setAutoRotate?.(v);
  }, []);
  const handleSetRotateSpeed = useCallback((n: number) => {
    mapRef.current?.setRotateSpeed?.(n);
  }, []);

  const handleToggleGdpLayer = useCallback((enabled: boolean) => {
    setGdpEnabled(enabled);
    if (enabled) {
      setGdpPerCapitaEnabled(false);
      setInflationEnabled(false);
      setGiniEnabled(false);
      setExportsEnabled(false);
      setLifeExpectancyEnabled(false);
      setMilitaryExpenditureEnabled(false);
      setDemocracyIndexEnabled(false);
      setTradeGdpEnabled(false);
    }
  }, []);

  const handleToggleGdpPerCapitaLayer = useCallback((enabled: boolean) => {
    setGdpPerCapitaEnabled(enabled);
    if (enabled) {
      setGdpEnabled(false);
      setInflationEnabled(false);
      setGiniEnabled(false);
      setExportsEnabled(false);
      setLifeExpectancyEnabled(false);
      setMilitaryExpenditureEnabled(false);
      setDemocracyIndexEnabled(false);
      setTradeGdpEnabled(false);
    }
  }, []);

  const handleToggleInflationLayer = useCallback((enabled: boolean) => {
    setInflationEnabled(enabled);
    if (enabled) {
      setGdpEnabled(false);
      setGdpPerCapitaEnabled(false);
      setGiniEnabled(false);
      setExportsEnabled(false);
      setLifeExpectancyEnabled(false);
      setMilitaryExpenditureEnabled(false);
      setDemocracyIndexEnabled(false);
      setTradeGdpEnabled(false);
    }
  }, []);

  const handleToggleGiniLayer = useCallback((enabled: boolean) => {
    setGiniEnabled(enabled);
    if (enabled) {
      setGdpEnabled(false);
      setGdpPerCapitaEnabled(false);
      setInflationEnabled(false);
      setExportsEnabled(false);
      setLifeExpectancyEnabled(false);
      setMilitaryExpenditureEnabled(false);
      setDemocracyIndexEnabled(false);
      setTradeGdpEnabled(false);
    }
  }, []);

  const handleToggleExportsLayer = useCallback((enabled: boolean) => {
    setExportsEnabled(enabled);
    if (enabled) {
      setGdpEnabled(false);
      setGdpPerCapitaEnabled(false);
      setInflationEnabled(false);
      setGiniEnabled(false);
      setLifeExpectancyEnabled(false);
      setMilitaryExpenditureEnabled(false);
      setDemocracyIndexEnabled(false);
      setTradeGdpEnabled(false);
    }
  }, []);

  // New indicator handlers
  const handleToggleLifeExpectancyLayer = useCallback((enabled: boolean) => {
    setLifeExpectancyEnabled(enabled);
    if (enabled) {
      setGdpEnabled(false);
      setGdpPerCapitaEnabled(false);
      setInflationEnabled(false);
      setGiniEnabled(false);
      setExportsEnabled(false);
      setMilitaryExpenditureEnabled(false);
      setDemocracyIndexEnabled(false);
      setTradeGdpEnabled(false);
    }
  }, []);


  const handleToggleMilitaryExpenditureLayer = useCallback((enabled: boolean) => {
    setMilitaryExpenditureEnabled(enabled);
    if (enabled) {
      setGdpEnabled(false);
      setGdpPerCapitaEnabled(false);
      setInflationEnabled(false);
      setGiniEnabled(false);
      setExportsEnabled(false);
      setLifeExpectancyEnabled(false);
      setDemocracyIndexEnabled(false);
      setTradeGdpEnabled(false);
    }
  }, []);

  const handleToggleDemocracyIndexLayer = useCallback((enabled: boolean) => {
    setDemocracyIndexEnabled(enabled);
    if (enabled) {
      setGdpEnabled(false);
      setGdpPerCapitaEnabled(false);
      setInflationEnabled(false);
      setGiniEnabled(false);
      setExportsEnabled(false);
      setLifeExpectancyEnabled(false);
      setMilitaryExpenditureEnabled(false);
      setTradeGdpEnabled(false);
    }
  }, []);

  const handleToggleTradeGdpLayer = useCallback((enabled: boolean) => {
    setTradeGdpEnabled(enabled);
    if (enabled) {
      setGdpEnabled(false);
      setGdpPerCapitaEnabled(false);
      setInflationEnabled(false);
      setGiniEnabled(false);
      setExportsEnabled(false);
      setLifeExpectancyEnabled(false);
      setMilitaryExpenditureEnabled(false);
      setDemocracyIndexEnabled(false);
    }
  }, []);

  const handleSetOrganizationIsoFilter = useCallback((iso3: string[], color?: string) => {
    setOrgIsoFilter(iso3);
    setOrgColor(color ?? null);
    mapRef.current?.highlightIso3List?.(iso3, color || undefined);
  }, []);

  // History Mode handlers
  const handleToggleHistoryMode = useCallback((enabled: boolean) => {
    setHistoryEnabled(enabled);
    mapRef.current?.setHistoryEnabled?.(enabled);
    // Auto-enable minimal mode (hide labels, roads, borders) when History Mode is on
    mapRef.current?.setMinimalMode?.(enabled);
    if (enabled) {
      mapRef.current?.setHistoryYear?.(historyYear);
    }
  }, [historyYear]);

  const handleSetHistoryYear = useCallback((year: number) => {
    setHistoryYear(year);
    mapRef.current?.setHistoryYear?.(year);
  }, []);

  // Removed: unused handleBackToLeftSidebar

  const handleCenterMapOnConflict = (coordinates: { lat: number; lng: number }) => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        center: [coordinates.lng, coordinates.lat],
        zoom: 4,
        duration: 1200
      });
    }
  };

  const handleConflictClick = (conflictId: string) => {
    const conflict = conflictsDatabase.find(c => c.id === conflictId);
    if (conflict) {
      setSelectedCountry(null);
      setSelectedConflictId(conflictId);
      handleCenterMapOnConflict(conflict.coordinates);
      toggleSidebar('conflict', true);
    }
  };

  const handleConflictSelect = (conflictId: string | null) => {
    setSelectedConflictId(conflictId);
  };

  // Compare Countries handlers
  const handleOpenComparePopup = useCallback(() => {
    setCompareCountries(prev => ({ ...prev, popupOpen: true }));
  }, []);

  const handleCloseComparePopup = useCallback(() => {
    setCompareCountries(prev => ({ ...prev, popupOpen: false }));
  }, []);

  const handleSelectCountries = useCallback((country1: string | null, country2: string | null) => {
    setCompareCountries({
      popupOpen: false,
      viewOpen: true,
      country1Iso3: country1,
      country2Iso3: country2
    });
  }, []);

  const handleCloseCompareView = useCallback(() => {
    setCompareCountries({
      popupOpen: false,
      viewOpen: false,
      country1Iso3: null,
      country2Iso3: null
    });
  }, []);

  // Memoized country data to prevent unnecessary recalculations
  const selectedCountryData = useMemo(() => 
    countries.find(country => 
      country.name.toLowerCase() === selectedCountry?.toLowerCase()
    ), [countries, selectedCountry]
  );

  // Memoized conflicts data for better performance
  // Update conflictsForMap - using static data for now (will be updated when API is ready)
  const conflictsForMap = useMemo(() => 
    sidebars.conflict ? conflictsDatabase : [], 
    [sidebars.conflict]
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Left menu toggle button */}
      <MenuToggleButton 
        isOpen={sidebars.menu}
        onClick={handleToggleLeftSidebar}
      />
      
      {/* Left sidebar */}
      <LeftSidebar 
        isOpen={sidebars.menu}
        onClose={handleCloseLeftSidebar}
        onOpenConflictTracker={handleOpenConflictTracker}
        // Natural layers props
        onToggleRiversLayer={handleToggleRiversLayer}
        riversEnabled={riversEnabled}
        onToggleMountainRangesLayer={handleToggleMountainRangesLayer}
        mountainRangesEnabled={mountainRangesEnabled}
        onTogglePeaksLayer={handleTogglePeaksLayer}
        peaksEnabled={peaksEnabled}
        naturalLod={naturalLod}
        onSetNaturalLod={handleSetNaturalLod}
        onSetBaseMapStyle={handleSetBaseMapStyle}
        onSetPlanetPreset={handleSetPlanetPreset}
        onSetTerrain={handleSetTerrain}
        onSetTerrainExaggeration={handleSetTerrainExaggeration}
        onSetBuildings3D={handleSetBuildings3D}
        onSetMinimalMode={handleSetMinimalMode}
        onSetAutoRotate={handleSetAutoRotate}
        onSetRotateSpeed={handleSetRotateSpeed}
        onToggleGdpLayer={handleToggleGdpLayer}
        gdpEnabled={gdpEnabled}
        gdpLegend={gdpLegend}
        onToggleGdpPerCapitaLayer={handleToggleGdpPerCapitaLayer}
        gdpPerCapitaEnabled={gdpPerCapitaEnabled}
        gdpPerCapitaLegend={gdpPerCapitaLegend}
        onToggleInflationLayer={handleToggleInflationLayer}
        inflationEnabled={inflationEnabled}
        inflationLegend={inflationLegend}
        onToggleGiniLayer={handleToggleGiniLayer}
        giniEnabled={giniEnabled}
        giniLegend={giniLegend}
        onToggleExportsLayer={handleToggleExportsLayer}
        exportsEnabled={exportsEnabled}
        exportsLegend={exportsLegend}
        onToggleLifeExpectancyLayer={handleToggleLifeExpectancyLayer}
        lifeExpectancyEnabled={lifeExpectancyEnabled}
        lifeExpectancyLegend={lifeExpectancyLegend}
        onToggleMilitaryExpenditureLayer={handleToggleMilitaryExpenditureLayer}
        militaryExpenditureEnabled={militaryExpenditureEnabled}
        militaryExpenditureLegend={militaryExpenditureLegend}
        onToggleDemocracyIndexLayer={handleToggleDemocracyIndexLayer}
        democracyIndexEnabled={democracyIndexEnabled}
        democracyIndexLegend={democracyIndexLegend}
        onToggleTradeGdpLayer={handleToggleTradeGdpLayer}
        tradeGdpEnabled={tradeGdpEnabled}
        tradeGdpLegend={tradeGdpLegend}
        onToggleHistoryMode={handleToggleHistoryMode}
        onSetHistoryYear={handleSetHistoryYear}
        historyEnabled={historyEnabled}
        historyYear={historyYear}
        onSetOrganizationIsoFilter={handleSetOrganizationIsoFilter}
        countries={countriesForSelector}
        countriesLoading={countriesLoading}
        onOpenCompareCountries={handleOpenComparePopup}
      />
      
      {/* Left sidebar overlay — pointer-events: none so the map stays interactive */}
      {sidebars.menu && (
        <motion.div 
          className="fixed inset-0 bg-black z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ pointerEvents: 'none' as const }}
        />
      )}
      
      <WorldMap 
        ref={mapRefCallback}
        onCountrySelect={handleCountrySelect}
        selectedCountry={selectedCountry}
        onResetView={handleResetView}
        conflicts={conflictsForMap}
        onConflictClick={handleConflictClick}
        selectedConflictId={selectedConflictId}
        isLeftSidebarOpen={sidebars.menu}
        onMapReady={handleMapReady}
      />
      
      {/* Country Sidebar */}
      {sidebars.country && (
        <>
          {/* Overlay */}
          <motion.div 
            className="fixed inset-0 bg-black z-40 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={handleCloseSidebar}
          />
          
          <CountrySidebar 
            isOpen={sidebars.country}
            onClose={handleCloseSidebar}
            countryName={selectedCountry}
            onNavigateToCity={(lat, lng, cityName) => {
              mapRef.current?.flyToCity?.(lat, lng, cityName);
            }}
            onCitiesLoaded={(cities) => {
              if (cities.length > 0) {
                mapRef.current?.setCitiesData?.(cities);
                mapRef.current?.setCitiesVisible?.(true);
              }
            }}
          />
        </>
      )}
      
      {/* Global loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="text-white text-lg flex items-center gap-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <motion.div
                className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Loading...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating country card */}
      <AnimatePresence>
        {selectedCountryData && (
          <motion.div 
            className="absolute top-4 left-4 z-10 max-w-sm"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <CountryCard country={selectedCountryData} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Tracker */}
      {sidebars.conflict && (
        <>
          {/* Overlay for ConflictTracker */}
          <motion.div 
            className="fixed inset-0 bg-black z-40 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={handleCloseConflictTracker}
          />
          
          <ConflictTracker 
            onBack={handleCloseConflictTracker}
            onCenterMap={handleCenterMapOnConflict}
            onConflictSelect={handleConflictSelect}
          />
        </>
      )}

      {/* Compare Countries Popup */}
      <CompareCountriesPopup
        isOpen={compareCountries.popupOpen}
        onClose={handleCloseComparePopup}
        countries={countriesForSelector}
        onSelectCountries={handleSelectCountries}
      />

      {/* Compare Countries View */}
      {compareCountries.country1Iso3 && compareCountries.country2Iso3 && (
        <CompareCountriesView
          isOpen={compareCountries.viewOpen}
          onClose={handleCloseCompareView}
          country1Iso3={compareCountries.country1Iso3}
          country2Iso3={compareCountries.country2Iso3}
          countries={countriesForSelector}
        />
      )}

    </div>
  );
}

export default WorldMapView;
