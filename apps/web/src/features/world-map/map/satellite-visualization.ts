/**
 * Satellite visualization layers for Mapbox GL JS.
 * Renders satellite positions as category-specific PNG icons (canvas-tinted) + ground track lines.
 */
import type mapboxgl from 'mapbox-gl';

// ─── Layer & source IDs ─────────────────────────────────────────────
const SOURCE_ID = 'satellite-tracking-points';
const LAYER_ID = 'satellite-tracking-layer';        // Starlink circles
const LAYER_ICON_ID = 'satellite-tracking-icons';   // Category PNG icons
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

// ─── Classified orbit type colors ────────────────────────────────
export const CLASSIFIED_ORBIT_COLORS: Record<string, string> = {
  leo: '#ff9933',   // LEO — reconnaissance / imaging
  meo: '#ffcc44',   // MEO — space domain awareness
  geo: '#ff5566',   // GEO — SIGINT / comms relay
  heo: '#cc77ff',   // HEO — early warning / polar coverage
};
const CLASSIFIED_FALLBACK_COLOR = '#cc8833';

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

// ─── Stations program colors ─────────────────────────────────────
export const STATION_PROGRAM_COLORS: Record<string, string> = {
  iss:      '#4488ff',  // International — blue
  css:      '#ffcc00',  // China — gold
  tdrs:     '#44bbff',  // USA — light cyan
  science:  '#aa88ff',  // NASA science — violet
  luch:     '#ff4444',  // Russia — red
  edrs:     '#ffd700',  // EU — gold
  tianlian: '#ff8833',  // China — orange
};
const STATION_FALLBACK_COLOR = '#d4a0ff';

// ─── Color helpers ──────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ─── Canvas tinting system ──────────────────────────────────────────
const TINT_SIZE = 128;

function loadBaseImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draw image centered on a TINT_SIZE canvas preserving aspect ratio */
function drawCentered(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.min(TINT_SIZE / img.naturalWidth, TINT_SIZE / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (TINT_SIZE - w) / 2, (TINT_SIZE - h) / 2, w, h);
}

function tintImage(baseImage: HTMLImageElement, tintHex: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TINT_SIZE;
  canvas.height = TINT_SIZE;
  const ctx = canvas.getContext('2d')!;
  drawCentered(ctx, baseImage);
  const imageData = ctx.getImageData(0, 0, TINT_SIZE, TINT_SIZE);
  const d = imageData.data;
  const [tR, tG, tB] = hexToRgb(tintHex);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue; // skip transparent pixels
    const L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    d[i]     = Math.round(tR * L);
    d[i + 1] = Math.round(tG * L);
    d[i + 2] = Math.round(tB * L);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Extract {width, height, data} from a canvas for Mapbox addImage */
function canvasToImageData(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: new Uint8Array(id.data.buffer) };
}

function addTintedIcon(map: mapboxgl.Map, iconId: string, baseImage: HTMLImageElement, tintHex: string, pr = 2) {
  if (map.hasImage(iconId)) return;
  const canvas = tintImage(baseImage, tintHex);
  map.addImage(iconId, canvasToImageData(canvas) as any, { sdf: false, pixelRatio: pr } as any);
}

function addBaseIcon(map: mapboxgl.Map, iconId: string, baseImage: HTMLImageElement, pr = 2) {
  if (map.hasImage(iconId)) return;
  const canvas = document.createElement('canvas');
  canvas.width = TINT_SIZE;
  canvas.height = TINT_SIZE;
  const ctx = canvas.getContext('2d')!;
  drawCentered(ctx, baseImage);
  map.addImage(iconId, canvasToImageData(canvas) as any, { sdf: false, pixelRatio: pr } as any);
}

// ─── Icon registration ─────────────────────────────────────────────
const ICON_PATHS = {
  military:   '/icons/sat-military.png',
  classified: '/icons/sat-classified.png',
  navigation: '/icons/sat-navigation.png',
  weather:    '/icons/sat-weather.png',
  stations:   '/icons/sat-stations.png',
} as const;

