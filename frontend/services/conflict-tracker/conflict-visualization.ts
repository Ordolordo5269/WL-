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
  CONFLICT_MARKER: '#8B0000', // Rojo granate más oscuro
  COUNTRY_FILL: '#4A0000', // Granate más oscuro para países
  COUNTRY_BORDER: '#8B0000', // Borde granate
} as const;

// Dimensiones y radios
const SIZES = {
  CONFLICT_MARKER_RADIUS: 8,
  COUNTRY_BORDER_WIDTH: 2,
  RIPPLE_BASE_RADIUS: 10,
  RIPPLE_SPACING: 6,
} as const;

// Opacidades
const OPACITIES = {
  COUNTRY_FILL: 0.18,
  COUNTRY_BORDER: 0.8,
  RIPPLE_BASE: 0.2,
  RIPPLE_DECREASE: 0.1,
} as const;

// Configuración de animación
const ANIMATION = {
  RIPPLE_COUNT: 2,
  RIPPLE_SPEED: 0.02,
  PULSE_SPEED: 0.05,
} as const;

// IDs de capas y fuentes
const LAYERS = {
  COUNTRY_FILL: 'country-conflict-fill',
  COUNTRY_BORDER: 'country-conflict-border',
  CONFLICT_SOURCE: 'conflict-points',
  CONFLICT_MARKER: 'conflict-marker',
  ALLY_FILL: (faction: string) => `ally-fill-${faction}`,
  ALLY_BORDER: (faction: string) => `ally-border-${faction}`,
} as const;

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
        filter: ['boolean', false], // Inicialmente oculto
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
        filter: ['boolean', false], // Inicialmente oculto
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
          filter: ['==', ['string', ['get', 'iso_3166_1_alpha_3']], 'NON_EXISTENT'],
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
          filter: ['==', ['string', ['get', 'iso_3166_1_alpha_3']], 'NON_EXISTENT'],
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
        data: conflictGeoJSON
      });
    }

    if (conflictGeoJSON && !map.getLayer(LAYERS.CONFLICT_MARKER)) {
      map.addLayer({
        id: LAYERS.CONFLICT_MARKER,
        type: 'circle',
        source: LAYERS.CONFLICT_SOURCE,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, SIZES.CONFLICT_MARKER_RADIUS,
            20, SIZES.CONFLICT_MARKER_RADIUS + 4
          ],
          'circle-color': COLORS.CONFLICT_MARKER,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.8,
            20, 1
          ]
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
          paint: {
            'circle-radius': SIZES.RIPPLE_BASE_RADIUS + (i * SIZES.RIPPLE_SPACING),
            'circle-color': COLORS.CONFLICT_MARKER,
            'circle-opacity': OPACITIES.RIPPLE_BASE - (i * OPACITIES.RIPPLE_DECREASE)
          }
        });
      }
    }

    // Iniciar animación de ondas minimalista
    this.startRippleAnimation(map);
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
        ? ['in', ['get', 'iso_3166_1_alpha_3'], ['literal', isoCodes]]
        : ['==', ['string', ['get', 'iso_3166_1_alpha_3']], 'NON_EXISTENT'];

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
          ? ['in', ['get', 'iso_3166_1_alpha_3'], ['literal', allyISO]]
          : ['==', ['string', ['get', 'iso_3166_1_alpha_3']], 'NON_EXISTENT'];

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
        if (map.getLayer(fillId)) map.setFilter(fillId, ['==', ['string', ['get', 'iso_3166_1_alpha_3']], 'NON_EXISTENT']);
        if (map.getLayer(borderId)) map.setFilter(borderId, ['==', ['string', ['get', 'iso_3166_1_alpha_3']], 'NON_EXISTENT']);
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
    [LAYERS.COUNTRY_FILL, LAYERS.COUNTRY_BORDER, LAYERS.CONFLICT_MARKER].forEach(layer => {
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
    const animate = () => {
      ripplePhase = (ripplePhase + ANIMATION.RIPPLE_SPEED) % (Math.PI * 2);
      pulsePhase = (pulsePhase + ANIMATION.PULSE_SPEED) % (Math.PI * 2);
      
      try {
        // Animar el marcador principal con efecto de pulsación
        if (map.getLayer(LAYERS.CONFLICT_MARKER)) {
          const pulseRadius = SIZES.CONFLICT_MARKER_RADIUS + Math.sin(pulsePhase) * 2;
          const pulseOpacity = 0.8 + Math.sin(pulsePhase) * 0.2;
          
          map.setPaintProperty(LAYERS.CONFLICT_MARKER, 'circle-radius', pulseRadius);
          map.setPaintProperty(LAYERS.CONFLICT_MARKER, 'circle-opacity', pulseOpacity);
        }
        
        // Animar cada capa de onda con efecto minimalista
        for (let i = 0; i < ANIMATION.RIPPLE_COUNT; i++) {
          const rippleLayerId = `conflict-ripple-${i}`;
          if (map.getLayer(rippleLayerId)) {
            // Fase escalonada para efecto sutil
            const wavePhase = (ripplePhase + (i * Math.PI / ANIMATION.RIPPLE_COUNT)) % (Math.PI * 2);
            
            // Efecto minimalista: expansión más sutil
            const waveRadius = SIZES.RIPPLE_BASE_RADIUS + (i * SIZES.RIPPLE_SPACING) + Math.sin(wavePhase) * 3;
            const waveOpacity = (0.15 - (i * 0.05)) * (0.6 + Math.sin(wavePhase) * 0.4);
            
            map.setPaintProperty(rippleLayerId, 'circle-radius', waveRadius);
            map.setPaintProperty(rippleLayerId, 'circle-opacity', Math.max(0, waveOpacity));
          }
        }
      } catch {
        // Ignorar errores si las capas no existen
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
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