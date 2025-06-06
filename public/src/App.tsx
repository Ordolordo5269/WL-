import { useState, useEffect } from 'react';
import WorldMap from '../components/WorldMap';
import CountryCard from '../components/CountryCard';
import CountrySidebar from '../components/CountrySidebar';
import './index.css';
import './styles/sidebar.css';

interface Country {
  name: string;
  capital: string;
  region: string;
}

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleCountrySelect = (countryName: string) => {
    setSelectedCountry(countryName);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedCountry(null);
    // Resetear la vista del mapa a la vista principal del globo
    if ((window as any).resetMapView) {
      (window as any).resetMapView();
    }
  };

  const handleResetView = () => {
    // Esta función se pasa al WorldMap para exponer resetMapView
  };

  const selectedCountryData = countries.find(country => 
    country.name.toLowerCase() === selectedCountry?.toLowerCase()
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      <WorldMap 
        onCountrySelect={handleCountrySelect}
        selectedCountry={selectedCountry}
        onResetView={handleResetView}
      />
      
      {isSidebarOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity duration-300"
            onClick={handleCloseSidebar}
          />
          
          <CountrySidebar 
            isOpen={isSidebarOpen}
            onClose={handleCloseSidebar}
            countryName={selectedCountry}
          />
        </>
      )}
      
      {/* Pantalla de carga opcional */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white text-lg">Cargando...</div>
        </div>
      )}
      
      {/* Panel flotante para información de países */}
      {selectedCountryData && (
        <div className="absolute top-4 left-4 z-10 max-w-sm">
          <CountryCard country={selectedCountryData} />
        </div>
      )}
    </div>
  );
}

export default App;
