export type StyleKey = 'night' | 'light' | 'outdoors' | 'dark' | 'satellite-streets' | 'navigation-day' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble';
export const MAP_STYLES: Record<StyleKey, string> = {
  night: 'mapbox://styles/mapbox/navigation-night-v1',
  light: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  'navigation-day': 'mapbox://styles/mapbox/navigation-day-v1',
  'earth-at-night': 'mapbox://styles/mapbox/dark-v11',
  'nasa-night-lights': 'mapbox://styles/mapbox/dark-v11',
  'nasa-black-marble': 'mapbox://styles/mapbox/dark-v11'
};

export const EARTH_AT_NIGHT_OVERLAY: RasterOverlay = {
  sourceId: 'nasa-black-marble',
  tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'],
  tileSize: 256,
  maxzoom: 8,
  attribution: 'NASA Earth Observatory'
};

export const NASA_NIGHT_LIGHTS_OVERLAY: RasterOverlay = {
  sourceId: 'nasa-dnb',
  tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg'],
  tileSize: 256,
  maxzoom: 8,
  attribution: "NASA's Black Marble — VIIRS City Lights 2012"
};

// 4 dates of the same At_Sensor_Radiance product stacked for full coverage
const DNB_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_At_Sensor_Radiance/default';
const DNB_SUFFIX = '/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
export const NASA_BLACK_MARBLE_OVERLAYS: RasterOverlay[] = [
  { sourceId: 'nasa-bm-d1', tiles: [`${DNB_BASE}/2022-02-03${DNB_SUFFIX}`], tileSize: 256, maxzoom: 8, attribution: 'NASA Black Marble' },
  { sourceId: 'nasa-bm-d2', tiles: [`${DNB_BASE}/2022-02-04${DNB_SUFFIX}`], tileSize: 256, maxzoom: 8, attribution: 'NASA Black Marble' },
  { sourceId: 'nasa-bm-d3', tiles: [`${DNB_BASE}/2022-02-05${DNB_SUFFIX}`], tileSize: 256, maxzoom: 8, attribution: 'NASA Black Marble' },
  { sourceId: 'nasa-bm-d4', tiles: [`${DNB_BASE}/2022-02-06${DNB_SUFFIX}`], tileSize: 256, maxzoom: 8, attribution: 'NASA Black Marble' },
];

export const NASA_OVERLAY_SOURCES = ['nasa-black-marble', 'nasa-dnb', 'nasa-bm-d1', 'nasa-bm-d2', 'nasa-bm-d3', 'nasa-bm-d4'];

export type PlanetPreset = 'default' | 'nebula' | 'sunset' | 'dawn' | 'arctic' | 'volcanic' | 'emerald' | 'midnight' | 'aurora' | 'sahara' | 'storm' | 'crimson' | 'rose' | 'void' | 'coral' | 'violet';

