import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import InternationalOrganizationsPanel from './InternationalOrganizationsPanel';
import StatisticsPanel from './StatisticsPanel';
import { AVAILABLE_HISTORY_YEARS, snapToAvailableYear } from '../../utils/historical-years';
import { Crosshair, Settings, Info, Globe, Users, Users2, BarChart3, Map, User, GitCompare, Radio, Satellite } from 'lucide-react';
import ConflictPanel from '../conflicts/ConflictPanel';
import type { ConflictSummary, ConflictFeature } from '../conflicts/types';
import { type NasaOverlayType, NASA_EARTH_OVERLAYS, NASA_EARTH_OVERLAY_KEYS, prefetchNightLightsTiles, getNasaObservationDate } from './map/mapAppearance';
import { MILITARY_COUNTRY_COLORS, CLASSIFIED_ORBIT_COLORS, GNSS_CONSTELLATION_COLORS, WEATHER_PROGRAM_COLORS, STATION_PROGRAM_COLORS } from './map/satellite-visualization';
import { COUNTRY_FLAGS, COUNTRY_NAMES } from './map/satellite-database';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSatelliteTracking, type SatCategory } from './useSatelliteTracking';
import type { ChoroplethState } from './useChoropleth';

const SAT_CATEGORY_META: Record<SatCategory, { label: string; count: string; color: string }> = {
  military:   { label: 'Military & Intel',  count: '~171', color: '#ff4444' },
  classified: { label: 'Classified',        count: '~497', color: '#ff8800' },
  navigation: { label: 'Navigation (GNSS)', count: '~168', color: '#ffaa22' },
  weather:    { label: 'Weather & SAR',     count: '~63',  color: '#44aaff' },
  stations:   { label: 'Stations & Relay',  count: '~39',  color: '#d4a0ff' },
  starlink:   { label: 'Starlink',          count: '~10,000', color: '#00ff88' },
};

const GNSS_CONSTELLATION_META: Record<string, { label: string; flag: string }> = {
  gps:     { label: 'GPS',     flag: '🇺🇸' },
  glonass: { label: 'GLONASS', flag: '🇷🇺' },
  galileo: { label: 'Galileo', flag: '🇪🇺' },
  beidou:  { label: 'BeiDou',  flag: '🇨🇳' },
  navic:   { label: 'NavIC',   flag: '🇮🇳' },
  qzss:    { label: 'QZSS',    flag: '🇯🇵' },
  sbas:    { label: 'SBAS',    flag: '🛰️' },
};

const WEATHER_PROGRAM_META: Record<string, { label: string; flag: string }> = {
  goes:     { label: 'GOES',           flag: '🇺🇸' },
  jpss:     { label: 'JPSS / NOAA',    flag: '🇺🇸' },
  meteosat: { label: 'Meteosat',       flag: '🇪🇺' },
  metop:    { label: 'MetOp',          flag: '🇪🇺' },
  fengyun:  { label: 'FengYun',        flag: '🇨🇳' },
  tianmu:   { label: 'Tianmu-1',       flag: '🇨🇳' },
  himawari: { label: 'Himawari',       flag: '🇯🇵' },
  meteor:   { label: 'Meteor-M',          flag: '🇷🇺' },
  arktika:  { label: 'Arktika-M',        flag: '🇷🇺' },
  elektro:  { label: 'Elektro-L',      flag: '🇷🇺' },
  insat:    { label: 'INSAT',          flag: '🇮🇳' },
  kompsat:  { label: 'GEO-KOMPSAT',   flag: '🇰🇷' },
};

const STATION_PROGRAM_META: Record<string, { label: string; flag: string }> = {
  iss:      { label: 'ISS',                  flag: '🌍' },
  css:      { label: 'China Space Station',  flag: '🇨🇳' },
  tdrs:     { label: 'TDRS',                 flag: '🇺🇸' },
  science:  { label: 'NASA Science',         flag: '🇺🇸' },
  luch:     { label: 'LUCH / Olymp',         flag: '🇷🇺' },
  edrs:     { label: 'EDRS',                 flag: '🇪🇺' },
  tianlian: { label: 'Tianlian',             flag: '🇨🇳' },
};