let iconsLoaded = false;

async function loadSatelliteIcons(map: mapboxgl.Map) {
  if (iconsLoaded) return;

  // Load all 5 base PNG images in parallel
  const [militaryImg, classifiedImg, navigationImg, weatherImg, stationsImg] = await Promise.all([
    loadBaseImage(ICON_PATHS.military),
    loadBaseImage(ICON_PATHS.classified),
    loadBaseImage(ICON_PATHS.navigation),
    loadBaseImage(ICON_PATHS.weather),
    loadBaseImage(ICON_PATHS.stations),
  ]).catch(() => {
    console.warn('[satellite] Failed to load base PNG icons');
    return [null, null, null, null, null];
  });

  if (!militaryImg || !classifiedImg || !navigationImg || !weatherImg || !stationsImg) return;
  iconsLoaded = true;

  // Register base (untinted) fallback icons
  addBaseIcon(map, 'sat-military', militaryImg);
  addBaseIcon(map, 'sat-navigation', navigationImg);
  addBaseIcon(map, 'sat-weather', weatherImg);
  addBaseIcon(map, 'sat-stations', stationsImg, 1.5);

  // Military: country-colored variants
  for (const [code, color] of Object.entries(MILITARY_COUNTRY_COLORS)) {
    addTintedIcon(map, `sat-military-${code}`, militaryImg, color);
  }
  addTintedIcon(map, 'sat-military-fallback', militaryImg, MILITARY_FALLBACK_COLOR);

  // Navigation: constellation-colored variants
  for (const [key, color] of Object.entries(GNSS_CONSTELLATION_COLORS)) {
    addTintedIcon(map, `sat-navigation-${key}`, navigationImg, color);
  }

  // Weather: program-colored variants
  for (const [key, color] of Object.entries(WEATHER_PROGRAM_COLORS)) {
    addTintedIcon(map, `sat-weather-${key}`, weatherImg, color);
  }

  // Stations: program-colored variants (pixelRatio 1.5 → slightly larger)
  for (const [key, color] of Object.entries(STATION_PROGRAM_COLORS)) {
    addTintedIcon(map, `sat-stations-${key}`, stationsImg, color, 1.5);
  }

  // Classified: orbit-colored variants (uses its own base image)
  for (const [code, color] of Object.entries(CLASSIFIED_ORBIT_COLORS)) {
    addTintedIcon(map, `sat-classified-${code}`, classifiedImg, color);
  }
  addTintedIcon(map, 'sat-classified-fallback', classifiedImg, CLASSIFIED_FALLBACK_COLOR);
}

// ─── Module-level cached features (survives style changes) ─────────
let _lastFeatures: any[] = [];

// ─── Module-level filter state ──────────────────────────────────────
let _hiddenConstellations: Set<string> = new Set();
let _hiddenWeatherPrograms: Set<string> = new Set();
let _hiddenStationPrograms: Set<string> = new Set();
let _hiddenClassifiedOrbits: Set<string> = new Set();

