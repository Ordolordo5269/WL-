import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WorldMap from './features/world-map/WorldMap';
import LeftSidebar from './features/world-map/LeftSidebar';
import CountrySidebar from './features/country-sidebar/CountrySidebar';
import ConflictTracker from './features/conflicts/ConflictTracker';
import DemographicsPanel from './features/demographics/DemographicsPanel';
import CountryCard from './features/country/CountryCard';
import MenuToggleButton from './features/world-map/MenuToggleButton';
import CompareCountriesPopup from './features/compare/CompareCountriesPopup';
import CompareCountriesView from './features/compare/CompareCountriesView';
import { conflictsDatabase } from './data/conflicts-data';
import { useChoropleth } from './features/world-map/useChoropleth';
import { useMapControls } from './features/world-map/useMapControls';
import type { MapRefType } from './features/world-map/types';
import { NASA_EARTH_OVERLAYS, getNasaPreviewUrl, getNasaObservationDate, INSTRUMENT_INFO, OVERLAY_INSTRUMENT_MAP, type NasaOverlayType, PHYSICAL_LAYER_CONFIG, PHYSICAL_LAYER_KEYS, type PhysicalLayerType } from './features/world-map/map/mapAppearance';
import { Satellite, Waves, Mountain, MountainSnow, Droplets, Flame, Zap, Sun } from 'lucide-react';
import { getSatelliteProfileAsync, preloadSatelliteProfiles, COUNTRY_FLAGS, COUNTRY_NAMES, type SatelliteProfile } from './features/world-map/map/satellite-database';
import { MuseumLegend, MuseumExpandedCard, PURPLE_SCHEME, EARTHY_SCHEME } from './components/MuseumCard';
import './index.css';
import './styles/sidebar.css';
import "./styles/conflict-tracker.css";
import "./styles/compare-countries.css";
import "./styles/demographics.css";

