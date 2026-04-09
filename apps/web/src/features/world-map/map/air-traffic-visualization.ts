/**
 * Air Traffic visualization layers for Mapbox GL JS.
 * Renders aircraft positions as rotated airplane icons colored by altitude,
 * with glow halos and optional trail lines.
 */
import mapboxgl from 'mapbox-gl';

// ─── Layer & source IDs ─────────────────────────────────────────────
const SOURCE_ID = 'air-traffic-tracking-points';
const LAYER_ID = 'air-traffic-tracking-layer';
const GLOW_LAYER_ID = 'air-traffic-tracking-glow';
const TRAILS_SOURCE_ID = 'air-traffic-trails';
const TRAILS_LAYER_ID = 'air-traffic-trails-layer';

const ICON_NAME = 'aircraft-icon';
const ICON_SIZE = 64;

// ─── Altitude color expression ──────────────────────────────────────
const altitudeColorExpr = [
  'interpolate', ['linear'], ['coalesce', ['get', 'altitude'], 5000],
  0,     '#00ff88',   // ground — green
  3000,  '#00cc66',   // climb — dark green
  8000,  '#00bfff',   // cruise — blue
  12000, '#7744ff',   // high cruise — purple
  15000, '#cc44ff',   // extreme — magenta
] as any;

// ─── Icon creation ──────────────────────────────────────────────────
let iconRegistered = false;

/**
 * Create a white airplane silhouette on canvas for SDF-based coloring.
 * The airplane points UP (north) by default — Mapbox's icon-rotate will handle heading.
 */
function createAircraftIcon(): { width: number; height: number; data: Uint8Array } {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d')!;
  const s = ICON_SIZE / 24; // scale from 24x24 viewBox

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.5 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Fuselage (pointing up)
  ctx.beginPath();
  ctx.moveTo(12 * s, 2 * s);   // nose
  ctx.lineTo(13.5 * s, 8 * s);
  ctx.lineTo(13 * s, 18 * s);
  ctx.lineTo(12 * s, 20 * s);  // tail center
  ctx.lineTo(11 * s, 18 * s);
  ctx.lineTo(10.5 * s, 8 * s);
  ctx.closePath();
  ctx.fill();

  // Wings
  ctx.beginPath();
  ctx.moveTo(12 * s, 9 * s);
  ctx.lineTo(21 * s, 13 * s);
  ctx.lineTo(21 * s, 14 * s);
  ctx.lineTo(13 * s, 12 * s);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(12 * s, 9 * s);
  ctx.lineTo(3 * s, 13 * s);
  ctx.lineTo(3 * s, 14 * s);
  ctx.lineTo(11 * s, 12 * s);
  ctx.fill();

  // Tail wings
  ctx.beginPath();
  ctx.moveTo(12 * s, 17 * s);
  ctx.lineTo(16 * s, 19 * s);
  ctx.lineTo(16 * s, 19.5 * s);
  ctx.lineTo(13 * s, 18.5 * s);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(12 * s, 17 * s);
  ctx.lineTo(8 * s, 19 * s);
  ctx.lineTo(8 * s, 19.5 * s);
  ctx.lineTo(11 * s, 18.5 * s);
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
  return { width: ICON_SIZE, height: ICON_SIZE, data: new Uint8Array(imageData.data.buffer) };
}

function registerIcon(map: mapboxgl.Map) {
  if (iconRegistered && map.hasImage(ICON_NAME)) return;
  if (map.hasImage(ICON_NAME)) { iconRegistered = true; return; }
  const imgData = createAircraftIcon();
  map.addImage(ICON_NAME, imgData as any, { sdf: true, pixelRatio: 2 } as any);
  iconRegistered = true;
}

// ─── Module-level cached features (survives style changes) ─────────
let _lastFeatures: any[] = [];
let _lastTrails: any[] = [];

// ─── Popup ──────────────────────────────────────────────────────────
let _hoverPopup: mapboxgl.Popup | null = null;

// ─── Public API ─────────────────────────────────────────────────────

