/**
 * Satellite visualization layers for Mapbox GL JS.
 * Renders satellite positions as category-specific SVG icons + ground track lines.
 */
import mapboxgl from 'mapbox-gl';

// ─── Layer & source IDs ─────────────────────────────────────────────
const SOURCE_ID = 'satellite-tracking-points';
const LAYER_ID = 'satellite-tracking-layer';        // Starlink circles
const LAYER_ICON_ID = 'satellite-tracking-icons';   // Military/Weather SVG icons
const LAYER_GLOW_ID = 'satellite-tracking-glow';
const LAYER_GEO_PULSE_ID = 'satellite-geo-pulse';  // Pulse ring for GEO sats
const TRACK_SOURCE_ID = 'satellite-ground-track';
const TRACK_LAYER_ID = 'satellite-ground-track-line';

// ─── Colors by category ────────────────────────────────────────────
const COLORS = {
  starlink: '#00ff88',
  military: '#ff4444',
  classified: '#ff8800',
  navigation: '#ffaa22',
  weather: '#44aaff',
  stations: '#d4a0ff',
  fallback: '#ffffff',
} as const;

// ─── GNSS constellation colors ────────────────────────────────────
export const GNSS_CONSTELLATION_COLORS: Record<string, string> = {
  gps:     '#4488ff',  // USA — blue
  glonass: '#ff4444',  // Russia — red
  galileo: '#ffd700',  // EU — gold
  beidou:  '#ff8800',  // China — orange
  navic:   '#ff6633',  // India — coral
  qzss:    '#00cccc',  // Japan — cyan
  sbas:    '#88cc44',  // Multi — lime
};
const GNSS_FALLBACK_COLOR = '#ffaa22';

// ─── Military country colors ──────────────────────────────────────
export const MILITARY_COUNTRY_COLORS: Record<string, string> = {
  US: '#4488ff',
  RU: '#ff4444',
  CN: '#ffcc00',
  IN: '#ff8833',
  FR: '#ff3399',
  IT: '#44cc88',
  GB: '#cc66ff',
  KR: '#00cccc',
  TR: '#ff6688',
  DE: '#88bb44',
  IL: '#ffffff',
  AE: '#33ddaa',
  ES: '#ffaa44',
  EG: '#ddaa33',
  CA: '#ee5577',
};
const MILITARY_FALLBACK_COLOR = '#aaaaaa';

// ─── Weather program colors ─────────────────────────────────────
export const WEATHER_PROGRAM_COLORS: Record<string, string> = {
  goes:     '#ff5555',  // USA — red
  jpss:     '#55bbff',  // USA — light blue
  meteosat: '#ffd700',  // EU — gold (Meteosat GEO)
  metop:    '#ccaa00',  // EU — dark gold (MetOp polar)
  fengyun:  '#ff8833',  // China — orange
  tianmu:   '#ffcc44',  // China — amber
  himawari: '#ff66aa',  // Japan — pink
  meteor:   '#44ddaa',  // Russia — teal
  arktika:  '#33bb99',  // Russia — dark teal
  elektro:  '#66cc66',  // Russia — green
  insat:    '#cc77ff',  // India — purple
  kompsat:  '#00cccc',  // South Korea — cyan
};
const WEATHER_FALLBACK_COLOR = '#44aaff';

// ─── Color helpers for SVG recoloring ─────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}
function adjustBrightness(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}
function lightenColor(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}

