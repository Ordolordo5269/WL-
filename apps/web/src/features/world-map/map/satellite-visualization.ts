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
const TRACK_SOURCE_ID = 'satellite-ground-track';
const TRACK_LAYER_ID = 'satellite-ground-track-line';

// ─── Colors by category ────────────────────────────────────────────
const COLORS = {
  starlink: '#00ff88',
  military: '#ff4444',
  navigation: '#ffaa22',
  weather: '#44aaff',
  stations: '#d4a0ff',
  fallback: '#ffffff',
} as const;

// ─── Icon registration ─────────────────────────────────────────────
const ICON_IDS = {
  military: 'sat-military',
  navigation: 'sat-stations',
  weather: 'sat-weather',
  stations: 'sat-stations',
} as const;

const ICON_PATHS: Record<string, string> = {
  'sat-military': '/icons/sat-military.svg',
  'sat-weather': '/icons/sat-weather.svg',
  'sat-stations': '/icons/sat-stations.svg',
};

let iconsLoaded = false;

async function loadSatelliteIcons(map: mapboxgl.Map) {
  if (iconsLoaded) return;
  iconsLoaded = true;

  for (const [id, path] of Object.entries(ICON_PATHS)) {
    if (map.hasImage(id)) continue;
    try {
      const img = new Image(64, 64);
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            map.addImage(id, img as any, { sdf: false, pixelRatio: 2 } as any);
          } catch { /* already exists */ }
          resolve();
        };
        img.onerror = reject;
        img.src = path;
      });
    } catch {
      console.warn(`[satellite] Failed to load icon: ${path}`);
    }
  }
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

    // Glow layer (behind icons for ambient presence)
    map.addLayer({
      id: LAYER_GLOW_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          0, 3,
          5, 5,
          10, 8,
        ],
        'circle-color': [
          'match', ['get', 'category'],
          'starlink', COLORS.starlink,
          'military', COLORS.military,
          'navigation', COLORS.navigation,
          'weather', COLORS.weather,
          'stations', COLORS.stations,
          COLORS.fallback,
        ],
        'circle-opacity': 0.12,
        'circle-blur': 1,
      },
    });

    // Symbol layer for military + weather + stations (SVG icons)
    map.addLayer({
      id: LAYER_ICON_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['in', ['get', 'category'], ['literal', ['military', 'navigation', 'weather', 'stations']]],
      layout: {
        'icon-image': [
          'match', ['get', 'category'],
          'military', ICON_IDS.military,
          'navigation', ICON_IDS.navigation,
          'weather', ICON_IDS.weather,
          'stations', ICON_IDS.stations,
          ICON_IDS.military,
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

  /** Show ground track line for a selected satellite */
  showGroundTrack(map: mapboxgl.Map, coordinates: [number, number][], category: string) {
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

    const color = COLORS[category as keyof typeof COLORS] || COLORS.fallback;

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
