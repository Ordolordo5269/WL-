import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';
import mapboxgl from 'mapbox-gl';
import type { ConflictsResponse, ConflictFeature } from './types';

const SOURCE_ID = 'conflicts-source';
const LAYER_ID = 'conflicts-circles';
const GLOW_LAYER_ID = 'conflicts-glow';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444', // red
  high: '#f97316',     // orange
  medium: '#eab308',   // yellow
  low: '#22c55e',      // green
};

let clickHandler: ((e: mapboxgl.MapMouseEvent) => void) | null = null;
let mouseEnterHandler: (() => void) | null = null;
let mouseLeaveHandler: (() => void) | null = null;
let activePopup: mapboxgl.Popup | null = null;

export function setConflictLayer(
  map: MapboxMap,
  enabled: boolean,
  data: ConflictsResponse | null,
  onEventClick?: (event: ConflictFeature) => void,
): void {
  // ── Remove ──
  if (!enabled) {
    if (activePopup) { activePopup.remove(); activePopup = null; }
    if (clickHandler) { map.off('click', LAYER_ID, clickHandler); clickHandler = null; }
    if (mouseEnterHandler) { map.off('mouseenter', LAYER_ID, mouseEnterHandler); mouseEnterHandler = null; }
    if (mouseLeaveHandler) { map.off('mouseleave', LAYER_ID, mouseLeaveHandler); mouseLeaveHandler = null; }
    if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    return;
  }

  if (!data) return;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: data.features,
  };

  // ── Source ──
  if (map.getSource(SOURCE_ID)) {
    (map.getSource(SOURCE_ID) as GeoJSONSource).setData(geojson);
  } else {
    map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
  }

  // ── Glow layer (pulse effect for critical) ──
  if (!map.getLayer(GLOW_LAYER_ID)) {
    map.addLayer({
      id: GLOW_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'fatalities'],
          0, 8,
          10, 16,
          50, 24,
          200, 32,
        ],
        'circle-color': [
          'match', ['get', 'severity'],
          'critical', SEVERITY_COLORS.critical,
          'high', SEVERITY_COLORS.high,
          'medium', SEVERITY_COLORS.medium,
          'low', SEVERITY_COLORS.low,
          SEVERITY_COLORS.low,
        ],
        'circle-opacity': 0.15,
        'circle-blur': 1,
      },
    });
  }

  // ── Main circles ──
  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'fatalities'],
          0, 4,
          10, 8,
          50, 13,
          200, 18,
        ],
        'circle-color': [
          'match', ['get', 'severity'],
          'critical', SEVERITY_COLORS.critical,
          'high', SEVERITY_COLORS.high,
          'medium', SEVERITY_COLORS.medium,
          'low', SEVERITY_COLORS.low,
          SEVERITY_COLORS.low,
        ],
        'circle-opacity': 0.85,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  // ── Interactivity ──
  if (clickHandler) map.off('click', LAYER_ID, clickHandler);
  if (mouseEnterHandler) map.off('mouseenter', LAYER_ID, mouseEnterHandler);
  if (mouseLeaveHandler) map.off('mouseleave', LAYER_ID, mouseLeaveHandler);

  clickHandler = (e: mapboxgl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_ID] });
    if (!features.length) return;

    const f = features[0];
    const props = f.properties as Record<string, unknown>;
    const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];

    // Show popup
    if (activePopup) activePopup.remove();
    activePopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, className: 'conflict-popup' })
      .setLngLat(coords)
      .setHTML(`
        <div style="font-family:Inter,system-ui,sans-serif;max-width:260px">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#f1f5f9">${props.country} — ${props.region}</div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:6px">${props.eventType} · ${props.subEventType}</div>
          <div style="font-size:11px;color:#cbd5e1;margin-bottom:2px"><b>Actor 1:</b> ${props.actor1}</div>
          <div style="font-size:11px;color:#cbd5e1;margin-bottom:2px"><b>Actor 2:</b> ${props.actor2 || 'N/A'}</div>
          <div style="font-size:11px;color:#cbd5e1;margin-bottom:2px"><b>Fatalities:</b> <span style="color:${SEVERITY_COLORS[props.severity as string] ?? '#eab308'};font-weight:600">${props.fatalities}</span></div>
          <div style="font-size:10px;color:#64748b;margin-top:4px">${props.date}</div>
        </div>
      `)
      .addTo(map);

    // Notify parent
    if (onEventClick) {
      const matchedFeature = data.features.find(
        (cf) => cf.properties.id === props.id,
      );
      if (matchedFeature) onEventClick(matchedFeature);
    }
  };

  mouseEnterHandler = () => { map.getCanvas().style.cursor = 'pointer'; };
  mouseLeaveHandler = () => { map.getCanvas().style.cursor = ''; };

  map.on('click', LAYER_ID, clickHandler);
  map.on('mouseenter', LAYER_ID, mouseEnterHandler);
  map.on('mouseleave', LAYER_ID, mouseLeaveHandler);
}

export { SEVERITY_COLORS };
