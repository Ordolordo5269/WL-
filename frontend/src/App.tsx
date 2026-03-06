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

  const [activeChoropleth, setActiveChoropleth] = useState<MetricId | null>(null);
  const [choroplethLegend, setChoroplethLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const prevChoroplethRef = useRef<MetricId | null>(null);

  const gdpEnabled = activeChoropleth === 'gdp';
  const gdpPerCapitaEnabled = activeChoropleth === 'gdp-per-capita';
  const inflationEnabled = activeChoropleth === 'inflation';
  const giniEnabled = activeChoropleth === 'gini';
  const exportsEnabled = activeChoropleth === 'exports';
  const lifeExpectancyEnabled = activeChoropleth === 'life-expectancy';
  const militaryExpenditureEnabled = activeChoropleth === 'military-expenditure';
  const democracyIndexEnabled = activeChoropleth === 'democracy-index';
  const tradeGdpEnabled = activeChoropleth === 'trade-gdp';

  const EMPTY_LEGEND: Array<{ color: string; min?: number; max?: number }> = [];
  const gdpLegend = gdpEnabled ? choroplethLegend : EMPTY_LEGEND;
  const gdpPerCapitaLegend = gdpPerCapitaEnabled ? choroplethLegend : EMPTY_LEGEND;
  const inflationLegend = inflationEnabled ? choroplethLegend : EMPTY_LEGEND;
  const giniLegend = giniEnabled ? choroplethLegend : EMPTY_LEGEND;
  const exportsLegend = exportsEnabled ? choroplethLegend : EMPTY_LEGEND;
  const lifeExpectancyLegend = lifeExpectancyEnabled ? choroplethLegend : EMPTY_LEGEND;
  const militaryExpenditureLegend = militaryExpenditureEnabled ? choroplethLegend : EMPTY_LEGEND;
  const democracyIndexLegend = democracyIndexEnabled ? choroplethLegend : EMPTY_LEGEND;
  const tradeGdpLegend = tradeGdpEnabled ? choroplethLegend : EMPTY_LEGEND;

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

  useEffect(() => {
    let cancelled = false;

    if (prevChoroplethRef.current && prevChoroplethRef.current !== activeChoropleth) {
      mapRef.current?.setChoropleth?.(prevChoroplethRef.current, null);
    }
    prevChoroplethRef.current = activeChoropleth;

    if (!activeChoropleth) {
      mapRef.current?.setActiveChoropleth?.(null);
      setChoroplethLegend([]);
      return;
    }

    const fmtCurrency = (value: number): string => {
      if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
      return `$${value.toFixed(2)}`;
    };

    const run = async () => {
      let spec: any;

      switch (activeChoropleth) {
        case 'gdp': {
          const byIso3 = await fetchGdpLatestByIso3();
          if (cancelled) return;
          spec = buildGdpChoropleth(byIso3, { buckets: 7 });
          break;
        }
        case 'gdp-per-capita': {
          const byIso3 = await fetchGdpPerCapitaLatestByIso3();
          if (cancelled) return;
          spec = buildGdpPerCapitaChoropleth(byIso3, { buckets: 7 });
          break;
        }
        case 'inflation': {
          const byIso3 = await fetchInflationLatestByIso3({ yearWindow: '1960:2050' });
          if (cancelled) return;
          spec = buildInflationChoropleth(byIso3, { buckets: 7 });
          break;
        }
        case 'gini': {
          const byIso3 = await fetchIndicatorLatestByIso3FromDb('gini');
          if (cancelled) return;
          spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v: number) => v.toFixed(1), palette: ['#16a34a', '#4ade80', '#86efac', '#fca5a5', '#f87171', '#ef4444', '#dc2626'] });
          break;
        }
        case 'exports': {
          const byIso3 = await fetchIndicatorLatestByIso3FromDb('exports');
          if (cancelled) return;
          spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: true, formatter: fmtCurrency, palette: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#6366f1', '#4f46e5'] });
          break;
        }
        case 'life-expectancy': {
          const byIso3 = await fetchIndicatorLatestByIso3FromDb('life-expectancy');
          if (cancelled) return;
          spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v: number) => `${v.toFixed(1)} yrs`, palette: ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'] });
          break;
        }
        case 'military-expenditure': {
          const byIso3 = await fetchIndicatorLatestByIso3FromDb('military-expenditure');
          if (cancelled) return;
          spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v: number) => `${v.toFixed(2)}%`, palette: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c'] });
          break;
        }
        case 'democracy-index': {
          const byIso3Raw = await fetchIndicatorLatestByIso3FromDb('democracy-index');
          if (cancelled) return;
          const byIso3: Record<string, { iso3: string; value: number | null; year: number | null }> = {};
          Object.entries(byIso3Raw).forEach(([iso, entry]) => {
            if (entry.value !== null) {
              const normalized = ((entry.value + 2.5) / 5) * 10;
              byIso3[iso] = { ...entry, value: Number(Math.max(0, Math.min(10, normalized)).toFixed(2)) };
            } else {
              byIso3[iso] = entry;
            }
          });
          spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v: number) => v.toFixed(1), palette: ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#86efac', '#4ade80', '#16a34a'] });
          break;
        }
        case 'trade-gdp': {
          const byIso3 = await fetchIndicatorLatestByIso3FromDb('trade-gdp');
          if (cancelled) return;
          spec = buildQuantileChoropleth(byIso3, { buckets: 7, useLog: false, formatter: (v: number) => `${v.toFixed(1)}%`, palette: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#06b6d4', '#0891b2'] });
          break;
        }
      }

      if (cancelled || !spec) return;
      setChoroplethLegend(spec.legend.map((l: any) => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.(activeChoropleth, spec as any);
      mapRef.current?.setActiveChoropleth?.(activeChoropleth);
    };
    run();
    return () => { cancelled = true; };
  }, [activeChoropleth]);

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
  }, [toggleSidebar]);

  // Left sidebar handlers
  const handleToggleLeftSidebar = useCallback(() => {
    toggleSidebar('menu', !sidebars.menu);
  }, [sidebars.menu, toggleSidebar]);

  const handleCloseLeftSidebar = useCallback(() => {
    toggleSidebar('menu', false);
  }, [toggleSidebar]);

  const handleOpenConflictTracker = useCallback(() => {
    toggleSidebar('conflict', true);
    if (historyEnabled) {
      setHistoryEnabled(false);
      mapRef.current?.setHistoryEnabled?.(false);
      mapRef.current?.setMinimalMode?.(false);
    }
  }, [toggleSidebar, historyEnabled]);

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
    setActiveChoropleth(enabled ? 'gdp' : null);
  }, []);

  const handleToggleGdpPerCapitaLayer = useCallback((enabled: boolean) => {
    setActiveChoropleth(enabled ? 'gdp-per-capita' : null);
  }, []);

  const handleToggleInflationLayer = useCallback((enabled: boolean) => {
    setActiveChoropleth(enabled ? 'inflation' : null);
  }, []);

  const handleToggleGiniLayer = useCallback((enabled: boolean) => {
    setActiveChoropleth(enabled ? 'gini' : null);
  }, []);

  const handleToggleExportsLayer = useCallback((enabled: boolean) => {
    setActiveChoropleth(enabled ? 'exports' : null);
  }, []);

  const handleToggleLifeExpectancyLayer = useCallback((enabled: boolean) => {
    setActiveChoropleth(enabled ? 'life-expectancy' : null);
  }, []);

  const handleToggleMilitaryExpenditureLayer = useCallback((enabled: boolean) => {
    setActiveChoropleth(enabled ? 'military-expenditure' : null);
  }, []);

  const handleToggleDemocracyIndexLayer = useCallback((enabled: boolean) => {
    setActiveChoropleth(enabled ? 'democracy-index' : null);
  }, []);

  const handleToggleTradeGdpLayer = useCallback((enabled: boolean) => {
    setActiveChoropleth(enabled ? 'trade-gdp' : null);
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
      
      {/* Left sidebar overlay */}
      <AnimatePresence>
        {sidebars.menu && (
          <motion.div
            className="fixed inset-0 bg-black z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ pointerEvents: historyEnabled ? 'none' as const : 'auto' as const }}
            onClick={() => { if (!historyEnabled) handleCloseLeftSidebar(); }}
          />
        )}
      </AnimatePresence>
      
      <WorldMap 
        ref={mapRefCallback}
        onCountrySelect={handleCountrySelect}
        selectedCountry={selectedCountry}
        conflicts={conflictsForMap}
        onConflictClick={handleConflictClick}
        selectedConflictId={selectedConflictId}
        isLeftSidebarOpen={sidebars.menu}
        onMapReady={handleMapReady}
      />
      
      {/* Country Sidebar */}
      <AnimatePresence>
        {sidebars.country && (
          <motion.div
            className="fixed inset-0 bg-black z-40 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={handleCloseSidebar}
          />
        )}
      </AnimatePresence>
      <CountrySidebar
        isOpen={sidebars.country}
        onClose={handleCloseSidebar}
        countryName={selectedCountry}
      />
      
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
      <AnimatePresence>
        {sidebars.conflict && (
          <motion.div
            className="fixed inset-0 bg-black z-40 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={handleCloseConflictTracker}
          />
        )}
      </AnimatePresence>
      {sidebars.conflict && (
        <ConflictTracker
          onBack={handleCloseConflictTracker}
          onCenterMap={handleCenterMapOnConflict}
          onConflictSelect={handleConflictSelect}
        />
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