export const AirTrafficVisualization = {
  /** Add air traffic layers to the map (idempotent) */
  addLayers(map: mapboxgl.Map) {
    if (map.getSource(SOURCE_ID)) return;

    registerIcon(map);

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Trail lines source
    map.addSource(TRAILS_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Trail lines layer (behind everything)
    map.addLayer({
      id: TRAILS_LAYER_ID,
      type: 'line',
      source: TRAILS_SOURCE_ID,
      minzoom: 4,
      paint: {
        'line-color': altitudeColorExpr,
        'line-width': 1,
        'line-opacity': 0.35,
      },
    });

    // Glow layer (ambient halo behind icons)
    map.addLayer({
      id: GLOW_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          1, 3,
          6, 5,
          12, 8,
        ],
        'circle-color': altitudeColorExpr,
        'circle-opacity': 0.12,
        'circle-blur': 1,
      },
    });

    // Airplane icon layer (rotated by heading, colored by altitude)
    map.addLayer({
      id: LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-image': ICON_NAME,
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          1, 0.35,
          4, 0.5,
          8, 0.75,
          12, 1.0,
        ],
        'icon-rotate': ['get', 'heading'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-color': altitudeColorExpr,
        'icon-opacity': 0.9,
      },
    } as any);

    // Restore cached features (prevents blink after style changes)
    if (_lastFeatures.length > 0) {
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: _lastFeatures });
    }
    if (_lastTrails.length > 0) {
      const src = map.getSource(TRAILS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: _lastTrails });
    }
  },

  /** Update aircraft positions from worker */
  updatePositions(map: mapboxgl.Map, features: any[]) {
    _lastFeatures = features;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({ type: 'FeatureCollection', features });
  },

  /** Update trail lines from worker */
  updateTrails(map: mapboxgl.Map, trails: any[]) {
    _lastTrails = trails;
    const source = map.getSource(TRAILS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({ type: 'FeatureCollection', features: trails });
  },

  /** Register click and hover handlers */
  registerInteractions(map: mapboxgl.Map) {
    _hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'aircraft-hover-popup',
    });

    map.on('mouseenter', LAYER_ID, (e: mapboxgl.MapMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        _hoverPopup!
          .setLngLat(coords)
          .setHTML(buildPopupHtml(props))
          .addTo(map);
      }
    });

    map.on('mousemove', LAYER_ID, (e: mapboxgl.MapMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        _hoverPopup!
          .setLngLat(coords)
          .setHTML(buildPopupHtml(props));
      }
    });

    map.on('mouseleave', LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
      _hoverPopup?.remove();
    });
  },

  /** Remove all air traffic layers and sources */
  cleanup(map: mapboxgl.Map) {
    _hoverPopup?.remove();
    _hoverPopup = null;
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);
    if (map.getLayer(TRAILS_LAYER_ID)) map.removeLayer(TRAILS_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    if (map.getSource(TRAILS_SOURCE_ID)) map.removeSource(TRAILS_SOURCE_ID);
    iconRegistered = false;
  },

  /** Get layer IDs for event registration */
  getLayerIds() {
    return [LAYER_ID];
  },

  /** Reset icon flag (needed after map style changes) */
  resetIcons() {
    iconRegistered = false;
  },
};

// ─── Helpers ────────────────────────────────────────────────────────

function buildPopupHtml(props: Record<string, any>): string {
  const callsign = props.callsign?.trim() || 'N/A';
  const country = props.origin_country || '';
  const altM = Number(props.altitude) || 0;
  const altFt = Math.round(altM * 3.28084);
  const velMs = Number(props.velocity) || 0;
  const velKn = Math.round(velMs * 1.94384);
  const heading = Math.round(Number(props.heading) || 0);

  return `
    <div style="font-family:monospace;font-size:12px;line-height:1.5;min-width:140px">
      <div style="font-size:14px;font-weight:700;color:#00bfff;margin-bottom:4px">${callsign}</div>
      ${country ? `<div style="opacity:0.7">${country}</div>` : ''}
      <div>ALT: ${altM.toLocaleString()} m <span style="opacity:0.5">(${altFt.toLocaleString()} ft)</span></div>
      <div>SPD: ${Math.round(velMs)} m/s <span style="opacity:0.5">(${velKn} kn)</span></div>
      <div>HDG: ${heading}°</div>
    </div>
  `;
}
