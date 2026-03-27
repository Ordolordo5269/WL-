import { getInvolvedISO, getAlliesByFaction } from './country-conflict-mapper';

// ✅ MEJORADO: Interfaces específicas para evitar tipos 'any'
export interface ConflictGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: {
      id: string;
      country: string;
      status: string;
      [key: string]: unknown;
    };
  }>;
}

export interface ConflictData {
  id: string;
  country: string;
  status: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  [key: string]: unknown;
}

// ===== CONSTANTES DE CONFIGURACIÓN =====

// Colores y estilos
const COLORS = {
  CONFLICT_MARKER: '#ff3535', // Núcleo rojo brillante (fallback)
  WAR: '#ef4444', // Rojo para War
  WARM: '#eab308', // Amarillo para Warm
  IMPROVING: '#22c55e', // Verde para Improving
  COUNTRY_FILL: '#4A0000', // Granate más oscuro para países
  COUNTRY_BORDER: '#8B0000', // Borde granate
  MARKER_STROKE: '#ffffff', // Trazo sutil (no se usa en el núcleo estilo referencia)
} as const;

// Expresión para obtener el color según el status
// Maneja tanto 'War'/'Warm'/'Improving' como 'WAR'/'WARM'/'IMPROVING'
const getStatusColorExpression = () => [
  'match',
  ['downcase', ['get', 'status']],
  'war', COLORS.WAR,
  'warm', COLORS.WARM,
  'improving', COLORS.IMPROVING,
  'one_sided', '#a855f7',
  'frozen', '#eab308',
  COLORS.CONFLICT_MARKER // fallback
] as any;

// Dimensiones y radios
const SIZES = {
  CONFLICT_MARKER_RADIUS: 8,
  COUNTRY_BORDER_WIDTH: 2,
  RIPPLE_BASE_RADIUS: 10,
  RIPPLE_SPACING: 6,
  MARKER_STROKE_WIDTH: 1.6,
  GLOW_EXTRA_RADIUS: 10,
} as const;

// Opacidades
const OPACITIES = {
  COUNTRY_FILL: 0.18,
  COUNTRY_BORDER: 0.8,
  RIPPLE_BASE: 0.2,
  RIPPLE_DECREASE: 0.1,
  GLOW_BASE: 0.22,
} as const;

// Configuración de animación
const ANIMATION = {
  ENABLED: false, // Estilo estático tipo referencia
  RIPPLE_COUNT: 0,
  RIPPLE_SPEED: 0.008,
  PULSE_SPEED: 0.0,
} as const;

// IDs de capas y fuentes
const LAYERS = {
  COUNTRY_FILL: 'country-conflict-fill',
  COUNTRY_BORDER: 'country-conflict-border',
  CONFLICT_SOURCE: 'conflict-points',
  CONFLICT_MARKER: 'conflict-marker',
  CONFLICT_GLOW: 'conflict-marker-glow',
  CONFLICT_GLOW_OUTER: 'conflict-marker-glow-outer',
  CONFLICT_CLUSTER: 'conflict-cluster',
  CONFLICT_CLUSTER_COUNT: 'conflict-cluster-count',
  CONFLICT_CLUSTER_GLOW: 'conflict-cluster-glow',
  ALLY_FILL: (faction: string) => `ally-fill-${faction}`,
  ALLY_BORDER: (faction: string) => `ally-border-${faction}`,
} as const;

// Filtro seguro que no coincide con ningún elemento. Evita castear propiedades nulas.
const MATCH_NONE_FILTER: any = ['==', ['literal', 1], 2];

// Variables de animación (estado global)
let animationId: number | null = null;
let ripplePhase = 0;
let pulsePhase = 0;