const LANDING_ABOUT_URL = `${import.meta.env.VITE_LANDING_URL ?? (import.meta.env.DEV ? 'http://localhost:5174' : '')}/about`;

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onOpenConflictTracker?: () => void;
  onOpenDemographics?: () => void;
  onSetBaseMapStyle?: (next: 'night' | 'light' | 'outdoors' | 'dark' | 'satellite-streets' | 'navigation-day' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble') => void;
  onSetPlanetPreset?: (preset: 'default' | 'nebula' | 'sunset' | 'dawn' | 'arctic' | 'volcanic' | 'emerald' | 'midnight' | 'aurora' | 'sahara' | 'storm' | 'crimson' | 'rose' | 'void' | 'coral' | 'violet') => void;
  onSetStarIntensity?: (v: number) => void;
  onSetSpacePreset?: (preset: 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson') => void;
  onSetGlobeTheme?: (theme: 'mars' | 'lunar' | 'venus' | 'ice-world' | 'cyberpunk' | 'golden-age' | 'alien' | 'deep-ocean' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble') => void;
  // Terrain removido
  onSetTerrain?: (v: boolean) => void;
  onSetTerrainExaggeration?: (n: number) => void;
  onSetBuildings3D?: (v: boolean) => void;
  onSetMinimalMode?: (v: boolean) => void;
  onSetAutoRotate?: (v: boolean) => void;
  onSetRotateSpeed?: (degPerSec: number) => void;
  onSetLedHalo?: (v: boolean) => void;
  onSetLedHaloSpeed?: (ms: number) => void;
  choropleth?: ChoroplethState;
  // History Mode controls
  onToggleHistoryMode?: (enabled: boolean, opts?: { skipRestore?: boolean }) => void;
  onResetHistoryPresentation?: () => void;
  onHistoryToSatellite?: () => void;
  onSatelliteToHistory?: () => void;
  onSetHistoryYear?: (year: number) => void;
  historyEnabled?: boolean;
  historyYear?: number | null;
  // International Organizations highlight callback
  onSetOrganizationIsoFilter?: (iso3: string[], colorHex?: string) => void;
  // Natural layers
  onToggleRiversLayer?: (enabled: boolean) => void;
  riversEnabled?: boolean;
  onToggleMountainRangesLayer?: (enabled: boolean) => void;
  mountainRangesEnabled?: boolean;
  onTogglePeaksLayer?: (enabled: boolean) => void;
  peaksEnabled?: boolean;
  onToggleLakesLayer?: (enabled: boolean) => void;
  lakesEnabled?: boolean;
  onToggleVolcanoesLayer?: (enabled: boolean) => void;
  volcanoesEnabled?: boolean;
  onToggleFaultLinesLayer?: (enabled: boolean) => void;
  faultLinesEnabled?: boolean;
  onToggleDesertsLayer?: (enabled: boolean) => void;
  desertsEnabled?: boolean;
  naturalLod?: 'auto' | 'low' | 'med' | 'high';
  onSetNaturalLod?: (lod: 'auto' | 'low' | 'med' | 'high') => void;
  // Earth Data (NASA) overlays
  earthOverlays?: Record<NasaOverlayType, boolean>;
  onToggleEarthOverlay?: (type: NasaOverlayType, enabled: boolean) => void;
  onToggleSatelliteIntelMode?: (enabled: boolean) => void;
  countries?: Array<{ iso3: string; name: string; flagUrl?: string }>;
  countriesLoading?: boolean;
  onOpenCompareCountries?: () => void;
  // Live Activity layers
  onToggleEarthquakes?: (enabled: boolean) => void;
  earthquakesEnabled?: boolean;
  onToggleFires?: (enabled: boolean) => void;
  firesEnabled?: boolean;
  onToggleRadar?: (enabled: boolean) => void;
  radarEnabled?: boolean;
  onToggleAirTraffic?: (enabled: boolean) => void;
  airTrafficEnabled?: boolean;
  onToggleMarineTraffic?: (enabled: boolean) => void;
  marineTrafficEnabled?: boolean;
  onToggleSatellites?: (enabled: boolean) => void;
  satellitesEnabled?: boolean;
  onToggleWeather?: (enabled: boolean) => void;
  weatherEnabled?: boolean;
  weatherLayers?: string[];
  onToggleWeatherLayer?: (layer: string) => void;
  // Conflict Tracker
  onToggleConflicts?: (enabled: boolean) => void;
  conflictsEnabled?: boolean;
  conflictsLoading?: boolean;
  conflictSummaries?: ConflictSummary[];
  conflictSelectedCountry?: string | null;
  onConflictSelectCountry?: (country: string | null) => void;
  conflictCountryEvents?: ConflictFeature[];
  conflictSelectedEvent?: ConflictFeature | null;
  onConflictSelectEvent?: (event: ConflictFeature | null) => void;
  onConflictFlyTo?: (lat: number, lng: number) => void;
  onTrackingCategoriesChange?: (cats: Record<SatCategory, boolean>) => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  iconBg?: string;
}

export default function LeftSidebar({ isOpen, onClose: _onCloseRaw, onOpenConflictTracker, onOpenDemographics, onOpenCompareCountries, onSetBaseMapStyle, onSetPlanetPreset, onSetStarIntensity, onSetSpacePreset, onSetGlobeTheme, onSetTerrain, onSetTerrainExaggeration, onSetBuildings3D, onSetMinimalMode, onSetAutoRotate, onSetRotateSpeed, onSetLedHalo, onSetLedHaloSpeed, choropleth, onToggleHistoryMode, onSetHistoryYear, onResetHistoryPresentation, historyEnabled: _historyEnabled = false, historyYear = null, onSetOrganizationIsoFilter, onToggleRiversLayer, riversEnabled = false, onToggleMountainRangesLayer, mountainRangesEnabled = false, onTogglePeaksLayer, peaksEnabled = false, onToggleLakesLayer, lakesEnabled = false, onToggleVolcanoesLayer, volcanoesEnabled = false, onToggleFaultLinesLayer, faultLinesEnabled = false, onToggleDesertsLayer, desertsEnabled = false, naturalLod = 'auto', onSetNaturalLod, earthOverlays, onToggleEarthOverlay, onToggleSatelliteIntelMode, onHistoryToSatellite, onSatelliteToHistory, onToggleEarthquakes, earthquakesEnabled = false, onToggleFires, firesEnabled = false, onToggleRadar, radarEnabled = false, onToggleAirTraffic, airTrafficEnabled = false, onToggleMarineTraffic, marineTrafficEnabled = false, onToggleSatellites, satellitesEnabled = false, onToggleWeather, weatherEnabled = false, weatherLayers = [], onToggleWeatherLayer, onToggleConflicts, conflictsEnabled = false, conflictsLoading = false, conflictSummaries = [], conflictSelectedCountry = null, onConflictSelectCountry, conflictCountryEvents = [], conflictSelectedEvent = null, onConflictSelectEvent, onConflictFlyTo, onTrackingCategoriesChange }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState<string>('home');
  const [conflictView, setConflictView] = useState(false);
  const [physicalSections, setPhysicalSections] = useState({ geo: true, climate: true, terrain: true });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // ── Satellite Live Tracking ──
  const satTracking = useSatelliteTracking();
  const lastFeaturesRef = useRef<any[]>([]);
  const [hiddenCountries, setHiddenCountries] = useState<Set<string>>(new Set());
  const hiddenCountriesRef = useRef<Set<string>>(hiddenCountries);
  hiddenCountriesRef.current = hiddenCountries;
  const [countryFilterOpen, setCountryFilterOpen] = useState(false);

  const [hiddenConstellations, setHiddenConstellations] = useState<Set<string>>(new Set());
  const hiddenConstellationsRef = useRef<Set<string>>(hiddenConstellations);
  hiddenConstellationsRef.current = hiddenConstellations;
  const [constellationFilterOpen, setConstellationFilterOpen] = useState(false);

  const [hiddenWeatherPrograms, setHiddenWeatherPrograms] = useState<Set<string>>(new Set());
  const hiddenWeatherProgramsRef = useRef<Set<string>>(hiddenWeatherPrograms);
  hiddenWeatherProgramsRef.current = hiddenWeatherPrograms;
  const [weatherFilterOpen, setWeatherFilterOpen] = useState(false);

  const [hiddenStationPrograms, setHiddenStationPrograms] = useState<Set<string>>(new Set());
  const hiddenStationProgramsRef = useRef<Set<string>>(hiddenStationPrograms);
  hiddenStationProgramsRef.current = hiddenStationPrograms;
  const [stationFilterOpen, setStationFilterOpen] = useState(false);

  const [hiddenClassifiedOrbits, setHiddenClassifiedOrbits] = useState<Set<string>>(new Set());
  const hiddenClassifiedOrbitsRef = useRef<Set<string>>(hiddenClassifiedOrbits);
  hiddenClassifiedOrbitsRef.current = hiddenClassifiedOrbits;
  const [classifiedOrbitFilterOpen, setClassifiedOrbitFilterOpen] = useState(false);

  const toggleCountryFilter = useCallback((code: string) => {
    setHiddenCountries(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }, []);

  const toggleConstellationFilter = useCallback((key: string) => {
    setHiddenConstellations(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleWeatherProgramFilter = useCallback((key: string) => {
    setHiddenWeatherPrograms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleStationProgramFilter = useCallback((key: string) => {
    setHiddenStationPrograms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleClassifiedOrbitFilter = useCallback((key: string) => {
    setHiddenClassifiedOrbits(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Sync tracking categories up to App.tsx for legend rendering
  useEffect(() => {
    onTrackingCategoriesChange?.(satTracking.categories);
  }, [satTracking.categories, onTrackingCategoriesChange]);

  // Shared filter logic — applies all active sub-filters to a feature array
  const applyFilters = useCallback((features: any[]) => {
    const hiddenC = hiddenCountriesRef.current;
    const hiddenCC = hiddenClassifiedOrbitsRef.current;
    const hiddenCon = hiddenConstellationsRef.current;
    const hiddenWP = hiddenWeatherProgramsRef.current;
    const hiddenSP = hiddenStationProgramsRef.current;
    let filtered = features;
    if (hiddenC.size > 0)
      filtered = filtered.filter((f: any) => !(f.properties?.category === 'military' && hiddenC.has(f.properties?.country)));
    if (hiddenCC.size > 0)
      filtered = filtered.filter((f: any) => !(f.properties?.category === 'classified' && hiddenCC.has(f.properties?.constellation)));
    if (hiddenCon.size > 0)
      filtered = filtered.filter((f: any) => !(f.properties?.category === 'navigation' && hiddenCon.has(f.properties?.constellation)));
    if (hiddenWP.size > 0) {
      const knownPrograms = Object.keys(WEATHER_PROGRAM_META);
      filtered = filtered.filter((f: any) => {
        if (f.properties?.category !== 'weather') return true;
        const prog = f.properties?.constellation;
        return knownPrograms.includes(prog) && !hiddenWP.has(prog);
      });
    }
    if (hiddenSP.size > 0) {
      const knownPrograms = Object.keys(STATION_PROGRAM_META);
      filtered = filtered.filter((f: any) => {
        if (f.properties?.category !== 'stations') return true;
        const prog = f.properties?.constellation;
        return knownPrograms.includes(prog) && !hiddenSP.has(prog);
      });
    }
    return filtered;
  }, []);

  // Bridge: wire worker output to map layers via __wl_map_comp
  useEffect(() => {
    const mapComp = () => (document as any).__wl_map_comp;

    satTracking.setOnPositions((features: any[]) => {
      lastFeaturesRef.current = features;
      const filtered = applyFilters(features);
      mapComp()?.updateSatellitePositions?.(filtered);
      mapComp()?.updateSatellitePOVPositions?.(filtered);
      // Emit live data for POV HUD
      window.dispatchEvent(new CustomEvent('wl-satellite-positions', { detail: { features } }));
    });

    satTracking.setOnGroundTrack((noradId: number, coords: [number, number][], category: string, country: string, constellation: string) => {
      mapComp()?.showSatelliteGroundTrack?.(coords, category, country, constellation);
    });

    // Listen for satellite clicks + POV mode — request ground track
    const handleGroundTrack = (e: Event) => {
      const { noradId } = (e as CustomEvent).detail;
      if (noradId) satTracking.requestGroundTrack(noradId);
    };
    window.addEventListener('wl-satellite-click', handleGroundTrack);
    window.addEventListener('wl-satellite-pov-track', handleGroundTrack);
    return () => {
      window.removeEventListener('wl-satellite-click', handleGroundTrack);
      window.removeEventListener('wl-satellite-pov-track', handleGroundTrack);
    };
  }, []);

  // Immediately re-filter when any sub-filter changes (don't wait for next worker tick)
  useEffect(() => {
    if (lastFeaturesRef.current.length === 0) return;
    const mapComp = (document as any).__wl_map_comp;
    const filtered = applyFilters(lastFeaturesRef.current);
    mapComp?.updateSatellitePositions?.(filtered);
    mapComp?.updateSatellitePOVPositions?.(filtered);
  }, [hiddenCountries, hiddenClassifiedOrbits, hiddenConstellations, hiddenWeatherPrograms, hiddenStationPrograms, applyFilters]);

  const handleToggleSatCategory = useCallback(async (cat: SatCategory, enabled: boolean) => {
    const mapComp = (document as any).__wl_map_comp;
    if (enabled) {
      mapComp?.setSatelliteTrackingLayers?.(true);
      // Immersive entry: globe rotation + twinkling stars
      mapComp?.setRotateSpeed?.(1);
      mapComp?.setAutoRotate?.(true);
      mapComp?.setSpacePreset?.('deep');
      window.dispatchEvent(new CustomEvent('wl-star-twinkle', { detail: { enabled: true } }));
    } else {
      // Always remove ground track when toggling a category off
      mapComp?.removeSatelliteGroundTrack?.();
    }
    await satTracking.toggleCategory(cat, enabled);
    const anyStillOn = Object.entries({ ...satTracking.categories, [cat]: enabled }).some(([, v]) => v);
    if (!anyStillOn) {
      mapComp?.setSatelliteTrackingLayers?.(false);
      mapComp?.setAutoRotate?.(false);
      window.dispatchEvent(new CustomEvent('wl-star-twinkle', { detail: { enabled: false } }));
    }
  }, [satTracking]);

  // Cleanup satellite tracking when leaving Satellite Intel
  const cleanupSatelliteTracking = useCallback(() => {
    satTracking.cleanup();
    const mapComp = (document as any).__wl_map_comp;
    mapComp?.setSatelliteTrackingLayers?.(false);
    mapComp?.setAutoRotate?.(false);
    window.dispatchEvent(new CustomEvent('wl-star-twinkle', { detail: { enabled: false } }));
  }, [satTracking]);

  // Deactivate immersive mode + all earth overlays + satellite tracking when leaving Satellite Intel
  const deactivateAllOverlays = useCallback(() => {
    onToggleSatelliteIntelMode?.(false);
    cleanupSatelliteTracking();
  }, [onToggleSatelliteIntelMode, cleanupSatelliteTracking]);

  // Deactivate all active natural/physical layers when leaving Physical Layers
  const deactivateAllNaturalLayers = useCallback(() => {
    if (riversEnabled) onToggleRiversLayer?.(false);
    if (mountainRangesEnabled) onToggleMountainRangesLayer?.(false);
    if (peaksEnabled) onTogglePeaksLayer?.(false);
    if (lakesEnabled) onToggleLakesLayer?.(false);
    if (volcanoesEnabled) onToggleVolcanoesLayer?.(false);
    if (faultLinesEnabled) onToggleFaultLinesLayer?.(false);
    if (desertsEnabled) onToggleDesertsLayer?.(false);
  }, [riversEnabled, mountainRangesEnabled, peaksEnabled, lakesEnabled, volcanoesEnabled, faultLinesEnabled, desertsEnabled, onToggleRiversLayer, onToggleMountainRangesLayer, onTogglePeaksLayer, onToggleLakesLayer, onToggleVolcanoesLayer, onToggleFaultLinesLayer, onToggleDesertsLayer]);

  // Deactivate all active statistic choropleths when leaving Statistics
  const deactivateAllStats = useCallback(() => {
    choropleth?.handleHideAll();
  }, [choropleth]);

  // Deactivate International Organizations highlights when leaving the section
  const deactivateOrganizations = useCallback(() => {
    try { (window as any).__wl_mapRef?.highlightIso3ToColorMap?.({}); } catch {}
    try { (document as any).__wl_map_comp?.highlightIso3ToColorMap?.({}); } catch {}
    try { onSetOrganizationIsoFilter?.([]); } catch {}
  }, [onSetOrganizationIsoFilter]);

  // Wrap onClose to cleanup active modes
  const _onClose = useCallback(() => {
    if (activeItem === 'satellite intel') {
      deactivateAllOverlays();
    }
    if (activeItem === 'statistics') {
      deactivateAllStats();
    }
    if (activeItem === 'physical layers') {
      deactivateAllNaturalLayers();
    }
    if (activeItem === 'international organizations') {
      deactivateOrganizations();
    }
    setActiveItem('home');
    _onCloseRaw();
  }, [activeItem, deactivateAllOverlays, deactivateAllStats, deactivateAllNaturalLayers, deactivateOrganizations, _onCloseRaw]);
  const [rotateSpeed, setRotateSpeed] = useState<number>(3);
  const [terrainEnabled, setTerrainEnabled] = useState<boolean>(false);
  const [terrainEx, setTerrainEx] = useState<number>(1);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [ledHaloEnabled, setLedHaloEnabled] = useState<boolean>(false);
  const [ledHaloSpeed, setLedHaloSpeed] = useState<number>(50);
  const [starIntensity, setStarIntensityLocal] = useState<number>(0.6);
  const yearScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const [_orgQuery, _setOrgQuery] = useState<string>('');
  const [_orgLoading, _setOrgLoading] = useState<boolean>(false);
  const [_orgSelectedKey, _setOrgSelectedKey] = useState<string | null>(null);
  const [_activeIsoToColor, _setActiveIsoToColor] = useState<Record<string,string>>({});

  // Snap the active year into view when it changes
  useEffect(() => {
    const container = yearScrollRef.current;
    if (!container || historyYear === null) return;
    const activeYear = snapToAvailableYear(historyYear);
    const btn = container.querySelector(`[data-year="${activeYear}"]`) as HTMLButtonElement | null;
    if (!btn) return;
    try {
      // @ts-ignore newer browsers support inline:center
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } catch {
      // Fallback: manual centering
      const rect = btn.getBoundingClientRect();
      const crect = container.getBoundingClientRect();
      const offset = (rect.left + rect.right) / 2 - (crect.left + crect.right) / 2;
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, [historyYear]);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: <Globe className="h-5 w-5 text-cyan-400" />,
      label: 'History Mode',
      href: '#history',
      iconBg: 'rgba(6, 182, 212, 0.12)'
    },
    {
      icon: <Crosshair className="h-5 w-5 text-red-400" />,
      label: 'Conflict Tracker',
      href: '#conflicts',
      iconBg: 'rgba(239, 68, 68, 0.12)'
    },
    {
      icon: <Radio className="h-5 w-5 text-orange-400" />,
      label: 'Live Activity',
      href: '#live',
      iconBg: 'rgba(251, 146, 60, 0.12)'
    },
    {
      icon: <Map className="h-5 w-5 text-green-400" />,
      label: 'Physical Layers',
      href: '#physical',
      iconBg: 'rgba(16, 185, 129, 0.12)'
    },
    {
      icon: <Satellite className="h-5 w-5 text-teal-400" />,
      label: 'Satellite Intel',
      href: '#satellite-intel',
      iconBg: 'rgba(20, 184, 166, 0.12)'
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-blue-400" />,
      label: 'Statistics',
      href: '#stats',
      iconBg: 'rgba(59, 130, 246, 0.12)'
    },
    {
      icon: <Users2 className="h-5 w-5 text-amber-400" />,
      label: 'Demographics',
      href: '#demographics',
      iconBg: 'rgba(245, 158, 11, 0.12)'
    },
    {
      icon: <Users className="h-5 w-5 text-yellow-400" />,
      label: 'International Organizations',
      href: '#orgs',
      iconBg: 'rgba(234, 179, 8, 0.12)'
    },
    {
      icon: <GitCompare className="h-5 w-5 text-purple-400" />,
      label: 'Compare Countries',
      href: '#compare',
      iconBg: 'rgba(147, 51, 234, 0.12)'
    },
    {
      icon: <User className="h-5 w-5 text-indigo-400" />,
      label: 'Dashboard',
      href: '/dashboard',
      iconBg: 'rgba(99, 102, 241, 0.12)',
      onClick: () => {
        if (isAuthenticated) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }
    },
    {
      icon: <Settings className="h-5 w-5 text-slate-400" />,
      label: 'Settings',
      href: '#settings',
      iconBg: 'rgba(148, 163, 184, 0.12)'
    },
    {
      icon: <Info className="h-5 w-5 text-pink-400" />,
      label: 'About',
      href: LANDING_ABOUT_URL,
      iconBg: 'rgba(236, 72, 153, 0.12)'
    }
  ], [navigate, isAuthenticated]);

  const handleItemClick = useCallback((item: MenuItem) => {
    // Handle Dashboard navigation
    if (item.label === 'Dashboard') {
      if (item.onClick) {
        item.onClick();
      }
      return;
    }

    // Conflict Tracker opens its own dedicated view
    if (item.label === 'Conflict Tracker') {
      setConflictView(true);
      return;
    }

    const itemKey = item.label.toLowerCase();

    // Toggle: if clicking the same item, close it
    if (activeItem === itemKey) {
      // If leaving Satellite Intel, disable all overlays
      if (item.label === 'Satellite Intel') {
        deactivateAllOverlays();
      }
      // If leaving History Mode, disable it
      if (activeItem === 'history mode') {
        onToggleHistoryMode?.(false);
      }
      // If leaving Statistics, hide all choropleth layers
      if (activeItem === 'statistics') {
        deactivateAllStats();
      }
      // If leaving Physical Layers, hide all natural layers
      if (activeItem === 'physical layers') {
        deactivateAllNaturalLayers();
      }
      // If leaving International Organizations, clear highlights
      if (activeItem === 'international organizations') {
        deactivateOrganizations();
      }
      setActiveItem('');
      return;
    }

    // --- Special case: History Mode → Satellite Intel ---
    // Use an atomic transition to avoid race conditions between the async
    // style restoration of History Mode and Night Lights activation.
    if (activeItem === 'history mode' && item.label === 'Satellite Intel') {
      prefetchNightLightsTiles();
      setActiveItem(itemKey);
      onHistoryToSatellite?.();
      return;
    }

    // --- Special case: Satellite Intel → History Mode ---
    // Use an atomic transition to avoid race conditions between night-lights
    // style restoration and History Mode activation.
    if (activeItem === 'satellite intel' && item.label === 'History Mode') {
      setActiveItem(itemKey);
      setAutoRotate(true); // History Mode enables rotation by default
      onSatelliteToHistory?.();
      return;
    }

    // If leaving Satellite Intel for another section, disable all overlays
    if (activeItem === 'satellite intel') {
      deactivateAllOverlays();
    }

    // If leaving History Mode for another section, disable it
    if (activeItem === 'history mode') {
      onToggleHistoryMode?.(false);
    }

    // If leaving Statistics for another section, hide all choropleth layers
    if (activeItem === 'statistics') {
      deactivateAllStats();
    }

    // If leaving Physical Layers for another section, hide all natural layers
    if (activeItem === 'physical layers') {
      deactivateAllNaturalLayers();
    }

    // If leaving International Organizations for another section, clear highlights
    if (activeItem === 'international organizations') {
      deactivateOrganizations();
    }

    setActiveItem(itemKey);

    // Activate Earth at Night immersive mode when entering Satellite Intel
    if (item.label === 'Satellite Intel') {
      prefetchNightLightsTiles();
      onToggleSatelliteIntelMode?.(true);
    }

    if (item.label === 'Conflict Tracker' && onOpenConflictTracker) {
      onOpenConflictTracker();
      return;
    }

    if (item.label === 'Demographics' && onOpenDemographics) {
      onOpenDemographics();
      return;
    }

    if (item.label === 'Compare Countries' && onOpenCompareCountries) {
      onOpenCompareCountries();
      return;
    }

    // Auto-activate History Mode when entering the section (switches to Nav Day)
    if (item.label === 'History Mode') {
      onToggleHistoryMode?.(true);
      setAutoRotate(true); // History Mode enables rotation by default
    }

    if (item.onClick) {
      item.onClick();
    }
  }, [activeItem, onToggleSatelliteIntelMode, earthOverlays, onToggleEarthOverlay, deactivateAllOverlays, deactivateAllStats, deactivateAllNaturalLayers, deactivateOrganizations, onOpenConflictTracker, onOpenDemographics, onOpenCompareCountries, onToggleHistoryMode, onHistoryToSatellite, onSatelliteToHistory]);

  return (
    <>
      {isOpen && (
            <div className="left-sidebar">

              {/* ── Conflict Tracker full-view ── */}
              {conflictView ? (
                <ConflictPanel
                  summaries={conflictSummaries}
                  selectedCountry={conflictSelectedCountry}
                  onSelectCountry={onConflictSelectCountry ?? (() => {})}
                  countryEvents={conflictCountryEvents}
                  selectedEvent={conflictSelectedEvent}
                  onSelectEvent={onConflictSelectEvent ?? (() => {})}
                  onFlyTo={onConflictFlyTo ?? (() => {})}
                  isLoading={conflictsLoading}
                  enabled={conflictsEnabled}
                  onToggle={onToggleConflicts ?? (() => {})}
                  onBack={() => setConflictView(false)}
                />
              ) : (
              <>
              <div className="left-sidebar-header mb-4" style={{ minHeight: '64px' }}>
                <h1 className="left-sidebar-title">WorldLore</h1>
              </div>

              <div className="left-sidebar-content">
                <nav className="space-y-2">
                  {menuItems.map((item, _index) => (
                    <div key={item.label}>
                      <a
                        href={item.href}
                        onClick={(e) => {
                          if (item.label === 'About') return;
                          e.preventDefault();
                          handleItemClick(item);
                        }}
                        className={`left-sidebar-item ${
                          activeItem === item.label.toLowerCase() || (item.label === 'Conflict Tracker' && conflictView) ? 'active' : ''
                        }`}
                      >
                        <div className="left-sidebar-item-icon" style={{ background: item.iconBg }}>
                          {item.icon}
                        </div>
                        <span className="left-sidebar-item-label">
                          {item.label}
                        </span>
                        {item.label === 'Conflict Tracker' && conflictsEnabled && (
                          <span className="conflict-live-dot" />
                        )}
                        {activeItem === item.label.toLowerCase() && (
                          <div className="left-sidebar-item-indicator" />
                        )}
                      </a>

                      {item.label === 'Live Activity' && activeItem === 'live activity' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Live Activity">
                          <div className="settings-subtitle" style={{ marginBottom: 8 }}>
                            Real-time tracking of moving objects.
                          </div>
                          <div className="layer-row">
                            <span className={`layer-row-dot ${radarEnabled ? 'on' : ''}`} />
                            <span className="layer-row-name">Weather Radar</span>
                            <button className={`toggle-switch ${radarEnabled ? 'on' : ''}`} onClick={() => onToggleRadar?.(!radarEnabled)} aria-label="Toggle radar" />
                          </div>
                          <div className="layer-row">
                            <span className={`layer-row-dot ${airTrafficEnabled ? 'on' : ''}`} />
                            <span className="layer-row-name">Air Traffic</span>
                            <button className={`toggle-switch ${airTrafficEnabled ? 'on' : ''}`} onClick={() => onToggleAirTraffic?.(!airTrafficEnabled)} aria-label="Toggle air traffic" />
                          </div>
                          <div className="layer-row">
                            <span className={`layer-row-dot ${marineTrafficEnabled ? 'on' : ''}`} />
                            <span className="layer-row-name">Marine Traffic</span>
                            <button className={`toggle-switch ${marineTrafficEnabled ? 'on' : ''}`} onClick={() => onToggleMarineTraffic?.(!marineTrafficEnabled)} aria-label="Toggle marine traffic" />
                          </div>
                          <div className="layer-row">
                            <span className={`layer-row-dot ${satellitesEnabled ? 'on' : ''}`} />
                            <span className="layer-row-name">Satellites</span>
                            <button className={`toggle-switch ${satellitesEnabled ? 'on' : ''}`} onClick={() => onToggleSatellites?.(!satellitesEnabled)} aria-label="Toggle satellites" />
                          </div>
                        </div>
                      )}

                      {item.label === 'Physical Layers' && activeItem === 'physical layers' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Physical Layers">
                          {/* ── GEOPHYSICAL ── */}
                          <div className="layer-section">
                            <div className="layer-section-header" onClick={() => setPhysicalSections(p => ({ ...p, geo: !p.geo }))}>
                              <span className="layer-section-dot" style={{ background: '#ef4444', color: '#ef4444' }} />
                              <span className="layer-section-label">Geophysical</span>
                              <svg className={`layer-section-chevron ${physicalSections.geo ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </div>
                            {physicalSections.geo && (<>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${earthquakesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Earthquakes</span>
                                <button className={`toggle-switch ${earthquakesEnabled ? 'on' : ''}`} onClick={() => onToggleEarthquakes?.(!earthquakesEnabled)} aria-label="Toggle earthquakes" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${volcanoesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Volcanoes</span>
                                <button className={`toggle-switch ${volcanoesEnabled ? 'on' : ''}`} onClick={() => onToggleVolcanoesLayer?.(!volcanoesEnabled)} aria-label="Toggle volcanoes" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${faultLinesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Fault Lines</span>
                                <button className={`toggle-switch ${faultLinesEnabled ? 'on' : ''}`} onClick={() => onToggleFaultLinesLayer?.(!faultLinesEnabled)} aria-label="Toggle fault lines" />
                              </div>
                            </>)}
                          </div>

                          {/* ── CLIMATE & WEATHER ── */}
                          <div className="layer-section">
                            <div className="layer-section-header" onClick={() => setPhysicalSections(p => ({ ...p, climate: !p.climate }))}>
                              <span className="layer-section-dot" style={{ background: '#f59e0b', color: '#f59e0b' }} />
                              <span className="layer-section-label">Climate & Weather</span>
                              <svg className={`layer-section-chevron ${physicalSections.climate ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </div>
                            {physicalSections.climate && (<>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${weatherEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Weather Overlay</span>
                                <button className={`toggle-switch ${weatherEnabled ? 'on' : ''}`} onClick={() => onToggleWeather?.(!weatherEnabled)} aria-label="Toggle weather" />
                              </div>
                              {weatherEnabled && (
                                <div className="layer-sub-chips">
                                  {([['temp_new','Temp'],['clouds_new','Clouds'],['precipitation_new','Rain'],['wind_new','Wind'],['pressure_new','Pressure']] as [string,string][]).map(([id,label]) => (
                                    <button key={id} className={`layer-sub-chip ${weatherLayers.includes(id) ? 'active' : ''}`} onClick={() => onToggleWeatherLayer?.(id)}>{label}</button>
                                  ))}
                                </div>
                              )}
                              <div className="layer-row">
                                <span className={`layer-row-dot ${firesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Active Fires</span>
                                <button className={`toggle-switch ${firesEnabled ? 'on' : ''}`} onClick={() => onToggleFires?.(!firesEnabled)} aria-label="Toggle fires" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${desertsEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Deserts</span>
                                <button className={`toggle-switch ${desertsEnabled ? 'on' : ''}`} onClick={() => onToggleDesertsLayer?.(!desertsEnabled)} aria-label="Toggle deserts" />
                              </div>
                            </>)}
                          </div>

                          {/* ── TERRAIN & WATER ── */}
                          <div className="layer-section">
                            <div className="layer-section-header" onClick={() => setPhysicalSections(p => ({ ...p, terrain: !p.terrain }))}>
                              <span className="layer-section-dot" style={{ background: '#10b981', color: '#10b981' }} />
                              <span className="layer-section-label">Terrain & Water</span>
                              <svg className={`layer-section-chevron ${physicalSections.terrain ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </div>
                            {physicalSections.terrain && (<>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${riversEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Rivers</span>
                                <button className={`toggle-switch ${riversEnabled ? 'on' : ''}`} onClick={() => onToggleRiversLayer?.(!riversEnabled)} aria-label="Toggle rivers" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${lakesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Lakes</span>
                                <button className={`toggle-switch ${lakesEnabled ? 'on' : ''}`} onClick={() => onToggleLakesLayer?.(!lakesEnabled)} aria-label="Toggle lakes" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${mountainRangesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Mountain Ranges</span>
                                <button className={`toggle-switch ${mountainRangesEnabled ? 'on' : ''}`} onClick={() => onToggleMountainRangesLayer?.(!mountainRangesEnabled)} aria-label="Toggle mountain ranges" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${peaksEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Peaks</span>
                                <button className={`toggle-switch ${peaksEnabled ? 'on' : ''}`} onClick={() => onTogglePeaksLayer?.(!peaksEnabled)} aria-label="Toggle peaks" />
                              </div>
                            </>)}
                          </div>

                          {/* ── LOD Slider ── */}
                          <div style={{ height: 1, background: 'rgba(71,85,105,0.25)', margin: '6px 0 8px' }} />
                          <div className="lod-slider-block">
                            <div className="lod-slider-header">
                              <span className="lod-slider-label">Detail Level</span>
                              <span className="lod-slider-value">{naturalLod}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={3}
                              step={1}
                              value={['auto','low','med','high'].indexOf(naturalLod)}
                              onChange={(e) => {
                                const lods = ['auto','low','med','high'] as const;
                                onSetNaturalLod?.(lods[Number(e.target.value)]);
                              }}
                              className="lod-slider"
                              aria-label="Detail level"
                            />
                            <div className="lod-ticks">
                              <span className="lod-tick">Auto</span>
                              <span className="lod-tick">Low</span>
                              <span className="lod-tick">Med</span>
                              <span className="lod-tick">High</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {item.label === 'Satellite Intel' && activeItem === 'satellite intel' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Satellite Intel">
                          <div className="section-header" style={{ marginBottom: 8 }}>
                            <h3>Satellite Intel</h3>
                          </div>
                          <div className="settings-subtitle" style={{ marginBottom: 12 }}>
                            Real-time satellite powered by WorldLore.
                          </div>
                          <div className="settings-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                            {NASA_EARTH_OVERLAY_KEYS.map(key => {
                              const cfg = NASA_EARTH_OVERLAYS[key];
                              const enabled = earthOverlays?.[key] ?? false;
                              return (
                                <div className="section-card" style={{ marginBottom: 0 }} key={key}>
                                  <div className="stats-header" style={{ marginBottom: 6 }}>
                                    <div className="stats-title">{cfg.label}</div>
                                    <div className="chip-group">
                                      <button
                                        className={`chip ${enabled ? 'active' : ''}`}
                                        onClick={() => onToggleEarthOverlay?.(key, true)}
                                        aria-pressed={enabled}
                                        aria-label={`Show ${cfg.label}`}
                                      >Show</button>
                                      <button
                                        className={`chip ${!enabled ? 'active' : ''}`}
                                        onClick={() => onToggleEarthOverlay?.(key, false)}
                                        aria-pressed={!enabled}
                                        aria-label={`Hide ${cfg.label}`}
                                      >Hide</button>
                                    </div>
                                  </div>
                                  <div className="stats-subtitle">{cfg.description}</div>
                                  <div style={{ fontSize: 9, color: 'rgba(160,150,200,0.45)', marginTop: 4, letterSpacing: '0.02em' }}>
                                    Last observation — {new Date(getNasaObservationDate(key) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* ── Live Tracking ── */}
                          <div className="section-header" style={{ marginTop: 18, marginBottom: 8 }}>
                            <h3>Space Monitor</h3>
                          </div>
                          <div className="settings-subtitle" style={{ marginBottom: 12 }}>
                            Real-time satellite positions powered by WorldLore.
                          </div>
                          <div className="settings-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                            {(['military', 'classified', 'navigation', 'weather', 'stations', 'starlink'] as SatCategory[]).map(cat => {
                              const meta = SAT_CATEGORY_META[cat];
                              const enabled = satTracking.categories[cat];
                              const isLoading = satTracking.loading[cat];
                              const liveCount = satTracking.getCategoryCount(cat);
                              const countLabel = liveCount !== null ? liveCount.toLocaleString() : meta.count;
                              return (
                                <div className="section-card" style={{ marginBottom: 0 }} key={cat}>
                                  <div className="stats-header" style={{ marginBottom: 4 }}>
                                    <div className="stats-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, display: 'inline-block', flexShrink: 0 }} />
                                      {meta.label}
                                      <span style={{ fontSize: 10, color: 'rgba(160,150,200,0.5)', fontWeight: 400 }}>({countLabel})</span>
                                    </div>
                                    <div className="chip-group">
                                      <button
                                        className={`chip ${enabled ? 'active' : ''}`}
                                        onClick={() => {
                                          if (isLoading) return;
                                          handleToggleSatCategory(cat, true);
                                          if (cat === 'military') setCountryFilterOpen(true);
                                          if (cat === 'classified') setClassifiedOrbitFilterOpen(true);
                                          if (cat === 'navigation') setConstellationFilterOpen(true);
                                          if (cat === 'weather') setWeatherFilterOpen(true);
                                          if (cat === 'stations') setStationFilterOpen(true);
                                        }}
                                        aria-pressed={enabled}
                                        disabled={isLoading}
                                      >{isLoading ? '...' : 'Show'}</button>
                                      <button
                                        className={`chip ${!enabled ? 'active' : ''}`}
                                        onClick={() => handleToggleSatCategory(cat, false)}
                                        aria-pressed={!enabled}
                                      >Hide</button>
                                    </div>
                                  </div>
                                  {cat === 'military' && enabled && (() => {
                                    const counts = satTracking.getCountryCounts('military');
                                    const hasFilters = hiddenCountries.size > 0;
                                    const sortedCountries = Object.entries(MILITARY_COUNTRY_COLORS)
                                      .sort((a, b) => (counts[b[0]] || 0) - (counts[a[0]] || 0));
                                    return (
                                      <div style={{ marginTop: 8 }}>
                                        <div className="sat-filter-desc">
                                          Reconnaissance, signals intelligence, early warning &amp; communications satellites — active operational assets tracked by country of origin.
                                        </div>
                                        <div className="sat-filter-bar">
                                          <button
                                            className={`sat-filter-btn ${countryFilterOpen ? 'open' : ''}`}
                                            onClick={() => setCountryFilterOpen(prev => !prev)}
                                          >
                                            <span className="sat-filter-btn-icon">🌍</span>
                                            Filter by country
                                            <span className="sat-filter-btn-arrow">{countryFilterOpen ? '▾' : '▸'}</span>
                                          </button>
                                          {hasFilters && (
                                            <>
                                              <span className="sat-filter-hidden-count">
                                                {hiddenCountries.size} hidden
                                              </span>
                                              <span className="sat-filter-reset" onClick={() => setHiddenCountries(new Set())}>
                                                Reset
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {countryFilterOpen && (
                                          <div className="hide-scrollbar sat-filter-list">
                                            {sortedCountries.map(([code, color]) => {
                                              const hidden = hiddenCountries.has(code);
                                              const count = counts[code] || 0;
                                              const flag = COUNTRY_FLAGS[code] || '';
                                              const name = COUNTRY_NAMES[code] || code;
                                              return (
                                                <div key={code} className={`sat-filter-item ${hidden ? 'is-hidden' : ''}`} style={{ '--fc': color } as any} onClick={() => toggleCountryFilter(code)}>
                                                  <div className="sat-filter-item-left">
                                                    <span className="sat-filter-dot" />
                                                    <span className="sat-filter-flag">{flag}</span>
                                                    <span className="sat-filter-label">{name}</span>
                                                    <span className="sat-filter-count">{count}</span>
                                                  </div>
                                                  <div className="sat-filter-toggle"><div className="sat-filter-knob" /></div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {cat === 'classified' && enabled && (() => {
                                    const counts = satTracking.getConstellationCounts('classified');
                                    const hasFilters = hiddenClassifiedOrbits.size > 0;
                                    const ORBIT_META: Record<string, { label: string; icon: string; desc: string }> = {
                                      leo: { label: 'LEO', icon: '🔭', desc: 'Reconnaissance / Imaging' },
                                      meo: { label: 'MEO', icon: '📡', desc: 'Space Domain Awareness' },
                                      geo: { label: 'GEO', icon: '🛰️', desc: 'SIGINT / Comms Relay' },
                                      heo: { label: 'HEO', icon: '⚡', desc: 'Early Warning / Polar' },
                                    };
                                    const sortedOrbits = Object.entries(CLASSIFIED_ORBIT_COLORS)
                                      .sort((a, b) => (counts[b[0]] || 0) - (counts[a[0]] || 0));
                                    return (
                                      <div style={{ marginTop: 8 }}>
                                        <div className="sat-filter-desc">
                                          Unacknowledged national security satellites tracked by amateur astronomers — orbit type reveals probable mission based on orbital mechanics.
                                        </div>
                                        <div className="sat-filter-bar">
                                          <button
                                            className={`sat-filter-btn ${classifiedOrbitFilterOpen ? 'open' : ''}`}
                                            onClick={() => setClassifiedOrbitFilterOpen(prev => !prev)}
                                          >
                                            <span className="sat-filter-btn-icon">🔒</span>
                                            Filter by orbit type
                                            <span className="sat-filter-btn-arrow">{classifiedOrbitFilterOpen ? '▾' : '▸'}</span>
                                          </button>
                                          {hasFilters && (
                                            <>
                                              <span className="sat-filter-hidden-count">
                                                {hiddenClassifiedOrbits.size} hidden
                                              </span>
                                              <span className="sat-filter-reset" onClick={() => setHiddenClassifiedOrbits(new Set())}>
                                                Reset
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {classifiedOrbitFilterOpen && (
                                          <div className="hide-scrollbar sat-filter-list">
                                            {sortedOrbits.map(([key, color]) => {
                                              const hidden = hiddenClassifiedOrbits.has(key);
                                              const count = counts[key] || 0;
                                              const meta = ORBIT_META[key] || { label: key.toUpperCase(), icon: '🛰️', desc: '' };
                                              return (
                                                <div key={key} className={`sat-filter-item ${hidden ? 'is-hidden' : ''}`} style={{ '--fc': color } as any} onClick={() => toggleClassifiedOrbitFilter(key)}>
                                                  <div className="sat-filter-item-left">
                                                    <span className="sat-filter-dot" />
                                                    <span className="sat-filter-flag">{meta.icon}</span>
                                                    <span className="sat-filter-label">{meta.label}</span>
                                                    <span className="sat-filter-count">{count}</span>
                                                  </div>
                                                  <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 4 }}>{meta.desc}</span>
                                                  <div className="sat-filter-toggle"><div className="sat-filter-knob" /></div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {cat === 'navigation' && enabled && (() => {
                                    const counts = satTracking.getConstellationCounts();
                                    const hasFilters = hiddenConstellations.size > 0;
                                    return (
                                      <div style={{ marginTop: 8 }}>
                                        <div className="sat-filter-desc">
                                          7 independent systems providing global &amp; regional PNT — GPS, GLONASS, Galileo, BeiDou, NavIC, QZSS and SBAS augmentation.
                                        </div>
                                        <div className="sat-filter-bar">
                                          <button
                                            className={`sat-filter-btn ${constellationFilterOpen ? 'open' : ''}`}
                                            onClick={() => setConstellationFilterOpen(prev => !prev)}
                                          >
                                            <span className="sat-filter-btn-icon">🛰️</span>
                                            Filter by constellation
                                            <span className="sat-filter-btn-arrow">{constellationFilterOpen ? '▾' : '▸'}</span>
                                          </button>
                                          {hasFilters && (
                                            <>
                                              <span className="sat-filter-hidden-count">
                                                {hiddenConstellations.size} hidden
                                              </span>
                                              <span className="sat-filter-reset" onClick={() => setHiddenConstellations(new Set())}>
                                                Reset
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {constellationFilterOpen && (
                                          <div className="hide-scrollbar sat-filter-list">
                                            {Object.entries(GNSS_CONSTELLATION_META).map(([key, meta]) => {
                                              const color = GNSS_CONSTELLATION_COLORS[key];
                                              const isHidden = hiddenConstellations.has(key);
                                              const count = counts[key] || 0;
                                              return (
                                                <div key={key} className={`sat-filter-item ${isHidden ? 'is-hidden' : ''}`} style={{ '--fc': color } as any} onClick={() => toggleConstellationFilter(key)}>
                                                  <div className="sat-filter-item-left">
                                                    <span className="sat-filter-dot" />
                                                    <span className="sat-filter-flag">{meta.flag}</span>
                                                    <span className="sat-filter-label">{meta.label}</span>
                                                    <span className="sat-filter-count">{count}</span>
                                                  </div>
                                                  <div className="sat-filter-toggle"><div className="sat-filter-knob" /></div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {cat === 'weather' && enabled && (() => {
                                    const counts = satTracking.getWeatherProgramCounts();
                                    const hasFilters = hiddenWeatherPrograms.size > 0;
                                    return (
                                      <div style={{ marginTop: 8 }}>
                                        <div className="sat-filter-desc">
                                          Polar-orbiting &amp; geostationary platforms from 8 agencies — continuous atmospheric monitoring, ocean observation and SAR imaging.
                                        </div>
                                        <div className="sat-filter-bar">
                                          <button
                                            className={`sat-filter-btn ${weatherFilterOpen ? 'open' : ''}`}
                                            onClick={() => setWeatherFilterOpen(prev => !prev)}
                                          >
                                            <span className="sat-filter-btn-icon">🌦️</span>
                                            Filter by program
                                            <span className="sat-filter-btn-arrow">{weatherFilterOpen ? '▾' : '▸'}</span>
                                          </button>
                                          {hasFilters && (
                                            <>
                                              <span className="sat-filter-hidden-count">
                                                {hiddenWeatherPrograms.size} hidden
                                              </span>
                                              <span className="sat-filter-reset" onClick={() => setHiddenWeatherPrograms(new Set())}>
                                                Reset
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {weatherFilterOpen && (
                                          <div className="hide-scrollbar sat-filter-list">
                                            {Object.entries(WEATHER_PROGRAM_META).map(([key, meta]) => {
                                              const color = WEATHER_PROGRAM_COLORS[key];
                                              const isHidden = hiddenWeatherPrograms.has(key);
                                              const count = counts[key] || 0;
                                              return (
                                                <div key={key} className={`sat-filter-item ${isHidden ? 'is-hidden' : ''}`} style={{ '--fc': color } as any} onClick={() => toggleWeatherProgramFilter(key)}>
                                                  <div className="sat-filter-item-left">
                                                    <span className="sat-filter-dot" />
                                                    <span className="sat-filter-flag">{meta.flag}</span>
                                                    <span className="sat-filter-label">{meta.label}</span>
                                                    <span className="sat-filter-count">{count}</span>
                                                  </div>
                                                  <div className="sat-filter-toggle"><div className="sat-filter-knob" /></div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {cat === 'stations' && enabled && (() => {
                                    const counts = satTracking.getStationProgramCounts();
                                    const hasFilters = hiddenStationPrograms.size > 0;
                                    return (
                                      <div style={{ marginTop: 8 }}>
                                        <div className="sat-filter-desc">
                                          Crewed stations, data relay networks &amp; science missions — ISS, CSS, TDRS, NASA Science, LUCH, EDRS &amp; Tianlian.
                                        </div>
                                        <div className="sat-filter-bar">
                                          <button
                                            className={`sat-filter-btn ${stationFilterOpen ? 'open' : ''}`}
                                            onClick={() => setStationFilterOpen(prev => !prev)}
                                          >
                                            <span className="sat-filter-btn-icon">🛰️</span>
                                            Filter by program
                                            <span className="sat-filter-btn-arrow">{stationFilterOpen ? '▾' : '▸'}</span>
                                          </button>
                                          {hasFilters && (
                                            <>
                                              <span className="sat-filter-hidden-count">
                                                {hiddenStationPrograms.size} hidden
                                              </span>
                                              <span className="sat-filter-reset" onClick={() => setHiddenStationPrograms(new Set())}>
                                                Reset
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {stationFilterOpen && (
                                          <div className="hide-scrollbar sat-filter-list">
                                            {Object.entries(STATION_PROGRAM_META).map(([key, meta]) => {
                                              const color = STATION_PROGRAM_COLORS[key];
                                              const isHidden = hiddenStationPrograms.has(key);
                                              const count = counts[key] || 0;
                                              return (
                                                <div key={key} className={`sat-filter-item ${isHidden ? 'is-hidden' : ''}`} style={{ '--fc': color } as any} onClick={() => toggleStationProgramFilter(key)}>
                                                  <div className="sat-filter-item-left">
                                                    <span className="sat-filter-dot" />
                                                    <span className="sat-filter-flag">{meta.flag}</span>
                                                    <span className="sat-filter-label">{meta.label}</span>
                                                    <span className="sat-filter-count">{count}</span>
                                                  </div>
                                                  <div className="sat-filter-toggle"><div className="sat-filter-knob" /></div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {cat === 'starlink' && (
                                    <div style={{ fontSize: 9, color: 'rgba(255,200,100,0.5)', marginTop: 2, letterSpacing: '0.02em' }}>
                                      Large constellation — may impact performance on older devices
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ fontSize: 9, color: 'rgba(160,150,200,0.35)', marginTop: 8, letterSpacing: '0.02em' }}>
                            Source: WorldLore · Positions updated every 2s · Click a satellite for details
                          </div>
                        </div>
                      )}

                      {item.label === 'Statistics' && activeItem === 'statistics' && choropleth && (
                        <div className="mt-3 ml-12 mr-3">
                          <StatisticsPanel choropleth={choropleth} />
                        </div>
                      )}

                      {item.label === 'International Organizations' && activeItem === 'international organizations' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="International Organizations">
                          <InternationalOrganizationsPanel onSetOrganizationIsoFilter={onSetOrganizationIsoFilter} />
                        </div>
                      )}

                      {item.label === 'History Mode' && activeItem === 'history mode' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="History Mode">
                          <div className="settings-subtitle" style={{ marginTop: 10 }}>Year</div>
                          <div className="settings-row" style={{ alignItems: 'center', gap: 8 }}>
                            <div
                              ref={yearScrollRef}
                              style={{
                                display: 'grid',
                                gridAutoFlow: 'column',
                                gridAutoColumns: 'minmax(54px,auto)',
                                gap: 10,
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                WebkitOverflowScrolling: 'touch',
                                scrollBehavior: 'smooth',
                                scrollSnapType: 'x mandatory',
                                scrollPadding: '8px',
                                overscrollBehavior: 'contain',
                                overscrollBehaviorX: 'contain',
                                overscrollBehaviorY: 'contain',
                                padding: '6px 8px',
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, rgba(30,41,59,0.45), rgba(51,65,85,0.35))',
                                border: '1px solid rgba(71,85,105,0.35)',
                                pointerEvents: 'auto'
                              }}
                              className="hide-scrollbar"
                              onWheel={(e) => {
                                const el = yearScrollRef.current;
                                if (!el) return;
                                const dx = Math.abs(e.deltaX);
                                const dy = Math.abs(e.deltaY);
                                // Prefer vertical wheel for horizontal scroll
                                const left = dy >= dx ? e.deltaY : e.deltaX;
                                e.stopPropagation();
                                if (wheelRafRef.current === null) {
                                  wheelRafRef.current = requestAnimationFrame(() => {
                                    el.scrollBy({ left, behavior: 'smooth' });
                                    if (wheelRafRef.current !== null) cancelAnimationFrame(wheelRafRef.current);
                                    wheelRafRef.current = null;
                                  });
                                }
                              }}
                              aria-label="Available historical years"
                            >
                              {AVAILABLE_HISTORY_YEARS.map((y: number) => {
                                const isActive = historyYear !== null && snapToAvailableYear(historyYear) === y;
                                return (
                                  <button
                                    key={y}
                                    className={`settings-chip ${isActive ? 'active' : ''}`}
                                    onClick={() => { onSetHistoryYear?.(y); }}
                                    aria-pressed={isActive}
                                    title={`Year ${y}`}
                                    data-year={y}
                                    style={{ minWidth: 54, boxShadow: isActive ? '0 6px 14px rgba(59,130,246,0.25)' : 'none', borderColor: isActive ? 'rgba(59,130,246,0.6)' : 'rgba(71, 85, 105, 0.55)', scrollSnapAlign: 'center' }}
                                  >
                                    {y}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="settings-subtitle" style={{ marginTop: 12 }}>Rotation</div>
                          <div className="settings-row segmented">
                            <button
                              className={`settings-chip ${autoRotate ? 'active' : ''}`}
                              onClick={() => { setAutoRotate(true); onSetAutoRotate?.(true); }}
                              aria-pressed={autoRotate}
                            >On</button>
                            <button
                              className={`settings-chip ${!autoRotate ? 'active' : ''}`}
                              onClick={() => { setAutoRotate(false); onSetAutoRotate?.(false); }}
                              aria-pressed={!autoRotate}
                            >Off</button>
                          </div>
                          <div className="settings-row" style={{ marginTop: 8 }}>
                            <button
                              className="settings-chip"
                              onClick={() => onResetHistoryPresentation?.()}
                              aria-label="Reset to presentation mode"
                            >Close History</button>
                          </div>
                        </div>
                      )}

                      {item.label === 'Settings' && activeItem === 'settings' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Map settings">
                          <div className="settings-title">Map settings</div>

                          {/* Globe Themes */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Globe Themes</div>
                              <div className="settings-group-meta">Quick presets</div>
                            </div>
                            <div className="settings-group-description">Combo presets that transform the entire globe appearance.</div>
                            <div className="settings-row settings-row-2col">
                              {(['mars','lunar','venus','ice-world','cyberpunk','golden-age','alien','deep-ocean','earth-at-night','nasa-night-lights','nasa-black-marble'] as const).map(theme => (
                                <button
                                  key={theme}
                                  className="settings-chip"
                                  onClick={() => onSetGlobeTheme?.(theme)}
                                >{({mars:'Mars',lunar:'Lunar',venus:'Venus','ice-world':'Ice World',cyberpunk:'Cyberpunk','golden-age':'Golden Age',alien:'Alien','deep-ocean':'Deep Ocean','earth-at-night':'Earth at Night','nasa-night-lights':'Night Lights','nasa-black-marble':'Black Marble'} as const)[theme]}</button>
                              ))}
                            </div>
                          </div>

                          {/* Base map */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Base map</div>
                              <div className="settings-group-meta">Style presets</div>
                            </div>
                            <div className="settings-group-description">Choose the primary cartographic style.</div>
                            <div className="settings-row settings-row-2col">
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('night')}>Night</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('light')}>Light</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('outdoors')}>Outdoors</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('dark')}>Dark</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('satellite-streets')}>Sat+Streets</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('navigation-day')}>Nav Day</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('earth-at-night')} title="Black Marble composite">Earth at Night</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('nasa-night-lights')} title="City Lights 2012">Night Lights</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('nasa-black-marble')} title="Day/Night Band — 4-date composite for full coverage">Black Marble</button>
                            </div>
                          </div>
                          
                          {/* Planet preset */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Planet preset</div>
                              <div className="settings-group-meta">Atmosphere</div>
                            </div>
                            <div className="settings-group-description">Atmospheric and lighting mood for the globe.</div>
                            <div className="settings-row settings-row-2col">
                              {['default','nebula','sunset','dawn','arctic','volcanic','emerald','midnight','aurora','sahara','storm','crimson','rose','void','coral','violet'].map(preset => (
                                <button
                                  key={preset}
                                  className="settings-chip"
                                  onClick={() => onSetPlanetPreset?.(preset as any)}
                                >{preset[0].toUpperCase() + preset.slice(1)}</button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Space */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Space</div>
                              <div className="settings-group-meta">Background</div>
                            </div>
                            <div className="settings-group-description">Space background color and star brightness.</div>
                            <div className="settings-row settings-row-2col">
                              {(['void','deep','nebula','galaxy','crimson'] as const).map(preset => (
                                <button
                                  key={preset}
                                  className="settings-chip"
                                  onClick={() => onSetSpacePreset?.(preset)}
                                >{preset[0].toUpperCase() + preset.slice(1)}</button>
                              ))}
                            </div>
                            <div className="settings-slider-block">
                              <div className="settings-slider-header">
                                <span>Star intensity</span>
                                <span className="settings-slider-value">{starIntensity.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={starIntensity}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setStarIntensityLocal(v);
                                  onSetStarIntensity?.(v);
                                }}
                                className="settings-slider"
                                aria-label="Star intensity"
                              />
                            </div>
                          </div>

                          {/* LED Halo */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">LED Halo</div>
                              <div className="settings-group-meta">Glow</div>
                            </div>
                            <div className="settings-group-description">Cycle the globe atmosphere through rainbow colors like LED lights.</div>
                            <div className="settings-row segmented">
                              <button
                                className={`settings-chip ${ledHaloEnabled ? 'active' : ''}`}
                                onClick={() => { setLedHaloEnabled(true); onSetLedHalo?.(true); }}
                                aria-pressed={ledHaloEnabled}
                              >On</button>
                              <button
                                className={`settings-chip ${!ledHaloEnabled ? 'active' : ''}`}
                                onClick={() => { setLedHaloEnabled(false); onSetLedHalo?.(false); }}
                                aria-pressed={!ledHaloEnabled}
                              >Off</button>
                            </div>
                            {ledHaloEnabled && (
                              <div className="settings-slider-block">
                                <div className="settings-slider-header">
                                  <span>Speed</span>
                                  <span className="settings-slider-value">{ledHaloSpeed}ms</span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={200}
                                  step={5}
                                  value={ledHaloSpeed}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setLedHaloSpeed(v);
                                    onSetLedHaloSpeed?.(v);
                                  }}
                                  className="settings-slider"
                                  aria-label="LED halo speed"
                                />
                              </div>
                            )}
                          </div>

                          {/* Terrain */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Terrain</div>
                              <div className="settings-group-meta">Relief</div>
                            </div>
                            <div className="settings-group-description">Enable elevation shading and adjust vertical exaggeration.</div>
                            <div className="settings-row segmented">
                              <button
                                className={`settings-chip ${terrainEnabled ? 'active' : ''}`}
                                onClick={() => { setTerrainEnabled(true); onSetTerrain?.(true); }}
                                aria-pressed={terrainEnabled}
                              >On</button>
                              <button
                                className={`settings-chip ${!terrainEnabled ? 'active' : ''}`}
                                onClick={() => { setTerrainEnabled(false); onSetTerrain?.(false); }}
                                aria-pressed={!terrainEnabled}
                              >Off</button>
                            </div>
                            <div className="settings-slider-block">
                              <div className="settings-slider-header">
                                <span>Terrain exaggeration</span>
                                <span className="settings-slider-value">{terrainEx.toFixed(1)}×</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={5}
                                step={0.1}
                                value={terrainEx}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setTerrainEx(v);
                                  onSetTerrainExaggeration?.(v);
                                }}
                                className="settings-slider"
                                aria-label="Terrain exaggeration (x)"
                              />
                            </div>
                          </div>
                          
                          {/* 3D Buildings */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">3D Buildings</div>
                              <div className="settings-group-meta">Urban</div>
                            </div>
                            <div className="settings-group-description">Extrude buildings where available for city context.</div>
                            <div className="settings-row segmented">
                              <button className="settings-chip" onClick={() => onSetBuildings3D?.(true)}>On</button>
                              <button className="settings-chip" onClick={() => onSetBuildings3D?.(false)}>Off</button>
                            </div>
                          </div>
                          
                          {/* Labels */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Labels</div>
                              <div className="settings-group-meta">Guides</div>
                            </div>
                            <div className="settings-group-description">Toggle map labels, roads and borders for a cleaner view.</div>
                            <div className="settings-row segmented">
                              <button className="settings-chip" onClick={() => onSetMinimalMode?.(false)}>Show</button>
                              <button className="settings-chip" onClick={() => onSetMinimalMode?.(true)}>Hide</button>
                            </div>
                          </div>
                          
                          {/* Rotation */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Rotation</div>
                              <div className="settings-group-meta">Globe</div>
                            </div>
                            <div className="settings-group-description">Enable auto-rotation and set the angular speed.</div>
                            <div className="settings-row segmented">
                              <button
                                className={`settings-chip ${autoRotate ? 'active' : ''}`}
                                onClick={() => { setAutoRotate(true); onSetAutoRotate?.(true); }}
                                aria-pressed={autoRotate}
                              >On</button>
                              <button
                                className={`settings-chip ${!autoRotate ? 'active' : ''}`}
                                onClick={() => { setAutoRotate(false); onSetAutoRotate?.(false); }}
                                aria-pressed={!autoRotate}
                              >Off</button>
                            </div>
                            <div className="settings-slider-block">
                              <div className="settings-slider-header">
                                <span>Rotation speed</span>
                                <span className="settings-slider-value">{rotateSpeed.toFixed(1)}°/s</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={10}
                                step={0.5}
                                value={rotateSpeed}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setRotateSpeed(v);
                                  onSetRotateSpeed?.(v);
                                }}
                                className="settings-slider"
                                aria-label="Rotation speed (deg/sec)"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="left-sidebar-footer" />
              </>
              )}
            </div>
        )}
      </>
    );
  }