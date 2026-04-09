import { useState, useCallback } from 'react';
import {
  useEarthquakesData,
  useFiresData,
  useAirTrafficData,
  useMarineTrafficData,
  useActiveVolcanoesData,
  useTsunamisData,
  useStormsData,
  useLightningData,
} from './useLiveActivityData';

export interface WeatherLayer {
  id: string;
  label: string;
  enabled: boolean;
}

export function useLiveActivity() {
  const [earthquakesEnabled, setEarthquakesEnabled] = useState(false);
  const [firesEnabled, setFiresEnabled] = useState(false);
  const [airTrafficEnabled, setAirTrafficEnabled] = useState(false);
  const [marineTrafficEnabled, setMarineTrafficEnabled] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [activeVolcanoesEnabled, setActiveVolcanoesEnabled] = useState(false);
  const [tsunamisEnabled, setTsunamisEnabled] = useState(false);
  const [stormsEnabled, setStormsEnabled] = useState(false);
  const [lightningEnabled, setLightningEnabled] = useState(false);
  // Active weather sublayer IDs (e.g. 'temp_new', 'clouds_new')
  const [weatherLayers, setWeatherLayers] = useState<string[]>([]);

  // Data fetching hooks — only fetch when enabled
  const earthquakesQuery = useEarthquakesData(earthquakesEnabled);
  const firesQuery = useFiresData(firesEnabled);
  const airTrafficQuery = useAirTrafficData(airTrafficEnabled);
  const marineTrafficQuery = useMarineTrafficData(marineTrafficEnabled);
  const activeVolcanoesQuery = useActiveVolcanoesData(activeVolcanoesEnabled);
  const tsunamisQuery = useTsunamisData(tsunamisEnabled);
  const stormsQuery = useStormsData(stormsEnabled);
  const lightningQuery = useLightningData(lightningEnabled);

  const handleToggleEarthquakes = useCallback((enabled: boolean) => {
    setEarthquakesEnabled(enabled);
  }, []);

  const handleToggleFires = useCallback((enabled: boolean) => {
    setFiresEnabled(enabled);
  }, []);

  const handleToggleAirTraffic = useCallback((enabled: boolean) => {
    setAirTrafficEnabled(enabled);
  }, []);

  const handleToggleMarineTraffic = useCallback((enabled: boolean) => {
    setMarineTrafficEnabled(enabled);
  }, []);

  const handleToggleActiveVolcanoes = useCallback((enabled: boolean) => {
    setActiveVolcanoesEnabled(enabled);
  }, []);

  const handleToggleTsunamis = useCallback((enabled: boolean) => {
    setTsunamisEnabled(enabled);
  }, []);

  const handleToggleStorms = useCallback((enabled: boolean) => {
    setStormsEnabled(enabled);
  }, []);

  const handleToggleLightning = useCallback((enabled: boolean) => {
    setLightningEnabled(enabled);
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
    airTrafficEnabled,
    handleToggleAirTraffic,
    airTrafficData: airTrafficQuery.data,
    marineTrafficEnabled,
    handleToggleMarineTraffic,
    marineTrafficData: marineTrafficQuery.data,
    activeVolcanoesEnabled,
    handleToggleActiveVolcanoes,
    activeVolcanoesData: activeVolcanoesQuery.data,
    tsunamisEnabled,
    handleToggleTsunamis,
    tsunamisData: tsunamisQuery.data,
    stormsEnabled,
    handleToggleStorms,
    stormsData: stormsQuery.data,
    lightningEnabled,
    handleToggleLightning,
    lightningData: lightningQuery.data,
    weatherEnabled,
    handleToggleWeather,
    weatherLayers,
    handleToggleWeatherLayer,
  };
}
