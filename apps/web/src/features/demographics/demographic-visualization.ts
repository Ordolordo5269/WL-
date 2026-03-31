import mapboxgl from 'mapbox-gl';
import type { Language, ReligionStat, DiasporaOrigin, MigrationCorridor } from './types';
import type { CountryMap } from './hooks/useCountryMap';
import { languageFamilyColor, religionColor, LANGUAGE_FAMILY_COLOR } from './types';

// ════════════════════════════════════════════════════════════════════
// LAYER IDS
// ════════════════════════════════════════════════════════════════════

const LAYER = {
  // Language
  LANG_CIRCLE: 'demo-lang-circle',
  LANG_LABEL: 'demo-lang-label',
  LANG_SOURCE: 'demo-lang-source',
  // Religion
  REL_FILL: 'demo-rel-fill',
  REL_BORDER: 'demo-rel-border',
  // Diaspora — choropleth
  DIA_ORIGIN_FILL: 'demo-dia-origin-fill',
  DIA_DEST_FILL: 'demo-dia-dest-fill',
  // Diaspora — markers & arcs
  DIA_ARCS: 'demo-dia-arcs',
  DIA_SOURCE: 'demo-dia-source',
  DIA_ORIGIN_CIRCLE: 'demo-dia-origin-circle',
  DIA_ORIGIN_SOURCE: 'demo-dia-origin-source',
  DIA_ORIGIN_PULSE: 'demo-dia-origin-pulse',
  DIA_DEST_CIRCLE: 'demo-dia-dest-circle',
  DIA_DEST_SOURCE: 'demo-dia-dest-source',
  DIA_ORIGIN_LABEL: 'demo-dia-origin-label',
  DIA_DEST_LABEL: 'demo-dia-dest-label',
} as const;

const COUNTRY_SOURCE = 'country-boundaries';
const COUNTRY_SOURCE_LAYER = 'country_boundaries';

// ISO field expression (handles Mapbox Natural Earth field variations)
const ISO_EXPR: any = ['upcase', ['coalesce',
  ['get', 'iso_3166_1_alpha_3'],
  ['get', 'wb_a3'],
  ['get', 'adm0_a3'],
  ['get', 'iso_3166_1'],
]];

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

function safeRemoveLayer(map: mapboxgl.Map, id: string) {
  try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
}
function safeRemoveSource(map: mapboxgl.Map, id: string) {
  try { if (map.getSource(id)) map.removeSource(id); } catch {}
}

/** Great-circle interpolation between two points → array of [lng, lat] */
function greatCircleArc(
  from: [number, number],
  to: [number, number],
  segments = 64
): [number, number][] {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const [lng1, lat1] = [from[0] * toRad, from[1] * toRad];
  const [lng2, lat2] = [to[0] * toRad, to[1] * toRad];

  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng2 - lng1) / 2), 2)
  ));

  if (d < 0.0001) return [from, to];

  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push([Math.atan2(y, x) * toDeg, Math.atan2(z, Math.sqrt(x * x + y * y)) * toDeg]);
  }
  return points;
}

// Country centroid lookup (approximate, for arc endpoints)
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {};

// Corridor index: origin ISO3 → list of destination ISO3s (built at addDiasporaLayers)
const corridorDestIndex: Record<string, string[]> = {};

export function setCountryCentroids(data: Record<string, [number, number]>) {
  Object.assign(COUNTRY_CENTROIDS, data);
}

// ════════════════════════════════════════════════════════════════════
// 1. LANGUAGE VISUALIZATION — Proportional bubbles by family
// ════════════════════════════════════════════════════════════════════