function _rebuildCategoryFilters(map: mapboxgl.Map) {
  if (!map.getLayer(LAYER_ICON_ID)) return;
  const navHidden = _hiddenConstellations.size > 0;
  const wxHidden = _hiddenWeatherPrograms.size > 0;
  const stHidden = _hiddenStationPrograms.size > 0;
  const clHidden = _hiddenClassifiedOrbits.size > 0;

  if (!navHidden && !wxHidden && !stHidden && !clHidden) {
    // No filters — show everything
    try {
      map.setFilter(LAYER_ICON_ID, ['in', ['get', 'category'], ['literal', ['military', 'classified', 'navigation', 'weather', 'stations']]]);
      map.setFilter(LAYER_GLOW_ID, null as any);
    } catch { /* layer may not exist */ }
    return;
  }

  const visibleNav = Object.keys(GNSS_CONSTELLATION_COLORS).filter(k => !_hiddenConstellations.has(k));
  const visibleWx = Object.keys(WEATHER_PROGRAM_COLORS).filter(k => !_hiddenWeatherPrograms.has(k));
  const visibleSt = Object.keys(STATION_PROGRAM_COLORS).filter(k => !_hiddenStationPrograms.has(k));

  // Base categories that pass through unfiltered
  const baseCats = ['military'];
  if (!clHidden) baseCats.push('classified');
  if (!navHidden) baseCats.push('navigation');
  if (!wxHidden) baseCats.push('weather');
  if (!stHidden) baseCats.push('stations');

  const filteredCats = ['navigation', 'weather', 'stations', 'classified'].filter(c =>
    c === 'navigation' ? navHidden : c === 'weather' ? wxHidden : c === 'stations' ? stHidden : clHidden
  );
  const iconFilter: any[] = ['any', ['in', ['get', 'category'], ['literal', baseCats]]];
  const glowFilter: any[] = ['any', ['!in', ['get', 'category'], ['literal', filteredCats]]];

  if (clHidden) {
    const visibleCl = Object.keys(CLASSIFIED_ORBIT_COLORS).filter(k => !_hiddenClassifiedOrbits.has(k));
    iconFilter.push(['all', ['==', ['get', 'category'], 'classified'], ['in', ['get', 'constellation'], ['literal', visibleCl]]]);
    glowFilter.push(['all', ['==', ['get', 'category'], 'classified'], ['in', ['get', 'constellation'], ['literal', visibleCl]]]);
  }
  if (navHidden) {
    iconFilter.push(['all', ['==', ['get', 'category'], 'navigation'], ['in', ['get', 'constellation'], ['literal', visibleNav]]]);
    glowFilter.push(['all', ['==', ['get', 'category'], 'navigation'], ['in', ['get', 'constellation'], ['literal', visibleNav]]]);
  }
  if (wxHidden) {
    iconFilter.push(['all', ['==', ['get', 'category'], 'weather'], ['in', ['get', 'constellation'], ['literal', visibleWx]]]);
    glowFilter.push(['all', ['==', ['get', 'category'], 'weather'], ['in', ['get', 'constellation'], ['literal', visibleWx]]]);
  }
  if (stHidden) {
    iconFilter.push(['all', ['==', ['get', 'category'], 'stations'], ['in', ['get', 'constellation'], ['literal', visibleSt]]]);
    glowFilter.push(['all', ['==', ['get', 'category'], 'stations'], ['in', ['get', 'constellation'], ['literal', visibleSt]]]);
  }

  try {
    map.setFilter(LAYER_ICON_ID, iconFilter as any);
    map.setFilter(LAYER_GLOW_ID, glowFilter as any);
  } catch { /* layer may not exist */ }
}

// ─── Shared Mapbox expressions ──────────────────────────────────────
/** Category-based color expression — reused in glow + GEO pulse layers */
const categoryColorExpr = [
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
  ['==', ['get', 'category'], 'stations'],
  ['match', ['get', 'constellation'],
    ...Object.entries(STATION_PROGRAM_COLORS).flat(),
    STATION_FALLBACK_COLOR,
  ],
  ['==', ['get', 'category'], 'classified'],
  ['match', ['get', 'constellation'],
    ...Object.entries(CLASSIFIED_ORBIT_COLORS).flat(),
    CLASSIFIED_FALLBACK_COLOR,
  ],
  ['match', ['get', 'category'],
    'starlink', COLORS.starlink,
    COLORS.fallback,
  ],
] as any;

// ─── GEO pulse animation state ─────────────────────────────────────
let _pulseRafId = 0;

// ─── Public API ─────────────────────────────────────────────────────

