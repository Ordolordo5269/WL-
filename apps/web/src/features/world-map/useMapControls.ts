import { useState, useCallback } from 'react';
import type { MapRefType } from './types';

const NL_KEY = 'wl-natural-layers';
function getNL(key: string): boolean {
  try { return JSON.parse(localStorage.getItem(NL_KEY) || '{}')[key] ?? false; } catch { return false; }
}
function saveNL(key: string, value: boolean) {
  try {
    const prev = JSON.parse(localStorage.getItem(NL_KEY) || '{}');
    localStorage.setItem(NL_KEY, JSON.stringify({ ...prev, [key]: value }));
  } catch {}
}

export function useMapControls(mapRef: React.RefObject<MapRefType | null>) {
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historyYear, setHistoryYear] = useState(1880);
  const [_orgIsoFilter, setOrgIsoFilter] = useState<string[]>([]);
  const [_orgColor, setOrgColor] = useState<string | null>(null);
  const [riversEnabled, setRiversEnabled] = useState(() => getNL('rivers'));
  const [mountainRangesEnabled, setMountainRangesEnabled] = useState(() => getNL('ranges'));
  const [peaksEnabled, setPeaksEnabled] = useState(() => getNL('peaks'));
  const [lakesEnabled, setLakesEnabled] = useState(() => getNL('lakes'));
  const [volcanoesEnabled, setVolcanoesEnabled] = useState(() => getNL('volcanoes'));
  const [faultLinesEnabled, setFaultLinesEnabled] = useState(() => getNL('fault-lines'));
  const [desertsEnabled, setDesertsEnabled] = useState(() => getNL('deserts'));
  const [naturalLod, setNaturalLod] = useState<'auto' | 'low' | 'med' | 'high'>('auto');

  const handleSetBaseMapStyle = useCallback((next: 'night' | 'light' | 'outdoors' | 'dark' | 'satellite' | 'satellite-streets') => {
    mapRef.current?.setBaseMapStyle?.(next);
  }, []);

  const handleSetPlanetPreset = useCallback((preset: 'default' | 'nebula' | 'sunset' | 'dawn' | 'arctic' | 'volcanic' | 'emerald' | 'midnight' | 'aurora' | 'sahara' | 'storm' | 'crimson' | 'rose' | 'void' | 'coral' | 'violet') => {
    mapRef.current?.setPlanetPreset?.(preset);
  }, []);

  const handleSetStarIntensity = useCallback((v: number) => {
    mapRef.current?.setStarIntensity?.(v);
  }, []);

  const handleSetSpacePreset = useCallback((preset: 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson') => {
    mapRef.current?.setSpacePreset?.(preset);
  }, []);

  const handleSetTerrain = useCallback((v: boolean) => {
    mapRef.current?.setTerrainEnabled?.(v);
  }, []);

  const handleSetTerrainExaggeration = useCallback((n: number) => {
    mapRef.current?.setTerrainExaggeration?.(n);
  }, []);

  const handleSetBuildings3D = useCallback((v: boolean) => {
    mapRef.current?.setBuildings3DEnabled?.(v);
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

  const handleToggleRiversLayer = useCallback((enabled: boolean) => {
    setRiversEnabled(enabled);
    saveNL('rivers', enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('rivers', enabled);
  }, []);

  const handleToggleMountainRangesLayer = useCallback((enabled: boolean) => {
    setMountainRangesEnabled(enabled);
    saveNL('ranges', enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('ranges', enabled);
  }, []);

  const handleTogglePeaksLayer = useCallback((enabled: boolean) => {
    setPeaksEnabled(enabled);
    saveNL('peaks', enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('peaks', enabled);
  }, []);

  const handleToggleLakesLayer = useCallback((enabled: boolean) => {
    setLakesEnabled(enabled);
    saveNL('lakes', enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('lakes', enabled);
  }, []);

  const handleToggleVolcanoesLayer = useCallback((enabled: boolean) => {
    setVolcanoesEnabled(enabled);
    saveNL('volcanoes', enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('volcanoes', enabled);
  }, []);

  const handleToggleFaultLinesLayer = useCallback((enabled: boolean) => {
    setFaultLinesEnabled(enabled);
    saveNL('fault-lines', enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('fault-lines', enabled);
  }, []);

  const handleToggleDesertsLayer = useCallback((enabled: boolean) => {
    setDesertsEnabled(enabled);
    saveNL('deserts', enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('deserts', enabled);
  }, []);

  const handleSetNaturalLod = useCallback((lod: 'auto' | 'low' | 'med' | 'high') => {
    setNaturalLod(lod);
    (document as any).__wl_map_comp?.setNaturalLod?.(lod);
  }, []);

  const handleSetOrganizationIsoFilter = useCallback((iso3: string[], color?: string) => {
    setOrgIsoFilter(iso3);
    setOrgColor(color ?? null);
    mapRef.current?.highlightIso3List?.(iso3, color || undefined);
  }, []);

  const handleToggleHistoryMode = useCallback((enabled: boolean) => {
    setHistoryEnabled(enabled);
    mapRef.current?.setHistoryEnabled?.(enabled);
    mapRef.current?.setMinimalMode?.(enabled);
    if (enabled) {
      mapRef.current?.setHistoryYear?.(historyYear);
    }
  }, [historyYear]);

  const handleSetHistoryYear = useCallback((year: number) => {
    setHistoryYear(year);
    mapRef.current?.setHistoryYear?.(year);
  }, []);

  return {
    historyEnabled, historyYear,
    riversEnabled, mountainRangesEnabled, peaksEnabled,
    lakesEnabled, volcanoesEnabled, faultLinesEnabled, desertsEnabled,
    naturalLod,
    handleSetBaseMapStyle, handleSetPlanetPreset,
    handleSetStarIntensity, handleSetSpacePreset,
    handleSetTerrain, handleSetTerrainExaggeration,
    handleSetBuildings3D, handleSetMinimalMode,
    handleSetAutoRotate, handleSetRotateSpeed,
    handleToggleRiversLayer, handleToggleMountainRangesLayer,
    handleTogglePeaksLayer, handleSetNaturalLod,
    handleToggleLakesLayer, handleToggleVolcanoesLayer,
    handleToggleFaultLinesLayer, handleToggleDesertsLayer,
    handleSetOrganizationIsoFilter,
    handleToggleHistoryMode, handleSetHistoryYear,
  };
}