export function addLanguageLayers(map: mapboxgl.Map, languages: Language[]) {
  removeLanguageLayers(map);

  // DB stores coords biased toward largest speaking population, not hubCountry capital
  // eng: (37.84, -92.08) Missouri → London | spa: (19.41, -99.13) Mexico City → Madrid | por: (-22.86, -43.35) Rio → Lisbon
  const COORD_OVERRIDE: Record<string, [number, number]> = {
    eng: [-0.13,  51.50],
    spa: [-3.70,  40.42],
    por: [-9.14,  38.72],
  };

  // Round coords to 1 decimal to detect co-located languages (same country centroid)
  const coordKey = (lng: number, lat: number) =>
    `${lng.toFixed(1)},${lat.toFixed(1)}`;

  // First pass: resolve each language's base coords
  const resolved = languages
    .filter(l => l.lat && l.lng && l.speakers > 0)
    .map(l => {
      const ov = COORD_OVERRIDE[l.iso639_3];
      return { lang: l, lng: ov ? ov[0] : l.lng!, lat: ov ? ov[1] : l.lat! };
    });

  // Group by coord key to find clusters
  const groups = new Map<string, typeof resolved>();
  for (const item of resolved) {
    const k = coordKey(item.lng, item.lat);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }

  // Second pass: apply spiral offset to co-located languages
  // Sorted by speakers DESC so dominant language stays at center
  const spiralOffset = (index: number, total: number): [number, number] => {
    if (total === 1 || index === 0) return [0, 0];
    const ring = Math.ceil(index / 6);           // 6 per ring
    const posInRing = ((index - 1) % 6);
    const angle = (posInRing / 6) * 2 * Math.PI;
    const radius = ring * 1.8;                   // ~1.8° per ring
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  };

  const features = [...groups.values()].flatMap(group => {
    const sorted = [...group].sort((a, b) => b.lang.speakers - a.lang.speakers);
    return sorted.map(({ lang: l, lng, lat }, idx) => {
      const [dLng, dLat] = spiralOffset(idx, sorted.length);
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [lng + dLng, lat + dLat] },
        properties: {
          id: l.id,
          name: l.name,
          family: l.family || 'Other',
          speakers: l.speakers,
          status: l.status || 'Unknown',
          nbrCountries: l.nbrCountries,
          iso: l.iso639_3,
          color: languageFamilyColor(l.family),
        },
      };
    });
  });

  map.addSource(LAYER.LANG_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  });

  // Circles — radius scaled logarithmically by speakers
  map.addLayer({
    id: LAYER.LANG_CIRCLE,
    type: 'circle',
    source: LAYER.LANG_SOURCE,
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': [
        'interpolate', ['linear'],
        ['log10', ['max', ['get', 'speakers'], 1]],
        3, 3,    // 1K speakers → 3px
        5, 6,    // 100K → 6px
        6, 10,   // 1M → 10px
        7, 16,   // 10M → 16px
        8, 22,   // 100M → 22px
        9, 30,   // 1B → 30px
      ],
      'circle-opacity': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.75,
        4, 0.85,
        8, 0.5,
      ],
      'circle-stroke-color': '#0f172a',
      'circle-stroke-width': 0.8,
    },
  } as any);

  // Labels
  map.addLayer({
    id: LAYER.LANG_LABEL,
    type: 'symbol',
    source: LAYER.LANG_SOURCE,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': [
        'interpolate', ['linear'], ['zoom'],
        0, 9,
        4, 11,
        8, 13,
      ],
      'text-offset': [0, 1.4],
      'text-anchor': 'top',
      'text-max-width': 8,
      'text-allow-overlap': false,
      'text-ignore-placement': false,
    },
    paint: {
      'text-color': '#e2e8f0',
      'text-halo-color': '#0f172a',
      'text-halo-width': 1.2,
      'text-opacity': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.7,
        3, 0.9,
        8, 0.6,
      ],
    },
  } as any);
}

export function removeLanguageLayers(map: mapboxgl.Map) {
  safeRemoveLayer(map, LAYER.LANG_LABEL);
  safeRemoveLayer(map, LAYER.LANG_CIRCLE);
  safeRemoveSource(map, LAYER.LANG_SOURCE);
}

