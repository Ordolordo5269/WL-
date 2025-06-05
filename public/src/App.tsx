import { useState, useEffect } from 'react';
import WorldMap from '../components/WorldMap';
import CountryCard from '../components/CountryCard';
import './index.css';

interface Country {
  name: string;
  capital: string;
  region: string;
}

function App() {
  const [, setCountries] = useState<Country[]>([]);
  const [selected] = useState<Country | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cargar países
    fetch('/api/countries')
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

  return (
    <div className="relative w-full h-full overflow-hidden">
      <WorldMap />
      {/* Pantalla de carga opcional */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white text-lg">Cargando...</div>
        </div>
      )}
      {/* Panel flotante para información de países */}
      {selected && (
        <div className="absolute top-4 left-4 z-10 max-w-sm">
          <CountryCard country={selected} />
        </div>
      )}
    </div>
  );
}

export default App;
