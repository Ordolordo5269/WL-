import type mapboxgl from 'mapbox-gl';

const SOURCE_ID = 'wl-mission-markers';
const LAYER_GLOW = 'wl-mission-glow';
const LAYER_PULSE = 'wl-mission-pulse';
const LAYER_CIRCLE = 'wl-mission-circle';
const LAYER_ICON = 'wl-mission-icon';
const LAYER_LABEL = 'wl-mission-label';
const LAYER_INFO = 'wl-mission-info';

// Arc layers
const ARC_SOURCE = 'wl-mission-arcs';
const ARC_GLOW = 'wl-mission-arc-glow';
const ARC_LAYER = 'wl-mission-arc-line';

// Agency → color mapping
const AGENCY_COLORS: Record<string, string> = {
  US: '#4488ff',
  CN: '#ff4444',
  RU: '#ff8844',
  EU: '#44aaff',
  IN: '#ff8800',
  JP: '#ff4488',
  CA: '#ff0000',
  NZ: '#ffffff',
};
const DEFAULT_COLOR = '#8888ff';

function agencyColorExpr(): any[] {
  return [
    'match', ['get', 'agencyCountryCode'],
    ...Object.entries(AGENCY_COLORS).flat(),
    DEFAULT_COLOR,
  ];
}

// ── Pulse animation ──────────────────────────────────────────────────
let pulseRaf: number | null = null;

function startPulseAnimation(map: mapboxgl.Map) {
  stopPulseAnimation();
  const animate = () => {
    if (!map.getLayer(LAYER_PULSE)) return;
    // Oscillate between 14 and 24 over 2 seconds
    const t = (Date.now() % 2000) / 2000;
    const ease = 0.5 - 0.5 * Math.cos(t * Math.PI * 2); // smooth 0→1→0
    const radius = 14 + ease * 10;
    const opacity = 0.5 - ease * 0.35;
    try {
      map.setPaintProperty(LAYER_PULSE, 'circle-radius', radius);
      map.setPaintProperty(LAYER_PULSE, 'circle-stroke-opacity', opacity);
      map.setPaintProperty(LAYER_GLOW, 'circle-opacity', 0.04 + ease * 0.06);
    } catch { /* layer removed */ }
    pulseRaf = requestAnimationFrame(animate);
  };
  pulseRaf = requestAnimationFrame(animate);
}

function stopPulseAnimation() {
  if (pulseRaf !== null) {
    cancelAnimationFrame(pulseRaf);
    pulseRaf = null;
  }
}

// ── Arc helpers ─────────────────────────────────────────────────────
function addArcLayers(map: mapboxgl.Map, arcs: GeoJSON.FeatureCollection) {
  if (arcs.features.length === 0) return;

  map.addSource(ARC_SOURCE, { type: 'geojson', data: arcs });

  // Glow underneath
  map.addLayer({
    id: ARC_GLOW,
    type: 'line',
    source: ARC_SOURCE,
    paint: {
      'line-color': agencyColorExpr() as any,
      'line-width': 4,
      'line-blur': 6,
      'line-opacity': 0.15,
    },
  });

  // Dashed arc line
  map.addLayer({
    id: ARC_LAYER,
    type: 'line',
    source: ARC_SOURCE,
    paint: {
      'line-color': agencyColorExpr() as any,
      'line-width': 1.5,
      'line-opacity': ['match', ['get', 'status'], 'in-flight', 0.7, 0.4] as any,
      'line-dasharray': [4, 4],
    },
  });
}

function removeArcLayers(map: mapboxgl.Map) {
  for (const id of [ARC_LAYER, ARC_GLOW]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(ARC_SOURCE)) map.removeSource(ARC_SOURCE);
}

