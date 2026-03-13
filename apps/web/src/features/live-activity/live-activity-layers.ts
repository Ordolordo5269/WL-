import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';
import mapboxgl from 'mapbox-gl';
import type { LiveActivityLayerId } from './types';
import { liveActivityApi } from './api';

// ── Satellite category colors ─────────────────────────────
const SATELLITE_CATEGORIES: Record<string, { color: string; label: string }> = {
  'Station':           { color: '#ff4444', label: 'Space Station' },
  'Starlink':          { color: '#4fc3f7', label: 'Starlink' },
  'OneWeb':            { color: '#81d4fa', label: 'OneWeb' },
  'Navigation':        { color: '#66bb6a', label: 'Navigation (GPS/GLONASS/Galileo)' },
  'Weather':           { color: '#ffb74d', label: 'Weather' },
  'Earth Observation': { color: '#aed581', label: 'Earth Observation' },
  'Science':           { color: '#ce93d8', label: 'Science' },
  'Communication':     { color: '#ffd54f', label: 'Communication' },
  'Military':          { color: '#ef5350', label: 'Military' },
  'Other':             { color: '#b0bec5', label: 'Other' },
};

// SVG satellite icon path (Lucide satellite simplified to a single filled shape)
function createSatelliteIcon(color: string, size = 32): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const s = size / 24; // scale from 24x24 viewBox

  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Main body diamond
  ctx.beginPath();
  ctx.moveTo(9.352 * s, 10.648 * s);
  ctx.lineTo(9.352 * s, 10.648 * s);
  // Simplified: draw a filled diamond for the body
  ctx.moveTo(12 * s, 7 * s);
  ctx.lineTo(17 * s, 12 * s);
  ctx.lineTo(12 * s, 17 * s);
  ctx.lineTo(7 * s, 12 * s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fill();

  // Solar panels (two lines)
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(5 * s, 5 * s);
  ctx.lineTo(9 * s, 9 * s);
  ctx.moveTo(15 * s, 15 * s);
  ctx.lineTo(19 * s, 19 * s);
  ctx.stroke();

  // Panel rectangles
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(3 * s, 3 * s, 4 * s, 4 * s);
  ctx.fillRect(17 * s, 17 * s, 4 * s, 4 * s);

  // Signal arc
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(9 * s, 21 * s, 3 * s, -Math.PI, -Math.PI / 2);
  ctx.stroke();

  return canvas;
}

let satelliteIconsRegistered = false;

function registerSatelliteIcons(map: MapboxMap) {
  if (satelliteIconsRegistered) return;
  for (const [cat, { color }] of Object.entries(SATELLITE_CATEGORIES)) {
    const iconName = `sat-icon-${cat.toLowerCase().replace(/\s+/g, '-')}`;
    if (!map.hasImage(iconName)) {
      const size = 32;
      const canvas = createSatelliteIcon(color, size);
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, size, size);
      map.addImage(iconName, { width: size, height: size, data: new Uint8Array(imageData.data.buffer) }, { pixelRatio: 2 });
    }
  }
  satelliteIconsRegistered = true;
}

/**
 * Per-layer paint/layout definitions.
 * Radar is handled separately as a raster layer.
 */
const LAYER_STYLES: Record<
  string,
  { type: string; paint: Record<string, any> }
> = {
  earthquakes: {
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], 1], 1, 3, 5, 10, 8, 20],
      'circle-color': [
        'interpolate', ['linear'], ['coalesce', ['get', 'depth'], 0],
        0, '#ffcc00',
        70, '#ff6600',
        300, '#cc0000',
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
    },
  },
  fires: {
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2, 6, 4, 10, 7],
      'circle-color': '#ff4500',
      'circle-opacity': 0.7,
      'circle-blur': 0.4,
    },
  },
  'air-traffic': {
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2, 4, 3, 8, 5, 12, 7],
      'circle-color': '#00bfff',
      'circle-opacity': 0.85,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': '#005f8f',
    },
  },
  'marine-traffic': {
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3, 6, 5, 10, 8],
      'circle-color': '#00cc66',
      'circle-opacity': 0.85,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': '#006633',
    },
  },
};

// OpenWeatherMap tile layers — IDs match LeftSidebar chip IDs
const OWM_TILE_LAYERS: Record<string, string> = {
  temp_new: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
  precipitation_new: 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
  wind_new: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
  clouds_new: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
  pressure_new: 'https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
};

