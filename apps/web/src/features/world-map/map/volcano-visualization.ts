/**
 * Volcano visualization — significant eruptions with triangle icons,
 * VEI-based coloring, lava glow pulse, and hover popups.
 */
import mapboxgl from 'mapbox-gl';

const SOURCE_ID = 'volcano-tracking-points';
const LAYER_ID = 'volcano-layer';
const GLOW_LAYER_ID = 'volcano-glow';
const PULSE_LAYER_ID = 'volcano-pulse';
const ICON_NAME = 'volcano-icon';
const ICON_SIZE = 48;

let _lastFeatures: any[] = [];
let _pulseRafId = 0;
let _hoverPopup: mapboxgl.Popup | null = null;
let _clickPopup: mapboxgl.Popup | null = null;
let _iconRegistered = false;

function buildViewAreaBtn(mode: string, lng: number, lat: number): string {
  return `<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px"><button class="eg-view-area-btn" onclick="event.stopPropagation();document.__wl_map_comp?.triggerEarthGallery?.('${mode}',${lat},${lng})">VIEW AREA</button></div>`;
}

// GDACS alertlevel color expression
const veiColorExpr = [
  'match', ['get', 'alertlevel'],
  'Red', '#ff0033',
  'Orange', '#ff4400',
  '#ff8c00', // Green / default
] as any;

/** Draw a triangle/mountain shape in canvas for SDF */
function createVolcanoIcon(): { width: number; height: number; data: Uint8Array } {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d')!;
  const s = ICON_SIZE / 24;

  ctx.fillStyle = '#ffffff';

  // Mountain/triangle shape
  ctx.beginPath();
  ctx.moveTo(12 * s, 3 * s);   // peak
  ctx.lineTo(21 * s, 20 * s);  // right base
  ctx.lineTo(3 * s, 20 * s);   // left base
  ctx.closePath();
  ctx.fill();

  // Crater opening at top
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(10 * s, 6 * s);
  ctx.lineTo(14 * s, 6 * s);
  ctx.lineTo(13 * s, 3.5 * s);
  ctx.lineTo(11 * s, 3.5 * s);
  ctx.closePath();
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
  return { width: ICON_SIZE, height: ICON_SIZE, data: new Uint8Array(imageData.data.buffer) };
}

function registerIcon(map: mapboxgl.Map) {
  if (_iconRegistered && map.hasImage(ICON_NAME)) return;
  if (map.hasImage(ICON_NAME)) { _iconRegistered = true; return; }
  map.addImage(ICON_NAME, createVolcanoIcon() as any, { sdf: true, pixelRatio: 2 } as any);
  _iconRegistered = true;
}

export const VolcanoVisualization = {
  addLayers(map: mapboxgl.Map) {
    if (map.getSource(SOURCE_ID)) return;
    registerIcon(map);

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Lava pulse for VEI >= 3
    map.addLayer({
      id: PULSE_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['in', ['get', 'alertlevel'], ['literal', ['Red', 'Orange']]],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 10, 6, 16, 12, 24],
        'circle-color': '#ff2200',
        'circle-opacity': 0.1,
        'circle-blur': 0.7,
      },
    });

    // Animate lava pulse
    if (_pulseRafId) cancelAnimationFrame(_pulseRafId);
    let phase = 0;
    const animate = () => {
      try { if (!map.getLayer(PULSE_LAYER_ID)) { _pulseRafId = 0; return; } } catch { _pulseRafId = 0; return; }
      phase = (phase + 0.012) % (Math.PI * 2);
      const sin = Math.sin(phase);
      const opacity = 0.06 + sin * 0.08;
      const scale = 1.0 + sin * 0.4;
      try {
        map.setPaintProperty(PULSE_LAYER_ID, 'circle-opacity', Math.max(0, opacity));
        map.setPaintProperty(PULSE_LAYER_ID, 'circle-radius', [
          'interpolate', ['linear'], ['zoom'],
          0, 10 * scale, 6, 16 * scale, 12, 24 * scale,
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
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 6, 6, 10, 12, 16],
        'circle-color': veiColorExpr,
        'circle-opacity': 0.18,
        'circle-blur': 1,
      },
    });

    // Triangle icon layer
    map.addLayer({
      id: LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-image': ICON_NAME,
        'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 4, 0.6, 8, 0.85, 12, 1.1],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-color': veiColorExpr,
        'icon-opacity': 0.95,
      },
    } as any);

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
    _hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'volcano-hover-popup' });

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

    _clickPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12, className: 'volcano-click-popup' });
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
    if (_pulseRafId) { cancelAnimationFrame(_pulseRafId); _pulseRafId = 0; }
    _hoverPopup?.remove(); _hoverPopup = null;
    _clickPopup?.remove(); _clickPopup = null;
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);
    if (map.getLayer(PULSE_LAYER_ID)) map.removeLayer(PULSE_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    _iconRegistered = false;
  },

  getLayerIds() { return [LAYER_ID]; },
  resetIcons() { _iconRegistered = false; },
};

function buildPopup(props: Record<string, any>): string {
  const name = props.name || 'Unknown';
  const country = props.country || '';
  const alertlevel = props.alertlevel || 'Green';
  const severity = props.severity || '';
  const fromdate = props.fromdate || '';
  const alertColor = alertlevel === 'Red' ? '#ff0033' : alertlevel === 'Orange' ? '#ff4400' : '#ff8c00';
  const dateStr = fromdate ? new Date(fromdate).toLocaleDateString() : '';

  return `
    <div style="font-family:monospace;font-size:12px;line-height:1.5;min-width:150px">
      <div style="font-size:14px;font-weight:700;color:#ff6600;margin-bottom:4px">${name.substring(0, 80)}</div>
      <div style="display:flex;gap:6px;margin-bottom:4px">
        <span style="font-size:10px;padding:2px 6px;border-radius:3px;background:${alertColor};color:#fff;font-weight:700">${alertlevel.toUpperCase()}</span>
      </div>
      ${country ? `<div style="font-weight:600">${country}</div>` : ''}
      ${severity ? `<div style="opacity:0.8;font-size:11px">${severity.substring(0, 100)}</div>` : ''}
      ${dateStr ? `<div style="opacity:0.5;margin-top:3px">${dateStr}</div>` : ''}
    </div>
  `;
}
