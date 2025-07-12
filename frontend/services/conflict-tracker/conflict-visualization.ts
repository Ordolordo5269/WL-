import mapboxgl from 'mapbox-gl';
import { getCountriesInConflict } from './country-conflict-mapper';

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
} as const;

// Variables de animación (estado global)
let animationId: number | null = null;
let ripplePhase = 0;
let pulsePhase = 0;

// --- Helpers de normalización ---
function normalizeCountryName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[()\[\]{}.,;:!?'-]/g, '')
    .trim();
}

function splitCountryVariants(name: string): string[] {
  return name.split(/[\/()|,;]+/).map(s => normalizeCountryName(s));
}

export const ConflictVisualization = {
  /**
   * Agrega capas de visualización de conflictos con animación de ondas minimalista
   */
  addLayers(map: mapboxgl.Map, countrySource = 'country-boundaries', conflictGeoJSON: any = null) {
    // Países en conflicto (relleno)
    if (!map.getLayer(LAYERS.COUNTRY_FILL)) {
      map.addLayer({
        id: LAYERS.COUNTRY_FILL,
        type: 'fill',
        source: countrySource,
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': COLORS.COUNTRY_FILL,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            OPACITIES.COUNTRY_FILL,
            0
          ]
        }
      });
    }

    // Países en conflicto (borde)
    if (!map.getLayer(LAYERS.COUNTRY_BORDER)) {
      map.addLayer({
        id: LAYERS.COUNTRY_BORDER,
        type: 'line',
        source: countrySource,
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': COLORS.COUNTRY_BORDER,
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            SIZES.COUNTRY_BORDER_WIDTH,
            0
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            OPACITIES.COUNTRY_BORDER,
            0
          ]
        }
      });
    }

    // Asegurar orden de capas
    try {
      if (map.getLayer('country-selected')) map.moveLayer(LAYERS.COUNTRY_FILL, 'country-selected');
      if (map.getLayer('country-selected')) map.moveLayer(LAYERS.COUNTRY_BORDER, 'country-selected');
      if (map.getLayer(LAYERS.CONFLICT_MARKER)) map.moveLayer(LAYERS.CONFLICT_MARKER);
    } catch (e) { /* ignore if layers missing */ }

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
   * Actualiza el estado de los países en conflicto
   */
  updateCountryStates(map: mapboxgl.Map, selectedConflictId: string | null, conflicts: any[]) {
    if (!map.isStyleLoaded()) {
      setTimeout(() => this.updateCountryStates(map, selectedConflictId, conflicts), 100);
      return;
    }

    try {
      const features = map.querySourceFeatures('country-boundaries', { sourceLayer: 'country_boundaries' });
      
      // Limpiar todos los estados de conflicto
      features.forEach((feature: any) => {
        if (feature.id) {
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: feature.id }, 
            { conflicted: false }
          );
        }
      });

      // Si hay un conflicto seleccionado, marcar los países correspondientes
      if (selectedConflictId && conflicts.length > 0) {
        const countries = getCountriesInConflict(selectedConflictId, conflicts);
        const normalizedCountries = countries.flatMap(splitCountryVariants);
        
        console.log('[DEBUG] Conflicted countries for', selectedConflictId, ':', normalizedCountries);
        
        features.forEach((feature: any) => {
          const possibleNames = [
            feature.properties?.name_en, 
            feature.properties?.name, 
            feature.properties?.NAME, 
            feature.properties?.NAME_EN, 
            feature.properties?.admin, 
            feature.properties?.ADMIN
          ].filter(Boolean);
          
          const normalizedFeatureNames = possibleNames.flatMap(splitCountryVariants);
          const match = normalizedFeatureNames.some(fn => 
            normalizedCountries.some(cn => fn === cn)
          );
          
          if (match) {
            console.log('[DEBUG] Setting conflicted for feature', feature.id, possibleNames);
            map.setFeatureState(
              { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: feature.id }, 
              { conflicted: true }
            );
          }
        });
      }
    } catch (error) {
      console.error('[ERROR] Failed to update country states:', error);
    }
  },

  /**
   * Actualiza los datos de los marcadores de conflicto
   */
  updateConflictMarkers(map: mapboxgl.Map, conflictGeoJSON: any) {
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
    } catch (error) {
      console.error('[ERROR] Failed to set marker visibility:', error);
    }
  },

  /**
   * Actualiza la visualización completa basada en el conflicto seleccionado
   */
  updateVisualization(map: mapboxgl.Map, selectedConflictId: string | null, conflicts: any[]) {
    // Actualizar estados de países
    this.updateCountryStates(map, selectedConflictId, conflicts);
    
    // Controlar visibilidad de marcadores
    // Si hay un conflicto seleccionado, ocultar marcadores para enfocar en el país
    const shouldShowMarkers = !selectedConflictId;
    this.setConflictMarkersVisibility(map, shouldShowMarkers);
    
    console.log('[DEBUG] Updated visualization - selectedConflictId:', selectedConflictId, 'showMarkers:', shouldShowMarkers);
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
      } catch (error) {
        // Ignorar errores si las capas no existen
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }
}; 