// ── Satellite orbit state ──────────────────────────────────
const ORBIT_SOURCE = 'satellite-orbit';
const ORBIT_LAYER = 'satellite-orbit-layer';
const ORBIT_GLOW_LAYER = 'satellite-orbit-glow-layer';
let activeOrbitPopup: mapboxgl.Popup | null = null;
let satelliteClickHandler: ((e: any) => void) | null = null;

function removeOrbitLayer(map: MapboxMap) {
  if (map.getLayer(ORBIT_GLOW_LAYER)) map.removeLayer(ORBIT_GLOW_LAYER);
  if (map.getLayer(ORBIT_LAYER)) map.removeLayer(ORBIT_LAYER);
  if (map.getSource(ORBIT_SOURCE)) map.removeSource(ORBIT_SOURCE);
  if (activeOrbitPopup) { activeOrbitPopup.remove(); activeOrbitPopup = null; }
}

async function showSatelliteOrbit(map: MapboxMap, noradId: number, name: string, altitude: number, category: string, lngLat: mapboxgl.LngLat) {
  try {
    removeOrbitLayer(map);

    const catInfo = SATELLITE_CATEGORIES[category] ?? SATELLITE_CATEGORIES['Other'];
    const catColor = catInfo.color;
    const catLabel = catInfo.label;

    // Show popup immediately
    activeOrbitPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, className: 'satellite-popup' })
      .setLngLat(lngLat)
      .setHTML(`
        <div class="satellite-popup-content">
          <div class="popup-title">${name}</div>
          <div class="popup-body">
            <div><span class="sat-cat-badge" style="background:${catColor}">${catLabel}</span></div>
            <div>NORAD: ${noradId}</div>
            <div>Altitude: ${altitude} km</div>
            <div class="popup-meta" style="margin-top:4px">Loading orbit...</div>
          </div>
        </div>
      `)
      .addTo(map);

    const orbitData = await liveActivityApi.getSatelliteOrbit(noradId);

    if (!orbitData || !orbitData.features?.length) {
      if (activeOrbitPopup) {
        activeOrbitPopup.setHTML(`
          <div class="satellite-popup-content">
            <div class="popup-title">${name}</div>
            <div class="popup-body">
              <div><span class="sat-cat-badge" style="background:${catColor}">${catLabel}</span></div>
              <div>NORAD: ${noradId}</div>
              <div>Altitude: ${altitude} km</div>
            </div>
          </div>
        `);
      }
      return;
    }

    // Add orbit line to map
    map.addSource(ORBIT_SOURCE, { type: 'geojson', data: orbitData as any });

    // Glow layer (wider, transparent)
    map.addLayer({
      id: ORBIT_GLOW_LAYER,
      type: 'line',
      source: ORBIT_SOURCE,
      paint: {
        'line-color': catColor,
        'line-width': 6,
        'line-opacity': 0.25,
        'line-blur': 4,
      },
    });

    // Main orbit line
    map.addLayer({
      id: ORBIT_LAYER,
      type: 'line',
      source: ORBIT_SOURCE,
      paint: {
        'line-color': catColor,
        'line-width': 2,
        'line-opacity': 0.8,
        'line-dasharray': [4, 3],
      },
    });

    // Update popup with orbit loaded
    if (activeOrbitPopup) {
      activeOrbitPopup.setHTML(`
        <div class="satellite-popup-content">
          <div class="popup-title">${name}</div>
          <div class="popup-body">
            <div><span class="sat-cat-badge" style="background:${catColor}">${catLabel}</span></div>
            <div>NORAD: ${noradId}</div>
            <div>Altitude: ${altitude} km</div>
            <div class="popup-meta" style="margin-top:4px;color:${catColor}">Orbit displayed</div>
          </div>
        </div>
      `);
    }
  } catch (err) {
    console.error('Failed to load satellite orbit:', err);
  }
}

function setupSatelliteClickHandler(map: MapboxMap) {
  const layerId = 'live-activity-satellites-layer';

  // Cursor changes
  map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });

  // Click handler
  satelliteClickHandler = (e: any) => {
    const features = e.features;
    if (!features?.length) return;
    const props = features[0].properties;
    const noradId = props.norad_id;
    const name = props.name ?? 'Unknown';
    const altitude = props.altitude ?? 0;
    const category = props.category ?? 'Other';
    showSatelliteOrbit(map, noradId, name, altitude, category, e.lngLat);
  };
  map.on('click', layerId, satelliteClickHandler);
}

