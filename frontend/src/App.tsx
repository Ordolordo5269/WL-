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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  // Add unified sidebars state
  const [sidebars, setSidebars] = useState({
    country: false, // right sidebar for countries
    menu: false,    // left menu sidebar
    conflict: false // conflict tracker
  });

  // Función para manejar sidebars
  const toggleSidebar = useCallback((type: 'country' | 'menu' | 'conflict', open: boolean) => {
    setSidebars(prev => ({ ...prev, [type]: open }));
  }, []);

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

  // Handler para selección de países
  const handleCountrySelect = useCallback((countryName: string) => {
    setSelectedCountry(countryName);
    toggleSidebar('country', true);
  }, [toggleSidebar]);

  const handleCloseSidebar = useCallback(() => {
    toggleSidebar('country', false);
    setSelectedCountry(null);
    // Resetear la vista del mapa a la vista principal del globo
    if ((window as any).resetMapView) {
      (window as any).resetMapView();
    }
  }, [toggleSidebar]);

  const handleResetView = useCallback(() => {
    // Esta función se pasa al WorldMap para exponer resetMapView
  }, []);

  // Simplificados: handlers para sidebars
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

  const handleBackToLeftSidebar = useCallback(() => {
    setSelectedConflictId(null);
    toggleSidebar('menu', true);
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
      {/* Botón para abrir/cerrar el menú izquierdo */}
      <MenuToggleButton 
        isOpen={sidebars.menu}
        onClick={handleToggleLeftSidebar}
      />
      
      {/* Sidebar izquierda */}
      <LeftSidebar 
        isOpen={sidebars.menu}
        onClose={handleCloseLeftSidebar}
        onOpenConflictTracker={handleOpenConflictTracker}
      />
      
      {/* Overlay para la sidebar izquierda con animación mejorada */}
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
      
      {/* Country Sidebar with improved animations */}
      {sidebars.country && (
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
            isOpen={sidebars.country}
            onClose={handleCloseSidebar}
            countryName={selectedCountry}
          />
        </>
      )}
      
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
      {sidebars.conflict && (
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
            onBack={handleCloseConflictTracker}
            onCenterMap={handleCenterMapOnConflict}
            onConflictSelect={handleConflictSelect}
          />
        </>
      )}
    </div>
  );
}

export default App;
