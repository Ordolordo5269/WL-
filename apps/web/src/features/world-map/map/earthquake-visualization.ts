/**
 * Earthquake visualization layers for Mapbox GL JS.
 * Renders earthquakes with magnitude-based sizing/coloring,
 * pulsing seismic waves for recent strong quakes, and hover popups.
 */
import mapboxgl from 'mapbox-gl';

// ─── Layer & source IDs ─────────────────────────────────────────────
const SOURCE_ID = 'earthquake-tracking-points';
const LAYER_ID = 'earthquake-layer';
const GLOW_LAYER_ID = 'earthquake-glow';
const PULSE_LAYER_ID = 'earthquake-pulse';
const PULSE2_LAYER_ID = 'earthquake-pulse-2';
const CORE_LAYER_ID = 'earthquake-core';

// ─── Magnitude color expression (arena → ascua) ─────────────────────
const magColorExpr = [
  'interpolate', ['linear'], ['coalesce', ['get', 'mag'], 1],
  0,   '#d4b896',   // micro — arena clara
  2.5, '#d4b896',
  3,   '#b8864b',   // ligero — ocre tostado
  4.5, '#8b4513',   // moderado — siena quemado
  5.5, '#5c2410',   // fuerte — caoba oscuro
  7,   '#ff6b1a',   // mayor — ascua incandescente
  8,   '#ff6b1a',
] as any;

// ─── Magnitude radius expression ────────────────────────────────────
const magRadiusExpr = [
  'interpolate', ['exponential', 2], ['coalesce', ['get', 'mag'], 1],
  0, 1.5,
  2, 2.5,
  3, 5,
  4, 8,
  5, 13,
  6, 20,
  7, 28,
  8, 38,
] as any;

// ─── Module state ───────────────────────────────────────────────────
let _lastFeatures: any[] = [];
let _pulseRafId = 0;
let _hoverPopup: mapboxgl.Popup | null = null;
let _clickPopup: mapboxgl.Popup | null = null;

function buildViewAreaBtn(mode: string, lng: number, lat: number): string {
  return `<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px"><button class="eg-view-area-btn" onclick="event.stopPropagation();document.__wl_map_comp?.triggerEarthGallery?.('${mode}',${lat},${lng})">VIEW AREA</button></div>`;
}

// 2 hours in ms — quakes newer than this get the pulse effect
const RECENT_MS = 2 * 60 * 60 * 1000;

// ─── Public API ─────────────────────────────────────────────────────