const PLANET_PRESETS: Record<PlanetPreset, any> = {
  default: { color: 'rgb(186, 210, 235)', 'high-color': 'rgb(36, 92, 223)', 'horizon-blend': 0, 'space-color': 'rgb(11, 11, 25)', 'star-intensity': 0.6 },
  nebula: { color: 'rgb(180, 200, 255)', 'high-color': 'rgb(120, 80, 200)', 'horizon-blend': 0.045, 'space-color': 'rgb(8, 10, 20)', 'star-intensity': 0.8 },
  sunset: { color: 'rgb(240, 190, 150)', 'high-color': 'rgb(200, 90, 60)', 'horizon-blend': 0.06, 'space-color': 'rgb(14, 8, 10)', 'star-intensity': 0.5 },
  dawn: { color: 'rgb(210, 225, 240)', 'high-color': 'rgb(120, 170, 230)', 'horizon-blend': 0.035, 'space-color': 'rgb(10, 12, 22)', 'star-intensity': 0.7 },
  arctic: { color: 'rgb(210, 245, 240)', 'high-color': 'rgb(140, 210, 220)', 'horizon-blend': 0.02, 'space-color': 'rgb(2, 3, 8)', 'star-intensity': 0.95 },
  volcanic: { color: 'rgb(255, 120, 50)', 'high-color': 'rgb(180, 40, 10)', 'horizon-blend': 0.07, 'space-color': 'rgb(10, 5, 5)', 'star-intensity': 0.3 },
  emerald: { color: 'rgb(150, 220, 170)', 'high-color': 'rgb(30, 130, 80)', 'horizon-blend': 0.05, 'space-color': 'rgb(5, 12, 8)', 'star-intensity': 0.65 },
  midnight: { color: 'rgb(30, 50, 120)', 'high-color': 'rgb(10, 20, 80)', 'horizon-blend': 0.055, 'space-color': 'rgb(3, 3, 10)', 'star-intensity': 0.95 },
  aurora: { color: 'rgb(100, 220, 180)', 'high-color': 'rgb(30, 140, 120)', 'horizon-blend': 0.04, 'space-color': 'rgb(5, 10, 15)', 'star-intensity': 0.9 },
  sahara: { color: 'rgb(245, 210, 140)', 'high-color': 'rgb(180, 120, 50)', 'horizon-blend': 0.065, 'space-color': 'rgb(12, 8, 5)', 'star-intensity': 0.55 },
  storm: { color: 'rgb(140, 145, 160)', 'high-color': 'rgb(60, 65, 90)', 'horizon-blend': 0.06, 'space-color': 'rgb(8, 8, 12)', 'star-intensity': 0.2 },
  crimson: { color: 'rgb(180, 30, 40)', 'high-color': 'rgb(80, 10, 15)', 'horizon-blend': 0.065, 'space-color': 'rgb(6, 2, 2)', 'star-intensity': 0.4 },
  rose: { color: 'rgb(240, 160, 190)', 'high-color': 'rgb(180, 60, 130)', 'horizon-blend': 0.05, 'space-color': 'rgb(10, 4, 10)', 'star-intensity': 0.7 },
  void: { color: 'rgb(10, 10, 15)', 'high-color': 'rgb(5, 5, 10)', 'horizon-blend': 0.01, 'space-color': 'rgb(1, 1, 2)', 'star-intensity': 1.0 },
  coral: { color: 'rgb(255, 150, 130)', 'high-color': 'rgb(200, 80, 70)', 'horizon-blend': 0.055, 'space-color': 'rgb(10, 5, 5)', 'star-intensity': 0.6 },
  violet: { color: 'rgb(170, 100, 240)', 'high-color': 'rgb(90, 30, 180)', 'horizon-blend': 0.05, 'space-color': 'rgb(6, 3, 15)', 'star-intensity': 0.85 },
};

export function applyFog(map: mapboxgl.Map, preset: PlanetPreset) {
  try { map.setFog(PLANET_PRESETS[preset] as any); } catch {}
}

/** Batch planet + space + star intensity into a single setFog call (used by globe themes) */
export function applyThemeAtmosphere(map: mapboxgl.Map, planet: PlanetPreset, space: SpacePreset, starIntensity: number) {
  const base = PLANET_PRESETS[planet] || PLANET_PRESETS['default'];
  const spaceOverrides = SPACE_PRESETS[space];
  try {
    map.setFog({
      ...base,
      'space-color': spaceOverrides['space-color'],
      'star-intensity': starIntensity,
    } as any);
  } catch {}
}

export type SpacePreset = 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson';

export const SPACE_PRESETS: Record<SpacePreset, { 'space-color': string; 'star-intensity': number }> = {
  void:    { 'space-color': 'rgb(0, 0, 0)',    'star-intensity': 0.15 },
  deep:    { 'space-color': 'rgb(5, 5, 18)',   'star-intensity': 0.9 },
  nebula:  { 'space-color': 'rgb(45, 10, 80)', 'star-intensity': 0.85 },
  galaxy:  { 'space-color': 'rgb(10, 25, 70)', 'star-intensity': 1.0 },
  crimson: { 'space-color': 'rgb(50, 8, 8)',   'star-intensity': 0.6 },
};

export type GlobeThemeKey = 'mars' | 'lunar' | 'venus' | 'ice-world' | 'cyberpunk' | 'golden-age' | 'alien' | 'deep-ocean' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble';

export interface RasterOverlay {
  sourceId: string;
  tiles: string[];
  tileSize?: number;
  maxzoom?: number;
  attribution?: string;
}

export interface GlobeTheme {
  label: string;
  baseMap: StyleKey;
  planet: PlanetPreset;
  space: SpacePreset;
  starIntensity: number;
  rasterOverlay?: RasterOverlay | RasterOverlay[];
}

