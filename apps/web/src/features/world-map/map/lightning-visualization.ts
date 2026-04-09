/**
 * Lightning visualization — real-time strikes from Blitzortung.
 * Yellow electric dots with flash/flicker animation for recent strikes.
 * Older strikes fade to dim. Hover shows time info.
 */
import mapboxgl from 'mapbox-gl';

const SOURCE_ID = 'lightning-tracking-points';
const LAYER_ID = 'lightning-layer';
const FLASH_LAYER_ID = 'lightning-flash';
const GLOW_LAYER_ID = 'lightning-glow';

let _lastFeatures: any[] = [];
let _flashRafId = 0;
let _hoverPopup: mapboxgl.Popup | null = null;

// Strikes newer than 30s get the flash effect
const FLASH_MS = 30 * 1000;

export const LightningVisualization = {
  addLayers(map: mapboxgl.Map) {
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Glow layer — ambient electric field
    map.addLayer({
      id: GLOW_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 6, 5, 12, 8],
        'circle-color': '#ffee00',
        'circle-opacity': 0.1,
        'circle-blur': 1,
      },
    });

    // Flash layer — recent strikes flicker rapidly
    map.addLayer({
      id: FLASH_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['>=', ['get', 'time'], Date.now() - FLASH_MS],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 6, 8, 12, 14],
        'circle-color': '#ffffff',
        'circle-opacity': 0.3,
        'circle-blur': 0.6,
      },
    });

    // Animate flash — fast flicker simulating electrical discharge
    if (_flashRafId) cancelAnimationFrame(_flashRafId);
    let phase = 0;
    const animateFlash = () => {
      try { if (!map.getLayer(FLASH_LAYER_ID)) { _flashRafId = 0; return; } } catch { _flashRafId = 0; return; }
      phase = (phase + 0.1) % (Math.PI * 2);
      // Sharp flicker — square-wave-ish pattern
      const raw = Math.sin(phase * 3);
      const flicker = raw > 0.3 ? 0.5 : 0.05;
      try {
        map.setPaintProperty(FLASH_LAYER_ID, 'circle-opacity', flicker);
      } catch { /* removed */ }
      _flashRafId = requestAnimationFrame(animateFlash);
    };
    _flashRafId = requestAnimationFrame(animateFlash);

    // Main dot layer — all strikes, bright yellow
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.5, 4, 2.5, 8, 4, 12, 5.5],
        'circle-color': '#ffee00',
        'circle-opacity': 0.9,
        'circle-stroke-width': 0.5,
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
    try {
      if (map.getLayer(FLASH_LAYER_ID)) {
        map.setFilter(FLASH_LAYER_ID, ['>=', ['get', 'time'], Date.now() - FLASH_MS]);
      }
    } catch { /* */ }
  },

  registerInteractions(map: mapboxgl.Map) {
    _hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8, className: 'lightning-hover-popup' });

    map.on('mouseenter', LAYER_ID, (e: mapboxgl.MapMouseEvent) => {
      map.getCanvas().style.cursor = 'crosshair';
      if (e.features?.length) {
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        _hoverPopup!.setLngLat(coords).setHTML(buildPopup(props, coords)).addTo(map);
      }
    });
    map.on('mousemove', LAYER_ID, (e: mapboxgl.MapMouseEvent) => {
      if (e.features?.length) {
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as any).coordinates.slice() as [number, number];
        _hoverPopup!.setLngLat(coords).setHTML(buildPopup(props, coords));
      }
    });
    map.on('mouseleave', LAYER_ID, () => { map.getCanvas().style.cursor = ''; _hoverPopup?.remove(); });
  },

  cleanup(map: mapboxgl.Map) {
    if (_flashRafId) { cancelAnimationFrame(_flashRafId); _flashRafId = 0; }
    _hoverPopup?.remove(); _hoverPopup = null;
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getLayer(FLASH_LAYER_ID)) map.removeLayer(FLASH_LAYER_ID);
    if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  },

  getLayerIds() { return [LAYER_ID]; },
};

function buildPopup(props: Record<string, any>, coords: [number, number]): string {
  const time = Number(props.time) || 0;
  const ago = time ? Math.floor((Date.now() - time) / 1000) : 0;
  const agoStr = ago < 5 ? 'just now' : ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;
  const isRecent = ago < 30;

  return `
    <div style="font-family:monospace;font-size:11px;line-height:1.4;min-width:100px">
      <div style="font-weight:700;color:${isRecent ? '#ffee00' : '#ccaa00'}">⚡ Lightning Strike</div>
      <div style="opacity:0.7">${agoStr}</div>
      <div style="opacity:0.5;font-size:10px">${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</div>
    </div>
  `;
}
