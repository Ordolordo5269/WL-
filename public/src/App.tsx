import { useEffect, useState } from 'react';
import WorldMap from '../components/WorldMap';
import CountryCard from '../components/CountryCard';
import './index.css';

interface Country {
  name: string;
  capital: string;
  region: string;
}

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selected, setSelected] = useState<Country | null>(null);

  useEffect(() => {
    fetch('/api/countries')
      .then((res) => res.json())
      .then(setCountries)
      .catch(console.error);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <WorldMap />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {countries.map((c) => (
          <div key={c.name} onClick={() => setSelected(c)} className="cursor-pointer">
            <CountryCard country={c} />
          </div>
        ))}
      </div>
      <CountryCard country={selected} />
    </div>
  );
}

export default App;