function recolorMilitarySvg(baseSvg: string, mainColor: string): string {
  const dark = adjustBrightness(mainColor, 0.55);
  const darker = adjustBrightness(mainColor, 0.4);
  const darkest = adjustBrightness(mainColor, 0.25);
  const highlight = lightenColor(mainColor, 0.5);
  return baseSvg
    .replace(/#E24B4A/gi, mainColor)
    .replace(/#A32D2D/gi, dark)
    .replace(/#791F1F/gi, darker)
    .replace(/#501313/gi, darkest)
    .replace(/#F09595/gi, highlight);
}

// Recolors sat-navigation.svg: body (#C8841A) + antenna (#ffaa22) → mainColor
function recolorNavigationSvg(baseSvg: string, mainColor: string): string {
  const dark = adjustBrightness(mainColor, 0.55);
  return baseSvg
    .replace(/#C8841A/gi, mainColor)
    .replace(/#8B5A0E/gi, dark)
    .replace(/#ffaa22/gi, mainColor);
}

// Recolors sat-weather.svg: body (#1D9E75), panels (#185FA5), accents (#5DCAA5)
function recolorWeatherSvg(baseSvg: string, mainColor: string): string {
  const dark = adjustBrightness(mainColor, 0.45);
  const accent = adjustBrightness(mainColor, 0.7);
  return baseSvg
    .replace(/#1D9E75/gi, mainColor)
    .replace(/#0F6E56/gi, dark)
    .replace(/#085041/gi, dark)
    .replace(/#185FA5/gi, accent)
    .replace(/#0C447C/gi, dark)
    .replace(/#5DCAA5/gi, accent);
}

// ─── Icon registration ─────────────────────────────────────────────
const ICON_IDS = {
  classified: 'sat-military',
  navigation: 'sat-navigation',
  weather: 'sat-weather',
  stations: 'sat-stations',
} as const;

const ICON_PATHS: Record<string, string> = {
  'sat-military': '/icons/sat-military.svg',
  'sat-weather': '/icons/sat-weather.svg',
  'sat-stations': '/icons/sat-stations.svg',
  'sat-navigation': '/icons/sat-navigation.svg',
};

let iconsLoaded = false;

function loadImageAsync(map: mapboxgl.Map, id: string, src: string): Promise<void> {
  if (map.hasImage(id)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const img = new Image(64, 64);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try { map.addImage(id, img as any, { sdf: false, pixelRatio: 2 } as any); } catch { /* exists */ }
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSatelliteIcons(map: mapboxgl.Map) {
  if (iconsLoaded) return;
  iconsLoaded = true;

  // Load base icons (weather, stations, military base)
  for (const [id, path] of Object.entries(ICON_PATHS)) {
    try { await loadImageAsync(map, id, path); }
    catch { console.warn(`[satellite] Failed to load icon: ${path}`); }
  }

  // Generate country-colored military icons
  try {
    const res = await fetch('/icons/sat-military.svg');
    const baseSvg = await res.text();
    const countries = { ...MILITARY_COUNTRY_COLORS, '': MILITARY_FALLBACK_COLOR };
    for (const [code, color] of Object.entries(countries)) {
      const iconId = code ? `sat-military-${code}` : 'sat-military-fallback';
      if (map.hasImage(iconId)) continue;
      const svg = recolorMilitarySvg(baseSvg, color);
      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      try { await loadImageAsync(map, iconId, dataUri); }
      catch { /* skip */ }
    }
  } catch {
    console.warn('[satellite] Failed to generate country military icons');
  }

  // Generate constellation-colored navigation icons
  try {
    const res = await fetch('/icons/sat-navigation.svg');
    const baseSvg = await res.text();
    for (const [key, color] of Object.entries(GNSS_CONSTELLATION_COLORS)) {
      const iconId = `sat-navigation-${key}`;
      if (map.hasImage(iconId)) continue;
      const svg = recolorNavigationSvg(baseSvg, color);
      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      try { await loadImageAsync(map, iconId, dataUri); }
      catch { /* skip */ }
    }
  } catch {
    console.warn('[satellite] Failed to generate constellation navigation icons');
  }

  // Generate program-colored weather icons
  try {
    const res = await fetch('/icons/sat-weather.svg');
    const baseSvg = await res.text();
    for (const [key, color] of Object.entries(WEATHER_PROGRAM_COLORS)) {
      const iconId = `sat-weather-${key}`;
      if (map.hasImage(iconId)) continue;
      const svg = recolorWeatherSvg(baseSvg, color);
      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      try { await loadImageAsync(map, iconId, dataUri); }
      catch { /* skip */ }
    }
  } catch {
    console.warn('[satellite] Failed to generate program weather icons');
  }
}

// ─── Module-level filter state ──────────────────────────────────────
let _hiddenConstellations: Set<string> = new Set();
let _hiddenWeatherPrograms: Set<string> = new Set();

function _rebuildCategoryFilters(map: mapboxgl.Map) {
  if (!map.getLayer(LAYER_ICON_ID)) return;
  const navHidden = _hiddenConstellations.size > 0;
  const wxHidden = _hiddenWeatherPrograms.size > 0;

  if (!navHidden && !wxHidden) {
    // No filters — show everything
    try {
      map.setFilter(LAYER_ICON_ID, ['in', ['get', 'category'], ['literal', ['military', 'classified', 'navigation', 'weather', 'stations']]]);
      map.setFilter(LAYER_GLOW_ID, null as any);
    } catch { /* layer may not exist */ }
    return;
  }

  const visibleNav = Object.keys(GNSS_CONSTELLATION_COLORS).filter(k => !_hiddenConstellations.has(k));
  const visibleWx = Object.keys(WEATHER_PROGRAM_COLORS).filter(k => !_hiddenWeatherPrograms.has(k));

  // Base categories that pass through unfiltered
  const baseCats = ['military', 'classified', 'stations'];
  if (!navHidden) baseCats.push('navigation');
  if (!wxHidden) baseCats.push('weather');

  const iconFilter: any[] = ['any', ['in', ['get', 'category'], ['literal', baseCats]]];
  const glowFilter: any[] = ['any', ['!in', ['get', 'category'], ['literal', ['navigation', 'weather'].filter(c => (c === 'navigation' ? navHidden : wxHidden))]]];

  if (navHidden) {
    iconFilter.push(['all', ['==', ['get', 'category'], 'navigation'], ['in', ['get', 'constellation'], ['literal', visibleNav]]]);
    glowFilter.push(['all', ['==', ['get', 'category'], 'navigation'], ['in', ['get', 'constellation'], ['literal', visibleNav]]]);
  }
  if (wxHidden) {
    iconFilter.push(['all', ['==', ['get', 'category'], 'weather'], ['in', ['get', 'constellation'], ['literal', visibleWx]]]);
    glowFilter.push(['all', ['==', ['get', 'category'], 'weather'], ['in', ['get', 'constellation'], ['literal', visibleWx]]]);
  }

  try {
    map.setFilter(LAYER_ICON_ID, iconFilter as any);
    map.setFilter(LAYER_GLOW_ID, glowFilter as any);
  } catch { /* layer may not exist */ }
}

// ─── Public API ─────────────────────────────────────────────────────

export const SatelliteVisualization = {
  /** Add satellite layers to the map (idempotent) */
  async addLayers(map: mapboxgl.Map) {
    if (map.getSource(SOURCE_ID)) return;

    // Load SVG icons first
    await loadSatelliteIcons(map);

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Glow layer (behind icons for ambient presence — radius scales with altitude)
    map.addLayer({
      id: LAYER_GLOW_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          0, ['interpolate', ['linear'], ['coalesce', ['get', 'alt'], 500],
            400, 2,    // LEO: small glow
            2000, 3,   // MEO low
            20000, 4,  // MEO high
            36000, 6,  // GEO: large glow
          ],
          5, ['interpolate', ['linear'], ['coalesce', ['get', 'alt'], 500],
            400, 3,
            2000, 5,
            20000, 7,
            36000, 10,
          ],
          10, ['interpolate', ['linear'], ['coalesce', ['get', 'alt'], 500],
            400, 5,
            2000, 7,
            20000, 10,
            36000, 14,
          ],
        ] as any,
        'circle-color': [
          'case',
          ['==', ['get', 'category'], 'military'],
          ['match', ['get', 'country'],
            ...Object.entries(MILITARY_COUNTRY_COLORS).flat(),
            MILITARY_FALLBACK_COLOR,
          ],
          ['==', ['get', 'category'], 'navigation'],
          ['match', ['get', 'constellation'],
            ...Object.entries(GNSS_CONSTELLATION_COLORS).flat(),
            GNSS_FALLBACK_COLOR,
          ],
          ['==', ['get', 'category'], 'weather'],
          ['match', ['get', 'constellation'],
            ...Object.entries(WEATHER_PROGRAM_COLORS).flat(),
            WEATHER_FALLBACK_COLOR,
          ],
          ['match', ['get', 'category'],
            'starlink', COLORS.starlink,
            'classified', COLORS.classified,
            'stations', COLORS.stations,
            COLORS.fallback,
          ],
        ] as any,
        'circle-opacity': 0.12,
        'circle-blur': 1,
      },
    });

    // Pulse ring for GEO satellites (alt > 30,000 km — appear stationary)
    map.addLayer({
      id: LAYER_GEO_PULSE_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['>', ['get', 'alt'], 30000],
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          0, 10,
          5, 16,
          10, 24,
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'category'], 'military'],
          ['match', ['get', 'country'],
            ...Object.entries(MILITARY_COUNTRY_COLORS).flat(),
            MILITARY_FALLBACK_COLOR,
          ],
          ['==', ['get', 'category'], 'navigation'],
          ['match', ['get', 'constellation'],
            ...Object.entries(GNSS_CONSTELLATION_COLORS).flat(),
            GNSS_FALLBACK_COLOR,
          ],
          ['==', ['get', 'category'], 'weather'],
          ['match', ['get', 'constellation'],
            ...Object.entries(WEATHER_PROGRAM_COLORS).flat(),
            WEATHER_FALLBACK_COLOR,
          ],
          ['match', ['get', 'category'],
            'starlink', COLORS.starlink,
            'classified', COLORS.classified,
            'stations', COLORS.stations,
            COLORS.fallback,
          ],
        ] as any,
        'circle-opacity': 0.18,
        'circle-blur': 0.6,
      },
    });

    // Animate GEO pulse
    let pulsePhase = 0;
    const animatePulse = () => {
      if (!map.getLayer(LAYER_GEO_PULSE_ID)) return;
      pulsePhase = (pulsePhase + 0.025) % (Math.PI * 2);
      const sin = Math.sin(pulsePhase);
      const opacity = 0.10 + sin * 0.12;
      const radiusScale = 1 + sin * 0.45;
      try {
        map.setPaintProperty(LAYER_GEO_PULSE_ID, 'circle-opacity', Math.max(0, opacity));
        map.setPaintProperty(LAYER_GEO_PULSE_ID, 'circle-radius', [
          'interpolate', ['linear'], ['zoom'],
          0, 10 * radiusScale,
          5, 16 * radiusScale,
          10, 24 * radiusScale,
        ]);
      } catch { /* layer removed */ }
      requestAnimationFrame(animatePulse);
    };
    requestAnimationFrame(animatePulse);

    // Symbol layer for military + weather + stations (SVG icons)
    map.addLayer({
      id: LAYER_ICON_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['in', ['get', 'category'], ['literal', ['military', 'classified', 'navigation', 'weather', 'stations']]],
      layout: {
        'icon-image': [
          'case',
          ['==', ['get', 'category'], 'military'],
          ['coalesce',
            ['image', ['concat', 'sat-military-', ['get', 'country']]],
            ['image', 'sat-military-fallback'],
            ['image', 'sat-military'],
          ],
          ['==', ['get', 'category'], 'navigation'],
          ['coalesce',
            ['image', ['concat', 'sat-navigation-', ['get', 'constellation']]],
            ['image', 'sat-navigation'],
          ],
          ['==', ['get', 'category'], 'weather'],
          ['coalesce',
            ['image', ['concat', 'sat-weather-', ['get', 'constellation']]],
            ['image', 'sat-weather'],
          ],
          ['match', ['get', 'category'],
            'classified', ICON_IDS.classified,
            'stations', ICON_IDS.stations,
            'sat-military',
          ],
        ],
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          0, 0.35,
          3, 0.55,
          6, 0.8,
          10, 1.1,
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': 0.9,
      },
    } as any);

    // Circle layer for Starlink (simple green dots — better for 10K points)
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['get', 'category'], 'starlink'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.2, 5, 2, 10, 3.5],
        'circle-color': COLORS.starlink,
        'circle-opacity': 0.85,
      },
    });
  },

  /** Update GeoJSON features from worker propagation result */
  updatePositions(map: mapboxgl.Map, features: any[]) {
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({ type: 'FeatureCollection', features });
  },

  /** Hide/show navigation constellations */
  setHiddenConstellations(map: mapboxgl.Map, hidden: Set<string>) {
    _hiddenConstellations = hidden;
    _rebuildCategoryFilters(map);
  },

  /** Hide/show weather programs */
  setHiddenWeatherPrograms(map: mapboxgl.Map, hidden: Set<string>) {
    _hiddenWeatherPrograms = hidden;
    _rebuildCategoryFilters(map);
  },

  showGroundTrack(map: mapboxgl.Map, coordinates: [number, number][], category: string, country?: string, constellation?: string) {
    this.removeGroundTrack(map);

    if (coordinates.length < 2) return;

    // Split at antimeridian crossings (|delta-lon| > 170)
    const segments: [number, number][][] = [];
    let current: [number, number][] = [coordinates[0]];
    for (let i = 1; i < coordinates.length; i++) {
      if (Math.abs(coordinates[i][0] - coordinates[i - 1][0]) > 170) {
        if (current.length > 1) segments.push(current);
        current = [];
      }
      current.push(coordinates[i]);
    }
    if (current.length > 1) segments.push(current);

    map.addSource(TRACK_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: segments.map((seg) => ({
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: seg },
          properties: {},
        })),
      },
    });

    const color = category === 'military' && country
      ? (MILITARY_COUNTRY_COLORS[country] || MILITARY_FALLBACK_COLOR)
      : category === 'navigation' && constellation
      ? (GNSS_CONSTELLATION_COLORS[constellation] || GNSS_FALLBACK_COLOR)
      : category === 'weather' && constellation
      ? (WEATHER_PROGRAM_COLORS[constellation] || WEATHER_FALLBACK_COLOR)
      : (COLORS[category as keyof typeof COLORS] || COLORS.fallback);

    map.addLayer(
      {
        id: TRACK_LAYER_ID,
        type: 'line',
        source: TRACK_SOURCE_ID,
        paint: {
          'line-color': color,
          'line-width': 1.5,
          'line-opacity': 0.6,
          'line-dasharray': [4, 3],
        },
      },
      LAYER_GLOW_ID,
    );
  },

  /** Remove ground track layer */
  removeGroundTrack(map: mapboxgl.Map) {
    if (map.getLayer(TRACK_LAYER_ID)) map.removeLayer(TRACK_LAYER_ID);
    if (map.getSource(TRACK_SOURCE_ID)) map.removeSource(TRACK_SOURCE_ID);
  },

  /** Remove all satellite layers and sources */
  cleanup(map: mapboxgl.Map) {
    this.removeGroundTrack(map);
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getLayer(LAYER_ICON_ID)) map.removeLayer(LAYER_ICON_ID);
    if (map.getLayer(LAYER_GEO_PULSE_ID)) map.removeLayer(LAYER_GEO_PULSE_ID);
    if (map.getLayer(LAYER_GLOW_ID)) map.removeLayer(LAYER_GLOW_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    iconsLoaded = false;
  },

  /** Get layer IDs for click event registration */
  getLayerIds() {
    return [LAYER_ID, LAYER_ICON_ID];
  },

  getGlowLayerId() {
    return LAYER_GLOW_ID;
  },

  /** Reset icon loaded flag (needed after style changes) */
  resetIcons() {
    iconsLoaded = false;
  },
};
