/**
 * Storm/severe weather visualization — severity-based coloring,
 * pulse animation for extreme events, and hover popups.
 */
import mapboxgl from 'mapbox-gl';

const SOURCE_ID = 'storm-tracking-points';
const LAYER_ID = 'storm-layer';
const GLOW_LAYER_ID = 'storm-glow';
const PULSE_LAYER_ID = 'storm-pulse';

let _lastFeatures: any[] = [];
let _pulseRafId = 0;
let _hoverPopup: mapboxgl.Popup | null = null;

// GDACS uses alertlevel: Red, Orange, Green
const severityColorExpr = [
  'match', ['get', 'alertlevel'],
  'Red', '#ff0044',
  'Orange', '#ff6600',
  '#ffcc00', // Green / default
] as any;

export const StormVisualization = {
  addLayers(map: mapboxgl.Map) {
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Pulse ring for Extreme/Severe
    map.addLayer({
      id: PULSE_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['in', ['get', 'alertlevel'], ['literal', ['Red', 'Orange']]],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 14, 6, 22, 12, 32],
        'circle-color': severityColorExpr,
        'circle-opacity': 0.08,
        'circle-blur': 0.6,
      },
    });

    // Animate pulse
    if (_pulseRafId) cancelAnimationFrame(_pulseRafId);
    let phase = 0;
    const animate = () => {
      try { if (!map.getLayer(PULSE_LAYER_ID)) { _pulseRafId = 0; return; } } catch { _pulseRafId = 0; return; }
      phase = (phase + 0.018) % (Math.PI * 2);
      const sin = Math.sin(phase);
      const scale = 1.0 + sin * 0.5;
      const opacity = 0.05 + Math.abs(sin) * 0.1;
      try {
        map.setPaintProperty(PULSE_LAYER_ID, 'circle-opacity', opacity);
        map.setPaintProperty(PULSE_LAYER_ID, 'circle-radius', [
          'interpolate', ['linear'], ['zoom'],
          0, 14 * scale, 6, 22 * scale, 12, 32 * scale,
        ]);
      } catch { /* */ }
      _pulseRafId = requestAnimationFrame(animate);
    };
    _pulseRafId = requestAnimationFrame(animate);

    // Glow layer
    map.addLayer({
      id: GLOW_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 6, 12, 12, 18],
        'circle-color': severityColorExpr,
        'circle-opacity': 0.15,
        'circle-blur': 1,
      },
    });

    // Main dot
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 6, 8, 12, 12],
        'circle-color': severityColorExpr,
        'circle-opacity': 0.9,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });

    if (_lastFeatures.length > 0) {
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: _lastFeatures });
    }
  },

  updateData(map: mapboxgl.Map, features: any[]) {
    _lastFeatures = features;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({ type: 'FeatureCollection', features });
  },

  registerInteractions(map: mapboxgl.Map) {
    _hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'storm-hover-popup' });

    map.on('mouseenter', LAYER_ID, (e: mapboxgl.MapMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features?.length) {
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        _hoverPopup!.setLngLat(coords).setHTML(buildPopup(props)).addTo(map);
      }
    });
    map.on('mousemove', LAYER_ID, (e: mapboxgl.MapMouseEvent) => {
      if (e.features?.length) {
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        _hoverPopup!.setLngLat(coords).setHTML(buildPopup(props));
      }
    });
    map.on('mouseleave', LAYER_ID, () => { map.getCanvas().style.cursor = ''; _hoverPopup?.remove(); });
  },

  cleanup(map: mapboxgl.Map) {
    if (_pulseRafId) { cancelAnimationFrame(_pulseRafId); _pulseRafId = 0; }
    _hoverPopup?.remove(); _hoverPopup = null;
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);
    if (map.getLayer(PULSE_LAYER_ID)) map.removeLayer(PULSE_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  },

  getLayerIds() { return [LAYER_ID]; },
};

function buildPopup(props: Record<string, any>): string {
  const name = props.name || 'Unknown event';
  const alertlevel = props.alertlevel || 'Green';
  const country = props.country || '';
  const severity = props.severity || '';
  const eventtype = props.eventtype || '';
  const fromdate = props.fromdate || '';

  const typeLabel: Record<string, string> = { TC: 'Tropical Cyclone', FL: 'Flood', WF: 'Wildfire', DR: 'Drought', EQ: 'Earthquake', VO: 'Volcano' };
  const sevColor = alertlevel === 'Red' ? '#ff0044' : alertlevel === 'Orange' ? '#ff6600' : '#ffcc00';
  const dateStr = fromdate ? new Date(fromdate).toLocaleDateString() : '';

  return `
    <div style="font-family:monospace;font-size:12px;line-height:1.5;min-width:160px">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
        <span style="font-size:10px;padding:2px 6px;border-radius:3px;background:${sevColor};color:#fff;font-weight:700">${alertlevel.toUpperCase()}</span>
        <span style="font-size:10px;padding:2px 6px;border-radius:3px;background:#333;color:#ddd">${typeLabel[eventtype] || eventtype}</span>
      </div>
      ${country ? `<div style="font-weight:600;margin-bottom:2px">${country}</div>` : ''}
      ${severity && !severity.includes('Magnitude 0') ? `<div style="opacity:0.85;font-size:11px;max-width:250px;word-wrap:break-word">${severity.replace(/&gt;/g, '>').substring(0, 150)}</div>` : ''}
      ${dateStr ? `<div style="opacity:0.5;margin-top:3px">${dateStr}</div>` : ''}
    </div>
  `;
}
