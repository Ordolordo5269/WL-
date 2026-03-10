import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WorldMap from './features/world-map/WorldMap';
import LeftSidebar from './features/world-map/LeftSidebar';
import CountrySidebar from './features/country-sidebar/CountrySidebar';
import ConflictTracker from './features/conflicts/ConflictTracker';
import CountryCard from './features/country/CountryCard';
import MenuToggleButton from './features/world-map/MenuToggleButton';
import CompareCountriesPopup from './features/compare/CompareCountriesPopup';
import CompareCountriesView from './features/compare/CompareCountriesView';
import { useChoropleth } from './features/world-map/useChoropleth';
import { useMapControls } from './features/world-map/useMapControls';
import type { MapRefType } from './features/world-map/types';
import './index.css';
import './styles/sidebar.css';
import "./styles/conflict-tracker.css";
import "./styles/compare-countries.css";

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

  // Unified sidebars state
  const [sidebars, setSidebars] = useState({
    country: false,
    menu: false,
    conflict: false
  });

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

  const handleCenterMapOnConflict = (coordinates: { lat: number; lng: number }) => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        center: [coordinates.lng, coordinates.lat],
        zoom: 4,
        duration: 1200
      });
    }
  };

  const handleConflictClick = (_conflictId: string) => {
    // Conflict clicks from the map are no longer driven by static data.
    // The ConflictTracker component handles selection via API.
    toggleSidebar('conflict', true);
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

  // Conflicts for map — static data removed; pass empty array for now.
  // Future: fetch conflict coordinates from API for map markers.
  const conflictsForMap = useMemo(() => [] as any[], []);

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
        onSetBaseMapStyle={mapControls.handleSetBaseMapStyle}
        onSetPlanetPreset={mapControls.handleSetPlanetPreset}
        onSetStarIntensity={mapControls.handleSetStarIntensity}
        onSetSpacePreset={mapControls.handleSetSpacePreset}
        onSetTerrain={mapControls.handleSetTerrain}
        onSetTerrainExaggeration={mapControls.handleSetTerrainExaggeration}
        onSetBuildings3D={mapControls.handleSetBuildings3D}
        onSetMinimalMode={mapControls.handleSetMinimalMode}
        onSetAutoRotate={mapControls.handleSetAutoRotate}
        onSetRotateSpeed={mapControls.handleSetRotateSpeed}
        onToggleGdpLayer={choropleth.handleToggleGdpLayer}
        gdpEnabled={choropleth.gdpEnabled}
        gdpLegend={choropleth.gdpLegend}
        onToggleGdpPerCapitaLayer={choropleth.handleToggleGdpPerCapitaLayer}
        gdpPerCapitaEnabled={choropleth.gdpPerCapitaEnabled}
        gdpPerCapitaLegend={choropleth.gdpPerCapitaLegend}
        onToggleInflationLayer={choropleth.handleToggleInflationLayer}
        inflationEnabled={choropleth.inflationEnabled}
        inflationLegend={choropleth.inflationLegend}
        onToggleGiniLayer={choropleth.handleToggleGiniLayer}
        giniEnabled={choropleth.giniEnabled}
        giniLegend={choropleth.giniLegend}
        onToggleExportsLayer={choropleth.handleToggleExportsLayer}
        exportsEnabled={choropleth.exportsEnabled}
        exportsLegend={choropleth.exportsLegend}
        onToggleLifeExpectancyLayer={choropleth.handleToggleLifeExpectancyLayer}
        lifeExpectancyEnabled={choropleth.lifeExpectancyEnabled}
        lifeExpectancyLegend={choropleth.lifeExpectancyLegend}
        onToggleMilitaryExpenditureLayer={choropleth.handleToggleMilitaryExpenditureLayer}
        militaryExpenditureEnabled={choropleth.militaryExpenditureEnabled}
        militaryExpenditureLegend={choropleth.militaryExpenditureLegend}
        onToggleDemocracyIndexLayer={choropleth.handleToggleDemocracyIndexLayer}
        democracyIndexEnabled={choropleth.democracyIndexEnabled}
        democracyIndexLegend={choropleth.democracyIndexLegend}
        onToggleTradeGdpLayer={choropleth.handleToggleTradeGdpLayer}
        tradeGdpEnabled={choropleth.tradeGdpEnabled}
        tradeGdpLegend={choropleth.tradeGdpLegend}
        onToggleFuelExportsLayer={choropleth.handleToggleFuelExportsLayer}
        fuelExportsEnabled={choropleth.fuelExportsEnabled}
        fuelExportsLegend={choropleth.fuelExportsLegend}
        onToggleMineralRentsLayer={choropleth.handleToggleMineralRentsLayer}
        mineralRentsEnabled={choropleth.mineralRentsEnabled}
        mineralRentsLegend={choropleth.mineralRentsLegend}
        onToggleEnergyImportsLayer={choropleth.handleToggleEnergyImportsLayer}
        energyImportsEnabled={choropleth.energyImportsEnabled}
        energyImportsLegend={choropleth.energyImportsLegend}
        onToggleCerealProductionLayer={choropleth.handleToggleCerealProductionLayer}
        cerealProductionEnabled={choropleth.cerealProductionEnabled}
        cerealProductionLegend={choropleth.cerealProductionLegend}
        onToggleHistoryMode={mapControls.handleToggleHistoryMode}
        onSetHistoryYear={mapControls.handleSetHistoryYear}
        historyEnabled={mapControls.historyEnabled}
        historyYear={mapControls.historyYear}
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
