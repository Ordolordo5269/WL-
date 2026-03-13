import { useState, useCallback } from 'react';
import {
  useEarthquakesData,
  useFiresData,
  useRadarData,
  useAirTrafficData,
  useMarineTrafficData,
  useSatellitesData,
} from './useLiveActivityData';

export interface WeatherLayer {
  id: string;
  label: string;
  enabled: boolean;
}

export function useLiveActivity() {
  const [earthquakesEnabled, setEarthquakesEnabled] = useState(false);
  const [firesEnabled, setFiresEnabled] = useState(false);
  const [radarEnabled, setRadarEnabled] = useState(false);
  const [airTrafficEnabled, setAirTrafficEnabled] = useState(false);
  const [marineTrafficEnabled, setMarineTrafficEnabled] = useState(false);
  const [satellitesEnabled, setSatellitesEnabled] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  // Active weather sublayer IDs (e.g. 'temp_new', 'clouds_new')
  const [weatherLayers, setWeatherLayers] = useState<string[]>([]);

  // Data fetching hooks — only fetch when enabled
  const earthquakesQuery = useEarthquakesData(earthquakesEnabled);
  const firesQuery = useFiresData(firesEnabled);
  const radarQuery = useRadarData(radarEnabled);
  const airTrafficQuery = useAirTrafficData(airTrafficEnabled);
  const marineTrafficQuery = useMarineTrafficData(marineTrafficEnabled);
  const satellitesQuery = useSatellitesData(satellitesEnabled);

  const handleToggleEarthquakes = useCallback((enabled: boolean) => {
    setEarthquakesEnabled(enabled);
  }, []);

  const handleToggleFires = useCallback((enabled: boolean) => {
    setFiresEnabled(enabled);
  }, []);

  const handleToggleRadar = useCallback((enabled: boolean) => {
    setRadarEnabled(enabled);
  }, []);

  const handleToggleAirTraffic = useCallback((enabled: boolean) => {
    setAirTrafficEnabled(enabled);
  }, []);

  const handleToggleMarineTraffic = useCallback((enabled: boolean) => {
    setMarineTrafficEnabled(enabled);
  }, []);

  const handleToggleSatellites = useCallback((enabled: boolean) => {
    setSatellitesEnabled(enabled);
  }, []);

  const handleToggleWeather = useCallback((enabled: boolean) => {
    setWeatherEnabled(enabled);
  }, []);

  // Toggle a weather sublayer on/off (sidebar passes just the id)
  const handleToggleWeatherLayer = useCallback((layerId: string) => {
    setWeatherLayers(prev =>
      prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId]
    );
  }, []);

  return {
    earthquakesEnabled,
    handleToggleEarthquakes,
    earthquakesData: earthquakesQuery.data,
    firesEnabled,
    handleToggleFires,
    firesData: firesQuery.data,
    radarEnabled,
    handleToggleRadar,
    radarData: radarQuery.data,
    airTrafficEnabled,
    handleToggleAirTraffic,
    airTrafficData: airTrafficQuery.data,
    marineTrafficEnabled,
    handleToggleMarineTraffic,
    marineTrafficData: marineTrafficQuery.data,
    satellitesEnabled,
    handleToggleSatellites,
    satellitesData: satellitesQuery.data,
    weatherEnabled,
    handleToggleWeather,
    weatherLayers,
    handleToggleWeatherLayer,
  };
}