export function setLanguageVisibility(map: mapboxgl.Map, visible: boolean) {
  const v = visible ? 'visible' : 'none';
  try { if (map.getLayer(LAYER.LANG_CIRCLE)) map.setLayoutProperty(LAYER.LANG_CIRCLE, 'visibility', v); } catch {}
  try { if (map.getLayer(LAYER.LANG_LABEL)) map.setLayoutProperty(LAYER.LANG_LABEL, 'visibility', v); } catch {}
}

// ════════════════════════════════════════════════════════════════════
// 2. RELIGION VISUALIZATION — Choropleth by dominant religion
// ════════════════════════════════════════════════════════════════════

export function addReligionLayers(map: mapboxgl.Map, stats: ReligionStat[]) {
  removeReligionLayers(map);

  if (!map.getSource(COUNTRY_SOURCE)) return;

  // Build match expression: ISO3 → color based on primaryReligion
  const isoKeys = stats.filter(s => s.primaryReligion).map(s => s.countryIso3.toUpperCase());
  if (isoKeys.length === 0) return;

  const matchExpr: any[] = ['match', ISO_EXPR];
  for (const stat of stats) {
    if (!stat.primaryReligion) continue;
    matchExpr.push(stat.countryIso3.toUpperCase(), religionColor(stat.primaryReligion));
  }
  matchExpr.push('rgba(0,0,0,0)'); // fallback: transparent

  const filter: any = ['in', ISO_EXPR, ['literal', isoKeys]];

  map.addLayer({
    id: LAYER.REL_FILL,
    type: 'fill',
    source: COUNTRY_SOURCE,
    'source-layer': COUNTRY_SOURCE_LAYER,
    filter,
    paint: {
      'fill-color': matchExpr as any,
      'fill-opacity': 0.35,
    },
  } as any);

  map.addLayer({
    id: LAYER.REL_BORDER,
    type: 'line',
    source: COUNTRY_SOURCE,
    'source-layer': COUNTRY_SOURCE_LAYER,
    filter,
    paint: {
      'line-color': matchExpr as any,
      'line-width': 1.2,
      'line-opacity': 0.6,
    },
  } as any);
}

export function removeReligionLayers(map: mapboxgl.Map) {
  safeRemoveLayer(map, LAYER.REL_BORDER);
  safeRemoveLayer(map, LAYER.REL_FILL);
}

export function setReligionVisibility(map: mapboxgl.Map, visible: boolean) {
  const v = visible ? 'visible' : 'none';
  try { if (map.getLayer(LAYER.REL_FILL)) map.setLayoutProperty(LAYER.REL_FILL, 'visibility', v); } catch {}
  try { if (map.getLayer(LAYER.REL_BORDER)) map.setLayoutProperty(LAYER.REL_BORDER, 'visibility', v); } catch {}
}

// ════════════════════════════════════════════════════════════════════
// 3. DIASPORA VISUALIZATION — Great-circle arcs + origin markers
// ════════════════════════════════════════════════════════════════════

// Pulse animation timer (to animate origin markers)
let pulseAnimFrame: number | null = null;

