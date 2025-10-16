import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { applyFog as appearanceApplyFog, applyRelief as appearanceApplyRelief, setBaseFeaturesVisibility as appearanceSetBaseFeaturesVisibility, applyPhysicalModeTweaks as appearanceApplyPhysical, MAP_STYLES, type StyleKey, type PlanetPreset } from './map/mapAppearance';
import type { ChoroplethSpec } from '../services/worldbank-gdp';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '../src/styles/geocoder.css';
import { ConflictVisualization } from '../services/conflict-tracker/conflict-visualization';
import { ConflictDataManager, type ConflictData } from '../services/conflict-tracker/conflict-data-manager';
import { findCapitalByCountry } from '../data/world-capitals';

mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kcmVzb29kIiwiYSI6ImNtNWNtMmd4dzJlZmQybXFyMGJuMDFxemsifQ.t4UlHVJhUi9ntjG5Tiq5_A';

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  onResetView?: () => void;
  conflicts?: ConflictData[];
  onConflictClick?: (conflictId: string) => void;
  selectedConflictId?: string | null;
  isLeftSidebarOpen?: boolean;
}

// Tipos específicos para evitar 'any'
interface MapEaseToOptions {
  center?: [number, number];
  zoom?: number;
  duration?: number;
  easing?: (t: number) => number;
  pitch?: number;
  bearing?: number;
}