export const GLOBE_THEMES: Record<GlobeThemeKey, GlobeTheme> = {
  mars: { label: 'Mars', baseMap: 'outdoors', planet: 'crimson', space: 'void', starIntensity: 0.25 },
  lunar: { label: 'Lunar', baseMap: 'dark', planet: 'void', space: 'void', starIntensity: 1.0 },
  venus: { label: 'Venus', baseMap: 'navigation-day', planet: 'sahara', space: 'crimson', starIntensity: 0.2 },
  'ice-world': { label: 'Ice World', baseMap: 'light', planet: 'arctic', space: 'deep', starIntensity: 0.95 },
  cyberpunk: { label: 'Cyberpunk', baseMap: 'dark', planet: 'violet', space: 'galaxy', starIntensity: 0.9 },
  'golden-age': { label: 'Golden Age', baseMap: 'outdoors', planet: 'sahara', space: 'deep', starIntensity: 0.55 },
  alien: { label: 'Alien', baseMap: 'night', planet: 'emerald', space: 'nebula', starIntensity: 0.65 },
  'deep-ocean': { label: 'Deep Ocean', baseMap: 'satellite-streets', planet: 'midnight', space: 'deep', starIntensity: 0.95 },
  'earth-at-night': {
    label: 'Earth at Night',
    baseMap: 'earth-at-night',
    planet: 'dawn',
    space: 'deep',
    starIntensity: 0.95,
    rasterOverlay: EARTH_AT_NIGHT_OVERLAY
  },
  'nasa-night-lights': {
    label: 'Night Lights',
    baseMap: 'nasa-night-lights',
    planet: 'arctic',
    space: 'void',
    starIntensity: 1.0,
    rasterOverlay: NASA_NIGHT_LIGHTS_OVERLAY
  },
  'nasa-black-marble': {
    label: 'Black Marble',
    baseMap: 'nasa-black-marble',
    planet: 'arctic',
    space: 'void',
    starIntensity: 1.0,
    rasterOverlay: NASA_BLACK_MARBLE_OVERLAYS
  },
};

export function applyStarIntensity(map: mapboxgl.Map, value: number) {
  try {
    const current = (map as any).getFog?.() || {};
    map.setFog({ ...current, 'star-intensity': value } as any);
  } catch {}
}

export function applySpacePreset(map: mapboxgl.Map, preset: SpacePreset) {
  try {
    const current = (map as any).getFog?.() || {};
    map.setFog({ ...current, ...SPACE_PRESETS[preset] } as any);
  } catch {}
}

export function setBaseFeaturesVisibility(map: mapboxgl.Map, hide: boolean) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id;
    const type = (layer as any).type;
    const match = type === 'symbol' || /\b(admin|boundary|country|state|disputed|road|rail|aeroway|place|poi)\b/i.test(id);
    if (match) {
      try { map.setLayoutProperty(id, 'visibility', hide ? 'none' : 'visible'); } catch {}
    }
  }
}

export function removeRasterOverlay(map: mapboxgl.Map, sourceId: string) {
  const layerId = `${sourceId}-layer`;
  try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
  try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}
}

/** Find the first symbol/interactive layer to use as insertion point for raster overlays */
export function findRasterInsertionPoint(map: mapboxgl.Map): string | undefined {
  const layers = map.getStyle()?.layers || [];
  for (const layer of layers) {
    if ((layer as any).type === 'symbol' || layer.id === 'country-highlight') {
      return layer.id;
    }
  }
  return undefined;
}

export function applyRasterOverlay(map: mapboxgl.Map, overlay: RasterOverlay, cachedBeforeId?: string) {
  const { sourceId, tiles, tileSize = 256, maxzoom = 8, attribution } = overlay;
  removeRasterOverlay(map, sourceId);
  try {
    map.addSource(sourceId, {
      type: 'raster',
      tiles,
      tileSize,
      maxzoom,
      attribution: attribution || ''
    });
    const beforeId = cachedBeforeId !== undefined ? cachedBeforeId : findRasterInsertionPoint(map);
    map.addLayer({
      id: `${sourceId}-layer`,
      type: 'raster',
      source: sourceId,
      paint: { 'raster-opacity': 1.0, 'raster-fade-duration': 300 }
    }, beforeId);
  } catch (e) {
    console.warn('[mapAppearance] Failed to apply raster overlay:', e);
  }
}

export function applyPhysicalModeTweaks(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id;
    const type = (layer as any).type;
    const shouldHide = type === 'symbol' || /\b(admin|boundary|country|state|disputed|road|rail|aeroway|poi|place|airport|ferry|building)\b/i.test(id);
    if (shouldHide) {
      try { map.setLayoutProperty(id, 'visibility', 'none'); } catch {}
    }
  }
  const toHide = [
    'country-highlight', 'country-selected',
    'country-conflict-fill','country-conflict-border',
    'conflict-marker','conflict-ripple-0','conflict-ripple-1',
    'ally-fill-faction1','ally-border-faction1',
    'ally-fill-faction2','ally-border-faction2'
  ];
  toHide.forEach(id => { try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); } catch {} });
}