export function addDiasporaLayers(
  map: mapboxgl.Map,
  corridors: MigrationCorridor[],
  origins: DiasporaOrigin[],
  countryMap?: CountryMap | null,
) {
  removeDiasporaLayers(map);

  // ── Choropleth: destination-only countries (blue fill) ──
  if (countryMap && map.getSource(COUNTRY_SOURCE)) {
    const originSet = new Set(countryMap.origins.map(o => o.iso3.toUpperCase()));
    const destOnly = countryMap.destinations.filter(d => !originSet.has(d.iso3.toUpperCase()));
    const maxDest = Math.max(...countryMap.destinations.map(d => d.total), 1);
    const destMatchExpr: any[] = ['match', ISO_EXPR];
    for (const d of destOnly) {
      const t = Math.min(d.total / maxDest, 1);
      const r = Math.round(30 + t * 29);
      const g = Math.round(64 + t * 66);
      const b = Math.round(175 + t * 80);
      destMatchExpr.push(d.iso3.toUpperCase(), `rgb(${r},${g},${b})`);
    }
    destMatchExpr.push('rgba(0,0,0,0)');

    if (destOnly.length > 0) {
      map.addLayer({
        id: LAYER.DIA_DEST_FILL,
        type: 'fill',
        source: COUNTRY_SOURCE,
        'source-layer': COUNTRY_SOURCE_LAYER,
        filter: ['in', ISO_EXPR, ['literal', destOnly.map(d => d.iso3.toUpperCase())]],
        paint: {
          'fill-color': destMatchExpr as any,
          'fill-opacity': 0.35,
        },
      } as any);
    }
  }

  // --- Origin markers (circles on the globe for top origin countries) ---
  const originFeatures = origins
    .filter(o => COUNTRY_CENTROIDS[o.iso3])
    .map(o => {
      const [lng, lat] = COUNTRY_CENTROIDS[o.iso3];
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [lng, lat] },
        properties: {
          iso3: o.iso3,
          name: o.name || o.iso3,
          refugees: o.refugees,
          asylumSeekers: o.asylumSeekers,
          total: o.refugees + o.asylumSeekers,
        },
      };
    });

  if (originFeatures.length > 0) {
    map.addSource(LAYER.DIA_ORIGIN_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: originFeatures },
    });

    // Outer pulsing ring
    map.addLayer({
      id: LAYER.DIA_ORIGIN_PULSE,
      type: 'circle',
      source: LAYER.DIA_ORIGIN_SOURCE,
      paint: {
        'circle-color': '#ef4444',
        'circle-radius': [
          'interpolate', ['linear'],
          ['get', 'refugees'],
          10000, 8,
          100000, 14,
          500000, 20,
          1000000, 28,
          3000000, 36,
          6000000, 44,
        ],
        'circle-opacity': 0.15,
        'circle-stroke-color': '#ef4444',
        'circle-stroke-width': 1,
        'circle-stroke-opacity': 0.3,
      },
    } as any);

    // Inner solid circle
    map.addLayer({
      id: LAYER.DIA_ORIGIN_CIRCLE,
      type: 'circle',
      source: LAYER.DIA_ORIGIN_SOURCE,
      paint: {
        'circle-color': [
          'interpolate', ['linear'],
          ['get', 'refugees'],
          100000, '#f87171',
          500000, '#ef4444',
          1000000, '#dc2626',
          3000000, '#b91c1c',
          6000000, '#991b1b',
        ],
        'circle-radius': [
          'interpolate', ['linear'],
          ['get', 'refugees'],
          10000, 4,
          100000, 7,
          500000, 11,
          1000000, 16,
          3000000, 22,
          6000000, 28,
        ],
        'circle-opacity': 0.7,
        'circle-stroke-color': '#fca5a5',
        'circle-stroke-width': 1.5,
      },
    } as any);

    // Origin country labels
    map.addLayer({
      id: LAYER.DIA_ORIGIN_LABEL,
      type: 'symbol',
      source: LAYER.DIA_ORIGIN_SOURCE,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          0, 0,
          2, 9,
          5, 11,
        ],
        'text-offset': [0, 2.2],
        'text-anchor': 'top',
        'text-max-width': 8,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#fca5a5',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1.4,
        'text-opacity': [
          'interpolate', ['linear'], ['zoom'],
          0, 0,
          2, 0.8,
          6, 0.6,
        ],
      },
    } as any);

    // Start pulse animation
    startPulseAnimation(map);
  }

  // --- Destination endpoint markers ---
  const destMap = new Map<string, number>();
  for (const c of corridors) {
    if (COUNTRY_CENTROIDS[c.destinationIso3] && c.refugees > 0) {
      destMap.set(c.destinationIso3, (destMap.get(c.destinationIso3) || 0) + c.refugees);
    }
  }

  const destFeatures = [...destMap.entries()]
    .filter(([iso3]) => !origins.some(o => o.iso3 === iso3)) // avoid overlap with origins
    .map(([iso3, refugees]) => {
      const [lng, lat] = COUNTRY_CENTROIDS[iso3];
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [lng, lat] },
        properties: { iso3, refugees },
      };
    });

  if (destFeatures.length > 0) {
    map.addSource(LAYER.DIA_DEST_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: destFeatures },
    });

    map.addLayer({
      id: LAYER.DIA_DEST_CIRCLE,
      type: 'circle',
      source: LAYER.DIA_DEST_SOURCE,
      paint: {
        'circle-color': '#3b82f6',
        'circle-radius': [
          'interpolate', ['linear'],
          ['get', 'refugees'],
          1000, 2,
          50000, 4,
          200000, 6,
          500000, 9,
          1000000, 12,
          3000000, 16,
        ],
        'circle-opacity': 0.55,
        'circle-stroke-color': '#93c5fd',
        'circle-stroke-width': 1,
      },
    } as any);

    // Destination labels
    map.addLayer({
      id: LAYER.DIA_DEST_LABEL,
      type: 'symbol',
      source: LAYER.DIA_DEST_SOURCE,
      layout: {
        'text-field': ['get', 'iso3'],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 0, 3, 8, 6, 10],
        'text-offset': [0, 1.8],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#93c5fd',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1.2,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0, 3, 0.7, 6, 0.5],
      },
    } as any);
  }

  // --- Build corridor index for filtering ---
  for (const k of Object.keys(corridorDestIndex)) delete corridorDestIndex[k];
  for (const c of corridors) {
    if (c.refugees > 0 && COUNTRY_CENTROIDS[c.originIso3] && COUNTRY_CENTROIDS[c.destinationIso3]) {
      if (!corridorDestIndex[c.originIso3]) corridorDestIndex[c.originIso3] = [];
      corridorDestIndex[c.originIso3].push(c.destinationIso3);
    }
  }

  // --- Arc lines (great-circle curves between origin → top destinations) ---
  const maxRefugees = Math.max(...corridors.map(c => c.refugees), 1);
  const arcFeatures = corridors
    .filter(c =>
      COUNTRY_CENTROIDS[c.originIso3] &&
      COUNTRY_CENTROIDS[c.destinationIso3] &&
      c.refugees > 0
    )
    .map(c => {
      const from = COUNTRY_CENTROIDS[c.originIso3];
      const to = COUNTRY_CENTROIDS[c.destinationIso3];
      const coords = greatCircleArc(from, to, 48);
      const intensity = Math.min(c.refugees / maxRefugees, 1);

      return {
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: coords },
        properties: {
          originIso3: c.originIso3,
          originName: c.originName,
          destinationIso3: c.destinationIso3,
          destinationName: c.destinationName,
          refugees: c.refugees,
          asylumSeekers: c.asylumSeekers,
          intensity,
        },
      };
    });

  if (arcFeatures.length > 0) {
    map.addSource(LAYER.DIA_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: arcFeatures },
    });

    map.addLayer({
      id: LAYER.DIA_ARCS,
      type: 'line',
      source: LAYER.DIA_SOURCE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': [
          'interpolate', ['linear'],
          ['get', 'intensity'],
          0, '#fca5a5',
          0.3, '#ef4444',
          0.7, '#dc2626',
          1, '#991b1b',
        ],
        'line-width': [
          'interpolate', ['linear'],
          ['get', 'refugees'],
          10000, 1,
          100000, 2,
          500000, 3.5,
          1000000, 5,
          3000000, 7,
        ],
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          0, 0.6,
          3, 0.75,
          6, 0.5,
        ],
      },
    } as any);
  }
}