export const ConflictVisualization = {
  /**
   * Agrega capas de visualización de conflictos con animación de ondas minimalista
   */
  addLayers(map: mapboxgl.Map, countrySource = 'country-boundaries', conflictGeoJSON: ConflictGeoJSON | null = null) {
    // Países en conflicto (relleno) - usando filter en lugar de feature-state
    if (!map.getLayer(LAYERS.COUNTRY_FILL)) {
      map.addLayer({
        id: LAYERS.COUNTRY_FILL,
        type: 'fill',
        source: countrySource,
        'source-layer': 'country_boundaries',
        filter: MATCH_NONE_FILTER, // Inicialmente oculto
        paint: {
          'fill-color': COLORS.COUNTRY_FILL,
          'fill-opacity': OPACITIES.COUNTRY_FILL
        }
      });
    }

    // Países en conflicto (borde) - usando filter
    if (!map.getLayer(LAYERS.COUNTRY_BORDER)) {
      map.addLayer({
        id: LAYERS.COUNTRY_BORDER,
        type: 'line',
        source: countrySource,
        'source-layer': 'country_boundaries',
        filter: MATCH_NONE_FILTER, // Inicialmente oculto
        paint: {
          'line-color': COLORS.COUNTRY_BORDER,
          'line-width': SIZES.COUNTRY_BORDER_WIDTH,
          'line-opacity': OPACITIES.COUNTRY_BORDER
        }
      });
    }

    // Capas para aliados - crear para posibles facciones (e.g., faction1, faction2)
    ['faction1', 'faction2'].forEach((faction) => {
      const fillId = LAYERS.ALLY_FILL(faction);
      const borderId = LAYERS.ALLY_BORDER(faction);

      if (!map.getLayer(fillId)) {
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: countrySource,
          'source-layer': 'country_boundaries',
          filter: MATCH_NONE_FILTER,
          paint: {
            'fill-color': '#000000', // Placeholder
            'fill-opacity': OPACITIES.COUNTRY_FILL
          }
        });
      }

      if (!map.getLayer(borderId)) {
        map.addLayer({
          id: borderId,
          type: 'line',
          source: countrySource,
          'source-layer': 'country_boundaries',
          filter: MATCH_NONE_FILTER,
          paint: {
            'line-color': '#000000', // Placeholder
            'line-width': SIZES.COUNTRY_BORDER_WIDTH,
            'line-opacity': OPACITIES.COUNTRY_BORDER
          }
        });
      }
    });

    // Asegurar orden de capas
    try {
      if (map.getLayer('country-selected')) map.moveLayer(LAYERS.COUNTRY_FILL, 'country-selected');
      if (map.getLayer('country-selected')) map.moveLayer(LAYERS.COUNTRY_BORDER, 'country-selected');
    } catch { /* ignore if layers missing */ }
  },

  /**
   * Nueva función para actualizar el resaltado de países usando filtros basados en ISO codes
   */
  updateCountryHighlights(map: mapboxgl.Map, isoCodes: string[]) {
    if (!map.isStyleLoaded()) {
      setTimeout(() => this.updateCountryHighlights(map, isoCodes), 100);
      return;
    }

    try {
      const filter = isoCodes.length > 0 
        ? ['in', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ''], ['literal', isoCodes]]
        : MATCH_NONE_FILTER;

      if (map.getLayer(LAYERS.COUNTRY_FILL)) {
        map.setFilter(LAYERS.COUNTRY_FILL, filter);
      }
      if (map.getLayer(LAYERS.COUNTRY_BORDER)) {
        map.setFilter(LAYERS.COUNTRY_BORDER, filter);
      }

    } catch {
      console.error('[ERROR] Failed to update country highlights');
    }
  },

  /**
   * Build shared GeoJSON from conflicts (reused across layer modes)
   */
  _buildConflictGeoJSON(conflicts: ConflictData[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: conflicts
        .filter(c => c.coordinates?.lat && c.coordinates?.lng)
        .map(c => {
          const deaths = Array.isArray((c as any).casualties)
            ? ((c as any).casualties as any[]).reduce((s: number, x: any) => s + (x.total || 0), 0)
            : 0;
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [c.coordinates.lng, c.coordinates.lat] },
            properties: {
              id: c.id,
              name: (c as any).name || c.country,
              status: c.status,
              deaths,
              typeOfViolence: (c as any).typeOfViolence ?? 1,
              radius: Math.max(4, Math.min(28, 4 + Math.log1p(deaths) * 2.8)),
            },
          };
        }),
    };
  },

  /**
   * Ensure the shared source exists or update it
   */
  _ensureSource(map: mapboxgl.Map, conflicts: ConflictData[]) {
    const sourceId = 'ucdp-conflict-points';
    const geojson = this._buildConflictGeoJSON(conflicts);
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojson });
    }
    return sourceId;
  },

  /**
   * Conflict-level markers — one dot per conflict, distinct style per violence type.
   * Fade out at zoom >= 6 as individual event dots take over.
   */
  addSimpleMarkers(map: mapboxgl.Map, conflicts: ConflictData[]) {
    const sourceId = this._ensureSource(map, conflicts);

    const sizeByDeaths = (base: number, scale: number): any => [
      'interpolate', ['linear'], ['get', 'deaths'],
      0, base, 100, base + scale, 1000, base + scale * 2, 10000, base + scale * 3.5,
    ];

    // Conflict markers fade out at high zoom (events take over)
    const fadeOpacity = (lo: number, hi: number): any => [
      'interpolate', ['linear'], ['zoom'],
      0, lo, 4, hi, 7, hi * 0.3,
    ];

    // ── Type 1: State-based — solid filled red circles ──
    if (!map.getLayer('ucdp-t1-glow')) {
      map.addLayer({ id: 'ucdp-t1-glow', type: 'circle', source: sourceId,
        filter: ['==', ['get', 'typeOfViolence'], 1],
        paint: {
          'circle-radius': sizeByDeaths(8, 5), 'circle-color': '#ef4444',
          'circle-opacity': fadeOpacity(0.08, 0.15), 'circle-blur': 1,
        },
      });
    }
    if (!map.getLayer('ucdp-t1-dot')) {
      map.addLayer({ id: 'ucdp-t1-dot', type: 'circle', source: sourceId,
        filter: ['==', ['get', 'typeOfViolence'], 1],
        paint: {
          'circle-radius': sizeByDeaths(3, 2), 'circle-color': '#ef4444',
          'circle-opacity': fadeOpacity(0.7, 0.85),
          'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.35)',
        },
      });
    }

    // ── Type 2: Non-state — hollow orange rings ──
    if (!map.getLayer('ucdp-t2-ring')) {
      map.addLayer({ id: 'ucdp-t2-ring', type: 'circle', source: sourceId,
        filter: ['==', ['get', 'typeOfViolence'], 2],
        paint: {
          'circle-radius': sizeByDeaths(4, 2), 'circle-color': 'transparent',
          'circle-stroke-width': ['interpolate', ['linear'], ['get', 'deaths'], 0, 1.2, 100, 1.8, 1000, 2.5],
          'circle-stroke-color': '#f97316', 'circle-stroke-opacity': fadeOpacity(0.6, 0.8),
        },
      });
    }

    // ── Type 3: One-sided — purple glow ──
    if (!map.getLayer('ucdp-t3-glow')) {
      map.addLayer({ id: 'ucdp-t3-glow', type: 'circle', source: sourceId,
        filter: ['==', ['get', 'typeOfViolence'], 3],
        paint: {
          'circle-radius': sizeByDeaths(10, 6), 'circle-color': '#a855f7',
          'circle-opacity': fadeOpacity(0.1, 0.2), 'circle-blur': 0.9,
        },
      });
    }
    if (!map.getLayer('ucdp-t3-core')) {
      map.addLayer({ id: 'ucdp-t3-core', type: 'circle', source: sourceId,
        filter: ['==', ['get', 'typeOfViolence'], 3],
        paint: {
          'circle-radius': sizeByDeaths(2, 1.2), 'circle-color': '#c084fc',
          'circle-opacity': fadeOpacity(0.7, 0.9),
        },
      });
    }
  },

  removeSimpleMarkers(map: mapboxgl.Map) {
    ['ucdp-t1-glow', 'ucdp-t1-dot', 'ucdp-t2-ring', 'ucdp-t3-glow', 'ucdp-t3-core'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
  },

  /**
   * Load individual UCDP events from /api/ucdp/geo as a detail layer.
   * Visible at zoom >= 4, fades in as you zoom into a region.
   */
  async loadEventDetailLayer(map: mapboxgl.Map, apiBase: string) {
    const sourceId = 'ucdp-event-detail';
    if (map.getSource(sourceId)) return;

    try {
      const res = await fetch(`${apiBase}/api/ucdp/geo`);
      if (!res.ok) return;
      const events: { latitude: number; longitude: number; bestEstimate: number; typeOfViolence: number }[] = await res.json();

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: events.map(e => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [e.longitude, e.latitude] },
          properties: { deaths: e.bestEstimate, type: e.typeOfViolence },
        })),
      };

      map.addSource(sourceId, { type: 'geojson', data: geojson });

      const typeColor: any = ['match', ['get', 'type'], 1, '#ef4444', 2, '#f97316', 3, '#c084fc', '#6b7280'];

      map.addLayer({
        id: 'ucdp-evt-dot',
        type: 'circle',
        source: sourceId,
        minzoom: 4,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            4, ['interpolate', ['linear'], ['get', 'deaths'], 0, 0.8, 10, 1.2, 100, 2],
            8, ['interpolate', ['linear'], ['get', 'deaths'], 0, 2, 10, 3, 100, 5, 1000, 8],
          ],
          'circle-color': typeColor,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.12, 6, 0.4, 8, 0.65],
          'circle-stroke-width': 0,
        },
      });
    } catch { /* detail layer is optional */ }
  },

  removeEventDetailLayer(map: mapboxgl.Map) {
    if (map.getLayer('ucdp-evt-dot')) map.removeLayer('ucdp-evt-dot');
    if (map.getSource('ucdp-event-detail')) map.removeSource('ucdp-event-detail');
  },

  /**
   * Mapbox GL heatmap layer using deaths as weight.
   */
  /**
   * Subtle heatmap that blends with WorldLore's dark globe aesthetic.
   * Deep crimson/ember tones — feels like the earth is smoldering.
   */
  addHeatmapLayer(map: mapboxgl.Map, conflicts: ConflictData[]) {
    const sourceId = this._ensureSource(map, conflicts);
    const layerId = 'ucdp-heatmap';

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
          'heatmap-weight': [
            'interpolate', ['linear'], ['get', 'deaths'],
            0, 0.05,
            25, 0.15,
            100, 0.35,
            500, 0.6,
            2000, 0.85,
            10000, 1,
          ],
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            0, 0.6,
            3, 1,
            6, 1.8,
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 12,
            3, 25,
            6, 45,
            10, 65,
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,    'rgba(0, 0, 0, 0)',
            0.05, 'rgba(80, 10, 20, 0.15)',
            0.15, 'rgba(120, 15, 25, 0.3)',
            0.3,  'rgba(160, 30, 30, 0.45)',
            0.5,  'rgba(200, 50, 30, 0.55)',
            0.7,  'rgba(230, 80, 30, 0.65)',
            0.85, 'rgba(245, 130, 50, 0.7)',
            1,    'rgba(255, 180, 80, 0.75)',
          ],
          'heatmap-opacity': [
            'interpolate', ['linear'], ['zoom'],
            0, 0.7,
            6, 0.55,
            10, 0.4,
          ],
        },
      });
    }
  },

  removeHeatmapLayer(map: mapboxgl.Map) {
    if (map.getLayer('ucdp-heatmap')) map.removeLayer('ucdp-heatmap');
  },

  /**
   * Switch between map layer modes: 'markers' | 'bubbles' | 'heatmap'
   */
  setMapMode(map: mapboxgl.Map, mode: string, conflicts: ConflictData[]) {
    // Remove all modes first
    this.removeSimpleMarkers(map);
    this.removeConflictBubbles(map);
    this.removeHeatmapLayer(map);

    switch (mode) {
      case 'markers':
        this.addSimpleMarkers(map, conflicts);
        break;
      case 'bubbles':
        this.addConflictBubbles(map, conflicts);
        break;
      case 'heatmap':
        this.addHeatmapLayer(map, conflicts);
        break;
    }
  },

  /**
   * Remove all UCDP point layers (any mode)
   */
  removeAllPointLayers(map: mapboxgl.Map) {
    this.removeSimpleMarkers(map);
    this.removeConflictBubbles(map);
    this.removeHeatmapLayer(map);
    this.removeEventDetailLayer(map);
    if (map.getSource('ucdp-conflict-points')) map.removeSource('ucdp-conflict-points');
  },

  /**
   * Add/update UCDP conflict bubble markers on the map.
   * Bubble radius ∝ log(deaths), color = status.
   */
  addConflictBubbles(map: mapboxgl.Map, conflicts: ConflictData[]) {
    const sourceId = 'ucdp-conflict-bubbles';
    const layerGlow = 'ucdp-bubble-glow';
    const layerCircle = 'ucdp-bubble-circle';
    const layerLabel = 'ucdp-bubble-label';

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: conflicts
        .filter(c => c.coordinates?.lat && c.coordinates?.lng)
        .map(c => {
          const deaths = Array.isArray((c as any).casualties)
            ? ((c as any).casualties as any[]).reduce((s: number, x: any) => s + (x.total || 0), 0)
            : 0;
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [c.coordinates.lng, c.coordinates.lat] },
            properties: {
              id: c.id,
              name: (c as any).name || c.country,
              status: c.status,
              deaths,
              // log scale for radius: min 4px, max 28px
              radius: Math.max(4, Math.min(28, 4 + Math.log1p(deaths) * 2.8)),
            },
          };
        }),
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojson });

      // Glow layer
      map.addLayer({
        id: layerGlow,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': ['*', ['get', 'radius'], 1.8],
          'circle-color': getStatusColorExpression(),
          'circle-opacity': 0.12,
          'circle-blur': 1,
        },
      });

      // Main bubble
      map.addLayer({
        id: layerCircle,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': getStatusColorExpression(),
          'circle-opacity': 0.7,
          'circle-stroke-width': 1.2,
          'circle-stroke-color': 'rgba(255,255,255,0.4)',
        },
      });

      // Death count label
      map.addLayer({
        id: layerLabel,
        type: 'symbol',
        source: sourceId,
        filter: ['>', ['get', 'deaths'], 50],
        layout: {
          'text-field': ['get', 'deaths'],
          'text-size': 9,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1,
        },
      });
    }
  },

  /**
   * Remove bubble layers
   */
  removeConflictBubbles(map: mapboxgl.Map) {
    ['ucdp-bubble-label', 'ucdp-bubble-circle', 'ucdp-bubble-glow'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('ucdp-conflict-bubbles')) map.removeSource('ucdp-conflict-bubbles');
  },

  /**
   * Highlight countries by conflict intensity (death count gradient)
   * Uses fill-color interpolated by total deaths in that country.
   */
  addCountryHeatmap(map: mapboxgl.Map, conflicts: ConflictData[], countrySource = 'country-boundaries') {
    const layerId = 'ucdp-country-heatmap';
    const borderLayerId = 'ucdp-country-heatmap-border';

    // Aggregate deaths per ISO
    const deathsByISO = new Map<string, number>();
    for (const c of conflicts) {
      const deaths = Array.isArray((c as any).casualties)
        ? ((c as any).casualties as any[]).reduce((s: number, x: any) => s + (x.total || 0), 0)
        : 0;
      const isos = (c as any).involvedISO as string[] | undefined;
      if (isos) {
        for (const iso of isos) {
          deathsByISO.set(iso, (deathsByISO.get(iso) || 0) + deaths);
        }
      }
    }

    if (deathsByISO.size === 0) return;

    const allISOs = [...deathsByISO.keys()];
    const isoFilter = ['in', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ''], ['literal', allISOs]];

    // Build match expression for fill-color
    const colorEntries: any[] = [];
    for (const [iso, deaths] of deathsByISO) {
      let fillColor: string;
      if (deaths >= 1000) fillColor = 'rgba(140, 20, 20, 0.2)';
      else if (deaths >= 100) fillColor = 'rgba(160, 30, 25, 0.14)';
      else if (deaths >= 10) fillColor = 'rgba(180, 50, 30, 0.09)';
      else fillColor = 'rgba(150, 60, 40, 0.05)';
      colorEntries.push(iso, fillColor);
    }

    const colorExpr = ['match', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ''], ...colorEntries, 'rgba(0,0,0,0)'] as any;

    if (map.getLayer(layerId)) {
      map.setFilter(layerId, isoFilter);
      map.setPaintProperty(layerId, 'fill-color', colorExpr);
    } else {
      // Insert before conflict fill layer to keep proper z-order
      const beforeLayer = map.getLayer(LAYERS.COUNTRY_FILL) ? LAYERS.COUNTRY_FILL : undefined;

      map.addLayer({
        id: layerId,
        type: 'fill',
        source: countrySource,
        'source-layer': 'country_boundaries',
        filter: isoFilter,
        paint: { 'fill-color': colorExpr },
      }, beforeLayer);

      map.addLayer({
        id: borderLayerId,
        type: 'line',
        source: countrySource,
        'source-layer': 'country_boundaries',
        filter: isoFilter,
        paint: {
          'line-color': 'rgba(160, 40, 30, 0.2)',
          'line-width': 0.6,
        },
      }, beforeLayer);
    }
  },

  removeCountryHeatmap(map: mapboxgl.Map) {
    ['ucdp-country-heatmap-border', 'ucdp-country-heatmap'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
  },

  /**
   * Actualiza los datos de los marcadores de conflicto (deshabilitado — puntos eliminados)
   */
  updateConflictMarkers(_map: mapboxgl.Map, _conflictGeoJSON: ConflictGeoJSON) {
    // No-op: legacy
  },

  /**
   * Controla la visibilidad de los marcadores de conflicto (deshabilitado — puntos eliminados)
   */
  setConflictMarkersVisibility(_map: mapboxgl.Map, _visible: boolean) {
    // No-op: legacy
  },

  /**
   * Actualiza la visualización completa basada en el conflicto seleccionado
   */
  updateVisualization(map: mapboxgl.Map, selectedConflictId: string | null, conflicts: ConflictData[]) {
    let isoCodes = selectedConflictId ? getInvolvedISO(selectedConflictId, conflicts) : [];

    if (selectedConflictId === 'russia-ukraine-war') {
      isoCodes = isoCodes.filter(iso => iso !== 'UKR');
    }

    this.updateCountryHighlights(map, isoCodes);

    // Actualizar aliados
    let factions: string[] = [];
    if (selectedConflictId) {
      const allies = getAlliesByFaction(selectedConflictId, conflicts);
      factions = Object.keys(allies);
      factions.forEach((faction, index) => {
        if (index >= 2) return;
        const { isoCodes: allyISO, color } = allies[faction];
        const fillId = LAYERS.ALLY_FILL(`faction${index + 1}`);
        const borderId = LAYERS.ALLY_BORDER(`faction${index + 1}`);

        const filter = allyISO?.length > 0 
          ? ['in', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ''], ['literal', allyISO]]
          : MATCH_NONE_FILTER;

        if (map.getLayer(fillId)) {
          map.setFilter(fillId, filter);
          map.setPaintProperty(fillId, 'fill-color', color);
        }
        if (map.getLayer(borderId)) {
          map.setFilter(borderId, filter);
          map.setPaintProperty(borderId, 'line-color', color);
        }
      });
    }

    // Hide all ally layers if no selection or unused
    for (let i = 0; i < 2; i++) {
      const fillId = LAYERS.ALLY_FILL(`faction${i + 1}`);
      const borderId = LAYERS.ALLY_BORDER(`faction${i + 1}`);
      if (i >= factions.length) {
        if (map.getLayer(fillId)) map.setFilter(fillId, MATCH_NONE_FILTER);
        if (map.getLayer(borderId)) map.setFilter(borderId, MATCH_NONE_FILTER);
      }
    }

    if (selectedConflictId === 'russia-ukraine-war') {
      this.loadUkraineRealTimeLayers(map);
    } else {
      this.removeUkraineLayers(map);
    }
  },

  /**
   * Limpia capas y animaciones
   */
  cleanup(map: mapboxgl.Map) {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    // Limpiar capas principales
    [
      LAYERS.COUNTRY_FILL,
      LAYERS.COUNTRY_BORDER,
      LAYERS.CONFLICT_MARKER,
      LAYERS.CONFLICT_GLOW,
      LAYERS.CONFLICT_GLOW_OUTER,
      LAYERS.CONFLICT_CLUSTER,
      LAYERS.CONFLICT_CLUSTER_COUNT,
      LAYERS.CONFLICT_CLUSTER_GLOW
    ].forEach(layer => {
      if (map.getLayer(layer)) map.removeLayer(layer);
    });
    
    // Limpiar capas de ondas minimalistas
    for (let i = 0; i < ANIMATION.RIPPLE_COUNT; i++) {
      const rippleLayerId = `conflict-ripple-${i}`;
      if (map.getLayer(rippleLayerId)) map.removeLayer(rippleLayerId);
    }

    // Limpiar capas de aliados
    ['faction1', 'faction2'].forEach(faction => {
      [LAYERS.ALLY_FILL(faction), LAYERS.ALLY_BORDER(faction)].forEach(layer => {
        if (map.getLayer(layer)) map.removeLayer(layer);
      });
    });
    
    if (map.getSource(LAYERS.CONFLICT_SOURCE)) map.removeSource(LAYERS.CONFLICT_SOURCE);
  },

  /**
   * Animación de ondas minimalista para los marcadores de conflicto
   */
  startRippleAnimation(map: mapboxgl.Map) {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = () => {
      ripplePhase = (ripplePhase + ANIMATION.RIPPLE_SPEED) % (Math.PI * 2);
      pulsePhase = (pulsePhase + ANIMATION.PULSE_SPEED) % (Math.PI * 2);
      
      try {
        // Animar el marcador principal con efecto de pulsación
        if (map.getLayer(LAYERS.CONFLICT_MARKER)) {
          const pulseRadius = SIZES.CONFLICT_MARKER_RADIUS + Math.sin(pulsePhase) * 1.5;
          const pulseOpacity = 0.85 + Math.sin(pulsePhase) * 0.15;
          
          map.setPaintProperty(LAYERS.CONFLICT_MARKER, 'circle-radius', pulseRadius);
          map.setPaintProperty(LAYERS.CONFLICT_MARKER, 'circle-opacity', pulseOpacity);
        }

        // Respiración suave del resplandor
        if (map.getLayer(LAYERS.CONFLICT_GLOW)) {
          const glowRadius = SIZES.CONFLICT_MARKER_RADIUS + SIZES.GLOW_EXTRA_RADIUS + Math.sin(pulsePhase) * 2;
          const glowOpacity = OPACITIES.GLOW_BASE + Math.sin(pulsePhase) * 0.05;
          map.setPaintProperty(LAYERS.CONFLICT_GLOW, 'circle-radius', glowRadius);
          map.setPaintProperty(LAYERS.CONFLICT_GLOW, 'circle-opacity', Math.max(0, glowOpacity));
        }
        
        // Animar cada capa de onda con efecto minimalista
        for (let i = 0; i < ANIMATION.RIPPLE_COUNT; i++) {
          const rippleLayerId = `conflict-ripple-${i}`;
          if (map.getLayer(rippleLayerId)) {
            // Fase escalonada para efecto sutil
            const wavePhase = (ripplePhase + (i * Math.PI / ANIMATION.RIPPLE_COUNT)) % (Math.PI * 2);
            
            // Efecto minimalista: expansión más sutil
            const waveRadius = SIZES.RIPPLE_BASE_RADIUS + (i * SIZES.RIPPLE_SPACING) + Math.sin(wavePhase) * 2.2;
            const waveOpacity = (0.14 - (i * 0.045)) * (0.6 + Math.sin(wavePhase) * 0.35);
            
            map.setPaintProperty(rippleLayerId, 'circle-radius', waveRadius);
            map.setPaintProperty(rippleLayerId, 'circle-opacity', Math.max(0, waveOpacity));
          }
        }
      } catch {
        // Ignorar errores si las capas no existen
      }
      
      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    if (!prefersReducedMotion) animate();
  },

  loadUkraineRealTimeLayers(map: mapboxgl.Map) {
    // Import and use the enhanced Ukraine API service
    import('../ukraine-api').then(({ UkraineAPIService }) => {
      UkraineAPIService.loadUkraineDataWithFeedback(map as any);
    }).catch(error => {
      console.error('Failed to load Ukraine API service:', error);
    });
  },

  removeUkraineLayers(map: mapboxgl.Map) {
    // Import and use the enhanced Ukraine API service
    import('../ukraine-api').then(({ UkraineAPIService }) => {
      UkraineAPIService.removeUkraineLayers(map as any);
      UkraineAPIService.stopAutoRefresh();
    }).catch(error => {
      console.error('Failed to load Ukraine API service:', error);
    });
  }
}; 