export const EarthquakeVisualization = {
  /** Add earthquake layers to the map (idempotent) */
  addLayers(map: mapboxgl.Map) {
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    const recentFilter: any = ['all',
      ['>=', ['get', 'mag'], 4],
      ['>=', ['get', 'time'], Date.now() - RECENT_MS],
    ];

    // Shockwave ring A — recent (< 2h) AND mag >= 4
    map.addLayer({
      id: PULSE_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: recentFilter,
      paint: {
        'circle-radius': ['*', magRadiusExpr, 1],
        'circle-color': magColorExpr,
        'circle-opacity': 0,
        'circle-blur': 0.6,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': magColorExpr,
        'circle-stroke-opacity': 0,
      },
    });

    // Shockwave ring B — same, phase-offset for continuous wave train
    map.addLayer({
      id: PULSE2_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: recentFilter,
      paint: {
        'circle-radius': ['*', magRadiusExpr, 1],
        'circle-color': magColorExpr,
        'circle-opacity': 0,
        'circle-blur': 0.6,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': magColorExpr,
        'circle-stroke-opacity': 0,
      },
    });

    // Animate shockwave — expanding ring that fades, resets, repeats
    if (_pulseRafId) cancelAnimationFrame(_pulseRafId);
    let pulseT = 0;
    const SPEED = 1 / 90; // ~1.5s per cycle at 60fps
    const MAX_SCALE = 4.0;
    const animatePulse = () => {
      try {
        if (!map.getLayer(PULSE_LAYER_ID)) { _pulseRafId = 0; return; }
      } catch { _pulseRafId = 0; return; }

      pulseT = (pulseT + SPEED) % 1;
      const tA = pulseT;
      const tB = (pulseT + 0.5) % 1;

      const scaleA = 1 + (MAX_SCALE - 1) * tA;
      const scaleB = 1 + (MAX_SCALE - 1) * tB;
      // Fill fades out as ring expands; stroke stays brighter for "wave" feel
      const fillA = 0.12 * (1 - tA);
      const fillB = 0.12 * (1 - tB);
      const strokeA = 0.55 * (1 - tA);
      const strokeB = 0.55 * (1 - tB);

      try {
        map.setPaintProperty(PULSE_LAYER_ID, 'circle-radius', ['*', magRadiusExpr, scaleA]);
        map.setPaintProperty(PULSE_LAYER_ID, 'circle-opacity', fillA);
        map.setPaintProperty(PULSE_LAYER_ID, 'circle-stroke-opacity', strokeA);
        map.setPaintProperty(PULSE2_LAYER_ID, 'circle-radius', ['*', magRadiusExpr, scaleB]);
        map.setPaintProperty(PULSE2_LAYER_ID, 'circle-opacity', fillB);
        map.setPaintProperty(PULSE2_LAYER_ID, 'circle-stroke-opacity', strokeB);
      } catch { /* layer removed */ }

      _pulseRafId = requestAnimationFrame(animatePulse);
    };
    _pulseRafId = requestAnimationFrame(animatePulse);

    // Glow layer (ambient halo)
    map.addLayer({
      id: GLOW_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['*', magRadiusExpr, 1.6],
        'circle-color': magColorExpr,
        'circle-opacity': 0.15,
        'circle-blur': 1,
      },
    });

    // Main dot layer
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': magRadiusExpr,
        'circle-color': magColorExpr,
        'circle-opacity': 0.9,
        'circle-stroke-width': [
          'interpolate', ['linear'], ['coalesce', ['get', 'mag'], 1],
          0, 0.5,
          5, 1,
          7, 1.5,
        ],
        'circle-stroke-color': '#3d1507',
      },
    });

    // Plasma core — bright incandescent center for mag >= 5 (overlays main dot)
    map.addLayer({
      id: CORE_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['>=', ['get', 'mag'], 5],
      paint: {
        'circle-radius': ['*', magRadiusExpr, 0.35],
        'circle-color': '#ffd9a3',
        'circle-opacity': 0.95,
        'circle-blur': 0.3,
      },
    });

    // Restore cached features
    if (_lastFeatures.length > 0) {
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: _lastFeatures });
    }
  },

  /** Update earthquake data */
  updateData(map: mapboxgl.Map, features: any[]) {
    _lastFeatures = features;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({ type: 'FeatureCollection', features });

    // Update pulse filters with current time threshold
    const recentFilter: any = ['all',
      ['>=', ['get', 'mag'], 4],
      ['>=', ['get', 'time'], Date.now() - RECENT_MS],
    ];
    try {
      if (map.getLayer(PULSE_LAYER_ID)) map.setFilter(PULSE_LAYER_ID, recentFilter);
      if (map.getLayer(PULSE2_LAYER_ID)) map.setFilter(PULSE2_LAYER_ID, recentFilter);
    } catch { /* layer may not exist */ }
  },

  /** Register hover interactions */
  registerInteractions(map: mapboxgl.Map) {
    _hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'earthquake-hover-popup',
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

    // Click → popup with VIEW AREA button
    _clickPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12, className: 'earthquake-click-popup' });
    map.on('click', LAYER_ID, (e: mapboxgl.MapMouseEvent) => {
      if (e.features?.length) {
        _hoverPopup?.remove();
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        _clickPopup!.setLngLat(coords).setHTML(buildPopupHtml(props) + buildViewAreaBtn('recon', coords[0], coords[1])).addTo(map);
      }
    });
  },

  /** Remove all earthquake layers */
  cleanup(map: mapboxgl.Map) {
    if (_pulseRafId) { cancelAnimationFrame(_pulseRafId); _pulseRafId = 0; }
    _hoverPopup?.remove(); _hoverPopup = null;
    _clickPopup?.remove(); _clickPopup = null;
    if (map.getLayer(CORE_LAYER_ID)) map.removeLayer(CORE_LAYER_ID);
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);
    if (map.getLayer(PULSE2_LAYER_ID)) map.removeLayer(PULSE2_LAYER_ID);
    if (map.getLayer(PULSE_LAYER_ID)) map.removeLayer(PULSE_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  },

  /** Get layer IDs for event registration */
  getLayerIds() {
    return [LAYER_ID];
  },
};

// ─── Helpers ────────────────────────────────────────────────────────

function timeAgo(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function magLabel(mag: number): string {
  if (mag >= 8) return 'GREAT';
  if (mag >= 7) return 'MAJOR';
  if (mag >= 6) return 'STRONG';
  if (mag >= 5) return 'MODERATE';
  if (mag >= 4) return 'LIGHT';
  if (mag >= 2.5) return 'MINOR';
  return 'MICRO';
}

function magColor(mag: number): string {
  if (mag >= 7) return '#ff6b1a';   // ascua
  if (mag >= 5.5) return '#8b4513'; // caoba (subido para legibilidad en popup)
  if (mag >= 4.5) return '#a85a20';
  if (mag >= 3) return '#b8864b';
  return '#d4b896';
}

function buildPopupHtml(props: Record<string, any>): string {
  const mag = Number(props.mag) || 0;
  const place = props.place || 'Unknown location';
  const depth = Number(props.depth) || 0;
  const time = Number(props.time) || 0;
  const color = magColor(mag);
  const label = magLabel(mag);

  return `
    <div style="font-family:monospace;font-size:12px;line-height:1.5;min-width:160px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:20px;font-weight:900;color:${color}">${mag.toFixed(1)}</span>
        <span style="font-size:10px;font-weight:700;color:${color};letter-spacing:1px">${label}</span>
      </div>
      <div style="opacity:0.85;margin-bottom:2px">${place}</div>
      <div style="opacity:0.6">Depth: ${depth.toFixed(1)} km</div>
      ${time ? `<div style="opacity:0.6">${timeAgo(time)}</div>` : ''}
    </div>
  `;
}