let pulseInterval: ReturnType<typeof setInterval> | null = null;

function startPulseAnimation(map: mapboxgl.Map) {
  stopPulseAnimation();

  // Throttled to ~10fps via setInterval instead of 60fps rAF
  pulseInterval = setInterval(() => {
    if (!map.getLayer(LAYER.DIA_ORIGIN_PULSE)) {
      stopPulseAnimation();
      return;
    }
    const t = (Date.now() % 2000) / 2000;
    const opacity = 0.15 + 0.1 * Math.sin(t * Math.PI * 2);
    try {
      map.setPaintProperty(LAYER.DIA_ORIGIN_PULSE, 'circle-opacity', opacity);
    } catch {
      stopPulseAnimation();
    }
  }, 100);
}

function stopPulseAnimation() {
  if (pulseAnimFrame) { cancelAnimationFrame(pulseAnimFrame); pulseAnimFrame = null; }
  if (pulseInterval) { clearInterval(pulseInterval); pulseInterval = null; }
}

export function removeDiasporaLayers(map: mapboxgl.Map) {
  stopPulseAnimation();
  safeRemoveLayer(map, LAYER.DIA_ORIGIN_FILL);
  safeRemoveLayer(map, LAYER.DIA_DEST_FILL);
  safeRemoveLayer(map, LAYER.DIA_ORIGIN_LABEL);
  safeRemoveLayer(map, LAYER.DIA_DEST_LABEL);
  safeRemoveLayer(map, LAYER.DIA_ARCS);
  safeRemoveSource(map, LAYER.DIA_SOURCE);
  safeRemoveLayer(map, LAYER.DIA_ORIGIN_CIRCLE);
  safeRemoveLayer(map, LAYER.DIA_ORIGIN_PULSE);
  safeRemoveSource(map, LAYER.DIA_ORIGIN_SOURCE);
  safeRemoveLayer(map, LAYER.DIA_DEST_CIRCLE);
  safeRemoveSource(map, LAYER.DIA_DEST_SOURCE);
  for (const k of Object.keys(corridorDestIndex)) delete corridorDestIndex[k];
}