interface ConflictGeoJSON {
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

// Zoom configuration for country focus
const COUNTRY_FOCUS_MAX_ZOOM = 4; // lower = farther
// Removed unused COUNTRY_FITBOUNDS_MAX_ZOOM

type MetricId = 'gdp' | 'inflation';
const WorldMap = forwardRef<{ easeTo: (options: MapEaseToOptions) => void; getMap: () => mapboxgl.Map | null; setChoropleth?: (metric: MetricId, spec: ChoroplethSpec | null) => void; setActiveChoropleth?: (metric: MetricId | null) => void }, WorldMapProps>(({ onCountrySelect, selectedCountry, onResetView, conflicts = [], selectedConflictId, isLeftSidebarOpen = false }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedCountryId = useRef<string | number | null>(null);
  // Removed unused markersRef to prevent memory leaks
  const animationFrameRef = useRef<number | undefined>(undefined);
  const conflictDataManager = useRef<ConflictDataManager | null>(null);
  const isLeftSidebarOpenRef = useRef(isLeftSidebarOpen);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  // ✅ NUEVO: Refs para prevenir memory leaks
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rotationSpeedRef = useRef<number>(3);
  const spinRafRef = useRef<number | null>(null);
  const userInteractingRef = useRef<boolean>(false);
  const eventListenersRef = useRef<EventListenerRecord[]>([]);
  const choroplethSpecRef = useRef<Record<MetricId, ChoroplethSpec | null>>({ gdp: null, inflation: null });
  const activeChoroplethRef = useRef<MetricId | null>(null);

  // Estilos centralizados en mapAppearance
  const [styleKey, setStyleKey] = useState<StyleKey>('night');
  
  // Relieve y sombreado
  const [terrainOn, setTerrainOn] = useState(false);
  const [hillshadeOn, setHillshadeOn] = useState(false);
  
  // Presets de planeta (atmósfera)
  const [planetPreset, setPlanetPreset] = useState<PlanetPreset>('default');
  // Ocultar nombres/carreteras/fronteras
  const [minimalModeOn, setMinimalModeOn] = useState(false);
  
  // ✅ NUEVO: Tipos específicos para event listeners
  type MapMouseEventHandler = (e: mapboxgl.MapMouseEvent) => void;
  type MapTouchEventHandler = (e: mapboxgl.MapTouchEvent) => void;
  type GeocoderEventHandler = (e: unknown) => void;
  
  interface EventListenerRecord {
    event: string;
    handler: MapMouseEventHandler | MapTouchEventHandler | GeocoderEventHandler;
    layer?: string;
  }

  // Inicializar el conflict data manager
  useEffect(() => {
    if (!conflictDataManager.current) {
      conflictDataManager.current = new ConflictDataManager('conflicts');
    }
  }, []);

  // ✅ MEJORADO: Optimized map methods con tipos específicos
  const easeTo = useCallback((options: MapEaseToOptions) => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        ...options,
        easing: options.easing || ((t: number) => 1 - Math.pow(1 - t, 3)) // Smooth easing
      });
    }
  }, []);

  // Función para validar y manejar selección de países
  const handleCountrySelection = useCallback((countryName: string) => {
    onCountrySelect(countryName);
  }, [onCountrySelect]);

  // ✅ MEJORADO: Función de cleanup para prevenir memory leaks
  const cleanupResources = useCallback(() => {
    // Limpiar timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
    
    // Limpiar animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    if (spinRafRef.current !== null) {
      cancelAnimationFrame(spinRafRef.current);
      spinRafRef.current = null;
    }
    
    // ✅ MEJORADO: Limpiar event listeners con manejo de capas
    if (mapRef.current) {
      eventListenersRef.current.forEach(({ event, handler, layer }) => {
        try {
          if (layer) {
            mapRef.current?.off(event, layer, handler as MapMouseEventHandler);
          } else {
            mapRef.current?.off(event, handler);
          }
        } catch (error) {
          console.warn(`Error removing event listener for ${event}${layer ? ` on layer ${layer}` : ''}:`, error);
        }
      });
      eventListenersRef.current = [];
    }
  }, []);

  // Exponer métodos del mapa al componente padre (se define más abajo tras helpers)

  // Reaplicar niebla/atmósfera con fondo estrellado
  const applyFog = useCallback((preset: PlanetPreset = planetPreset) => {
    if (!mapRef.current) return;
    appearanceApplyFog(mapRef.current, preset);
  }, [planetPreset]);

  // Aplicar capas de relieve (DEM) y sombreado de colinas
  const applyTerrainLayers = useCallback((overrideTerrain?: boolean, overrideHillshade?: boolean) => {
    if (!mapRef.current) return;
    appearanceApplyRelief(mapRef.current, {
      terrain: overrideTerrain ?? terrainOn,
      hillshade: overrideHillshade ?? hillshadeOn
    });
  }, [terrainOn, hillshadeOn]);

  // Ocultar capas políticas y overlays en modo físico
  const applyPhysicalModeTweaks = useCallback(() => {
    if (!mapRef.current) return;
    appearanceApplyPhysical(mapRef.current);
  }, []);

  // Mostrar/ocultar nombres, carreteras y fronteras en cualquier estilo
  const setBaseFeaturesVisibility = useCallback((hide: boolean) => {
    if (!mapRef.current) return;
    appearanceSetBaseFeaturesVisibility(mapRef.current, hide);
  }, []);

  // Helper: add/update/remove GDP choropleth layer
  const applyChoropleth = useCallback((metric: MetricId) => {
    const map = mapRef.current;
    const spec = choroplethSpecRef.current[metric];
    if (!map) return;
    if (!map.getSource('country-boundaries')) return;

    const layerId = metric === 'gdp' ? 'gdp-fill' : 'inflation-fill';
    const sourceLayer = 'country_boundaries';

    // Remove if no spec
    if (!spec) {
      try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
      return;
    }

    // Build a match expression on ISO3 code using multiple potential fields
    // Normalize to uppercase to ensure consistency with WB ISO3 keys
    const isoExpr: any[] = ['upcase', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ['get', 'wb_a3'], ['get', 'adm0_a3'], ['get', 'iso_3166_1']]];
    const expr: any[] = ['match', isoExpr];
    for (const [iso3, color] of Object.entries(spec.iso3ToColor)) {
      expr.push(iso3, color);
    }
    expr.push(spec.defaultColor);

    if (!map.getLayer(layerId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        if (beforeId) {
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: 'country-boundaries',
            'source-layer': sourceLayer,
            paint: {
              'fill-color': expr as any,
              'fill-opacity': 0.75
            }
          } as any, beforeId);
        } else {
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: 'country-boundaries',
            'source-layer': sourceLayer,
            paint: {
              'fill-color': expr as any,
              'fill-opacity': 0.75
            }
          } as any);
        }
      } catch {}
    } else {
      try { map.setPaintProperty(layerId, 'fill-color', expr as any); } catch {}
      try { map.setPaintProperty(layerId, 'fill-opacity', 0.75); } catch {}
    }
  }, []);

  // Exponer métodos del mapa al componente padre (incluye estilo/preset/relieve)
  useImperativeHandle(ref, () => ({
    easeTo,
    getMap: () => mapRef.current,
    setChoropleth: (metric: MetricId, spec: ChoroplethSpec | null) => {
      choroplethSpecRef.current[metric] = spec;
      applyChoropleth(metric);
    },
    setActiveChoropleth: (metric: MetricId | null) => {
      activeChoroplethRef.current = metric;
      const map = mapRef.current;
      if (!map) return;
      const layers: Record<MetricId, string> = { gdp: 'gdp-fill', inflation: 'inflation-fill' };
      (Object.keys(layers) as MetricId[]).forEach((m) => {
        const id = layers[m];
        if (!map.getLayer(id)) return;
        try { map.setLayoutProperty(id, 'visibility', metric === m ? 'visible' : 'none'); } catch {}
      });
    },
    setBaseMapStyle: (next: StyleKey) => {
      setStyleKey(next);
      if (!mapRef.current) return;
      const map = mapRef.current;
      try {
        map.setStyle(MAP_STYLES[next], { diff: false } as any);
        map.once('style.load', () => {
          applyFog();
          if (next === 'physical') {
            setTerrainOn(true);
            setHillshadeOn(true);
          }
          applyTerrainLayers( next === 'physical' ? true : undefined, next === 'physical' ? true : undefined );
          reinitializeInteractiveLayers();
          if (next === 'physical') applyPhysicalModeTweaks();
        });
      } catch {}
    },
    setPlanetPreset: (preset: PlanetPreset) => {
      setPlanetPreset(preset);
      applyFog(preset);
    },
    setTerrainEnabled: (v: boolean) => {
      // Unificado: terrain y hillshade siguen el mismo estado
      setTerrainOn(v);
      setHillshadeOn(v);
      applyTerrainLayers(v, v);
    },
    setHillshadeEnabled: (v: boolean) => {
      // Compatibilidad: delega en Terrain unificado
      setTerrainOn(v);
      setHillshadeOn(v);
      applyTerrainLayers(v, v);
    },
    setMinimalMode: (v: boolean) => { setMinimalModeOn(v); setBaseFeaturesVisibility(v); },
    // NEW: Globe rotation controls (smooth RAF-based)
    setAutoRotate: (enabled: boolean) => {
      // Stop any interval-based fallback if present
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
      // Stop existing RAF loop
      if (!enabled) {
        if (spinRafRef.current !== null) {
          cancelAnimationFrame(spinRafRef.current);
          spinRafRef.current = null;
        }
        return;
      }
      // Start RAF loop
      let lastTs = 0;
      const step = (ts: number) => {
        const map = mapRef.current;
        if (!map) {
          spinRafRef.current = null;
          return;
        }
        if (lastTs === 0) lastTs = ts;
        const dt = Math.max(0, (ts - lastTs) / 1000);
        lastTs = ts;
        const zoom = map.getZoom();
        const isMoving = (map as any).isMoving?.() ?? false;
        if (!isMoving && !userInteractingRef.current && zoom < 5) {
          const center = map.getCenter();
          center.lng -= rotationSpeedRef.current * dt;
          // Use setCenter for immediate, smooth updates each frame
          map.setCenter(center);
        }
        spinRafRef.current = requestAnimationFrame(step);
      };
      if (spinRafRef.current !== null) cancelAnimationFrame(spinRafRef.current);
      spinRafRef.current = requestAnimationFrame(step);
    },
    setRotateSpeed: (degPerSec: number) => {
      rotationSpeedRef.current = Math.max(0, Number.isFinite(degPerSec) ? degPerSec : 0);
    }
  }), [easeTo, applyFog, applyTerrainLayers, applyPhysicalModeTweaks, styleKey, setBaseFeaturesVisibility]);

  // Helper para reinstalar fuentes/capas y eventos tras cambio de estilo
  const reinitializeInteractiveLayers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Asegurar atmósfera/fog y terreno/hillshade tras cambio de estilo
    applyFog();
    applyTerrainLayers();
    setBaseFeaturesVisibility(minimalModeOn);

    // Si estamos en modo físico, ocultar política y no reinyectar overlays
    if (styleKey === 'physical') {
      applyPhysicalModeTweaks();
      return;
    }
    // Fuente de límites de países
    if (!map.getSource('country-boundaries')) {
      try {
        map.addSource('country-boundaries', {
          type: 'vector',
          url: 'mapbox://mapbox.country-boundaries-v1'
        } as any);
      } catch {}
    }

    // Apply any existing choropleths and reassert active visibility
    applyChoropleth('gdp');
    applyChoropleth('inflation');
    if (activeChoroplethRef.current) {
      const map = mapRef.current;
      if (map) {
        const layers: Record<MetricId, string> = { gdp: 'gdp-fill', inflation: 'inflation-fill' };
        (Object.keys(layers) as MetricId[]).forEach((m) => {
          const id = layers[m];
          if (!map.getLayer(id)) return;
          try { map.setLayoutProperty(id, 'visibility', activeChoroplethRef.current === m ? 'visible' : 'none'); } catch {}
        });
      }
    }

    // Capa hover
    if (!map.getLayer('country-highlight')) {
      try {
        map.addLayer({
          id: 'country-highlight',
          type: 'fill',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          paint: {
            'fill-color': '#87CEEB',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.3,
              0
            ]
          }
        } as any);
      } catch {}
    }

    // Capa seleccionado
    if (!map.getLayer('country-selected')) {
      try {
        map.addLayer({
          id: 'country-selected',
          type: 'fill',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          paint: {
            'fill-color': '#4A90E2',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              0.5,
              0
            ]
          }
        } as any);
      } catch {}
    }

    // Reagregar visualización de conflictos
    try {
      const conflictGeoJSON = conflictsToGeoJSON(conflicts);
      ConflictVisualization.addLayers(map, 'country-boundaries', conflictGeoJSON);
    } catch {}

    // Re-registrar eventos mínimos (hover y click)
    let hoveredId: number | string | null = null;

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (isLeftSidebarOpenRef.current) {
        map.getCanvas().style.cursor = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%2387CEEB' stroke-width='1.5' opacity='0.9'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%2387CEEB' opacity='0.7'/%3E%3C/svg%3E\") 10 10, auto";
        return;
      }
      if (e.features && e.features.length > 0) {
        const id = e.features[0].id as any;
        if (id !== hoveredId) {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          if (hoveredId !== null) {
            try {
              map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: false });
            } catch {}
          }
          hoveredId = id;
          hoverTimeoutRef.current = setTimeout(() => {
            if (hoveredId !== null) {
              try {
                map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: true });
              } catch {}
            }
          }, 50);
        }
      }
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (hoveredId !== null) {
        try {
          map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: false });
        } catch {}
      }
      hoveredId = null;
      map.getCanvas().style.cursor = 'grab';
    };

    const handleCountryClick = (e: mapboxgl.MapMouseEvent) => {
      if (isLeftSidebarOpenRef.current) return;
      if (e.features && e.features.length > 0) {
        const feature: any = e.features[0];
        const countryName = feature.properties?.name_en || feature.properties?.name || 'Unknown Country';
        const featureId = feature.id;
        if (featureId === undefined || featureId === null) return;

        if (selectedCountryId.current !== null) {
          try {
            map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: selectedCountryId.current }, { selected: false });
          } catch {}
        }
        selectedCountryId.current = featureId as any;
        try {
          map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: featureId }, { selected: true });
        } catch {}

        const capitalData = findCapitalByCountry(countryName);
        if (capitalData) {
          map.easeTo({ center: capitalData.coordinates, zoom: Math.min(capitalData.zoomLevel || 6, COUNTRY_FOCUS_MAX_ZOOM), duration: 1200, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
        }
        handleCountrySelection(countryName);
      }
    };

    try {
      map.on('mousemove', 'country-highlight', handleMouseMove);
      map.on('mouseleave', 'country-highlight', handleMouseLeave);
      map.on('click', 'country-highlight', handleCountryClick);
      eventListenersRef.current.push(
        { event: 'mousemove', handler: handleMouseMove, layer: 'country-highlight' },
        { event: 'mouseleave', handler: handleMouseLeave, layer: 'country-highlight' },
        { event: 'click', handler: handleCountryClick, layer: 'country-highlight' }
      );
    } catch {}
  }, [conflicts, handleCountrySelection, applyFog, applyTerrainLayers, applyPhysicalModeTweaks, styleKey, minimalModeOn, setBaseFeaturesVisibility]);

  // El toggle inline fue movido a la sidebar (Settings)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[styleKey],
      center: [0, 20],
      zoom: 2,
      minZoom: 0.5,
      maxZoom: 20,
      projection: 'globe',
      antialias: true,
      scrollZoom: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
      boxZoom: true,
      keyboard: true,
      renderWorldCopies: false,
      performanceMetricsCollection: false, // Mejorar rendimiento
      
      fadeDuration: 300, // Smooth transitions
      crossSourceCollisions: false, // Better performance
      attributionControl: false // Eliminar marca de agua de Mapbox
    });

    mapRef.current = map;

    // Buscador de países en inglés
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken as string,
      // @ts-expect-error mapbox-gl-geocoder types expect full module; runtime is fine
      mapboxgl: mapboxgl as unknown as typeof mapboxgl,
      types: 'country',
      language: 'en',
      placeholder: 'Search country',
      clearOnBlur: true,
      clearAndBlurOnEsc: true,
      collapsed: false
    });
    
    // Evento cuando se selecciona un país desde el geocoder
    const handleGeocoderResult = (e: unknown) => {
      const event = e as { result: { place_name?: string; text?: string; center: [number, number] } };
      const countryName = event.result.place_name || event.result.text || 'Unknown Country';
      const coordinates = event.result.center;
      
      // Buscar el país en las capas del mapa para obtener su feature
      const features = map.querySourceFeatures('country-boundaries', {
        sourceLayer: 'country_boundaries'
      });
      
      // Encontrar el feature que corresponde al país seleccionado
      const matchingFeature = features.find(feature => {
        const featureName = feature.properties?.name_en || feature.properties?.name || '';
        return featureName.toLowerCase().includes(countryName.toLowerCase()) ||
               countryName.toLowerCase().includes(featureName.toLowerCase());
      });
      
      if (matchingFeature && matchingFeature.id) {
        // Limpiar selección anterior
        if (selectedCountryId.current !== null) {
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: selectedCountryId.current },
            { selected: false }
          );
        }
        
        // Establecer nueva selección
        selectedCountryId.current = matchingFeature.id as string | number;
        map.setFeatureState(
          { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: matchingFeature.id },
          { selected: true }
        );
        
        // Llamar a la función de selección de país
        const finalCountryName = matchingFeature.properties?.name_en || matchingFeature.properties?.name || countryName;
        
        // Buscar la capital del país seleccionado
        const capitalData = findCapitalByCountry(finalCountryName);
        
        if (capitalData) {
          // Zoom a la capital del país con límite máximo para verse más lejos
          const zoomLevel = Math.min(capitalData.zoomLevel || 6, COUNTRY_FOCUS_MAX_ZOOM);
          map.easeTo({
            center: capitalData.coordinates,
            zoom: zoomLevel,
            duration: 1200,
            easing: (t: number) => 1 - Math.pow(1 - t, 3)
          });
        } else {
          // Fallback: usar las coordenadas del geocoder
          map.easeTo({
            center: coordinates,
            zoom: COUNTRY_FOCUS_MAX_ZOOM,
            duration: 1200,
            easing: (t: number) => 1 - Math.pow(1 - t, 3)
          });
        }
        
        handleCountrySelection(finalCountryName);
       } else {
         // Si no se encuentra el feature, al menos centrar en las coordenadas
         map.easeTo({
           center: coordinates,
           zoom: COUNTRY_FOCUS_MAX_ZOOM, // Zoom fijo para mostrar la capital con contexto
           duration: 1200,
           easing: (t: number) => 1 - Math.pow(1 - t, 3)
         });
         
         // Llamar a la función de selección con el nombre del geocoder
         handleCountrySelection(countryName);
       }
       
       // Limpiar el input del geocoder para permitir nuevas búsquedas
       setTimeout(() => {
         geocoder.clear();
       }, 100);
    };
    
    geocoder.on('result', handleGeocoderResult);
    
    if (geocoderContainer.current) {
      geocoderContainer.current.innerHTML = '';
      geocoderContainer.current.appendChild(geocoder.onAdd(map));
    }

    // Habilitar controles de navegación
    map.addControl(new mapboxgl.NavigationControl());
    
    // Configurar zoom fluido y suave
    map.scrollZoom.setWheelZoomRate(1/450); // Más suave
    map.scrollZoom.setZoomRate(1/150); // Más controlado
    
    // ✅ MEJORADO: Configurar transiciones suaves para el mapa con cleanup
    const handleMoveStart = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
    
    const handleMoveEnd = () => {
      // Optimizar renderizado después del movimiento
      animationFrameRef.current = requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.triggerRepaint();
        }
      });
    };
    
    // ✅ MEJORADO: Registrar event listeners para cleanup posterior
    map.on('movestart', handleMoveStart);
    map.on('moveend', handleMoveEnd);
    eventListenersRef.current.push(
      { event: 'movestart', handler: handleMoveStart },
      { event: 'moveend', handler: handleMoveEnd }
    );
    
    // Configurar el globo y capas cuando el mapa esté cargado
    map.on('load', () => {
      setIsMapLoaded(true);
      // Configurar la atmósfera del globo con fondo estrellado
      applyFog();
      // aplicar estado inicial de terrain/hillshade
      applyTerrainLayers(terrainOn, hillshadeOn);
      if (styleKey === 'physical') applyPhysicalModeTweaks();

      // Initialize conflict data manager and add conflict source
      if (conflictDataManager.current) {
        conflictDataManager.current.initialize(map);
        conflictDataManager.current.addConflictSource(conflicts);
      }

      // Conflict visualization is now handled by CountryConflictVisualization

      // Reusar helper estándar
      reinitializeInteractiveLayers();
    });

    // ✅ MEJORADO: Animación de rotación automática con cleanup
    let userInteracting = false;
    const spinEnabled = false;

    const spinGlobe = () => {
      const zoom = map.getZoom();
      if (spinEnabled && !userInteracting && zoom < 5) {
        const distancePerSecond = 360 / 120;
        const center = map.getCenter();
        center.lng -= distancePerSecond;
        map.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    };

    // ✅ MEJORADO: Event handlers con cleanup
    const handleMouseDown = () => { userInteracting = true; userInteractingRef.current = true; };
    const handleMouseUp = () => { 
      userInteracting = false; 
      userInteractingRef.current = false;
      spinGlobe(); 
    };
    const handleDragEnd = () => { 
      userInteracting = false; 
      userInteractingRef.current = false;
      spinGlobe(); 
    };
    const handlePitchEnd = () => { 
      userInteracting = false; 
      userInteractingRef.current = false;
      spinGlobe(); 
    };
    const handleRotateEnd = () => { 
      userInteracting = false; 
      userInteractingRef.current = false;
      spinGlobe(); 
    };
    const handleMoveEndGlobe = () => { 
      spinGlobe(); 
    };

    // ✅ NUEVO: Registrar todos los event listeners para cleanup
    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);
    map.on('dragend', handleDragEnd);
    map.on('pitchend', handlePitchEnd);
    map.on('rotateend', handleRotateEnd);
    map.on('moveend', handleMoveEndGlobe);
    
    eventListenersRef.current.push(
      { event: 'mousedown', handler: handleMouseDown },
      { event: 'mouseup', handler: handleMouseUp },
      { event: 'dragend', handler: handleDragEnd },
      { event: 'pitchend', handler: handlePitchEnd },
      { event: 'rotateend', handler: handleRotateEnd },
      { event: 'moveend', handler: handleMoveEndGlobe }
    );

    // Iniciar la rotación
    spinGlobe();

    // ✅ MEJORADO: Cleanup completo para prevenir memory leaks
    return () => {
      // Limpiar todos los recursos
      cleanupResources();
      
      // Limpiar geocoder
      if (geocoder) {
        try {
          geocoder.off('result', handleGeocoderResult);
          geocoder.onRemove();
        } catch (error) {
          console.warn('Error cleaning up geocoder:', error);
        }
      }
      
      // Limpiar conflict data manager
      if (conflictDataManager.current) {
        conflictDataManager.current.cleanup();
      }
      
      // Limpiar capas de visualización de conflictos
      if (mapRef.current) {
        try {
          ConflictVisualization.cleanup(mapRef.current);
        } catch (error) {
          console.warn('Error cleaning up conflict visualization:', error);
        }
      }
      
      // Limpiar mapa
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
        mapRef.current = null;
      }
    };
  }, []); // Solo ejecutar una vez

  // Efecto para actualizar conflictos cuando cambien
  useEffect(() => {
    if (conflictDataManager.current?.hasConflictSource()) {
      conflictDataManager.current.updateConflictData(conflicts);
    }
  }, [conflicts]);

  // ✅ MEJORADO: Actualizar marcadores y países en conflicto con cleanup
  useEffect(() => {
    const update = () => {
      if (mapRef.current && isMapLoaded) {
        const conflictGeoJSON = conflictsToGeoJSON(conflicts as any);
        ConflictVisualization.updateConflictMarkers(mapRef.current, conflictGeoJSON as any);
        ConflictVisualization.updateVisualization(mapRef.current, selectedConflictId ?? null, conflicts as any);
      } else {
        // ✅ MEJORADO: Usar ref para timeout y limpiarlo
        const timeoutId = setTimeout(update, 100);
        // Guardar el timeout ID para cleanup si es necesario
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = timeoutId;
      }
    };
    update();
    
    // ✅ NUEVO: Cleanup del timeout si el componente se desmonta
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, [conflicts, selectedConflictId, isMapLoaded]);

  // Función para resetear la vista del mapa
  const resetMapView = () => {
    if (!mapRef.current) return;
    
    // Limpiar selección actual
    if (selectedCountryId.current) {
      mapRef.current.setFeatureState(
        { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: selectedCountryId.current },
        { selected: false }
      );
      selectedCountryId.current = null;
    }
    
    // Detener cualquier animación en curso
    mapRef.current.stop();
    
    // Regresar a la vista principal del globo con coordenadas exactas
    mapRef.current.easeTo({
      center: [0, 20], // Coordenadas exactas de inicialización
      zoom: 2,
      pitch: 0, // Asegurar que no hay inclinación
      bearing: 0, // Asegurar que no hay rotación
      duration: 1200,
      easing: (t: number) => 1 - Math.pow(1 - t, 3) // Mismo easing que la inicialización
    });
  };

  // Efecto para manejar cambios en el país seleccionado
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Solo resetear si selectedCountry cambió de un valor a null
    // y hay una selección actual en el mapa
    if (!selectedCountry && selectedCountryId.current) {
      // Pequeño delay para evitar conflictos con otras animaciones
      const timeoutId = setTimeout(() => {
        resetMapView();
      }, 100);
      
      // ✅ MEJORADO: Guardar timeout para cleanup
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = timeoutId;
    }
  }, [selectedCountry]);
  
  // Exponer la función de reset a través de onResetView
  useEffect(() => {
    if (onResetView) {
      // Asignar la función de reset al callback
      (window as any).resetMapView = resetMapView;
    }
  }, [onResetView]);
  
  // Efecto para actualizar el ref cuando cambia el estado de sidebar izquierda
  useEffect(() => {
    isLeftSidebarOpenRef.current = isLeftSidebarOpen;
    if (mapRef.current && isMapLoaded) {
      const canvas = mapRef.current.getCanvas();
      if (isLeftSidebarOpen) {
        // Cursor personalizado minimalista y elegante
        canvas.style.cursor = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%2387CEEB' stroke-width='1.5' opacity='0.9'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%2387CEEB' opacity='0.7'/%3E%3C/svg%3E\") 10 10, auto";
        // Agregar una clase CSS para efectos adicionales
        canvas.classList.add('sidebar-open-cursor');
      } else {
        canvas.style.cursor = 'grab';
        canvas.classList.remove('sidebar-open-cursor');
      }
    }
  }, [isLeftSidebarOpen, isMapLoaded]);

  // Efecto separado para manejar la función de selección
  useEffect(() => {
    // Este efecto se ejecuta cuando cambia onCountrySelect pero no recrea el mapa
  }, [onCountrySelect]);

  return (
    <>
      <div
        ref={mapContainer}
        className="fixed inset-0 w-full h-full"
        style={{ cursor: 'grab' }}
      />
      {/* Control de estilo movido a la LeftSidebar > Settings */}
      <div 
        ref={geocoderContainer} 
        className="geocoder-container absolute left-1/2 transform -translate-x-1/2 z-20 w-80"
        style={{ top: '16px' }}
      />
    </>
  );
});

WorldMap.displayName = 'WorldMap';

// ✅ MEJORADO: Helper con tipos específicos
function conflictsToGeoJSON(conflicts: ConflictData[]): ConflictGeoJSON {
  return {
    type: 'FeatureCollection',
    features: conflicts.map(conflict => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [conflict.coordinates.lng, conflict.coordinates.lat]
      },
      properties: {
        ...conflict,
        id: conflict.id,
        country: conflict.country,
        status: conflict.status
      }
    }))
  };
}

export default WorldMap;
