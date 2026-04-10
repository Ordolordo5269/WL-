import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';
import type { LiveActivityLayerId } from './types';

// Track registered click handlers to avoid duplicates
const _registeredClicks = new Set<string>();
let _volcanoClickPopup: mapboxgl.Popup | null = null;

/**
 * Per-layer paint/layout definitions.
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
  'active-volcanoes': {
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 4, 8, 8, 12],
      'circle-color': [
        'match', ['get', 'alert_level'],
        'Warning', '#ff0000',
        'Watch', '#ff6600',
        'Advisory', '#ffcc00',
        '#e84b1a', // Normal / default
      ],
      'circle-opacity': 0.9,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ff8c00',
      'circle-blur': 0.15,
    },
  },
  'tsunamis': {
    type: 'circle',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['coalesce', ['get', 'max_height'], 1],
        0, 4,
        2, 8,
        5, 14,
        10, 22,
      ],
      'circle-color': '#00ccff',
      'circle-opacity': 0.8,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#0088cc',
      'circle-blur': 0.2,
    },
  },
  'storms': {
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 6, 4, 10, 8, 16],
      'circle-color': [
        'match', ['get', 'severity'],
        'Extreme', '#ff0044',
        'Severe', '#ff4400',
        'Moderate', '#ff8800',
        '#ffcc00', // Minor / default
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#cc4400',
      'circle-blur': 0.2,
    },
  },
  'lightning': {
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.5, 4, 2.5, 8, 4, 12, 6],
      'circle-color': '#ffee00',
      'circle-opacity': 0.9,
      'circle-blur': 0.3,
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
 * Toggle a live-activity layer on/off on the given map instance.
 * Weather uses raster tiles; others use GeoJSON circle layers.
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

  // Register click handler for active-volcanoes (VIEW AREA → NASA Photos)
  if (id === 'active-volcanoes' && !_registeredClicks.has(layerId)) {
    _registeredClicks.add(layerId);
    _volcanoClickPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12 });
    map.on('click', layerId, (e: mapboxgl.MapMouseEvent) => {
      if (e.features?.length) {
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        const name = props.name || props.volcano_name || 'Unknown';
        const alert = props.alert_level || 'Normal';
        const alertColor = alert === 'Warning' ? '#ff0000' : alert === 'Watch' ? '#ff6600' : '#ffcc00';
        const html = `<div style="font-family:monospace;font-size:12px;line-height:1.5;min-width:150px">
          <div style="font-size:14px;font-weight:700;color:#ff6600;margin-bottom:4px">${String(name).substring(0, 80)}</div>
          <span style="font-size:10px;padding:2px 6px;border-radius:3px;background:${alertColor};color:#fff;font-weight:700">${String(alert).toUpperCase()}</span>
          <div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px"><button class="eg-view-area-btn" onclick="event.stopPropagation();document.__wl_map_comp?.triggerEarthGallery?.('recon',${coords[1]},${coords[0]})">VIEW AREA</button></div>
        </div>`;
        _volcanoClickPopup!.setLngLat(coords).setHTML(html).addTo(map);
      }
    });
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  }
}
