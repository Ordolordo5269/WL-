export type MetricId = 'gdp' | 'inflation' | 'gdp-per-capita' | 'gini' | 'exports' | 'life-expectancy' | 'military-expenditure' | 'democracy-index' | 'trade-gdp' | 'fuel-exports' | 'mineral-rents' | 'energy-imports' | 'cereal-production';

export type MapEaseToOptions = {
  center?: [number, number];
  zoom?: number;
  duration?: number;
  easing?: (t: number) => number;
  pitch?: number;
  bearing?: number;
};

export type { NasaOverlayType } from './map/mapAppearance';

export interface MapRefType {
  easeTo: (options: MapEaseToOptions) => void;
  getMap: () => any;
  setBaseMapStyle?: (next: 'night' | 'light' | 'outdoors' | 'dark' | 'satellite-streets' | 'navigation-day' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble', opts?: { skipFade?: boolean }) => void;
  setPlanetPreset?: (preset: 'default' | 'nebula' | 'sunset' | 'dawn' | 'arctic' | 'volcanic' | 'emerald' | 'midnight' | 'aurora' | 'sahara' | 'storm' | 'crimson' | 'rose' | 'void' | 'coral' | 'violet') => void;
  setBuildings3DEnabled?: (v: boolean) => void;
  setMinimalMode?: (v: boolean) => void;
  setAutoRotate?: (v: boolean) => void;
  setRotateSpeed?: (v: number) => void;
  setChoropleth?: (metric: MetricId, spec: any | null) => void;
  setActiveChoropleth?: (metric: MetricId | null) => void;
  setHistoryEnabled?: (enabled: boolean) => void;
  setHistoryYear?: (year: number) => void;
  highlightIso3List?: (iso: string[], colorHex?: string) => void;
  highlightIso3ToColorMap?: (isoToColor: Record<string, string>) => void;
  setStarIntensity?: (v: number) => void;
  setSpacePreset?: (preset: 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson') => void;
  setGlobeTheme?: (theme: 'mars' | 'lunar' | 'venus' | 'ice-world' | 'cyberpunk' | 'golden-age' | 'alien' | 'deep-ocean' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble') => void;
  setTerrainEnabled?: (v: boolean) => void;
  setTerrainExaggeration?: (n: number) => void;
  setNasaOverlayEnabled?: (type: import('./map/mapAppearance').NasaOverlayType, enabled: boolean) => void;
  getBaseMapStyle?: () => 'night' | 'light' | 'outdoors' | 'dark' | 'satellite-streets' | 'navigation-day' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble';
  getAutoRotate?: () => boolean;
  getRotateSpeed?: () => number;
  getStarIntensity?: () => number;
  dismissHistoryPopup?: () => void;
  flyToCity?: (lat: number, lng: number, cityName?: string) => void;
  setCitiesData?: (cities: any[]) => void;
  setCitiesVisible?: (visible: boolean) => void;
  setSatelliteTrackingLayers?: (enabled: boolean) => void;
  updateSatellitePositions?: (features: any[]) => void;
  showSatelliteGroundTrack?: (coords: [number, number][], category: string, country?: string, constellation?: string) => void;
  removeSatelliteGroundTrack?: () => void;
  enterSatellitePOV?: (noradId: number, category?: string) => void;
  exitSatellitePOV?: () => void;
  updateSatellitePOVPositions?: (features: any[]) => void;
  isSatellitePOVActive?: () => boolean;
  setSatelliteIntelMode?: (enabled: boolean) => void;
  setNightLightsPrevStyleOverride?: (style: string, planet: string, star: number) => void;
  clearNightLightsPrevStyle?: () => void;
  getNightLightsPrevStyle?: () => { style: string; planet: string; star: number } | null;
}