export const SatelliteVisualization = {
  /** Add satellite layers to the map (idempotent) */
  async addLayers(map: mapboxgl.Map) {
    if (map.getSource(SOURCE_ID)) return;

    // Load PNG icons + generate tinted variants
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
        'circle-color': categoryColorExpr,
        'circle-opacity': 0.12,
        'circle-blur': 1,
      },
    });

    // Pulse ring for GEO satellites (alt > 30,000 km — appear stationary)
    map.addLayer({
      id: LAYER_GEO_PULSE_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['>', ['get', 'alt'], 35000],
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          0, 10,
          5, 16,
          10, 24,
        ],
        'circle-color': categoryColorExpr,
        'circle-opacity': 0.18,
        'circle-blur': 0.6,
      },
    });

    // Animate GEO pulse (cancel previous if re-entering)
    if (_pulseRafId) cancelAnimationFrame(_pulseRafId);
    let pulsePhase = 0;
    const animatePulse = () => {
      try { if (!map.getLayer(LAYER_GEO_PULSE_ID)) { _pulseRafId = 0; return; } } catch { _pulseRafId = 0; return; }
      pulsePhase = (pulsePhase + 0.015) % (Math.PI * 2);
      const sin = Math.sin(pulsePhase);
      const opacity = 0.06 + sin * 0.06;
      const radiusScale = 1 + sin * 0.2;
      try {
        map.setPaintProperty(LAYER_GEO_PULSE_ID, 'circle-opacity', Math.max(0, opacity));
        map.setPaintProperty(LAYER_GEO_PULSE_ID, 'circle-radius', [
          'interpolate', ['linear'], ['zoom'],
          0, 10 * radiusScale,
          5, 16 * radiusScale,
          10, 24 * radiusScale,
        ]);
      } catch { /* layer removed */ }
      _pulseRafId = requestAnimationFrame(animatePulse);
    };
    _pulseRafId = requestAnimationFrame(animatePulse);

    // Symbol layer for military + weather + stations (PNG icons)
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
          ['==', ['get', 'category'], 'stations'],
          ['coalesce',
            ['image', ['concat', 'sat-stations-', ['get', 'constellation']]],
            ['image', 'sat-stations'],
          ],
          ['==', ['get', 'category'], 'classified'],
          ['coalesce',
            ['image', ['concat', 'sat-classified-', ['get', 'constellation']]],
            ['image', 'sat-classified-fallback'],
            ['image', 'sat-military'],
          ],
          'sat-military',
        ],
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          0, 0.3,
          3, 0.45,
          6, 0.6,
          10, 0.85,
        ],
        'icon-rotate': ['get', 'heading'],
        'icon-rotation-alignment': 'map',
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

    // Restore cached features immediately (prevents blink after style changes)
    if (_lastFeatures.length > 0) {
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: _lastFeatures });
    }
  },

  /** Update GeoJSON features from worker propagation result */
  updatePositions(map: mapboxgl.Map, features: any[]) {
    _lastFeatures = features;
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

  /** Hide/show station programs */
  setHiddenStationPrograms(map: mapboxgl.Map, hidden: Set<string>) {
    _hiddenStationPrograms = hidden;
    _rebuildCategoryFilters(map);
  },

  /** Hide/show classified countries */
  setHiddenClassifiedOrbits(map: mapboxgl.Map, hidden: Set<string>) {
    _hiddenClassifiedOrbits = hidden;
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
      : category === 'classified' && constellation
      ? (CLASSIFIED_ORBIT_COLORS[constellation] || CLASSIFIED_FALLBACK_COLOR)
      : category === 'navigation' && constellation
      ? (GNSS_CONSTELLATION_COLORS[constellation] || GNSS_FALLBACK_COLOR)
      : category === 'weather' && constellation
      ? (WEATHER_PROGRAM_COLORS[constellation] || WEATHER_FALLBACK_COLOR)
      : category === 'stations' && constellation
      ? (STATION_PROGRAM_COLORS[constellation] || STATION_FALLBACK_COLOR)
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
    if (_pulseRafId) { cancelAnimationFrame(_pulseRafId); _pulseRafId = 0; }
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