interface SatelliteClickData {
  noradId: number;
  name: string;
  category: string;
  alt: number;
  objectId: string;
  country: string;
  lon: number;
  lat: number;
}

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

  const mapRef = useRef<MapRefType | null>(null);

  // Callback ref to expose map ref when it's ready
  const mapRefCallback = useCallback((node: MapRefType | null) => {
    mapRef.current = node;
    (document as any).__wl_map_comp = node;
  }, []);

  // Extracted hooks
  const choropleth = useChoropleth(mapRef);
  const mapControls = useMapControls(mapRef);

  // Satellite Intel — expanded overlay state
  const [expandedOverlay, setExpandedOverlay] = useState<NasaOverlayType | null>(null);
  const closeExpandedCard = useCallback(() => setExpandedOverlay(null), []);

  // ── Satellite Orbital Card (Phase 2) ──
  const [expandedSatellite, setExpandedSatellite] = useState<{ data: SatelliteClickData; profile: SatelliteProfile } | null>(null);
  const satCardRef = useRef<HTMLDivElement>(null);
  const [satCardTilt, setSatCardTilt] = useState({ rx: 0, ry: 0, shineX: 50, shineY: 50 });
  const handleSatCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = satCardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const maxTilt = 8;
    setSatCardTilt({
      rx: -dy * maxTilt,
      ry: dx * maxTilt,
      shineX: ((e.clientX - rect.left) / rect.width) * 100,
      shineY: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);
  const handleSatCardMouseLeave = useCallback(() => {
    setSatCardTilt({ rx: 0, ry: 0, shineX: 50, shineY: 50 });
  }, []);
  const closeSatelliteCard = useCallback(() => {
    setExpandedSatellite(null);
    setSatCardTilt({ rx: 0, ry: 0, shineX: 50, shineY: 50 });
    mapRef.current?.removeSatelliteGroundTrack?.();
  }, []);

  // ── Satellite POV Mode ──
  const [povMode, setPovMode] = useState<{ noradId: number; name: string; country: string; category: string } | null>(null);

  const enterPOV = useCallback((sat: SatelliteClickData) => {
    setExpandedSatellite(null);
    setSatCardTilt({ rx: 0, ry: 0, shineX: 50, shineY: 50 });
    mapRef.current?.enterSatellitePOV?.(sat.noradId, sat.category);
    setPovMode({ noradId: sat.noradId, name: sat.name, country: sat.country, category: sat.category });
  }, []);

  const exitPOV = useCallback(() => {
    mapRef.current?.exitSatellitePOV?.();
    mapRef.current?.removeSatelliteGroundTrack?.();
    setPovMode(null);
  }, []);

  useEffect(() => {
    if (!povMode) return;
    const handler = (e: Event) => {
      const { active } = (e as CustomEvent).detail;
      if (!active) setPovMode(null);
    };
    window.addEventListener('wl-satellite-pov', handler);
    return () => window.removeEventListener('wl-satellite-pov', handler);
  }, [povMode]);

  useEffect(() => { preloadSatelliteProfiles(); }, []);

  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as SatelliteClickData;
      if (mapRef.current?.isSatellitePOVActive?.()) {
        mapRef.current?.exitSatellitePOV?.();
        setPovMode(null);
      }
      const profile = await getSatelliteProfileAsync(detail.name, detail.country);
      setExpandedSatellite({ data: detail, profile });
    };
    window.addEventListener('wl-satellite-click', handler);
    return () => window.removeEventListener('wl-satellite-click', handler);
  }, []);

  // Physical Layers — expanded layer state
  const [expandedPhysicalLayer, setExpandedPhysicalLayer] = useState<PhysicalLayerType | null>(null);
  const closePhysicalExpandedCard = useCallback(() => setExpandedPhysicalLayer(null), []);

  // Derive active physical layers
  const activePhysicalLayers = useMemo(() => {
    const map: Record<PhysicalLayerType, boolean> = {
      rivers: mapControls.riversEnabled,
      ranges: mapControls.mountainRangesEnabled,
      peaks: mapControls.peaksEnabled,
      lakes: mapControls.lakesEnabled,
      volcanoes: mapControls.volcanoesEnabled,
      'fault-lines': mapControls.faultLinesEnabled,
      deserts: mapControls.desertsEnabled,
    };
    return PHYSICAL_LAYER_KEYS.filter(k => map[k]);
  }, [mapControls.riversEnabled, mapControls.mountainRangesEnabled, mapControls.peaksEnabled, mapControls.lakesEnabled, mapControls.volcanoesEnabled, mapControls.faultLinesEnabled, mapControls.desertsEnabled]);

  // Reset expanded physical layer card when all layers deactivate
  useEffect(() => {
    if (activePhysicalLayers.length === 0 && expandedPhysicalLayer) {
      setExpandedPhysicalLayer(null);
    }
  }, [activePhysicalLayers.length, expandedPhysicalLayer]);

  // Preload GIBS preview images as blob URLs (GIBS sends no-store, so browser HTTP cache won't help)
  const previewBlobCache = useRef<Map<string, string>>(new Map());
  const [, forcePreviewUpdate] = useState(0);
  useEffect(() => {
    const active = Object.entries(mapControls.earthOverlays)
      .filter(([, v]) => v)
      .map(([k]) => k as NasaOverlayType);
    active.forEach(type => {
      if (previewBlobCache.current.has(type)) return;
      const url = getNasaPreviewUrl(type);
      if (!url) return;
      fetch(url)
        .then(r => r.blob())
        .then(blob => {
          previewBlobCache.current.set(type, URL.createObjectURL(blob));
          forcePreviewUpdate(n => n + 1);
        })
        .catch(() => {});
    });
  }, [mapControls.earthOverlays]);

  // Instrument card — 3D tilt + dismiss state
  const instrumentCardRef = useRef<HTMLDivElement>(null);
  const [instrumentTilt, setInstrumentTilt] = useState({ rx: 0, ry: 0, shineX: 50, shineY: 50 });
  const [instrumentDismissed, setInstrumentDismissed] = useState(false);
  const handleInstrumentMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = instrumentCardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const maxTilt = 8;
    setInstrumentTilt({
      rx: -dy * maxTilt,
      ry: dx * maxTilt,
      shineX: ((e.clientX - rect.left) / rect.width) * 100,
      shineY: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);
  const handleInstrumentMouseLeave = useCallback(() => {
    setInstrumentTilt({ rx: 0, ry: 0, shineX: 50, shineY: 50 });
  }, []);

  // Reset instrument dismissed when all overlays are deactivated
  const anyOverlayActive = useMemo(() => Object.values(mapControls.earthOverlays).some(v => v), [mapControls.earthOverlays]);
  const [satAutoRotate, setSatAutoRotate] = useState(true);
  const [sat3DTerrain, setSat3DTerrain] = useState(false);
  const wasRotatingBeforeSat = useRef(false);
  useEffect(() => {
    if (!anyOverlayActive) {
      setInstrumentDismissed(false);
      // When transitioning to History Mode the overlays are deactivated but
      // History Mode manages its own rotation — don't kill it here.
      if (!mapControls.historyEnabled) {
        // Restore previous rotation state
        if (!wasRotatingBeforeSat.current) {
          mapControls.handleSetAutoRotate(false);
        }
      }
      // Disable terrain when leaving Satellite Intel
      if (sat3DTerrain) {
        mapControls.handleSetTerrain(false);
        setSat3DTerrain(false);
      }
    } else {
      // Entering Satellite Intel — save current state and start rotation at 1°/s
      wasRotatingBeforeSat.current = false; // we don't know if it was already rotating, default to stop on exit
      mapControls.handleSetRotateSpeed(1);
      mapControls.handleSetAutoRotate(true);
      setSatAutoRotate(true);
    }
  }, [anyOverlayActive]);

  // Star shimmer — gently oscillate star intensity while Satellite Intel is active
  useEffect(() => {
    if (!anyOverlayActive) return;
    let frame: number;
    const start = performance.now();
    const animate = () => {
      const map = mapRef.current?.getMap?.();
      if (map) {
        const t = (performance.now() - start) / 1000;
        // Oscillate between 0.05 and 1.0 — ~2.8s cycle
        const intensity = 0.525 + 0.475 * Math.sin(t * 2.2);
        try {
          const current = (map as any).getFog?.() || {};
          map.setFog({ ...current, 'star-intensity': intensity } as any);
        } catch {}
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [anyOverlayActive]);

  // Overlay loading indicator — triggers when overlays change, clears on map idle
  const [overlayLoading, setOverlayLoading] = useState(false);
  const overlayCountRef = useRef(0);
  useEffect(() => {
    const count = Object.values(mapControls.earthOverlays).filter(Boolean).length;
    if (count > overlayCountRef.current) {
      // New overlay activated
      setOverlayLoading(true);
      const map = mapRef.current?.getMap?.();
      if (map) {
        const onIdle = () => { setOverlayLoading(false); map.off('idle', onIdle); };
        map.on('idle', onIdle);
        // Fallback timeout in case idle doesn't fire
        const timeout = setTimeout(() => { setOverlayLoading(false); map.off('idle', onIdle); }, 8000);
        overlayCountRef.current = count;
        return () => { clearTimeout(timeout); map.off('idle', onIdle); };
      } else {
        // No map — just timeout
        const timeout = setTimeout(() => setOverlayLoading(false), 4000);
        overlayCountRef.current = count;
        return () => clearTimeout(timeout);
      }
    }
    overlayCountRef.current = count;
  }, [mapControls.earthOverlays]);

  // Derive instrument info from last activated overlay
  const instrumentKey = mapControls.lastActivatedOverlay ? OVERLAY_INSTRUMENT_MAP[mapControls.lastActivatedOverlay] : null;
  const instrumentInfo = instrumentKey ? INSTRUMENT_INFO[instrumentKey] : null;

  // Unified sidebars state
  const [sidebars, setSidebars] = useState({
    country: false,
    menu: false,
    conflict: false,
    demographics: false
  });

  // Compare Countries state
  const [compareCountries, setCompareCountries] = useState({
    popupOpen: false,
    viewOpen: false,
    country1Iso3: null as string | null,
    country2Iso3: null as string | null
  });

  // Unified sidebars handler
  const toggleSidebar = useCallback((type: 'country' | 'menu' | 'conflict' | 'demographics', open: boolean) => {
    setSidebars(prev => ({ ...prev, [type]: open }));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/data/countries-cache.json');
        const data = await res.json();
        setCountries(data);
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, []);

  // Called by WorldMap when map.on('load') fires
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
            const uniqueCountries = Array.from(
              new Map(data.data.map((country: CountryBasicInfo) => [country.cca3, country])).values()
            ) as CountryBasicInfo[];

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
  }, []);

  // Country selection handler
  const handleCountrySelect = useCallback((countryName: string) => {
    setSelectedCountry(countryName);
    toggleSidebar('country', true);
  }, [toggleSidebar]);

  const handleCloseSidebar = useCallback(() => {
    toggleSidebar('country', false);
    setSelectedCountry(null);
    mapRef.current?.setCitiesVisible?.(false);
    (window as WindowWithResetMapView).resetMapView?.();
  }, [toggleSidebar]);

  const handleResetView = useCallback(() => {
    // This function is passed to WorldMap to expose resetMapView
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
    if (mapControls.historyEnabled) {
      mapControls.handleToggleHistoryMode(false);
    }
  }, [toggleSidebar, mapControls.historyEnabled, mapControls.handleToggleHistoryMode]);

  const handleCloseConflictTracker = useCallback(() => {
    toggleSidebar('conflict', false);
    setSelectedConflictId(null);
  }, [toggleSidebar]);

  const handleOpenDemographics = useCallback(() => {
    toggleSidebar('menu', false);
    toggleSidebar('demographics', true);
  }, [toggleSidebar]);

  const handleCloseDemographics = useCallback(() => {
    toggleSidebar('demographics', false);
  }, [toggleSidebar]);

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
    // Find conflict in current map data or fallback to static
    const ucdpConflict = conflictsForMap.find((c: any) => c.id === conflictId);
    const staticConflict = conflictsDatabase.find(c => c.id === conflictId);
    const conflict = ucdpConflict || staticConflict;
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

  const selectedCountryData = useMemo(() =>
    countries.find(country =>
      country.name.toLowerCase() === selectedCountry?.toLowerCase()
    ), [countries, selectedCountry]
  );

  // UCDP conflicts for map — driven by ConflictTracker's filtered results
  const [conflictsForMap, setConflictsForMap] = useState<any[]>([]);
  const handleConflictsChange = useCallback((c: any[]) => setConflictsForMap(c), []);
  // Clear map when tracker closes
  useEffect(() => { if (!sidebars.conflict) setConflictsForMap([]); }, [sidebars.conflict]);

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
        onOpenDemographics={handleOpenDemographics}
        // Natural layers props
        onToggleRiversLayer={mapControls.handleToggleRiversLayer}
        riversEnabled={mapControls.riversEnabled}
        onToggleMountainRangesLayer={mapControls.handleToggleMountainRangesLayer}
        mountainRangesEnabled={mapControls.mountainRangesEnabled}
        onTogglePeaksLayer={mapControls.handleTogglePeaksLayer}
        peaksEnabled={mapControls.peaksEnabled}
        onToggleLakesLayer={mapControls.handleToggleLakesLayer}
        lakesEnabled={mapControls.lakesEnabled}
        onToggleVolcanoesLayer={mapControls.handleToggleVolcanoesLayer}
        volcanoesEnabled={mapControls.volcanoesEnabled}
        onToggleFaultLinesLayer={mapControls.handleToggleFaultLinesLayer}
        faultLinesEnabled={mapControls.faultLinesEnabled}
        onToggleDesertsLayer={mapControls.handleToggleDesertsLayer}
        desertsEnabled={mapControls.desertsEnabled}
        naturalLod={mapControls.naturalLod}
        onSetNaturalLod={mapControls.handleSetNaturalLod}
        // Earth Data (satellite) overlays
        earthOverlays={mapControls.earthOverlays}
        onToggleEarthOverlay={mapControls.handleToggleEarthOverlay}
        onSetBaseMapStyle={mapControls.handleSetBaseMapStyle}
        onSetPlanetPreset={mapControls.handleSetPlanetPreset}
        onSetStarIntensity={mapControls.handleSetStarIntensity}
        onSetSpacePreset={mapControls.handleSetSpacePreset}
        onSetGlobeTheme={mapControls.handleSetGlobeTheme}
        onSetTerrain={mapControls.handleSetTerrain}
        onSetTerrainExaggeration={mapControls.handleSetTerrainExaggeration}
        onSetBuildings3D={mapControls.handleSetBuildings3D}
        onSetMinimalMode={mapControls.handleSetMinimalMode}
        onSetAutoRotate={mapControls.handleSetAutoRotate}
        onSetRotateSpeed={mapControls.handleSetRotateSpeed}
        choropleth={choropleth}
        onToggleHistoryMode={mapControls.handleToggleHistoryMode}
        onSetHistoryYear={mapControls.handleSetHistoryYear}
        onResetHistoryPresentation={mapControls.handleResetHistoryPresentation}
        historyEnabled={mapControls.historyEnabled}
        historyYear={mapControls.historyYear}
        onHistoryToSatellite={mapControls.handleHistoryToSatellite}
        onSatelliteToHistory={mapControls.handleSatelliteToHistory}
        onSetOrganizationIsoFilter={mapControls.handleSetOrganizationIsoFilter}
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
            style={{ pointerEvents: mapControls.historyEnabled ? 'none' as const : 'auto' as const }}
            onClick={() => { if (!mapControls.historyEnabled) handleCloseLeftSidebar(); }}
          />
        )}
      </AnimatePresence>

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

      {/* Vignette + nebula — Satellite Intel immersive */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          opacity: anyOverlayActive ? 1 : 0,
          transition: 'opacity 1s ease',
          background: `
            radial-gradient(ellipse at 12% 8%, rgba(40,20,120,0.1) 0%, transparent 40%),
            radial-gradient(ellipse at 88% 12%, rgba(20,40,100,0.07) 0%, transparent 35%),
            radial-gradient(ellipse at 8% 88%, rgba(30,15,90,0.08) 0%, transparent 40%),
            radial-gradient(ellipse at 92% 85%, rgba(50,25,130,0.07) 0%, transparent 35%),
            radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(4,2,16,0.2) 75%, rgba(2,1,8,0.45) 100%)
          `,
        }}
      />

      {/* Instrument Info Card — Museum of the Future style (top-right) */}
      <AnimatePresence>
        {anyOverlayActive && instrumentInfo && instrumentKey && !instrumentDismissed && (
          <div
            ref={instrumentCardRef}
            onMouseMove={handleInstrumentMouseMove}
            onMouseLeave={handleInstrumentMouseLeave}
            style={{
              position: 'fixed',
              top: 20,
              right: 20,
              zIndex: 48,
              width: 280,
              transform: `perspective(800px) rotateX(${instrumentTilt.rx}deg) rotateY(${instrumentTilt.ry}deg)`,
              transition: 'transform 0.18s cubic-bezier(0.23, 1, 0.32, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            <motion.div
              key={instrumentKey}
              initial={{ opacity: 0, scale: 0.88, x: 24 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.88, x: 24 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Gradient border wrapper */}
              <div style={{
                position: 'relative',
                borderRadius: 24,
                padding: 1,
                background: 'linear-gradient(170deg, rgba(130,100,220,0.2) 0%, rgba(80,120,200,0.1) 40%, rgba(60,50,120,0.05) 100%)',
              }}>
                {/* Ambient glow */}
                <div style={{
                  position: 'absolute',
                  inset: -6,
                  borderRadius: 30,
                  background: 'radial-gradient(ellipse at 50% 20%, rgba(120,80,200,0.07) 0%, transparent 70%)',
                  filter: 'blur(12px)',
                  pointerEvents: 'none',
                }} />
                {/* Main card */}
                <div style={{
                  position: 'relative',
                  background: 'linear-gradient(170deg, rgba(14,12,28,0.97) 0%, rgba(20,16,40,0.95) 50%, rgba(32,24,56,0.93) 100%)',
                  backdropFilter: 'blur(40px) saturate(1.3)',
                  borderRadius: 23,
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 80px rgba(100,70,180,0.05), 0 0 0 0.5px rgba(255,255,255,0.03) inset',
                }}>
                  {/* Cursor-following shine */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background: `radial-gradient(circle at ${instrumentTilt.shineX}% ${instrumentTilt.shineY}%, rgba(160,140,255,0.1) 0%, rgba(120,100,220,0.03) 40%, transparent 65%)`,
                    pointerEvents: 'none',
                    transition: 'background 0.15s ease-out',
                    zIndex: 2,
                  }} />
                  {/* Satellite image */}
                  <div style={{
                    width: '100%',
                    height: 140,
                    backgroundImage: `url(${instrumentInfo.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: 'rgba(20,16,40,0.8)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Gradient fade at bottom */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 60,
                      background: 'linear-gradient(to top, rgba(14,12,28,0.97), transparent)',
                    }} />
                    {/* Close button */}
                    <button
                      onClick={() => setInstrumentDismissed(true)}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        lineHeight: 1,
                        padding: 0,
                        zIndex: 3,
                      }}
                    >{'\u2715'}</button>
                  </div>
                  {/* Content section */}
                  <div style={{ padding: '12px 22px 18px', textAlign: 'center' }}>
                    {/* Header badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      marginBottom: 10,
                    }}>
                      <div style={{ position: 'relative', width: 5, height: 5 }}>
                        <div style={{
                          position: 'absolute',
                          inset: -3,
                          borderRadius: '50%',
                          background: 'rgba(52,211,153,0.12)',
                          animation: 'pulse 3s ease-in-out infinite',
                        }} />
                        <div style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#34d399',
                          boxShadow: '0 0 8px rgba(52,211,153,0.4)',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 300,
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        color: 'rgba(170,155,210,0.45)',
                      }}>Orbital Platform</span>
                    </div>
                    {/* Instrument name */}
                    <div style={{
                      fontSize: 16,
                      fontWeight: 200,
                      color: 'rgba(240,235,255,0.92)',
                      letterSpacing: '0.02em',
                      lineHeight: 1.2,
                      marginBottom: 4,
                    }}>{instrumentInfo.instrumentName}</div>
                    {/* Satellite names */}
                    <div style={{
                      fontSize: 9,
                      fontWeight: 300,
                      letterSpacing: '0.08em',
                      color: 'rgba(160,145,210,0.4)',
                      marginBottom: 10,
                    }}>{instrumentInfo.satellites.join(' · ')}</div>
                    {/* Instrument description */}
                    <div style={{
                      fontSize: 10.5,
                      fontWeight: 300,
                      color: 'rgba(190,180,220,0.45)',
                      lineHeight: 1.7,
                      letterSpacing: '0.01em',
                      marginBottom: 14,
                    }}>{instrumentInfo.instrumentDescription}</div>
                    {/* Decorative separator */}
                    <div style={{
                      width: 28,
                      height: 1,
                      background: 'linear-gradient(90deg, transparent, rgba(140,120,200,0.2), transparent)',
                      margin: '0 auto 12px',
                    }} />
                    {/* Orbit info */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                      marginBottom: 10,
                    }}>
                      <div style={{
                        fontSize: 9,
                        fontWeight: 300,
                        color: 'rgba(170,155,210,0.5)',
                        letterSpacing: '0.04em',
                      }}>
                        <span style={{ color: 'rgba(52,211,153,0.5)', marginRight: 6 }}>&#9675;</span>
                        {instrumentInfo.orbitType}
                      </div>
                      {instrumentInfo.altitude !== 'N/A' && (
                        <div style={{
                          fontSize: 9,
                          fontWeight: 300,
                          color: 'rgba(170,155,210,0.5)',
                          letterSpacing: '0.04em',
                        }}>
                          <span style={{ color: 'rgba(52,211,153,0.5)', marginRight: 6 }}>&#9675;</span>
                          {instrumentInfo.altitude} altitude
                        </div>
                      )}
                    </div>
                    {/* Orbit description */}
                    <div style={{
                      fontSize: 9.5,
                      fontWeight: 300,
                      color: 'rgba(190,180,220,0.35)',
                      lineHeight: 1.65,
                      letterSpacing: '0.01em',
                    }}>{instrumentInfo.orbitDescription}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reopen instrument card button — appears when card was dismissed */}
      <AnimatePresence>
        {anyOverlayActive && instrumentInfo && instrumentDismissed && (
          <motion.button
            key="reopen-instrument"
            initial={false}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            onClick={() => setInstrumentDismissed(false)}
            style={{
              position: 'fixed',
              top: 24,
              right: 70,
              zIndex: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 20,
              background: 'linear-gradient(170deg, rgba(14,12,28,0.92) 0%, rgba(20,16,40,0.9) 100%)',
              backdropFilter: 'blur(24px) saturate(1.2)',
              border: '1px solid rgba(130,100,220,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.03) inset',
              color: 'rgba(200,185,240,0.7)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(130,100,220,0.35)';
              e.currentTarget.style.color = 'rgba(220,205,255,0.9)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(100,70,180,0.08), 0 0 0 0.5px rgba(255,255,255,0.05) inset';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(130,100,220,0.15)';
              e.currentTarget.style.color = 'rgba(200,185,240,0.7)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.03) inset';
            }}
          >
            <Satellite style={{ width: 13, height: 13, opacity: 0.7 }} />
            <span style={{
              fontSize: 9,
              fontWeight: 300,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>Orbital Info</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Satellite Intel Legend — Museum of the Future style */}
      <AnimatePresence>
        {(() => {
          const activeOverlays = Object.entries(mapControls.earthOverlays)
            .filter(([, v]) => v)
            .map(([k]) => k as NasaOverlayType);
          if (activeOverlays.length === 0) return null;
          return (
            <MuseumLegend
              colorScheme={PURPLE_SCHEME}
              motionKey="sat-legend"
              headerLabel="Satellite Intel"
              items={activeOverlays.map(key => {
                const cfg = NASA_EARTH_OVERLAYS[key];
                const obsDate = getNasaObservationDate(key);
                const obsLabel = obsDate ? new Date(obsDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                return { key, label: cfg.label, note: cfg.legendNote, source: cfg.legendSource, date: obsLabel || undefined };
              })}
              onItemClick={(key) => setExpandedOverlay(key as NasaOverlayType)}
              scrollClassName="sat-legend-scroll"
              loading={overlayLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10, padding: '5px 0' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid rgba(130,100,220,0.15)', borderTopColor: 'rgba(130,100,220,0.5)', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(170,155,210,0.4)' }}>Loading imagery...</span>
                </div>
              ) : undefined}
              controls={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(160,140,220,0.06)' }}>
                  {/* Auto-Rotate toggle */}
                  <div onClick={() => { const next = !satAutoRotate; setSatAutoRotate(next); mapControls.handleSetAutoRotate(next); if (next) mapControls.handleSetRotateSpeed(1); }} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', pointerEvents: 'auto', transition: 'opacity 0.15s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}>
                    <div style={{ width: 22, height: 11, borderRadius: 6, background: satAutoRotate ? 'linear-gradient(90deg, rgba(52,211,153,0.4) 0%, rgba(52,211,153,0.25) 100%)' : 'rgba(80,70,120,0.2)', border: `1px solid ${satAutoRotate ? 'rgba(52,211,153,0.3)' : 'rgba(120,100,180,0.12)'}`, position: 'relative', transition: 'all 0.25s ease' }}>
                      <div style={{ position: 'absolute', top: 1, left: satAutoRotate ? 11 : 1, width: 7, height: 7, borderRadius: '50%', background: satAutoRotate ? '#34d399' : 'rgba(160,140,200,0.3)', boxShadow: satAutoRotate ? '0 0 6px rgba(52,211,153,0.4)' : 'none', transition: 'all 0.25s ease' }} />
                    </div>
                    <span style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: satAutoRotate ? 'rgba(52,211,153,0.6)' : 'rgba(160,140,200,0.3)', transition: 'color 0.25s ease' }}>Auto-Rotate</span>
                  </div>
                  <div style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(160,140,220,0.2)' }} />
                  {/* 3D Terrain toggle */}
                  <div onClick={() => { const next = !sat3DTerrain; setSat3DTerrain(next); mapControls.handleSetTerrain(next); }} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', pointerEvents: 'auto', transition: 'opacity 0.15s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}>
                    <div style={{ width: 22, height: 11, borderRadius: 6, background: sat3DTerrain ? 'linear-gradient(90deg, rgba(52,211,153,0.4) 0%, rgba(52,211,153,0.25) 100%)' : 'rgba(80,70,120,0.2)', border: `1px solid ${sat3DTerrain ? 'rgba(52,211,153,0.3)' : 'rgba(120,100,180,0.12)'}`, position: 'relative', transition: 'all 0.25s ease' }}>
                      <div style={{ position: 'absolute', top: 1, left: sat3DTerrain ? 11 : 1, width: 7, height: 7, borderRadius: '50%', background: sat3DTerrain ? '#34d399' : 'rgba(160,140,200,0.3)', boxShadow: sat3DTerrain ? '0 0 6px rgba(52,211,153,0.4)' : 'none', transition: 'all 0.25s ease' }} />
                    </div>
                    <span style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: sat3DTerrain ? 'rgba(52,211,153,0.6)' : 'rgba(160,140,200,0.3)', transition: 'color 0.25s ease' }}>3D Terrain</span>
                  </div>
                </div>
              }
            />
          );
        })()}
      </AnimatePresence>

      {/* Satellite Intel — Expanded Card */}
      <AnimatePresence>
        {expandedOverlay && (() => {
          const cfg = NASA_EARTH_OVERLAYS[expandedOverlay];
          const cachedBlob = previewBlobCache.current.get(expandedOverlay);
          const previewUrl = cachedBlob || getNasaPreviewUrl(expandedOverlay);
          const obsDate = getNasaObservationDate(expandedOverlay);
          const obsLabel = obsDate ? new Date(obsDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
          return (
            <MuseumExpandedCard
              variant="purple"
              motionKey="sat-expanded-card"
              heroContent={{ type: 'image', url: previewUrl, shimmer: !cachedBlob }}
              sourceLabel={cfg.legendSource}
              date={obsLabel || undefined}
              title={cfg.label}
              description={cfg.expandedDescription}
              footerIcon={<Satellite style={{ width: 16, height: 16 }} />}
              onClose={closeExpandedCard}
            />
          );
        })()}
      </AnimatePresence>

      {/* Satellite Orbital Card — expanded profile (Phase 2) */}
      <AnimatePresence>
        {expandedSatellite && (() => {
          const sat = expandedSatellite.data;
          const profile = expandedSatellite.profile;
          const catColor = ({ military: '#ff4444', weather: '#44aaff', stations: '#d4a0ff', starlink: '#00ff88' } as Record<string, string>)[sat.category] || '#ffffff';
          const flag = COUNTRY_FLAGS[sat.country] || '';
          const countryName = COUNTRY_NAMES[sat.country] || sat.country;
          const iconPath = ({ military: '/icons/sat-military.svg', weather: '/icons/sat-weather.svg', stations: '/icons/sat-stations.svg' } as Record<string, string>)[sat.category];
          return (
            <>
              <motion.div
                key="sat-orbital-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={closeSatelliteCard}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 55,
                  background: 'rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(6px)',
                }}
              />
              <div
                ref={satCardRef}
                onMouseMove={handleSatCardMouseMove}
                onMouseLeave={handleSatCardMouseLeave}
                style={{
                  position: 'fixed',
                  bottom: 40,
                  right: 24,
                  zIndex: 60,
                  width: 340,
                  transform: `perspective(800px) rotateX(${satCardTilt.rx}deg) rotateY(${satCardTilt.ry}deg)`,
                  transition: 'transform 0.18s cubic-bezier(0.23, 1, 0.32, 1)',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                }}
              >
                <motion.div
                  key="sat-orbital-card"
                  initial={{ opacity: 0, scale: 0.85, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 40 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                >
                  {/* Gradient border */}
                  <div style={{
                    borderRadius: 24,
                    padding: 1,
                    background: `linear-gradient(170deg, ${catColor}33 0%, ${catColor}15 40%, rgba(60,50,120,0.05) 100%)`,
                    position: 'relative',
                  }}>
                    {/* Cursor-following shine */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'inherit',
                      background: `radial-gradient(circle at ${satCardTilt.shineX}% ${satCardTilt.shineY}%, rgba(160,140,255,0.1) 0%, rgba(120,100,220,0.03) 40%, transparent 65%)`,
                      pointerEvents: 'none',
                      transition: 'background 0.15s ease-out',
                      zIndex: 1,
                    }} />
                    {/* Main card */}
                    <div style={{
                      borderRadius: 23,
                      background: 'linear-gradient(170deg, rgba(14,12,28,0.97) 0%, rgba(20,16,40,0.95) 50%, rgba(32,24,56,0.93) 100%)',
                      backdropFilter: 'blur(40px) saturate(1.3)',
                      overflow: 'hidden',
                      boxShadow: `0 24px 70px rgba(0,0,0,0.6), 0 0 100px ${catColor}0F`,
                    }}>
                      {/* Image header section */}
                      <div style={{
                        width: '100%',
                        height: 180,
                        ...(profile.imageUrl
                          ? { backgroundImage: `url(${profile.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'rgba(20,16,40,0.8)' }
                          : { background: `linear-gradient(135deg, ${catColor}15 0%, rgba(20,16,40,0.6) 60%, rgba(14,12,28,0.95) 100%)` }
                        ),
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {/* Shimmer while image loads */}
                        {profile.imageUrl && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(110deg, rgba(20,16,40,0) 30%, rgba(80,60,140,0.08) 50%, rgba(20,16,40,0) 70%)',
                            backgroundSize: '200% 100%',
                            animation: 'satShimmer 1.5s ease-in-out infinite',
                          }} />
                        )}
                        {/* Category icon overlay when no image */}
                        {!profile.imageUrl && (iconPath ? (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={iconPath} alt="" style={{ width: 64, height: 64, opacity: 0.4, filter: 'brightness(1.5)' }} />
                          </div>
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Satellite style={{ width: 40, height: 40, color: catColor, opacity: 0.3 }} />
                          </div>
                        ))}
                        {/* Gradient fade at bottom */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
                          background: 'linear-gradient(to top, rgba(14,12,28,0.97), transparent)',
                        }} />
                        {/* Close button */}
                        <button
                          onClick={closeSatelliteCard}
                          style={{
                            position: 'absolute', top: 12, right: 12,
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.45)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, lineHeight: 1, padding: 0,
                          }}
                        >{'\u2715'}</button>
                        {/* Category badge */}
                        <div style={{
                          position: 'absolute', top: 12, left: 14,
                          fontSize: 7, fontWeight: 400, letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: catColor,
                          background: `${catColor}15`,
                          border: `1px solid ${catColor}30`,
                          borderRadius: 10, padding: '3px 10px',
                        }}>{sat.category}</div>
                      </div>

                      {/* Content section */}
                      <div style={{ padding: '14px 26px 22px' }}>
                        {/* Country */}
                        {sat.country && (
                          <div style={{
                            fontSize: 8, fontWeight: 400, letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: 'rgba(170,155,210,0.45)',
                            marginBottom: 6,
                          }}>{flag}  {countryName}</div>
                        )}
                        {/* Satellite name */}
                        <div style={{
                          fontSize: 20, fontWeight: 200,
                          color: 'rgba(240,235,255,0.92)',
                          letterSpacing: '0.02em', lineHeight: 1.2,
                          marginBottom: 4,
                        }}>{sat.name}</div>
                        {/* Program */}
                        <div style={{
                          fontSize: 11, fontWeight: 300,
                          color: 'rgba(160,145,210,0.5)',
                          marginBottom: 10,
                        }}>{profile.program}</div>
                        {/* Description */}
                        <div style={{
                          fontSize: 11, fontWeight: 300,
                          color: 'rgba(190,180,220,0.45)',
                          lineHeight: 1.75, letterSpacing: '0.01em',
                          marginBottom: 16,
                        }}>{profile.description}</div>
                        {/* Separator */}
                        <div style={{
                          width: 28, height: 1,
                          background: 'linear-gradient(90deg, transparent, rgba(140,120,200,0.2), transparent)',
                          margin: '0 auto 14px',
                        }} />
                        {/* Orbital details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                          <div style={{ fontSize: 9, fontWeight: 300, color: 'rgba(170,155,210,0.5)', letterSpacing: '0.04em' }}>
                            <span style={{ color: `${catColor}80`, marginRight: 6 }}>&#9675;</span>
                            {profile.orbitType}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 300, color: 'rgba(170,155,210,0.5)', letterSpacing: '0.04em' }}>
                            <span style={{ color: `${catColor}80`, marginRight: 6 }}>&#9675;</span>
                            {sat.alt.toLocaleString()} km altitude
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 300, color: 'rgba(170,155,210,0.5)', letterSpacing: '0.04em' }}>
                            <span style={{ color: `${catColor}80`, marginRight: 6 }}>&#9675;</span>
                            {profile.coverage}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 300, color: 'rgba(170,155,210,0.5)', letterSpacing: '0.04em' }}>
                            <span style={{ color: `${catColor}80`, marginRight: 6 }}>&#9675;</span>
                            {profile.operator}
                          </div>
                        </div>
                        {/* Enter POV button */}
                        <button
                          onClick={() => enterPOV(sat)}
                          style={{
                            width: '100%',
                            padding: '9px 16px',
                            marginBottom: 14,
                            background: `linear-gradient(135deg, ${catColor}20 0%, ${catColor}10 100%)`,
                            border: `1px solid ${catColor}40`,
                            borderRadius: 10,
                            color: catColor,
                            fontSize: 10,
                            fontWeight: 400,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `linear-gradient(135deg, ${catColor}40 0%, ${catColor}25 100%)`;
                            e.currentTarget.style.borderColor = `${catColor}70`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `linear-gradient(135deg, ${catColor}20 0%, ${catColor}10 100%)`;
                            e.currentTarget.style.borderColor = `${catColor}40`;
                          }}
                        >
                          <Satellite style={{ width: 13, height: 13 }} />
                          Enter POV
                        </button>
                        {/* Separator */}
                        <div style={{
                          width: 28, height: 1,
                          background: 'linear-gradient(90deg, transparent, rgba(140,120,200,0.2), transparent)',
                          margin: '0 auto 14px',
                        }} />
                        {/* Footer — NORAD + source */}
                        <div style={{
                          fontSize: 8, fontWeight: 300, letterSpacing: '0.06em',
                          color: 'rgba(140,125,180,0.3)',
                          textAlign: 'center',
                        }}>
                          NORAD {sat.noradId}{sat.objectId ? ` \u00B7 ${sat.objectId}` : ''}
                        </div>
                        <div style={{
                          fontSize: 7, fontWeight: 300, letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'rgba(140,125,180,0.2)',
                          textAlign: 'center',
                          marginTop: 4,
                        }}>CelesTrak \u00B7 WorldLore</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Satellite POV HUD */}
      <AnimatePresence>
        {povMode && (() => {
          const flag = COUNTRY_FLAGS[povMode.country] || '';
          const hudColor = ({ military: '#ff4444', weather: '#44aaff', stations: '#d4a0ff', starlink: '#00ff88' } as Record<string, string>)[povMode.category] || '#ffffff';
          return (
            <motion.div
              key="sat-pov-hud"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50,
                pointerEvents: 'auto',
              }}
            >
              <div style={{
                borderRadius: 16,
                padding: 1,
                background: `linear-gradient(170deg, ${hudColor}30 0%, ${hudColor}10 40%, rgba(60,50,120,0.05) 100%)`,
              }}>
                <div style={{
                  borderRadius: 15,
                  background: 'linear-gradient(170deg, rgba(10,8,20,0.95) 0%, rgba(16,12,32,0.93) 100%)',
                  backdropFilter: 'blur(40px) saturate(1.3)',
                  padding: '12px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 60px ${hudColor}08`,
                }}>
                  {/* Satellite info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: hudColor,
                      boxShadow: `0 0 10px ${hudColor}80`,
                      animation: 'pulse 2s ease-in-out infinite',
                    }} />
                    <span style={{
                      fontSize: 12, fontWeight: 300, color: 'rgba(240,235,255,0.9)',
                      letterSpacing: '0.03em',
                    }}>{povMode.name}</span>
                    {flag && <span style={{ fontSize: 14 }}>{flag}</span>}
                  </div>
                  {/* Separator */}
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />
                  {/* POV label */}
                  <div style={{
                    fontSize: 7, fontWeight: 400, letterSpacing: '0.2em',
                    textTransform: 'uppercase', color: `${hudColor}90`,
                  }}>POV Mode</div>
                  {/* Separator */}
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />
                  {/* Exit button */}
                  <button
                    onClick={exitPOV}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: 9,
                      fontWeight: 300,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,80,80,0.15)';
                      e.currentTarget.style.borderColor = 'rgba(255,80,80,0.3)';
                      e.currentTarget.style.color = 'rgba(255,120,120,0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    }}
                  >Exit POV</button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Physical Layers Legend */}
      <AnimatePresence>
        {(() => {
          if (activePhysicalLayers.length === 0) return null;
          const PhysIconMap: Record<string, React.ComponentType<any>> = { Waves, Mountain, MountainSnow, Droplets, Flame, Zap, Sun };
          return (
            <MuseumLegend
              colorScheme={EARTHY_SCHEME}
              motionKey="phys-legend"
              headerLabel="Physical Layers"
              items={activePhysicalLayers.map(key => {
                const cfg = PHYSICAL_LAYER_CONFIG[key];
                const iconSvgs: Record<string, React.ReactNode> = {
                  rivers: <svg width="28" height="18" viewBox="0 0 28 18" fill="none"><path d="M2 14 C8 14, 8 4, 14 4 C20 4, 20 14, 26 14" stroke={cfg.color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.9" /><path d="M4 16 C8 16, 10 10, 14 10" stroke={cfg.color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" /></svg>,
                  ranges: <svg width="28" height="18" viewBox="0 0 28 18" fill="none"><path d="M1 16 L7 5 L10 9 L14 2 L18 9 L21 5 L27 16Z" fill={cfg.color} fillOpacity="0.2" stroke={cfg.color} strokeWidth="1" strokeDasharray="3 2" strokeLinecap="round" opacity="0.8" /></svg>,
                  peaks: <svg width="28" height="18" viewBox="0 0 28 18" fill="none"><path d="M14 2 L20 16 L8 16Z" fill={cfg.color} fillOpacity="0.15" stroke={cfg.color} strokeWidth="1" opacity="0.8" /><circle cx="14" cy="5" r="1.5" fill="#fff" fillOpacity="0.6" /></svg>,
                  lakes: <svg width="28" height="18" viewBox="0 0 28 18" fill="none"><ellipse cx="14" cy="10" rx="11" ry="6" fill={cfg.color} fillOpacity="0.25" stroke={cfg.color} strokeWidth="1" opacity="0.8" /><path d="M7 9 Q14 7, 21 9" stroke={cfg.color} strokeWidth="0.5" fill="none" opacity="0.4" /></svg>,
                  volcanoes: <svg width="28" height="18" viewBox="0 0 28 18" fill="none"><path d="M10 16 L14 6 L18 16" fill={cfg.color} fillOpacity="0.15" stroke={cfg.color} strokeWidth="1" opacity="0.7" /><circle cx="14" cy="4" r="2.5" fill={cfg.color} fillOpacity="0.3" stroke={cfg.color} strokeWidth="0.8" opacity="0.9" /><circle cx="14" cy="4" r="1" fill="#ff8c00" fillOpacity="0.8" /></svg>,
                  'fault-lines': <svg width="28" height="18" viewBox="0 0 28 18" fill="none"><path d="M2 14 L8 6 L14 12 L20 4 L26 10" stroke={cfg.color} strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" fill="none" opacity="0.9" /><path d="M8 6 L6 2" stroke={cfg.color} strokeWidth="0.8" fill="none" opacity="0.4" /><path d="M20 4 L22 1" stroke={cfg.color} strokeWidth="0.8" fill="none" opacity="0.4" /></svg>,
                  deserts: <svg width="28" height="18" viewBox="0 0 28 18" fill="none"><rect x="2" y="4" width="24" height="12" rx="3" fill={cfg.color} fillOpacity="0.2" stroke={cfg.color} strokeWidth="1" strokeDasharray="3 2" opacity="0.7" /><circle cx="9" cy="9" r="1" fill={cfg.color} fillOpacity="0.4" /><circle cx="14" cy="11" r="0.8" fill={cfg.color} fillOpacity="0.3" /><circle cx="19" cy="8" r="1" fill={cfg.color} fillOpacity="0.4" /></svg>,
                };
                return {
                  key, label: cfg.label, note: cfg.legendNote, source: cfg.legendSource,
                  icon: <div style={{ width: 28, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconSvgs[key]}</div>,
                  iconIndent: 38,
                };
              })}
              onItemClick={(key) => setExpandedPhysicalLayer(key as PhysicalLayerType)}
              scrollClassName="phys-legend-scroll"
              controls={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(180,140,80,0.06)', pointerEvents: 'auto' }}>
                  {(['auto', 'low', 'med', 'high'] as const).map((l) => (
                    <div key={l} onClick={() => mapControls.handleSetNaturalLod(l)} style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: mapControls.naturalLod === l ? 'rgba(212,168,83,0.8)' : 'rgba(190,170,130,0.3)', background: mapControls.naturalLod === l ? 'linear-gradient(135deg, rgba(180,140,60,0.12) 0%, rgba(140,100,40,0.06) 100%)' : 'transparent', padding: '3px 8px', borderRadius: 10, border: `1px solid ${mapControls.naturalLod === l ? 'rgba(180,140,80,0.15)' : 'rgba(180,140,80,0.05)'}`, cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}>{l}</div>
                  ))}
                </div>
              }
            />
          );
        })()}
      </AnimatePresence>

      {/* Physical Layers — Expanded Card */}
      <AnimatePresence>
        {expandedPhysicalLayer && (() => {
          const cfg = PHYSICAL_LAYER_CONFIG[expandedPhysicalLayer];
          const PhysIconMap2: Record<string, React.ComponentType<any>> = { Waves, Mountain, MountainSnow, Droplets, Flame, Zap, Sun };
          const LayerIcon = PhysIconMap2[cfg.iconName] || Mountain;
          return (
            <MuseumExpandedCard
              variant="earthy"
              motionKey="phys-expanded-card"
              heroContent={{ type: 'image', url: cfg.heroSvg }}
              sourceLabel={cfg.legendSource}
              title={cfg.label}
              description={cfg.expandedDescription}
              footerIcon={<LayerIcon style={{ width: 16, height: 16 }} />}
              onClose={closePhysicalExpandedCard}
            />
          );
        })()}
      </AnimatePresence>

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
          onConflictsChange={handleConflictsChange}
        />
      )}

      {/* Demographics Panel */}
      <AnimatePresence>
        {sidebars.demographics && (
          <motion.div
            className="fixed inset-0 bg-black z-40 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={handleCloseDemographics}
          />
        )}
      </AnimatePresence>
      {sidebars.demographics && (
        <DemographicsPanel
          onBack={handleCloseDemographics}
          onCenterMap={handleCenterMapOnConflict}
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
