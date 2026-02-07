import mapboxgl from 'mapbox-gl';

export type TerrainState = {
  enabled: boolean;
  exaggeration: number;
  useHillshade?: boolean;
};

const DEM_SOURCE_ID = 'mapbox-dem';
const HILLSHADE_LAYER_ID = 'terrain-hillshade';

export function ensureDemSource(map: mapboxgl.Map): void {
  const src = map.getSource(DEM_SOURCE_ID) as any;
  if (src) return;
  try {
    map.addSource(DEM_SOURCE_ID, {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14
    } as any);
  } catch {}
}

export function applyTerrain(map: mapboxgl.Map, state: TerrainState): void {
  if (!state || !map) return;
  if (!state.enabled) {
    try { (map as any).setTerrain(null); } catch {}
    removeHillshade(map);
    return;
  }
  ensureDemSource(map);
  const exaggeration = Number.isFinite(state.exaggeration) ? Math.max(0, state.exaggeration) : 1;
  try {
    (map as any).setTerrain({ source: DEM_SOURCE_ID, exaggeration });
  } catch {}

  if (state.useHillshade) {
    ensureHillshade(map);
    const hasHillshade = !!map.getLayer(HILLSHADE_LAYER_ID);
    if (hasHillshade) {
      try {
        // Mapbox hillshade-exaggeration max is 1, so clamp to avoid spec errors.
        const hs = Math.min(1, 0.8 + 0.3 * exaggeration);
        map.setPaintProperty(HILLSHADE_LAYER_ID, 'hillshade-exaggeration', hs as any);
        map.setPaintProperty(HILLSHADE_LAYER_ID, 'hillshade-highlight-color', '#f5f5f5' as any);
        map.setPaintProperty(HILLSHADE_LAYER_ID, 'hillshade-shadow-color', '#1f2937' as any);
        map.setPaintProperty(HILLSHADE_LAYER_ID, 'hillshade-illumination-direction', 315 as any);
        map.setPaintProperty(HILLSHADE_LAYER_ID, 'hillshade-illumination-anchor', 'map' as any);
      } catch {}
    }
  } else {
    removeHillshade(map);
  }
}

export function ensureHillshade(map: mapboxgl.Map): void {
  if (!map.getSource(DEM_SOURCE_ID)) return;
  if (map.getLayer(HILLSHADE_LAYER_ID)) return;
  try {
    const labelLayerId = (map.getStyle()?.layers || []).find(
      l => l.type === 'symbol' && (l as any).layout?.['text-field']
    )?.id;
    map.addLayer({
      id: HILLSHADE_LAYER_ID,
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      layout: { visibility: 'visible' },
      paint: {
        // Must stay <= 1 to satisfy Mapbox style spec.
        'hillshade-exaggeration': 1,
        'hillshade-highlight-color': '#f5f5f5',
        'hillshade-shadow-color': '#1f2937',
        'hillshade-illumination-direction': 315,
        'hillshade-illumination-anchor': 'map'
      }
    } as any, labelLayerId);
  } catch {}
}

export function removeHillshade(map: mapboxgl.Map): void {
  try { if (map.getLayer(HILLSHADE_LAYER_ID)) map.removeLayer(HILLSHADE_LAYER_ID); } catch {}
}

export function reapplyAfterStyleChange(map: mapboxgl.Map, state: TerrainState): void {
  if (!map || !state?.enabled) return;
  ensureDemSource(map);
  applyTerrain(map, state);
}

export function loadPersistedTerrain(): { on: boolean; ex: number } {
  try {
    const on = localStorage.getItem('wl_terrain_on') === '1';
    const ex = parseFloat(localStorage.getItem('wl_terrain_ex') || '1') || 1;
    return { on, ex: Math.max(0, ex) };
  } catch { return { on: false, ex: 1 }; }
}

export function persistTerrain(on: boolean, ex: number): void {
  try {
    localStorage.setItem('wl_terrain_on', on ? '1' : '0');
    localStorage.setItem('wl_terrain_ex', String(Math.max(0, ex)));
  } catch {}
}


