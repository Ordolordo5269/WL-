/**
 * Tsunami visualization — concentric expanding wave rings from epicenters.
 * Animated ripple effect + central dot sized by wave height.
 */
import mapboxgl from 'mapbox-gl';

const SOURCE_ID = 'tsunami-tracking-points';
const LAYER_ID = 'tsunami-layer';
const WAVE_LAYER_1 = 'tsunami-wave-1';
const WAVE_LAYER_2 = 'tsunami-wave-2';

let _lastFeatures: any[] = [];
let _waveRafId = 0;
let _hoverPopup: mapboxgl.Popup | null = null;
let _clickPopup: mapboxgl.Popup | null = null;

function buildViewAreaBtn(mode: string, lng: number, lat: number): string {
  return `<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px"><button class="eg-view-area-btn" onclick="event.stopPropagation();document.__wl_map_comp?.triggerEarthGallery?.('${mode}',${lat},${lng})">VIEW AREA</button></div>`;
}

const waveColor = '#00ccff';

// Size by max wave height
const heightRadiusExpr = [
  'interpolate', ['linear'], ['coalesce', ['get', 'max_height'], 0.5],
  0, 4,
  1, 6,
  5, 12,
  10, 18,
  20, 25,
] as any;

export const TsunamiVisualization = {
  addLayers(map: mapboxgl.Map) {
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Wave ring 1 (outer, expanding)
    map.addLayer({
      id: WAVE_LAYER_1,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['*', heightRadiusExpr, 3],
        'circle-color': 'transparent',
        'circle-opacity': 1,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': waveColor,
        'circle-stroke-opacity': 0.2,
      },
    });

    // Wave ring 2 (inner, expanding offset)
    map.addLayer({
      id: WAVE_LAYER_2,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['*', heightRadiusExpr, 2],
        'circle-color': 'transparent',
        'circle-opacity': 1,
        'circle-stroke-width': 1,
        'circle-stroke-color': waveColor,
        'circle-stroke-opacity': 0.3,
      },
    });

    // Animate waves — concentric expanding rings
    if (_waveRafId) cancelAnimationFrame(_waveRafId);
    let phase = 0;
    const animate = () => {
      try { if (!map.getLayer(WAVE_LAYER_1)) { _waveRafId = 0; return; } } catch { _waveRafId = 0; return; }
      phase = (phase + 0.015) % (Math.PI * 2);
      const sin1 = Math.sin(phase);
      const sin2 = Math.sin(phase + Math.PI * 0.6);
      const scale1 = 2.0 + sin1 * 1.5;  // 0.5 — 3.5
      const scale2 = 1.5 + sin2 * 1.0;  // 0.5 — 2.5
      const opacity1 = 0.1 + (1 - Math.abs(sin1)) * 0.2;
      const opacity2 = 0.15 + (1 - Math.abs(sin2)) * 0.25;
      try {
        map.setPaintProperty(WAVE_LAYER_1, 'circle-radius', ['*', heightRadiusExpr, scale1]);
        map.setPaintProperty(WAVE_LAYER_1, 'circle-stroke-opacity', opacity1);
        map.setPaintProperty(WAVE_LAYER_2, 'circle-radius', ['*', heightRadiusExpr, scale2]);
        map.setPaintProperty(WAVE_LAYER_2, 'circle-stroke-opacity', opacity2);
      } catch { /* */ }
      _waveRafId = requestAnimationFrame(animate);
    };
    _waveRafId = requestAnimationFrame(animate);

    // Central dot
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': heightRadiusExpr,
        'circle-color': '#0099dd',
        'circle-opacity': 0.85,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': waveColor,
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
    _hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'tsunami-hover-popup' });

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

    _clickPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12, className: 'tsunami-click-popup' });
    map.on('click', LAYER_ID, (e: mapboxgl.MapMouseEvent) => {
      if (e.features?.length) {
        _hoverPopup?.remove();
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        _clickPopup!.setLngLat(coords).setHTML(buildPopup(props) + buildViewAreaBtn('recon', coords[0], coords[1])).addTo(map);
      }
    });
  },

  cleanup(map: mapboxgl.Map) {
    if (_waveRafId) { cancelAnimationFrame(_waveRafId); _waveRafId = 0; }
    _hoverPopup?.remove(); _hoverPopup = null;
    _clickPopup?.remove(); _clickPopup = null;
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getLayer(WAVE_LAYER_1)) map.removeLayer(WAVE_LAYER_1);
    if (map.getLayer(WAVE_LAYER_2)) map.removeLayer(WAVE_LAYER_2);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  },

  getLayerIds() { return [LAYER_ID]; },
};

function buildPopup(props: Record<string, any>): string {
  const country = props.country || 'Unknown';
  const mag = Number(props.magnitude) || 0;
  const height = Number(props.max_height) || 0;
  const deaths = Number(props.deaths) || 0;
  const date = props.date || '';
  const cause = props.cause || '';

  const causeLabel: Record<string, string> = {
    '1': 'Earthquake', '2': 'Questionable Earthquake', '3': 'Volcano',
    '4': 'Volcanic + Earthquake', '5': 'Landslide', '6': 'Volcano + Landslide',
    '7': 'Meteorological', '8': 'Landslide/Avalanche', 'Earthquake': 'Earthquake',
  };

  return `
    <div style="font-family:monospace;font-size:12px;line-height:1.5;min-width:150px">
      <div style="font-size:14px;font-weight:700;color:#00ccff;margin-bottom:4px">🌊 TSUNAMI</div>
      <div style="font-weight:600">${country}</div>
      ${mag > 0 ? `<div>Magnitude: <span style="font-weight:700">${mag.toFixed(1)}</span></div>` : ''}
      ${height > 0 ? `<div>Max wave: <span style="font-weight:700;color:#00ccff">${height.toFixed(1)} m</span></div>` : ''}
      <div style="opacity:0.6">Cause: ${causeLabel[String(cause)] || cause}</div>
      ${date ? `<div style="opacity:0.6">${date}</div>` : ''}
      ${deaths > 0 ? `<div style="color:#ff4444">Deaths: ${deaths}</div>` : ''}
    </div>
  `;
}
