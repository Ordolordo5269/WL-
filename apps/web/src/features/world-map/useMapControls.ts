import { useState, useCallback } from 'react';
import type { MapRefType } from './types';

export function useMapControls(mapRef: React.RefObject<MapRefType | null>) {
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historyYear, setHistoryYear] = useState(1880);
  const [_orgIsoFilter, setOrgIsoFilter] = useState<string[]>([]);
  const [_orgColor, setOrgColor] = useState<string | null>(null);
  const [riversEnabled, setRiversEnabled] = useState(false);
  const [mountainRangesEnabled, setMountainRangesEnabled] = useState(false);
  const [peaksEnabled, setPeaksEnabled] = useState(false);
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
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('rivers', enabled);
  }, []);

  const handleToggleMountainRangesLayer = useCallback((enabled: boolean) => {
    setMountainRangesEnabled(enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('ranges', enabled);
  }, []);

  const handleTogglePeaksLayer = useCallback((enabled: boolean) => {
    setPeaksEnabled(enabled);
    (document as any).__wl_map_comp?.setNaturalLayerEnabled?.('peaks', enabled);
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
    riversEnabled, mountainRangesEnabled, peaksEnabled, naturalLod,
    handleSetBaseMapStyle, handleSetPlanetPreset,
    handleSetStarIntensity, handleSetSpacePreset,
    handleSetTerrain, handleSetTerrainExaggeration,
    handleSetBuildings3D, handleSetMinimalMode,
    handleSetAutoRotate, handleSetRotateSpeed,
    handleToggleRiversLayer, handleToggleMountainRangesLayer,
    handleTogglePeaksLayer, handleSetNaturalLod,
    handleSetOrganizationIsoFilter,
    handleToggleHistoryMode, handleSetHistoryYear,
  };
}
