export type MetricId = 'gdp' | 'inflation' | 'gdp-per-capita' | 'gini' | 'exports' | 'life-expectancy' | 'military-expenditure' | 'democracy-index' | 'trade-gdp';

export type MapEaseToOptions = {
  center?: [number, number];
  zoom?: number;
  duration?: number;
  easing?: (t: number) => number;
  pitch?: number;
  bearing?: number;
};

export interface MapRefType {
  easeTo: (options: MapEaseToOptions) => void;
  getMap: () => any;
  setBaseMapStyle?: (next: 'night' | 'light' | 'outdoors' | 'dark' | 'satellite' | 'satellite-streets') => void;
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
  setTerrainEnabled?: (v: boolean) => void;
  setTerrainExaggeration?: (n: number) => void;
  flyToCity?: (lat: number, lng: number, cityName?: string) => void;
  setCitiesData?: (cities: any[]) => void;
  setCitiesVisible?: (visible: boolean) => void;
}