export function setDiasporaVisibility(map: mapboxgl.Map, visible: boolean) {
  const v = visible ? 'visible' : 'none';
  const layers = [
    LAYER.DIA_ORIGIN_FILL, LAYER.DIA_DEST_FILL,
    LAYER.DIA_ARCS,
    LAYER.DIA_ORIGIN_CIRCLE, LAYER.DIA_ORIGIN_PULSE, LAYER.DIA_ORIGIN_LABEL,
    LAYER.DIA_DEST_CIRCLE, LAYER.DIA_DEST_LABEL,
  ];
  for (const id of layers) {
    try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v); } catch {}
  }
  if (visible && !pulseInterval) startPulseAnimation(map);
  if (!visible) stopPulseAnimation();
}

// ════════════════════════════════════════════════════════════════════
// 3b. DIASPORA ISOLATION — filter map to a single origin country
// ════════════════════════════════════════════════════════════════════

/**
 * When iso3 is provided, dims everything except arcs/markers related to that origin.
 * When iso3 is null, resets to show all.
 */
export function filterDiasporaByOrigin(map: mapboxgl.Map, iso3: string | null) {
  try {
    if (!iso3) {
      // ── Reset: show everything ──
      if (map.getLayer(LAYER.DIA_ARCS)) {
        map.setFilter(LAYER.DIA_ARCS, null);
        map.setPaintProperty(LAYER.DIA_ARCS, 'line-opacity', [
          'interpolate', ['linear'], ['zoom'], 0, 0.6, 3, 0.75, 6, 0.5,
        ]);
      }
      if (map.getLayer(LAYER.DIA_ORIGIN_CIRCLE)) {
        map.setFilter(LAYER.DIA_ORIGIN_CIRCLE, null);
        map.setPaintProperty(LAYER.DIA_ORIGIN_CIRCLE, 'circle-opacity', 0.7);
      }
      if (map.getLayer(LAYER.DIA_ORIGIN_PULSE)) {
        map.setFilter(LAYER.DIA_ORIGIN_PULSE, null);
      }
      if (map.getLayer(LAYER.DIA_ORIGIN_LABEL)) {
        map.setFilter(LAYER.DIA_ORIGIN_LABEL, null);
        map.setPaintProperty(LAYER.DIA_ORIGIN_LABEL, 'text-opacity', [
          'interpolate', ['linear'], ['zoom'], 0, 0, 2, 0.8, 6, 0.6,
        ]);
      }
      if (map.getLayer(LAYER.DIA_DEST_CIRCLE)) {
        map.setFilter(LAYER.DIA_DEST_CIRCLE, null);
        map.setPaintProperty(LAYER.DIA_DEST_CIRCLE, 'circle-opacity', 0.5);
      }
      // Restore choropleth fills
      if (map.getLayer(LAYER.DIA_DEST_FILL)) {
        map.setPaintProperty(LAYER.DIA_DEST_FILL, 'fill-opacity', 0.35);
      }
      return;
    }

    // ── Isolate: only show selected origin's corridors ──
    const upper = iso3.toUpperCase();

    // Arcs: only those from this origin
    if (map.getLayer(LAYER.DIA_ARCS)) {
      map.setFilter(LAYER.DIA_ARCS, ['==', ['get', 'originIso3'], upper]);
      map.setPaintProperty(LAYER.DIA_ARCS, 'line-opacity', 0.85);
    }

    // Origin circles: show only the selected one at full opacity
    if (map.getLayer(LAYER.DIA_ORIGIN_CIRCLE)) {
      map.setFilter(LAYER.DIA_ORIGIN_CIRCLE, ['==', ['get', 'iso3'], upper]);
      map.setPaintProperty(LAYER.DIA_ORIGIN_CIRCLE, 'circle-opacity', 0.9);
    }
    if (map.getLayer(LAYER.DIA_ORIGIN_PULSE)) {
      map.setFilter(LAYER.DIA_ORIGIN_PULSE, ['==', ['get', 'iso3'], upper]);
    }
    if (map.getLayer(LAYER.DIA_ORIGIN_LABEL)) {
      map.setFilter(LAYER.DIA_ORIGIN_LABEL, ['==', ['get', 'iso3'], upper]);
      map.setPaintProperty(LAYER.DIA_ORIGIN_LABEL, 'text-opacity', 1);
    }

    // Dim choropleth fill so arcs stand out
    if (map.getLayer(LAYER.DIA_DEST_FILL)) {
      map.setPaintProperty(LAYER.DIA_DEST_FILL, 'fill-opacity', 0.1);
    }

    // Destination circles: only destinations of this origin's corridors
    if (map.getLayer(LAYER.DIA_DEST_CIRCLE)) {
      const destIsos = corridorDestIndex[upper] || [];
      if (destIsos.length > 0) {
        map.setFilter(LAYER.DIA_DEST_CIRCLE, ['in', ['get', 'iso3'], ['literal', destIsos]]);
        map.setPaintProperty(LAYER.DIA_DEST_CIRCLE, 'circle-opacity', 0.8);
      } else {
        map.setFilter(LAYER.DIA_DEST_CIRCLE, ['==', ['get', 'iso3'], '__none__']);
      }
    }
  } catch {}
}

// ════════════════════════════════════════════════════════════════════
// MASTER CLEANUP
// ════════════════════════════════════════════════════════════════════

export function removeAllDemographicLayers(map: mapboxgl.Map) {
  removeLanguageLayers(map);
  removeReligionLayers(map);
  removeDiasporaLayers(map);
}
