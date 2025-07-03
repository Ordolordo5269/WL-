import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WorldMap from '../components/WorldMap';
import LeftSidebar from '../components/LeftSidebar';
import CountrySidebar from '../components/CountrySidebar';
import ConflictTracker from '../components/ConflictTracker';
import CountryCard from '../components/CountryCard';
import MenuToggleButton from '../components/MenuToggleButton';
import { conflictsDatabase } from '../data/conflicts-data';
import './index.css';
import './styles/sidebar.css';
import "./styles/conflict-tracker.css";

interface Country {
  name: string;
  capital: string;
  region: string;
}

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isConflictTrackerOpen, setIsConflictTrackerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Load countries from local cache
    fetch('/data/countries-cache.json')
      .then((res) => res.json())
      .then((data) => {
        setCountries(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  }, []);

  // Optimized handlers with useCallback to prevent unnecessary re-renders
  const handleCountrySelect = useCallback((countryName: string) => {
    setSelectedCountry(countryName);
    setIsSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    setSelectedCountry(null);
    // Resetear la vista del mapa a la vista principal del globo
    if ((window as any).resetMapView) {
      (window as any).resetMapView();
    }
  }, []);

  const handleResetView = useCallback(() => {
    // Esta función se pasa al WorldMap para exponer resetMapView
  }, []);

  const handleToggleLeftSidebar = useCallback(() => {
    setIsLeftSidebarOpen(!isLeftSidebarOpen);
  }, [isLeftSidebarOpen]);

  const handleCloseLeftSidebar = useCallback(() => {
    setIsLeftSidebarOpen(false);
  }, []);

  const handleOpenConflictTracker = useCallback(() => {
    setIsConflictTrackerOpen(true);
    setIsLeftSidebarOpen(false);
  }, []);

  const handleCloseConflictTracker = useCallback(() => {
    setIsConflictTrackerOpen(false);
    setSelectedConflictId(null);
  }, []);

  const handleBackToLeftSidebar = useCallback(() => {
    setIsConflictTrackerOpen(false);
    setIsLeftSidebarOpen(true);
    setSelectedConflictId(null);
  }, []);

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
      setIsConflictTrackerOpen(true);
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
  const conflictsForMap = useMemo(() => 
    isConflictTrackerOpen ? conflictsDatabase : [], 
    [isConflictTrackerOpen]
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Botón para abrir/cerrar el menú izquierdo */}
      <MenuToggleButton 
        isOpen={isLeftSidebarOpen}
        onClick={handleToggleLeftSidebar}
      />
      
      {/* Sidebar izquierda */}
      <LeftSidebar 
        isOpen={isLeftSidebarOpen}
        onClose={handleCloseLeftSidebar}
        onOpenConflictTracker={handleOpenConflictTracker}
      />
      
      {/* Overlay para la sidebar izquierda con animación mejorada */}
      <AnimatePresence>
        {isLeftSidebarOpen && (
          <motion.div 
            className="fixed inset-0 bg-black z-40 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={handleCloseLeftSidebar}
          />
        )}
      </AnimatePresence>
      
      <WorldMap 
        ref={mapRef}
        onCountrySelect={handleCountrySelect}
        selectedCountry={selectedCountry}
        onResetView={handleResetView}
        conflicts={conflictsForMap}
        onConflictClick={handleConflictClick}
        selectedConflictId={selectedConflictId}
      />
      
      {/* Country Sidebar with improved animations */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Overlay con animación fluida */}
            <motion.div 
              className="fixed inset-0 bg-black z-40 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              onClick={handleCloseSidebar}
            />
            
            <CountrySidebar 
              isOpen={isSidebarOpen}
              onClose={handleCloseSidebar}
              countryName={selectedCountry}
            />
          </>
        )}
      </AnimatePresence>
      
      {/* Pantalla de carga mejorada con animación */}
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
              Cargando...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Panel flotante para información de países con animación */}
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

      {/* Conflict Tracker con animaciones mejoradas */}
      <AnimatePresence>
        {isConflictTrackerOpen && (
          <>
            {/* Overlay para ConflictTracker */}
            <motion.div 
              className="fixed inset-0 bg-black z-40 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              onClick={handleCloseConflictTracker}
            />
            
            <ConflictTracker 
              onBack={handleBackToLeftSidebar}
              onCenterMap={handleCenterMapOnConflict}
              onConflictSelect={handleConflictSelect}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