// ── Layer setup ──────────────────────────────────────────────────────
export function addMissionMarkers(map: mapboxgl.Map, geojson: GeoJSON.FeatureCollection, arcData?: GeoJSON.FeatureCollection) {
  removeMissionMarkers(map);

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: geojson,
  });

  // 1. Outer glow — large soft circle for in-flight
  map.addLayer({
    id: LAYER_GLOW,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['==', ['get', 'status'], 'in-flight'],
    paint: {
      'circle-radius': 35,
      'circle-color': agencyColorExpr() as any,
      'circle-opacity': 0.06,
      'circle-blur': 1,
    },
  });

  // 2. Pulse ring — animated via rAF
  map.addLayer({
    id: LAYER_PULSE,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['==', ['get', 'status'], 'in-flight'],
    paint: {
      'circle-radius': 18,
      'circle-color': 'transparent',
      'circle-stroke-width': 1.5,
      'circle-stroke-color': agencyColorExpr() as any,
      'circle-stroke-opacity': 0.5,
    },
  });

  // 3. Main marker — size by status
  map.addLayer({
    id: LAYER_CIRCLE,
    type: 'circle',
    source: SOURCE_ID,
    paint: {
      'circle-radius': [
        'match', ['get', 'status'],
        'in-flight', 8,
        5,
      ] as any,
      'circle-color': agencyColorExpr() as any,
      'circle-opacity': [
        'match', ['get', 'status'],
        'in-flight', 0.95,
        0.7,
      ] as any,
      'circle-stroke-width': [
        'match', ['get', 'status'],
        'in-flight', 2,
        1,
      ] as any,
      'circle-stroke-color': 'rgba(255,255,255,0.35)',
    },
  });

  // 4. Center dot for in-flight
  map.addLayer({
    id: LAYER_ICON,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['==', ['get', 'status'], 'in-flight'],
    paint: {
      'circle-radius': 2.5,
      'circle-color': '#ffffff',
      'circle-opacity': 0.9,
    },
  });

  // 5. Mission name
  map.addLayer({
    id: LAYER_LABEL,
    type: 'symbol',
    source: SOURCE_ID,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': [
        'match', ['get', 'status'],
        'in-flight', 12,
        10,
      ] as any,
      'text-offset': [0, 1.6],
      'text-anchor': 'top',
      'text-max-width': 14,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-letter-spacing': 0.02,
    },
    paint: {
      'text-color': [
        'match', ['get', 'status'],
        'in-flight', 'rgba(255,255,255,0.95)',
        'rgba(220,210,255,0.65)',
      ] as any,
      'text-halo-color': 'rgba(5,3,20,0.9)',
      'text-halo-width': 1.5,
    },
  });

  // 6. Info line (agency · countdown)
  map.addLayer({
    id: LAYER_INFO,
    type: 'symbol',
    source: SOURCE_ID,
    layout: {
      'text-field': [
        'case',
        ['==', ['get', 'webcastLive'], true],
        ['concat', '● LIVE · ', ['get', 'agency'], ' · ', ['get', 'countdown']],
        ['concat', ['get', 'agency'], ' · ', ['get', 'countdown']],
      ],
      'text-size': 9,
      'text-offset': [
        'match', ['get', 'status'],
        'in-flight', ['literal', [0, 3.0]],
        ['literal', [0, 2.8]],
      ] as any,
      'text-anchor': 'top',
      'text-max-width': 18,
      'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
      'text-letter-spacing': 0.03,
    },
    paint: {
      'text-color': [
        'match', ['get', 'status'],
        'in-flight', 'rgba(0,255,136,0.7)',
        'rgba(255,170,34,0.5)',
      ] as any,
      'text-halo-color': 'rgba(5,3,20,0.8)',
      'text-halo-width': 1,
    },
  });

  // Add arc layers if provided
  if (arcData && arcData.features.length > 0) {
    addArcLayers(map, arcData);
  }

  // Start pulse animation
  startPulseAnimation(map);
}

export function updateMissionMarkers(map: mapboxgl.Map, geojson: GeoJSON.FeatureCollection, arcData?: GeoJSON.FeatureCollection) {
  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(geojson);
    // Update arcs too
    const arcSource = map.getSource(ARC_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (arcSource) {
      arcSource.setData(arcData || { type: 'FeatureCollection', features: [] });
    }
  } else {
    addMissionMarkers(map, geojson, arcData);
  }
}

export function removeMissionMarkers(map: mapboxgl.Map) {
  stopPulseAnimation();
  removeArcLayers(map);
  const layers = [LAYER_INFO, LAYER_LABEL, LAYER_ICON, LAYER_CIRCLE, LAYER_PULSE, LAYER_GLOW];
  for (const id of layers) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

export const MISSION_LAYER_IDS = [LAYER_CIRCLE, LAYER_PULSE, LAYER_GLOW, LAYER_ICON, LAYER_LABEL, LAYER_INFO];

// ── Click handler ───────────────────────────────────────────────────
type MissionClickCallback = (missionId: string, coords: [number, number]) => void;
let boundClickHandler: ((e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => void) | null = null;
let boundCursorEnter: (() => void) | null = null;
let boundCursorLeave: (() => void) | null = null;
const CLICKABLE_LAYERS = [LAYER_CIRCLE, LAYER_LABEL, LAYER_INFO, LAYER_ICON];

export function setupMissionClickHandler(map: mapboxgl.Map, callback: MissionClickCallback) {
  cleanupMissionClickHandler(map);

  boundClickHandler = (e) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const id = feature.properties?.id as string;
    const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
    if (id) callback(id, coords);
  };

  for (const layer of CLICKABLE_LAYERS) {
    if (map.getLayer(layer)) {
      map.on('click', layer, boundClickHandler);
    }
  }

  // Cursor pointer on hover
  boundCursorEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
  boundCursorLeave = () => { map.getCanvas().style.cursor = ''; };
  for (const layer of CLICKABLE_LAYERS) {
    if (map.getLayer(layer)) {
      map.on('mouseenter', layer, boundCursorEnter);
      map.on('mouseleave', layer, boundCursorLeave);
    }
  }
}

export function cleanupMissionClickHandler(map: mapboxgl.Map) {
  for (const layer of CLICKABLE_LAYERS) {
    if (boundClickHandler) try { map.off('click', layer, boundClickHandler); } catch { /* layer removed */ }
    if (boundCursorEnter) try { map.off('mouseenter', layer, boundCursorEnter); } catch { /* layer removed */ }
    if (boundCursorLeave) try { map.off('mouseleave', layer, boundCursorLeave); } catch { /* layer removed */ }
  }
  boundClickHandler = null;
  boundCursorEnter = null;
  boundCursorLeave = null;
  map.getCanvas().style.cursor = '';
}
