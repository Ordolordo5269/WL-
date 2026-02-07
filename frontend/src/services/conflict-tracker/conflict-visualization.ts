import mapboxgl from 'mapbox-gl';
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
      if (map.getLayer(LAYERS.CONFLICT_MARKER)) map.moveLayer(LAYERS.CONFLICT_MARKER);
    } catch { /* ignore if layers missing */ }

    // Marcadores de conflicto principales
    if (conflictGeoJSON && !map.getSource(LAYERS.CONFLICT_SOURCE)) {
      map.addSource(LAYERS.CONFLICT_SOURCE, {
        type: 'geojson',
        data: conflictGeoJSON,
        cluster: false // Desactivado: mostrar cada conflicto individualmente
      });
    }

    // Capa de resplandor sutil detrás del marcador
    if (conflictGeoJSON && !map.getLayer(LAYERS.CONFLICT_GLOW)) {
      map.addLayer({
        id: LAYERS.CONFLICT_GLOW,
        type: 'circle',
        source: LAYERS.CONFLICT_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 14,
            20, 22
          ],
          'circle-color': getStatusColorExpression(),
          'circle-opacity': 0.22,
          'circle-blur': 0.9,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport'
        }
      });
    }

    if (conflictGeoJSON && !map.getLayer(LAYERS.CONFLICT_GLOW_OUTER)) {
      map.addLayer({
        id: LAYERS.CONFLICT_GLOW_OUTER,
        type: 'circle',
        source: LAYERS.CONFLICT_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 22,
            20, 30
          ],
          'circle-color': getStatusColorExpression(),
          'circle-opacity': 0.12,
          'circle-blur': 1.2,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport'
        }
      });
    }

    if (conflictGeoJSON && !map.getLayer(LAYERS.CONFLICT_MARKER)) {
      map.addLayer({
        id: LAYERS.CONFLICT_MARKER,
        type: 'circle',
        source: LAYERS.CONFLICT_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          // Núcleo brillante (más pequeño que antes)
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 5,
            20, 8
          ],
          'circle-color': getStatusColorExpression(),
          'circle-opacity': 1,
          'circle-blur': 0.0,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport'
        }
      });
    }

    // Crear ondas minimalistas
    for (let i = 0; i < ANIMATION.RIPPLE_COUNT; i++) {
      const rippleLayerId = `conflict-ripple-${i}`;
      if (conflictGeoJSON && !map.getLayer(rippleLayerId)) {
        map.addLayer({
          id: rippleLayerId,
          type: 'circle',
          source: LAYERS.CONFLICT_SOURCE,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': SIZES.RIPPLE_BASE_RADIUS + (i * SIZES.RIPPLE_SPACING),
            'circle-color': getStatusColorExpression(),
            'circle-opacity': OPACITIES.RIPPLE_BASE - (i * OPACITIES.RIPPLE_DECREASE),
            'circle-pitch-alignment': 'viewport',
            'circle-pitch-scale': 'viewport'
          }
        });
      }
    }

    // Clusters: brillo + conteo
    if (conflictGeoJSON && !map.getLayer(LAYERS.CONFLICT_CLUSTER_GLOW)) {
      map.addLayer({
        id: LAYERS.CONFLICT_CLUSTER_GLOW,
        type: 'circle',
        source: LAYERS.CONFLICT_SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': getStatusColorExpression(),
          'circle-radius': [
            'step', ['get', 'point_count'],
            22, 10, 28, 25, 34
          ],
          'circle-opacity': 0.22,
          'circle-blur': 0.95
        }
      });
    }
    if (conflictGeoJSON && !map.getLayer(LAYERS.CONFLICT_CLUSTER)) {
      map.addLayer({
        id: LAYERS.CONFLICT_CLUSTER,
        type: 'circle',
        source: LAYERS.CONFLICT_SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': getStatusColorExpression(),
          'circle-radius': [
            'step', ['get', 'point_count'],
            10, 10, 12, 25, 14
          ],
          'circle-opacity': 1
        }
      });
    }
    if (conflictGeoJSON && !map.getLayer(LAYERS.CONFLICT_CLUSTER_COUNT)) {
      map.addLayer({
        id: LAYERS.CONFLICT_CLUSTER_COUNT,
        type: 'symbol',
        source: LAYERS.CONFLICT_SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': getStatusColorExpression(),
          'text-halo-width': 1.2
        }
      });
    }

    // Estilo de referencia es mayormente estático; animación opcional
    if (ANIMATION.ENABLED) this.startRippleAnimation(map);
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

      console.log('[DEBUG] Updated country highlights with ISO:', isoCodes);
    } catch {
      console.error('[ERROR] Failed to update country highlights');
    }
  },

  /**
   * Actualiza los datos de los marcadores de conflicto
   */
  updateConflictMarkers(map: mapboxgl.Map, conflictGeoJSON: ConflictGeoJSON) {
    const source = map.getSource(LAYERS.CONFLICT_SOURCE) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(conflictGeoJSON);
    }
  },

  /**
   * Controla la visibilidad de los marcadores de conflicto
   */
  setConflictMarkersVisibility(map: mapboxgl.Map, visible: boolean) {
    try {
      if (map.getLayer(LAYERS.CONFLICT_MARKER)) {
        map.setLayoutProperty(LAYERS.CONFLICT_MARKER, 'visibility', visible ? 'visible' : 'none');
      }
      if (map.getLayer(LAYERS.CONFLICT_GLOW)) {
        map.setLayoutProperty(LAYERS.CONFLICT_GLOW, 'visibility', visible ? 'visible' : 'none');
      }
      if (map.getLayer(LAYERS.CONFLICT_GLOW_OUTER)) {
        map.setLayoutProperty(LAYERS.CONFLICT_GLOW_OUTER, 'visibility', visible ? 'visible' : 'none');
      }
      if (map.getLayer(LAYERS.CONFLICT_CLUSTER)) {
        map.setLayoutProperty(LAYERS.CONFLICT_CLUSTER, 'visibility', visible ? 'visible' : 'none');
      }
      if (map.getLayer(LAYERS.CONFLICT_CLUSTER_COUNT)) {
        map.setLayoutProperty(LAYERS.CONFLICT_CLUSTER_COUNT, 'visibility', visible ? 'visible' : 'none');
      }
      if (map.getLayer(LAYERS.CONFLICT_CLUSTER_GLOW)) {
        map.setLayoutProperty(LAYERS.CONFLICT_CLUSTER_GLOW, 'visibility', visible ? 'visible' : 'none');
      }
      
      // Controlar visibilidad de las ondas minimalistas
      for (let i = 0; i < ANIMATION.RIPPLE_COUNT; i++) {
        const rippleLayerId = `conflict-ripple-${i}`;
        if (map.getLayer(rippleLayerId)) {
          map.setLayoutProperty(rippleLayerId, 'visibility', visible ? 'visible' : 'none');
        }
      }
    } catch {
      console.error('[ERROR] Failed to set marker visibility');
    }
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

    // Controlar visibilidad de marcadores
    const shouldShowMarkers = !selectedConflictId;
    this.setConflictMarkersVisibility(map, shouldShowMarkers);
    
    if (selectedConflictId === 'russia-ukraine-war') {
      this.loadUkraineRealTimeLayers(map);
    } else {
      this.removeUkraineLayers(map);
    }

    console.log('[DEBUG] Updated visualization - selectedConflictId:', selectedConflictId, 'showMarkers:', shouldShowMarkers, 'isoCodes:', isoCodes);
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
      UkraineAPIService.loadUkraineDataWithFeedback(map);
    }).catch(error => {
      console.error('Failed to load Ukraine API service:', error);
    });
  },

  removeUkraineLayers(map: mapboxgl.Map) {
    // Import and use the enhanced Ukraine API service
    import('../ukraine-api').then(({ UkraineAPIService }) => {
      UkraineAPIService.removeUkraineLayers(map);
      UkraineAPIService.stopAutoRefresh();
    }).catch(error => {
      console.error('Failed to load Ukraine API service:', error);
    });
  }
}; 