function teardownSatelliteClickHandler(map: MapboxMap) {
  const layerId = 'live-activity-satellites-layer';
  if (satelliteClickHandler) {
    try { map.off('click', layerId, satelliteClickHandler); } catch {}
    satelliteClickHandler = null;
  }
  try { map.getCanvas().style.cursor = ''; } catch {}
  removeOrbitLayer(map);
}

// ── Helpers ───────────────────────────────────────────────

function addRasterLayer(map: MapboxMap, sourceId: string, layerId: string, tileUrl: string, opacity = 0.6) {
  const existingSource = map.getSource(sourceId);
  if (existingSource) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    map.removeSource(sourceId);
  }
  map.addSource(sourceId, { type: 'raster', tiles: [tileUrl], tileSize: 256 });
  map.addLayer({ id: layerId, type: 'raster', source: sourceId, paint: { 'raster-opacity': opacity } });
}

function removeLayer(map: MapboxMap, sourceId: string, layerId: string) {
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

/**
 * Build the icon-image expression that maps each category to its registered icon.
 */
function buildSatelliteIconExpression(): any[] {
  const expr: any[] = ['match', ['get', 'category']];
  for (const cat of Object.keys(SATELLITE_CATEGORIES)) {
    const iconName = `sat-icon-${cat.toLowerCase().replace(/\s+/g, '-')}`;
    expr.push(cat, iconName);
  }
  expr.push('sat-icon-other'); // fallback
  return expr;
}

/**
 * Toggle a live-activity layer on/off on the given map instance.
 * Radar/Weather use raster tiles; satellites use symbol icons; others use GeoJSON circle layers.
 */
export function setLiveActivityLayer(
  map: MapboxMap,
  id: LiveActivityLayerId,
  enabled: boolean,
  data?: GeoJSON.FeatureCollection | null,
  extra?: any,
) {
  const sourceId = `live-activity-${id}`;
  const layerId = `live-activity-${id}-layer`;

  // ── Remove ────────────────────────────────────────────────
  if (!enabled) {
    if (id === 'weather') {
      for (const sub of Object.keys(OWM_TILE_LAYERS)) {
        removeLayer(map, `live-activity-weather-${sub}`, `live-activity-weather-${sub}-layer`);
      }
      return;
    }
    if (id === 'satellites') {
      teardownSatelliteClickHandler(map);
      satelliteIconsRegistered = false;
    }
    removeLayer(map, sourceId, layerId);
    return;
  }

  // ── Weather (multiple raster sublayers) ───────────────────
  if (id === 'weather') {
    const enabledSubs: string[] = extra?.enabledSublayers ?? [];
    for (const [sub, url] of Object.entries(OWM_TILE_LAYERS)) {
      const subSource = `live-activity-weather-${sub}`;
      const subLayer = `live-activity-weather-${sub}-layer`;
      if (enabledSubs.includes(sub)) {
        addRasterLayer(map, subSource, subLayer, url, 0.75);
      } else {
        removeLayer(map, subSource, subLayer);
      }
    }
    return;
  }

  // ── Radar (raster tiles) ──────────────────────────────────
  if (id === 'radar') {
    const tileUrl = extra?.tileUrl as string | undefined;
    if (!tileUrl) return;
    addRasterLayer(map, sourceId, layerId, tileUrl, 0.6);
    return;
  }

  // ── Satellites (symbol layer with SVG icons) ──────────────
  if (id === 'satellites') {
    registerSatelliteIcons(map);

    const fc: GeoJSON.FeatureCollection = data ?? { type: 'FeatureCollection', features: [] };
    const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(fc);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: fc });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'icon-image': buildSatelliteIconExpression() as any,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 4, 0.7, 8, 1, 12, 1.3],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-opacity': 0.95,
        },
      });
      setupSatelliteClickHandler(map);
    }
    return;
  }

  // ── GeoJSON circle layers ─────────────────────────────────
  const fc: GeoJSON.FeatureCollection = data ?? { type: 'FeatureCollection', features: [] };

  const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(fc);
  } else {
    map.addSource(sourceId, { type: 'geojson', data: fc });
  }

  if (!map.getLayer(layerId)) {
    const style = LAYER_STYLES[id] ?? LAYER_STYLES.earthquakes;
    map.addLayer({
      id: layerId,
      type: style.type as any,
      source: sourceId,
      paint: style.paint,
    });
  }
}
