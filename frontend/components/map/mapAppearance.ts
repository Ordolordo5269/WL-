import mapboxgl from 'mapbox-gl';

export type StyleKey = 'night' | 'light' | 'outdoors' | 'physical';
export const MAP_STYLES: Record<StyleKey, string> = {
  night: 'mapbox://styles/mapbox/navigation-night-v1',
  light: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  physical: 'mapbox://styles/mapbox/outdoors-v12'
};

export type PlanetPreset = 'default' | 'nebula' | 'sunset' | 'dawn';

export function applyFog(map: mapboxgl.Map, preset: PlanetPreset) {
  const presets: Record<PlanetPreset, any> = {
    default: {
      color: 'rgb(186, 210, 235)',
      'high-color': 'rgb(36, 92, 223)',
      'horizon-blend': 0.02,
      'space-color': 'rgb(11, 11, 25)',
      'star-intensity': 0.6
    },
    nebula: {
      color: 'rgb(180, 200, 255)',
      'high-color': 'rgb(120, 80, 200)',
      'horizon-blend': 0.045,
      'space-color': 'rgb(8, 10, 20)',
      'star-intensity': 0.8
    },
    sunset: {
      color: 'rgb(240, 190, 150)',
      'high-color': 'rgb(200, 90, 60)',
      'horizon-blend': 0.06,
      'space-color': 'rgb(14, 8, 10)',
      'star-intensity': 0.5
    },
    dawn: {
      color: 'rgb(210, 225, 240)',
      'high-color': 'rgb(120, 170, 230)',
      'horizon-blend': 0.035,
      'space-color': 'rgb(10, 12, 22)',
      'star-intensity': 0.7
    }
  };
  try { map.setFog(presets[preset] as any); } catch {}
}

export function applyRelief(
  map: mapboxgl.Map,
  opts?: Partial<{ terrain: boolean; hillshade: boolean; exaggeration: number }>
) {
  const useTerrain = !!opts?.terrain;
  const useHillshade = !!opts?.hillshade;
  const exaggeration = typeof opts?.exaggeration === 'number' ? opts.exaggeration : 1.0;

  // Ensure separate DEM sources for terrain and hillshade to avoid resolution warning
  if (useTerrain && !map.getSource('mapbox-dem-terrain')) {
    try {
      map.addSource('mapbox-dem-terrain', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512
      } as any);
    } catch {}
  }
  if (useHillshade && !map.getSource('mapbox-dem-hillshade')) {
    try {
      map.addSource('mapbox-dem-hillshade', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512
      } as any);
    } catch {}
  }

  try {
    if (useTerrain) {
      map.setTerrain({ source: 'mapbox-dem-terrain', exaggeration } as any);
    } else {
      map.setTerrain(null as any);
    }
  } catch {}

  const existingHill = map.getLayer('hillshade') as any | undefined;
  const hillLayerExists = !!existingHill;
  const hillLayerHasWrongSource = hillLayerExists && (existingHill.source !== 'mapbox-dem-hillshade');

  if (useHillshade) {
    if (hillLayerHasWrongSource) {
      try { map.removeLayer('hillshade'); } catch {}
    }
    if (!map.getLayer('hillshade')) {
      try {
        map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'mapbox-dem-hillshade' } as any);
      } catch {}
    }
  } else if (hillLayerExists) {
    try { map.removeLayer('hillshade'); } catch {}
    // optional: free hillshade source to reduce memory
    try { if (map.getSource('mapbox-dem-hillshade')) map.removeSource('mapbox-dem-hillshade'); } catch {}
  }
}

export function setBaseFeaturesVisibility(map: mapboxgl.Map, hide: boolean) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id;
    const type = (layer as any).type;
    const match = type === 'symbol' || /\b(admin|boundary|country|state|disputed|road|rail|aeroway|place|poi)\b/i.test(id);
    if (match) {
      try { map.setLayoutProperty(id, 'visibility', hide ? 'none' : 'visible'); } catch {}
    }
  }
}

export function applyPhysicalModeTweaks(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id;
    const type = (layer as any).type;
    const shouldHide = type === 'symbol' || /\b(admin|boundary|country|state|disputed|road|rail|aeroway|poi|place|airport|ferry|building)\b/i.test(id);
    if (shouldHide) {
      try { map.setLayoutProperty(id, 'visibility', 'none'); } catch {}
    }
  }
  const toHide = [
    'country-highlight', 'country-selected',
    'country-conflict-fill','country-conflict-border',
    'conflict-marker','conflict-ripple-0','conflict-ripple-1',
    'ally-fill-faction1','ally-border-faction1',
    'ally-fill-faction2','ally-border-faction2'
  ];
  toHide.forEach(id => { try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); } catch {} });
}



