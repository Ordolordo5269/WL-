import { useState, useCallback, useRef } from 'react';
import type { MapRefType } from './types';
import { type NasaOverlayType, NASA_EARTH_OVERLAY_KEYS } from './map/mapAppearance';

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

const NASAL_KEY = 'wl-earth-layers';
function getEL(key: string): boolean {
  try { return JSON.parse(localStorage.getItem(NASAL_KEY) || '{}')[key] ?? false; } catch { return false; }
}
function saveEL(key: string, value: boolean) {
  try {
    const prev = JSON.parse(localStorage.getItem(NASAL_KEY) || '{}');
    localStorage.setItem(NASAL_KEY, JSON.stringify({ ...prev, [key]: value }));
  } catch {}
}

export function useMapControls(mapRef: React.RefObject<MapRefType | null>) {
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historyYear, setHistoryYear] = useState<number | null>(null);
  const [_orgIsoFilter, setOrgIsoFilter] = useState<string[]>([]);
  const [_orgColor, setOrgColor] = useState<string | null>(null);
  const [riversEnabled, setRiversEnabled] = useState(false);
  const [mountainRangesEnabled, setMountainRangesEnabled] = useState(false);
  const [peaksEnabled, setPeaksEnabled] = useState(false);
  const [lakesEnabled, setLakesEnabled] = useState(false);
  const [volcanoesEnabled, setVolcanoesEnabled] = useState(false);
  const [faultLinesEnabled, setFaultLinesEnabled] = useState(false);
  const [desertsEnabled, setDesertsEnabled] = useState(false);
  const [earthGalleryEnabled, setEarthGalleryEnabled] = useState(false);
  const [earthGallerySelectMode, setEarthGallerySelectMode] = useState(false);
  const [earthGalleryZoom, setEarthGalleryZoom] = useState<number>(2); // 0=city, 1=metro, 2=region, 3=country
  const [naturalLod, setNaturalLod] = useState<'auto' | 'low' | 'med' | 'high'>('auto');

  // Earth Data (NASA) overlay states
  const initEarth = useCallback(() => {
    const m: Record<string, boolean> = {};
    for (const k of NASA_EARTH_OVERLAY_KEYS) m[k] = false;
    return m as Record<NasaOverlayType, boolean>;
  }, []);
  const [earthOverlays, setEarthOverlays] = useState<Record<NasaOverlayType, boolean>>(initEarth);
  const [lastActivatedOverlay, setLastActivatedOverlay] = useState<NasaOverlayType | null>(null);

  // Track active globe theme to reset on individual control changes
  const activeThemeRef = useRef<string | null>(null);

  // Track map state before entering history mode so we can restore on exit
  const preHistoryStateRef = useRef<{
    baseMap: string;
    autoRotate: boolean;
    rotateSpeed: number;
    starIntensity: number;
  } | null>(null);

  const resetFromTheme = useCallback(() => {
    if (!activeThemeRef.current) return;
    activeThemeRef.current = null;
    // Reset atmosphere/space/stars to defaults (sync operations on the map)
    mapRef.current?.setPlanetPreset?.('default');
    mapRef.current?.setStarIntensity?.(0.6);
  }, []);

  const handleSetBaseMapStyle = useCallback((next: 'night' | 'light' | 'outdoors' | 'dark' | 'satellite-streets' | 'navigation-day' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble') => {
    resetFromTheme();
    mapRef.current?.setBaseMapStyle?.(next);
  }, [resetFromTheme]);

  const handleSetPlanetPreset = useCallback((preset: 'default' | 'nebula' | 'sunset' | 'dawn' | 'arctic' | 'volcanic' | 'emerald' | 'midnight' | 'aurora' | 'sahara' | 'storm' | 'crimson' | 'rose' | 'void' | 'coral' | 'violet') => {
    resetFromTheme();
    mapRef.current?.setPlanetPreset?.(preset);
  }, [resetFromTheme]);

  const handleSetStarIntensity = useCallback((v: number) => {
    resetFromTheme();
    mapRef.current?.setStarIntensity?.(v);
  }, [resetFromTheme]);

  const handleSetSpacePreset = useCallback((preset: 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson') => {
    resetFromTheme();
    mapRef.current?.setSpacePreset?.(preset);
  }, [resetFromTheme]);

  const handleSetGlobeTheme = useCallback((theme: 'mars' | 'lunar' | 'venus' | 'ice-world' | 'cyberpunk' | 'golden-age' | 'alien' | 'deep-ocean' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble') => {
    activeThemeRef.current = theme;
    mapRef.current?.setGlobeTheme?.(theme);
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

  const handleToggleEarthGallery = useCallback((enabled: boolean) => {
    setEarthGalleryEnabled(enabled);
    if (!enabled) setEarthGallerySelectMode(false);
    (document as any).__wl_map_comp?.setEarthGalleryEnabled?.(enabled);
  }, []);

  const handleToggleEarthGallerySelectMode = useCallback((enabled: boolean) => {
    setEarthGallerySelectMode(enabled);
    (document as any).__wl_map_comp?.setEarthGallerySelectMode?.(enabled);
  }, []);

  const handleSetEarthGalleryZoom = useCallback((level: number) => {
    setEarthGalleryZoom(level);
    (document as any).__wl_map_comp?.setEarthGalleryZoom?.(level);
  }, []);

  const handleSetNaturalLod = useCallback((lod: 'auto' | 'low' | 'med' | 'high') => {
    setNaturalLod(lod);
    (document as any).__wl_map_comp?.setNaturalLod?.(lod);
  }, []);

  const handleSetLedHalo = useCallback((enabled: boolean) => {
    mapRef.current?.setLedHalo?.(enabled);
  }, []);

  const handleSetLedHaloSpeed = useCallback((ms: number) => {
    mapRef.current?.setLedHaloSpeed?.(ms);
  }, []);

  const handleToggleEarthOverlay = useCallback((type: NasaOverlayType, enabled: boolean) => {
    setEarthOverlays(prev => {
      const next = { ...prev, [type]: enabled };
      if (enabled) {
        setLastActivatedOverlay(type);
      } else if (type === lastActivatedOverlay) {
        const fallback = NASA_EARTH_OVERLAY_KEYS.find(k => k !== type && next[k]) ?? null;
        setLastActivatedOverlay(fallback);
      }
      return next;
    });
    saveEL(type, enabled);
    (document as any).__wl_map_comp?.setNasaOverlayEnabled?.(type, enabled);
  }, [lastActivatedOverlay]);

  // Satellite Intel immersive mode — separate from individual overlay toggles.
  // Activates Earth at Night base + dark style + atmosphere.
  // Deactivation clears ALL overlays and restores previous style.
  const handleToggleSatelliteIntelMode = useCallback((enabled: boolean) => {
    if (enabled) {
      mapRef.current?.setSatelliteIntelMode?.(true);
    } else {
      // Deactivate all overlay state
      setEarthOverlays(prev => {
        const next = { ...prev };
        for (const k of NASA_EARTH_OVERLAY_KEYS) {
          next[k] = false;
          saveEL(k, false);
        }
        return next;
      });
      setLastActivatedOverlay(null);
      mapRef.current?.setSatelliteIntelMode?.(false);
    }
  }, []);

  const handleSetOrganizationIsoFilter = useCallback((iso3: string[], color?: string) => {
    setOrgIsoFilter(iso3);
    setOrgColor(color ?? null);
    mapRef.current?.highlightIso3List?.(iso3, color || undefined);
  }, []);

  // Atomic transition: History Mode → Satellite Intel
  const handleHistoryToSatellite = useCallback(() => {
    const prev = preHistoryStateRef.current;
    setHistoryEnabled(false);
    mapRef.current?.setHistoryEnabled?.(false);
    mapRef.current?.setMinimalMode?.(false);
    mapRef.current?.setAutoRotate?.(false);
    preHistoryStateRef.current = null;

    if (prev) {
      mapRef.current?.setNightLightsPrevStyleOverride?.(prev.baseMap, 'default', prev.starIntensity);
    }

    handleToggleSatelliteIntelMode(true);
  }, [handleToggleSatelliteIntelMode]);

  // Atomic transition: Satellite Intel → History Mode
  const handleSatelliteToHistory = useCallback(() => {
    const nlPrev = mapRef.current?.getNightLightsPrevStyle?.();
    mapRef.current?.clearNightLightsPrevStyle?.();

    handleToggleSatelliteIntelMode(false);

    setHistoryEnabled(true);
    setHistoryYear(null);
    mapRef.current?.setHistoryEnabled?.(true);

    const originalStyle = nlPrev?.style ?? 'night';
    const originalStar = nlPrev?.star ?? 0.6;
    preHistoryStateRef.current = {
      baseMap: originalStyle,
      autoRotate: false,
      rotateSpeed: 3,
      starIntensity: originalStar,
    };

    mapRef.current?.setBaseMapStyle?.('navigation-day', { skipFade: true });
    mapRef.current?.setRotateSpeed?.(1);
    mapRef.current?.setStarIntensity?.(0.9);
    mapRef.current?.setAutoRotate?.(true);
  }, [handleToggleSatelliteIntelMode]);

  const handleToggleHistoryMode = useCallback((enabled: boolean, opts?: { skipRestore?: boolean }) => {
    setHistoryEnabled(enabled);
    if (enabled) {
      // Reset to null — no year visually selected in presentation mode
      setHistoryYear(null);
    }
    mapRef.current?.setHistoryEnabled?.(enabled);
    if (enabled) {
      // Save current map state before switching to study mode
      const map = mapRef.current;
      preHistoryStateRef.current = {
        baseMap: map?.getBaseMapStyle?.() ?? 'night',
        autoRotate: map?.getAutoRotate?.() ?? false,
        rotateSpeed: map?.getRotateSpeed?.() ?? 3,
        starIntensity: map?.getStarIntensity?.() ?? 0.6,
      };
      // Switch to navigation-day + slow rotate + bright stars.
      // skipFade keeps the globe visible so rotation starts immediately.
      map?.setBaseMapStyle?.('navigation-day', { skipFade: true });
      map?.setAutoRotate?.(true);
      map?.setRotateSpeed?.(1);
      map?.setStarIntensity?.(0.9);
    } else {
      // Restore base features visibility (may have been hidden when user picked a year)
      mapRef.current?.setMinimalMode?.(false);
      const prev = preHistoryStateRef.current;
      if (prev && !opts?.skipRestore) {
        // Restore previous map state
        mapRef.current?.setBaseMapStyle?.(prev.baseMap as any);
        mapRef.current?.setAutoRotate?.(prev.autoRotate);
        mapRef.current?.setRotateSpeed?.(prev.rotateSpeed);
        mapRef.current?.setStarIntensity?.(prev.starIntensity);
      }
      preHistoryStateRef.current = null;
    }
  }, [historyYear]);

  const handleSetHistoryYear = useCallback((year: number) => {
    setHistoryYear(year);
    // Switch to minimal mode (hide country labels/borders) so only
    // historical territories are visible once the user picks a year.
    mapRef.current?.setMinimalMode?.(true);
    mapRef.current?.setHistoryYear?.(year);
  }, []);

  // Reset to presentation mode: show colored territories + visible countries, no year selected
  const handleResetHistoryPresentation = useCallback(() => {
    setHistoryYear(null);
    mapRef.current?.setMinimalMode?.(false);
    mapRef.current?.dismissHistoryPopup?.();
    mapRef.current?.setHistoryEnabled?.(true); // reloads default year (2010) territories
  }, []);

  return {
    historyEnabled, historyYear,
    riversEnabled, mountainRangesEnabled, peaksEnabled,
    lakesEnabled, volcanoesEnabled, faultLinesEnabled, desertsEnabled, earthGalleryEnabled, earthGallerySelectMode, earthGalleryZoom,
    naturalLod,
    handleSetBaseMapStyle, handleSetPlanetPreset,
    handleSetStarIntensity, handleSetSpacePreset, handleSetGlobeTheme,
    handleSetTerrain, handleSetTerrainExaggeration,
    handleSetBuildings3D, handleSetMinimalMode,
    handleSetAutoRotate, handleSetRotateSpeed,
    handleToggleRiversLayer, handleToggleMountainRangesLayer,
    handleTogglePeaksLayer, handleSetNaturalLod,
    handleToggleLakesLayer, handleToggleVolcanoesLayer,
    handleToggleFaultLinesLayer, handleToggleDesertsLayer, handleToggleEarthGallery, handleToggleEarthGallerySelectMode, handleSetEarthGalleryZoom,
    handleSetOrganizationIsoFilter,
    handleToggleHistoryMode, handleSetHistoryYear, handleResetHistoryPresentation,
    handleSetLedHalo, handleSetLedHaloSpeed,
    handleHistoryToSatellite, handleSatelliteToHistory,
    earthOverlays, handleToggleEarthOverlay, lastActivatedOverlay, handleToggleSatelliteIntelMode,
  };
}
