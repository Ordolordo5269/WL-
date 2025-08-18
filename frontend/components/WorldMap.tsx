import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '../src/styles/geocoder.css';
import { ConflictVisualization } from '../services/conflict-tracker/conflict-visualization';
import { ConflictDataManager, type ConflictData } from '../services/conflict-tracker/conflict-data-manager';
import { findCapitalByCountry } from '../data/world-capitals';

mapboxgl.accessToken = (import.meta as unknown as { env: { VITE_MAPBOX_TOKEN: string } }).env.VITE_MAPBOX_TOKEN || '';

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  onResetView?: () => void;
  conflicts?: ConflictData[];
  onConflictClick?: (conflictId: string) => void;
  selectedConflictId?: string | null;
  isLeftSidebarOpen?: boolean;
  alignmentOverlayEnabled?: boolean;
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

const WorldMap = forwardRef<{ easeTo: (options: MapEaseToOptions) => void; getMap: () => mapboxgl.Map | null }, WorldMapProps>(({ onCountrySelect, selectedCountry, onResetView, conflicts = [], selectedConflictId, isLeftSidebarOpen = false, alignmentOverlayEnabled = false }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedCountryId = useRef<string | number | null>(null);
  // Removed unused markersRef to prevent memory leaks
  const animationFrameRef = useRef<number | undefined>(undefined);
  const conflictDataManager = useRef<ConflictDataManager | null>(null);
  const isLeftSidebarOpenRef = useRef(isLeftSidebarOpen);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [alignmentPaintApplied, setAlignmentPaintApplied] = useState(false);
  
  // ✅ NUEVO: Refs para prevenir memory leaks
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersRef = useRef<EventListenerRecord[]>([]);
  
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

  // Exponer métodos del mapa al componente padre
  useImperativeHandle(ref, () => ({
    easeTo,
    getMap: () => mapRef.current
  }), [easeTo]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
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
      mapboxgl: mapboxgl as { Map: typeof mapboxgl.Map },
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
          // Zoom a la capital del país con zoom dinámico basado en el tamaño del país
          const zoomLevel = capitalData.zoomLevel || 6; // Usar zoom personalizado o 6 por defecto
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
            zoom: 5,
            duration: 1200,
            easing: (t: number) => 1 - Math.pow(1 - t, 3)
          });
        }
        
        handleCountrySelection(finalCountryName);
       } else {
         // Si no se encuentra el feature, al menos centrar en las coordenadas
         map.easeTo({
           center: coordinates,
           zoom: 5, // Zoom fijo para mostrar la capital con contexto
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
      // Configurar la atmósfera del globo
      map.setFog({
        'color': 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      });

      // Initialize conflict data manager and add conflict source
      if (conflictDataManager.current) {
        conflictDataManager.current.initialize(map);
        conflictDataManager.current.addConflictSource(conflicts);
      }

      // Conflict visualization is now handled by CountryConflictVisualization

      // Fuente y capa para resaltar países al pasar el ratón
      map.addSource('country-boundaries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
      });

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
      });

      // Capa para país seleccionado
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
      });

      // Agregar capas de visualización de conflictos con animación de pulso
      const conflictGeoJSON = conflictsToGeoJSON(conflicts);
      ConflictVisualization.addLayers(map, 'country-boundaries', conflictGeoJSON);

      let hoveredId: number | string | null = null;

      // ✅ MEJORADO: Eventos de hover optimizados con cleanup de timeouts
      const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
        // Si la sidebar izquierda está abierta, no procesar hover
        if (isLeftSidebarOpenRef.current) {
          // Usar el cursor personalizado minimalista
          map.getCanvas().style.cursor = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%2387CEEB' stroke-width='1.5' opacity='0.9'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%2387CEEB' opacity='0.7'/%3E%3C/svg%3E\") 10 10, auto";
          return;
        }

        if (e.features && e.features.length > 0) {
          const id = e.features[0].id;
          
          // Solo actualizar si el ID cambió
          if (id !== hoveredId) {
            // ✅ MEJORADO: Limpiar timeout anterior usando ref
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
            
            // Limpiar hover anterior
            if (hoveredId !== null) {
              map.setFeatureState(
                { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId },
                { hover: false }
              );
            }
            
            hoveredId = id as number | string | null;
            
            // ✅ MEJORADO: Aplicar nuevo hover con pequeño delay usando ref
            hoverTimeoutRef.current = setTimeout(() => {
              if (hoveredId !== null) {
                map.setFeatureState(
                  { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId },
                  { hover: true }
                );
              }
            }, 50);
          }
        }
        map.getCanvas().style.cursor = 'pointer';
      };

      const handleMouseLeave = () => {
        // ✅ MEJORADO: Limpiar timeout usando ref
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId },
            { hover: false }
          );
        }
        hoveredId = null;
        map.getCanvas().style.cursor = 'grab';
      };

      // ✅ MEJORADO: Registrar event listeners para cleanup con capas
      map.on('mousemove', 'country-highlight', handleMouseMove);
      map.on('mouseleave', 'country-highlight', handleMouseLeave);
      eventListenersRef.current.push(
        { event: 'mousemove', handler: handleMouseMove, layer: 'country-highlight' },
        { event: 'mouseleave', handler: handleMouseLeave, layer: 'country-highlight' }
      );

      // ✅ MEJORADO: Evento de clic para seleccionar país con cleanup
      const handleCountryClick = (e: mapboxgl.MapMouseEvent) => {
        // Si la sidebar izquierda está abierta, no procesar el click
        if (isLeftSidebarOpenRef.current) {
          return;
        }

        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const countryName = feature.properties?.name_en || feature.properties?.name || 'Unknown Country';
          const featureId = feature.id;
          
          // Verificar que featureId no sea undefined
          if (featureId === undefined || featureId === null) {
            console.warn('Feature ID is undefined or null');
            return;
          }
          
          // Limpiar selección anterior
          if (selectedCountryId.current !== null) {
            map.setFeatureState(
              { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: selectedCountryId.current },
              { selected: false }
            );
          }
          
          // Establecer nueva selección
          selectedCountryId.current = featureId as string | number;
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: featureId },
            { selected: true }
          );
          
          // Buscar la capital del país seleccionado
          const capitalData = findCapitalByCountry(countryName);
          
          if (capitalData) {
            // Zoom a la capital del país con zoom dinámico basado en el tamaño del país
            const zoomLevel = capitalData.zoomLevel || 6; // Usar zoom personalizado o 6 por defecto
            map.easeTo({
              center: capitalData.coordinates,
              zoom: zoomLevel,
              duration: 1200,
              easing: (t: number) => 1 - Math.pow(1 - t, 3)
            });
          } else {
            // Fallback: centrar en el país usando bounds si no se encuentra la capital
            if (feature.geometry) {
              try {
                let coordinates: number[][];
                
                if (feature.geometry.type === 'Polygon') {
                  coordinates = feature.geometry.coordinates[0];
                } else if (feature.geometry.type === 'MultiPolygon') {
                  // Para MultiPolygon, usar el primer polígono
                  coordinates = feature.geometry.coordinates[0][0];
                } else {
                  throw new Error('Unsupported geometry type');
                }
                
                const bounds = coordinates.reduce((bounds: mapboxgl.LngLatBounds, coord: number[]) => {
                  return bounds.extend(coord as [number, number]);
                }, new mapboxgl.LngLatBounds());
                
                map.fitBounds(bounds, {
                  padding: { top: 50, bottom: 50, left: 200, right: 200 },
                  duration: 1200,
                  maxZoom: 6,
                  easing: (t: number) => {
                    return 1 - Math.pow(1 - t, 3);
                  }
                });
              } catch (error) {
                console.warn('Error processing country geometry:', error);
                // Fallback: centrar en el punto de clic
                if (e.lngLat) {
                  map.easeTo({
                    center: [e.lngLat.lng, e.lngLat.lat],
                    zoom: Math.min(Math.max(map.getZoom(), 3), 5),
                    duration: 1200,
                    easing: (t: number) => 1 - Math.pow(1 - t, 3)
                  });
                }
              }
            } else if (e.lngLat) {
              // Fallback: centrar en el punto de clic
              map.easeTo({
                center: [e.lngLat.lng, e.lngLat.lat],
                zoom: Math.min(Math.max(map.getZoom(), 3), 5),
                duration: 1200,
                easing: (t: number) => 1 - Math.pow(1 - t, 3)
              });
            }
          }
          
          handleCountrySelection(countryName);
        }
      };

      map.on('click', 'country-highlight', handleCountryClick);
      eventListenersRef.current.push({ event: 'click', handler: handleCountryClick, layer: 'country-highlight' });
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
    const handleMouseDown = () => { userInteracting = true; };
    const handleMouseUp = () => { 
      userInteracting = false; 
      spinGlobe(); 
    };
    const handleDragEnd = () => { 
      userInteracting = false; 
      spinGlobe(); 
    };
    const handlePitchEnd = () => { 
      userInteracting = false; 
      spinGlobe(); 
    };
    const handleRotateEnd = () => { 
      userInteracting = false; 
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

  // Apply/remove alignment overlay paint
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;
    const layerId = 'country-alignment';
    const source = 'country-boundaries';
    const sourceLayer = 'country_boundaries';

    if (alignmentOverlayEnabled) {
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'fill',
          source,
          'source-layer': sourceLayer,
          paint: {
            'fill-color': {
              property: 'name_en',
              type: 'categorical',
              stops: [
                ['United States', '#053061'],
                ['China', '#67001f']
              ]
            },
            'fill-opacity': 0.35
          }
        });
      }
      setAlignmentPaintApplied(true);
    } else if (alignmentPaintApplied) {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      setAlignmentPaintApplied(false);
    }
  }, [alignmentOverlayEnabled, isMapLoaded, alignmentPaintApplied]);

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
        const conflictGeoJSON = conflictsToGeoJSON(conflicts);
        ConflictVisualization.updateConflictMarkers(mapRef.current, conflictGeoJSON);
        ConflictVisualization.updateVisualization(mapRef.current, selectedConflictId ?? null, conflicts);
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
      <div 
        ref={geocoderContainer} 
        className="geocoder-container absolute left-1/2 transform -translate-x-1/2 z-20 w-80"
        style={{ top: '40px' }}
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
