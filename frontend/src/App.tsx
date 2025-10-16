import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WorldMap from '../components/WorldMap';
import LeftSidebar from '../components/LeftSidebar';
import { fetchGdpLatestByIso3, buildGdpChoropleth } from '../services/worldbank-gdp';
import { fetchInflationLatestByIso3, buildInflationChoropleth } from '../services/worldbank-inflation';
import CountrySidebar from '../components/CountrySidebar';
import ConflictTracker from '../components/ConflictTracker';
import GdeltTracker from '../components/GdeltTracker';
import CountryCard from '../components/CountryCard';
import MenuToggleButton from '../components/MenuToggleButton';
import { conflictsDatabase } from '../data/conflicts-data';
import './index.css';
import './styles/sidebar.css';
import "./styles/conflict-tracker.css";

// ✅ MEJORADO: Interfaces específicas para evitar tipos 'any'
interface Country {
  name: string;
  capital: string;
  region: string;
}

interface WindowWithResetMapView extends Window {
  resetMapView?: () => void;
}

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
type MapEaseToOptionsApp = { center?: [number, number]; zoom?: number; duration?: number; easing?: (t: number) => number; pitch?: number; bearing?: number };
const mapRef = useRef<{ easeTo: (options: MapEaseToOptionsApp) => void; getMap: () => any; setBaseMapStyle?: (next: 'night' | 'light' | 'outdoors' | 'physical') => void; setPlanetPreset?: (preset: 'default' | 'nebula' | 'sunset' | 'dawn') => void; setTerrainEnabled?: (v: boolean) => void; setHillshadeEnabled?: (v: boolean) => void; setMinimalMode?: (v: boolean) => void; setAutoRotate?: (v: boolean) => void; setRotateSpeed?: (v: number) => void; setChoropleth?: (metric: 'gdp' | 'inflation', spec: any | null) => void; setActiveChoropleth?: (metric: 'gdp' | 'inflation' | null) => void } | null>(null);

  // Add unified sidebars state
  const [sidebars, setSidebars] = useState({
    country: false, // right sidebar for countries
    menu: false,    // left menu sidebar
    conflict: false, // conflict tracker
    gdelt: false     // gdelt tracker
  });

  const [gdpEnabled, setGdpEnabled] = useState<boolean>(false);
  const [gdpLegend, setGdpLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);
  const [inflationEnabled, setInflationEnabled] = useState<boolean>(false);
  const [inflationLegend, setInflationLegend] = useState<Array<{ color: string; min?: number; max?: number }>>([]);

  // Unified sidebars handler
  const toggleSidebar = useCallback((type: 'country' | 'menu' | 'conflict' | 'gdelt', open: boolean) => {
    setSidebars(prev => ({ ...prev, [type]: open }));
  }, []);

  useEffect(() => {
    // Load countries and warm up GDP cache
    const load = async () => {
      try {
        const res = await fetch('/data/countries-cache.json');
        const data = await res.json();
        setCountries(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // Prefetch in background to speed up toggle
    fetchGdpLatestByIso3({ yearWindow: '1960:2050' }).catch(() => {});
    fetchInflationLatestByIso3({ yearWindow: '1960:2050' }).catch(() => {});
  }, []);

  // GDP layer management
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!gdpEnabled) {
        if (inflationEnabled) mapRef.current?.setActiveChoropleth?.('inflation');
        else mapRef.current?.setActiveChoropleth?.(null);
        setGdpLegend([]);
        return;
      }
      const byIso3 = await fetchGdpLatestByIso3({ yearWindow: '1960:2050' });
      if (cancelled) return;
      const spec = buildGdpChoropleth(byIso3, { buckets: 7 });
      setGdpLegend(spec.legend.map(l => ({ color: l.color, min: l.min, max: l.max })));
      mapRef.current?.setChoropleth?.('gdp', spec as any);
      mapRef.current?.setActiveChoropleth?.('gdp');
    };
    run();
    return () => { cancelled = true; };
  }, [gdpEnabled]);

  // Inflation layer management
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!inflationEnabled) {
        if (gdpEnabled) mapRef.current?.setActiveChoropleth?.('gdp');
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
  }, [inflationEnabled]);

  // Country selection handler
  const handleCountrySelect = useCallback((countryName: string) => {
    setSelectedCountry(countryName);
    toggleSidebar('country', true);
  }, [toggleSidebar]);

  const handleCloseSidebar = useCallback(() => {
    toggleSidebar('country', false);
    setSelectedCountry(null);
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
  }, [toggleSidebar]);

  const handleCloseConflictTracker = useCallback(() => {
    toggleSidebar('conflict', false);
    setSelectedConflictId(null);
  }, [toggleSidebar]);

  const handleOpenGdeltTracker = useCallback(() => {
    toggleSidebar('gdelt', true);
  }, [toggleSidebar]);

  const handleCloseGdeltTracker = useCallback(() => {
    toggleSidebar('gdelt', false);
  }, [toggleSidebar]);

  // New: map style callbacks for Settings section
  const handleSetBaseMapStyle = useCallback((next: 'night' | 'light' | 'outdoors' | 'physical') => {
    mapRef.current?.setBaseMapStyle?.(next);
  }, []);
  const handleSetPlanetPreset = useCallback((preset: 'default' | 'nebula' | 'sunset' | 'dawn') => {
    mapRef.current?.setPlanetPreset?.(preset);
  }, []);
  const handleSetTerrain = useCallback((v: boolean) => {
    mapRef.current?.setTerrainEnabled?.(v);
  }, []);
  const handleSetMinimalMode = useCallback((v: boolean) => {
    mapRef.current?.setMinimalMode?.(v);
  }, []);

  const handleSetAutoRotate = useCallback((v: boolean) => {
    mapRef.current?.setAutoRotate?.(v);
  }, []);
  const handleSetRotateSpeed = useCallback((n: number) => {
    mapRef.current?.setRotateSpeed?.(n);
  }, []);

  const handleToggleGdpLayer = useCallback((enabled: boolean) => {
    setGdpEnabled(enabled);
  }, []);

  const handleToggleInflationLayer = useCallback((enabled: boolean) => {
    setInflationEnabled(enabled);
    if (enabled) setGdpEnabled(false); // ensure only one is active in current UI
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

  // Memoized country data to prevent unnecessary recalculations
  const selectedCountryData = useMemo(() => 
    countries.find(country => 
      country.name.toLowerCase() === selectedCountry?.toLowerCase()
    ), [countries, selectedCountry]
  );

  // Memoized conflicts data for better performance
  // Update conflictsForMap
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
        onOpenGdeltTracker={handleOpenGdeltTracker}
        onSetBaseMapStyle={handleSetBaseMapStyle}
        onSetPlanetPreset={handleSetPlanetPreset}
        onSetTerrain={handleSetTerrain}
        onSetMinimalMode={handleSetMinimalMode}
        onSetAutoRotate={handleSetAutoRotate}
        onSetRotateSpeed={handleSetRotateSpeed}
        onToggleGdpLayer={handleToggleGdpLayer}
        gdpEnabled={gdpEnabled}
        gdpLegend={gdpLegend}
        onToggleInflationLayer={handleToggleInflationLayer}
        inflationEnabled={inflationEnabled}
        inflationLegend={inflationLegend}
      />
      
      {/* Left sidebar overlay */}
      {sidebars.menu && (
        <motion.div 
          className="fixed inset-0 bg-black z-40 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          onClick={handleCloseLeftSidebar}
        />
      )}
      
      <WorldMap 
        ref={mapRef}
        onCountrySelect={handleCountrySelect}
        selectedCountry={selectedCountry}
        onResetView={handleResetView}
        conflicts={conflictsForMap}
        onConflictClick={handleConflictClick}
        selectedConflictId={selectedConflictId}
        isLeftSidebarOpen={sidebars.menu}
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

      {/* GDELT Tracker */}
      {sidebars.gdelt && (
        <>
          {/* Overlay for GdeltTracker */}
          <motion.div 
            className="fixed inset-0 bg-black z-40 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={handleCloseGdeltTracker}
          />

          <GdeltTracker 
            onBack={handleCloseGdeltTracker}
          />
        </>
      )}
    </div>
  );
}

export default App;
