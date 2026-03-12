export type StyleKey = 'night' | 'light' | 'outdoors' | 'dark' | 'satellite' | 'satellite-streets';
export const MAP_STYLES: Record<StyleKey, string> = {
  night: 'mapbox://styles/mapbox/navigation-night-v1',
  light: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12'
};

export type PlanetPreset = 'default' | 'nebula' | 'sunset' | 'dawn' | 'arctic' | 'volcanic' | 'emerald' | 'midnight' | 'aurora' | 'sahara' | 'storm' | 'crimson' | 'rose' | 'void' | 'coral' | 'violet';

export function applyFog(map: mapboxgl.Map, preset: PlanetPreset) {
  const presets: Record<PlanetPreset, any> = {
    default: {
      color: 'rgb(186, 210, 235)',
      'high-color': 'rgb(36, 92, 223)',
      'horizon-blend': 0,
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
    },
    arctic: {
      color: 'rgb(210, 245, 240)',
      'high-color': 'rgb(140, 210, 220)',
      'horizon-blend': 0.02,
      'space-color': 'rgb(2, 3, 8)',
      'star-intensity': 0.95
    },
    volcanic: {
      color: 'rgb(255, 120, 50)',
      'high-color': 'rgb(180, 40, 10)',
      'horizon-blend': 0.07,
      'space-color': 'rgb(10, 5, 5)',
      'star-intensity': 0.3
    },
    emerald: {
      color: 'rgb(150, 220, 170)',
      'high-color': 'rgb(30, 130, 80)',
      'horizon-blend': 0.05,
      'space-color': 'rgb(5, 12, 8)',
      'star-intensity': 0.65
    },
    midnight: {
      color: 'rgb(30, 50, 120)',
      'high-color': 'rgb(10, 20, 80)',
      'horizon-blend': 0.055,
      'space-color': 'rgb(3, 3, 10)',
      'star-intensity': 0.95
    },
    aurora: {
      color: 'rgb(100, 220, 180)',
      'high-color': 'rgb(30, 140, 120)',
      'horizon-blend': 0.04,
      'space-color': 'rgb(5, 10, 15)',
      'star-intensity': 0.9
    },
    sahara: {
      color: 'rgb(245, 210, 140)',
      'high-color': 'rgb(180, 120, 50)',
      'horizon-blend': 0.065,
      'space-color': 'rgb(12, 8, 5)',
      'star-intensity': 0.55
    },
    storm: {
      color: 'rgb(140, 145, 160)',
      'high-color': 'rgb(60, 65, 90)',
      'horizon-blend': 0.06,
      'space-color': 'rgb(8, 8, 12)',
      'star-intensity': 0.2
    },
    crimson: {
      color: 'rgb(180, 30, 40)',
      'high-color': 'rgb(80, 10, 15)',
      'horizon-blend': 0.065,
      'space-color': 'rgb(6, 2, 2)',
      'star-intensity': 0.4
    },
    rose: {
      color: 'rgb(240, 160, 190)',
      'high-color': 'rgb(180, 60, 130)',
      'horizon-blend': 0.05,
      'space-color': 'rgb(10, 4, 10)',
      'star-intensity': 0.7
    },
    void: {
      color: 'rgb(10, 10, 15)',
      'high-color': 'rgb(5, 5, 10)',
      'horizon-blend': 0.01,
      'space-color': 'rgb(1, 1, 2)',
      'star-intensity': 1.0
    },
    coral: {
      color: 'rgb(255, 150, 130)',
      'high-color': 'rgb(200, 80, 70)',
      'horizon-blend': 0.055,
      'space-color': 'rgb(10, 5, 5)',
      'star-intensity': 0.6
    },
    violet: {
      color: 'rgb(170, 100, 240)',
      'high-color': 'rgb(90, 30, 180)',
      'horizon-blend': 0.05,
      'space-color': 'rgb(6, 3, 15)',
      'star-intensity': 0.85
    }
  };
  try { map.setFog(presets[preset] as any); } catch {}
}

export type SpacePreset = 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson';

export const SPACE_PRESETS: Record<SpacePreset, { 'space-color': string; 'star-intensity': number }> = {
  void:    { 'space-color': 'rgb(0, 0, 0)',    'star-intensity': 0.15 },
  deep:    { 'space-color': 'rgb(5, 5, 18)',   'star-intensity': 0.9 },
  nebula:  { 'space-color': 'rgb(45, 10, 80)', 'star-intensity': 0.85 },
  galaxy:  { 'space-color': 'rgb(10, 25, 70)', 'star-intensity': 1.0 },
  crimson: { 'space-color': 'rgb(50, 8, 8)',   'star-intensity': 0.6 },
};

export function applyStarIntensity(map: mapboxgl.Map, value: number) {
  try {
    const current = (map as any).getFog?.() || {};
    map.setFog({ ...current, 'star-intensity': value } as any);
  } catch {}
}

export function applySpacePreset(map: mapboxgl.Map, preset: SpacePreset) {
  try {
    const current = (map as any).getFog?.() || {};
    map.setFog({ ...current, ...SPACE_PRESETS[preset] } as any);
  } catch {}
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



