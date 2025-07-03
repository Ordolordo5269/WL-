import mapboxgl from 'mapbox-gl';

// --- Configuración de estilos ---
const COUNTRY_FILL_COLOR = '#8B0000';
const COUNTRY_FILL_OPACITY = 0.22;
const COUNTRY_BORDER_COLOR = '#CD5C5C';
const COUNTRY_BORDER_WIDTH = 3;
const COUNTRY_BORDER_OPACITY = 0.9;

const CONFLICT_MARKER_COLOR = '#ff4d4f';
const CONFLICT_MARKER_RADIUS = 8;
const CONFLICT_MARKER_GLOW_RADIUS = 18;

const COUNTRY_FILL_LAYER = 'country-conflict-fill';
const COUNTRY_BORDER_LAYER = 'country-conflict-border';
const CONFLICT_SOURCE = 'conflict-points';
const CONFLICT_MARKER_LAYER = 'conflict-marker';
const CONFLICT_GLOW_LAYER = 'conflict-marker-glow';

let animationId: number | null = null;
let pulsePhase = 0;

// Helper: Normalize country names for robust comparison
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
   * Agrega capas de visualización de países en conflicto y marcadores de conflicto
   */
  addLayers(map: mapboxgl.Map, countrySource = 'country-boundaries', conflictGeoJSON: any = null) {
    // Países en conflicto (relleno)
    if (!map.getLayer(COUNTRY_FILL_LAYER)) {
      map.addLayer({
        id: COUNTRY_FILL_LAYER,
        type: 'fill',
        source: countrySource,
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': COUNTRY_FILL_COLOR,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            COUNTRY_FILL_OPACITY,
            0
          ]
        }
      });
    }
    // Países en conflicto (borde)
    if (!map.getLayer(COUNTRY_BORDER_LAYER)) {
      map.addLayer({
        id: COUNTRY_BORDER_LAYER,
        type: 'line',
        source: countrySource,
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': COUNTRY_BORDER_COLOR,
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            COUNTRY_BORDER_WIDTH,
            0
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            COUNTRY_BORDER_OPACITY,
            0
          ]
        }
      });
    }
    // Asegurar orden de capas: borde y relleno por encima de base, debajo de marcadores
    try {
      if (map.getLayer('country-selected')) map.moveLayer(COUNTRY_FILL_LAYER, 'country-selected');
      if (map.getLayer('country-selected')) map.moveLayer(COUNTRY_BORDER_LAYER, 'country-selected');
      if (map.getLayer(CONFLICT_MARKER_LAYER)) map.moveLayer(CONFLICT_MARKER_LAYER);
      if (map.getLayer(CONFLICT_GLOW_LAYER)) map.moveLayer(CONFLICT_GLOW_LAYER);
    } catch (e) { /* ignore if layers missing */ }
    // Marcadores de conflicto (GeoJSON)
    if (conflictGeoJSON && !map.getSource(CONFLICT_SOURCE)) {
      map.addSource(CONFLICT_SOURCE, {
        type: 'geojson',
        data: conflictGeoJSON
      });
    }
    if (conflictGeoJSON && !map.getLayer(CONFLICT_MARKER_LAYER)) {
      map.addLayer({
        id: CONFLICT_MARKER_LAYER,
        type: 'circle',
        source: CONFLICT_SOURCE,
        paint: {
          'circle-radius': CONFLICT_MARKER_RADIUS,
          'circle-color': CONFLICT_MARKER_COLOR,
          'circle-opacity': 0.95,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-stroke-opacity': 0.8
        }
      });
    }
    if (conflictGeoJSON && !map.getLayer(CONFLICT_GLOW_LAYER)) {
      map.addLayer({
        id: CONFLICT_GLOW_LAYER,
        type: 'circle',
        source: CONFLICT_SOURCE,
        paint: {
          'circle-radius': CONFLICT_MARKER_GLOW_RADIUS,
          'circle-color': CONFLICT_MARKER_COLOR,
          'circle-opacity': 0.25
        }
      });
    }
    this.startPulse(map);
  },

  /**
   * Actualiza el estado de los países en conflicto
   */
  updateCountryStates(map: mapboxgl.Map, selectedConflictId: string | null, conflicts: any[]) {
    if (!map.isStyleLoaded()) return;
    const features = map.querySourceFeatures('country-boundaries', { sourceLayer: 'country_boundaries' });
    // Limpiar todos
    features.forEach((feature: any) => {
      if (feature.id) {
        map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: feature.id }, { conflicted: false });
      }
    });
    if (selectedConflictId) {
      import('./country-conflict-mapper').then(({ getCountriesInConflict, isCountryInConflict }) => {
        const countries = getCountriesInConflict(selectedConflictId, conflicts);
        const normalizedCountries = countries.flatMap(splitCountryVariants);
        console.log('[DEBUG] Conflicted countries for', selectedConflictId, ':', normalizedCountries);
        features.forEach((feature: any) => {
          const possibleNames = [feature.properties?.name_en, feature.properties?.name, feature.properties?.NAME, feature.properties?.NAME_EN, feature.properties?.admin, feature.properties?.ADMIN].filter(Boolean);
          const normalizedFeatureNames = possibleNames.flatMap(splitCountryVariants);
          const match = normalizedFeatureNames.some(fn => normalizedCountries.some(cn => fn === cn));
          if (match) {
            console.log('[DEBUG] Setting conflicted for feature', feature.id, possibleNames);
            map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: feature.id }, { conflicted: true });
          }
        });
      });
    }
  },

  /**
   * Actualiza los datos de los marcadores de conflicto
   */
  updateConflictMarkers(map: mapboxgl.Map, conflictGeoJSON: any) {
    const source = map.getSource(CONFLICT_SOURCE) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(conflictGeoJSON);
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
    [COUNTRY_FILL_LAYER, COUNTRY_BORDER_LAYER, CONFLICT_MARKER_LAYER, CONFLICT_GLOW_LAYER].forEach(layer => {
      if (map.getLayer(layer)) map.removeLayer(layer);
    });
    if (map.getSource(CONFLICT_SOURCE)) map.removeSource(CONFLICT_SOURCE);
  },

  /**
   * Animación de pulso para los marcadores
   */
  startPulse(map: mapboxgl.Map) {
    if (!map.getLayer(CONFLICT_GLOW_LAYER)) return;
    const animate = () => {
      pulsePhase = (pulsePhase + 0.04) % (Math.PI * 2);
      const glowOpacity = 0.18 + Math.abs(Math.sin(pulsePhase)) * 0.18;
      try {
        map.setPaintProperty(CONFLICT_GLOW_LAYER, 'circle-opacity', glowOpacity);
      } catch {}
      animationId = requestAnimationFrame(animate);
    };
    animate();
  }
}; 