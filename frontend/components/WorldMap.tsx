import React, { useRef, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '../src/styles/geocoder.css';

mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN;

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  onResetView?: () => void;
  conflicts?: Array<{
    id: string;
    country: string;
    status: 'War' | 'Warm' | 'Improving';
    coordinates: { lat: number; lng: number };
    description: string;
    casualties: number;
  }>;
  onConflictClick?: (conflictId: string) => void;
  selectedConflictId?: string | null;
}

const WorldMap = forwardRef<any, WorldMapProps>(({ onCountrySelect, selectedCountry, onResetView, conflicts = [], onConflictClick, selectedConflictId }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedCountryId = useRef<string | number | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animationFrameRef = useRef<number>();

  // Memoized conflict data for better performance
  const conflictGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: conflicts.map(conflict => ({
      type: 'Feature' as const,
      properties: {
        id: conflict.id,
        country: conflict.country,
        status: conflict.status,
        description: conflict.description,
        casualties: conflict.casualties
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [conflict.coordinates.lng, conflict.coordinates.lat]
      }
    }))
  }), [conflicts]);

  // Optimized map methods
  const easeTo = useCallback((options: any) => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        ...options,
        easing: (t: number) => 1 - Math.pow(1 - t, 3) // Smooth easing
      });
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
      optimizeForTerrain: true,
      fadeDuration: 300, // Smooth transitions
      crossSourceCollisions: false, // Better performance
      attributionControl: false // Eliminar marca de agua de Mapbox
    });

    mapRef.current = map;

    // Buscador de países en inglés
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken as string,
      mapboxgl: mapboxgl as any,
      types: 'country',
      language: 'en',
      placeholder: 'Search country',
      clearOnBlur: true,
      clearAndBlurOnEsc: true,
      collapsed: false
    });
    
    // Evento cuando se selecciona un país desde el geocoder
    geocoder.on('result', (e) => {
      const countryName = e.result.place_name || e.result.text;
      const coordinates = e.result.center;
      
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
        
        // Centrar el mapa en las coordenadas del geocoder (capital/centro del país)
        map.easeTo({
          center: coordinates,
          zoom: 5, // Zoom fijo para mostrar la capital con contexto
          duration: 1200,
          easing: (t: number) => 1 - Math.pow(1 - t, 3)
        });
        
        // Llamar a la función de selección de país
         const finalCountryName = matchingFeature.properties?.name_en || matchingFeature.properties?.name || countryName;
         onCountrySelect(finalCountryName);
       } else {
         // Si no se encuentra el feature, al menos centrar en las coordenadas
         map.easeTo({
           center: coordinates,
           zoom: 5, // Zoom fijo para mostrar la capital con contexto
           duration: 1200,
           easing: (t: number) => 1 - Math.pow(1 - t, 3)
         });
         
         // Llamar a la función de selección con el nombre del geocoder
         onCountrySelect(countryName);
       }
       
       // Limpiar el input del geocoder para permitir nuevas búsquedas
       setTimeout(() => {
         geocoder.clear();
       }, 100);
    });
    
    if (geocoderContainer.current) {
      geocoderContainer.current.innerHTML = '';
      geocoderContainer.current.appendChild(geocoder.onAdd(map));
    }

    // Habilitar controles de navegación
    map.addControl(new mapboxgl.NavigationControl());
    
    // Configurar zoom fluido y suave
    map.scrollZoom.setWheelZoomRate(1/450); // Más suave
    map.scrollZoom.setZoomRate(1/150); // Más controlado
    
    // Configurar transiciones suaves para el mapa
    map.on('movestart', () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    });
    
    map.on('moveend', () => {
      // Optimizar renderizado después del movimiento
      animationFrameRef.current = requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.triggerRepaint();
        }
      });
    });
    
    // Configurar el globo y capas cuando el mapa esté cargado
    map.on('load', () => {
      // Configurar la atmósfera del globo
      map.setFog({
        'color': 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      });

      // Agregar fuente de datos para conflictos optimizada
      map.addSource('conflicts', {
        type: 'geojson',
        data: conflictGeoJSON,
        cluster: false,
        buffer: 32, // Reduced buffer for better performance
        maxzoom: 12, // Lower maxzoom to reduce detail at high zoom
        tolerance: 0.375 // Simplify geometries for better performance
      });

      // Optimized conflict visualization - only 2 layers instead of 5
      // Main conflict marker
      map.addLayer({
        id: 'conflicts-base',
        type: 'circle',
        source: 'conflicts',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'status'], 'War'], 7,
            ['==', ['get', 'status'], 'Warm'], 6,
            5 // Improving
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'War'], '#DC2626', // Bright red
            ['==', ['get', 'status'], 'Warm'], '#F59E0B', // Amber
            '#10B981' // Emerald
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'status'], 'War'], '#FCA5A5',
            ['==', ['get', 'status'], 'Warm'], '#FDE68A',
            '#A7F3D0'
          ],
          'circle-stroke-opacity': 0.8
        }
      });

      // Simple glow effect - single layer without blur
      map.addLayer({
        id: 'conflicts-glow',
        type: 'circle',
        source: 'conflicts',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'status'], 'War'], 14,
            ['==', ['get', 'status'], 'Warm'], 12,
            10 // Improving
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'War'], '#DC2626',
            ['==', ['get', 'status'], 'Warm'], '#F59E0B',
            '#10B981'
          ],
          'circle-opacity': 0.3
        }
      });

      // Simplified animation - less CPU intensive
      let pulsePhase = 0;
      let animationId: number;
      
      const animateConflicts = () => {
        pulsePhase = (pulsePhase + 0.02) % (Math.PI * 2); // Slower animation
        
        // Simple pulse effect for glow layer only
        const glowOpacity = 0.2 + Math.sin(pulsePhase) * 0.1;
        
        try {
          map.setPaintProperty('conflicts-glow', 'circle-opacity', glowOpacity);
        } catch (error) {
          // Silently handle errors if layer doesn't exist
        }
        
        animationId = requestAnimationFrame(animateConflicts);
      };
      
      // Start animation
      animateConflicts();
      
      // Cleanup function for animation
      const cleanupAnimation = () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
      
      // Store cleanup function for later use
      (map as any)._conflictAnimationCleanup = cleanupAnimation;

      // Eventos para conflictos
      map.on('click', 'conflicts-base', (e) => {
        if (e.features && e.features.length > 0 && onConflictClick) {
          const conflictId = e.features[0].properties?.id;
          if (conflictId) {
            onConflictClick(conflictId);
          }
        }
      });

      map.on('mouseenter', 'conflicts-base', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'conflicts-base', () => {
        map.getCanvas().style.cursor = 'grab';
      });

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

      // Capa para países involucrados en conflictos (resaltado en rojo)
      map.addLayer({
        id: 'country-conflict-highlight',
        type: 'fill',
        source: 'country-boundaries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': '#ff6b6b',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            0.4,
            0
          ]
        }
      });

      // Capa de borde para países en conflicto
      map.addLayer({
        id: 'country-conflict-border',
        type: 'line',
        source: 'country-boundaries',
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': '#ff6b6b',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            2,
            0
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'conflicted'], false],
            0.6,
            0
          ]
        }
      });

      let hoveredId: number | string | null = null;
      let hoverTimeout: NodeJS.Timeout | null = null;

      // Eventos de hover optimizados
      map.on('mousemove', 'country-highlight', (e) => {
        if (e.features && e.features.length > 0) {
          const id = e.features[0].id;
          
          // Solo actualizar si el ID cambió
          if (id !== hoveredId) {
            // Limpiar timeout anterior
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
            }
            
            // Limpiar hover anterior
            if (hoveredId !== null) {
              map.setFeatureState(
                { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId },
                { hover: false }
              );
            }
            
            hoveredId = id as number | string | null;
            
            // Aplicar nuevo hover con pequeño delay para evitar flickering
            hoverTimeout = setTimeout(() => {
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
      });

      map.on('mouseleave', 'country-highlight', () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
        
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId },
            { hover: false }
          );
        }
        hoveredId = null;
        map.getCanvas().style.cursor = 'grab';
      });

      // Evento de clic para seleccionar país
      map.on('click', 'country-highlight', (e) => {
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
          
          // Centrar el mapa en el país seleccionado con animación suave
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
                padding: { top: 50, bottom: 50, left: 200, right: 200 }, // Padding equilibrado para centrar correctamente
                duration: 1200,
                maxZoom: 6,
                easing: (t: number) => {
                  // Easing más suave: ease-out-cubic
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
          
          onCountrySelect(countryName);
        }
      });
    });

    // Animación de rotación automática
    let userInteracting = false;
    const spinEnabled = false;

    function spinGlobe() {
      const zoom = map.getZoom();
      if (spinEnabled && !userInteracting && zoom < 5) {
        const distancePerSecond = 360 / 120;
        const center = map.getCenter();
        center.lng -= distancePerSecond;
        map.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }

    // Pausar rotación durante interacción del usuario
    map.on('mousedown', () => {
      userInteracting = true;
    });

    map.on('mouseup', () => {
      userInteracting = false;
      spinGlobe();
    });

    map.on('dragend', () => {
      userInteracting = false;
      spinGlobe();
    });

    map.on('pitchend', () => {
      userInteracting = false;
      spinGlobe();
    });

    map.on('rotateend', () => {
      userInteracting = false;
      spinGlobe();
    });

    map.on('moveend', () => {
      spinGlobe();
    });

    // Iniciar la rotación
    spinGlobe();

    // Cleanup
    return () => {
      if (geocoder) {
        geocoder.onRemove();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Solo ejecutar una vez

  // Efecto para actualizar conflictos cuando cambien
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getSource('conflicts')) return;

    const conflictGeoJSON = {
      type: 'FeatureCollection' as const,
      features: conflicts.map(conflict => ({
        type: 'Feature' as const,
        properties: {
          id: conflict.id,
          country: conflict.country,
          status: conflict.status,
          description: conflict.description,
          casualties: conflict.casualties
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [conflict.coordinates.lng, conflict.coordinates.lat]
        }
      }))
    };

    (mapRef.current.getSource('conflicts') as mapboxgl.GeoJSONSource).setData(conflictGeoJSON);
  }, [conflicts]);

  // Función para obtener países involucrados en un conflicto
  const getCountriesInConflict = (conflictId: string): string[] => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return [];
    
    // Mapear países basado en el ID del conflicto
    const countryMappings: { [key: string]: string[] } = {
      // Conflictos existentes
      'ukr-001': ['Ukraine', 'Russia'],
      'syr-001': ['Syria'],
      'eth-001': ['Ethiopia'],
      'mmr-001': ['Myanmar'],
      'afg-001': ['Afghanistan'],
      'yem-001': ['Yemen', 'Saudi Arabia'],
      'som-001': ['Somalia'],
      'col-001': ['Colombia'],
      'mli-001': ['Mali'],
      'irq-001': ['Iraq'],
      'israel-iran-war': ['Israel', 'Iran'],
      'mexico-drug-war': ['Mexico'],
      'haiti-gang-violence': ['Haiti'],
      'post-isis-stabilization-iraq': ['Iraq'],
      // Nuevos conflictos agregados
      'myanmar-civil-war': ['Myanmar'],
      'russia-ukraine-war': ['Ukraine', 'Russia'],
      'syrian-civil-war': ['Syria'],
      'yemen-civil-war': ['Yemen', 'Saudi Arabia'],
      'israel-hamas-war': ['Israel', 'Palestine'],
      'libya-civil-war': ['Libya'],
      'sudan-civil-war': ['Sudan'],
      'somalia-insurgency': ['Somalia'],
      'nigeria-insurgency': ['Nigeria'],
      'mozambique-insurgency': ['Mozambique']
    };
    
    return countryMappings[conflictId] || [conflict.country];
  };

  // Efecto para manejar el resaltado de países en conflicto
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getSource('country-boundaries')) return;
    
    const map = mapRef.current;
    
    // Limpiar todos los estados de conflicto anteriores
    const features = map.querySourceFeatures('country-boundaries', {
      sourceLayer: 'country_boundaries'
    });
    
    features.forEach((feature: any) => {
      if (feature.id) {
        map.setFeatureState(
          { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: feature.id },
          { conflicted: false }
        );
      }
    });
    
    // Si hay un conflicto seleccionado, resaltar los países involucrados
    if (selectedConflictId) {
      const countriesInConflict = getCountriesInConflict(selectedConflictId);
      
      features.forEach((feature: any) => {
        if (feature.id && feature.properties) {
          const countryName = feature.properties.name_en || feature.properties.name || '';
          const isInConflict = countriesInConflict.some(conflictCountry => 
            countryName.toLowerCase().includes(conflictCountry.toLowerCase()) ||
            conflictCountry.toLowerCase().includes(countryName.toLowerCase())
          );
          
          if (isInConflict) {
            map.setFeatureState(
              { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: feature.id },
              { conflicted: true }
            );
          }
        }
      });
    }
  }, [selectedConflictId, conflicts]);

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
      setTimeout(() => {
        resetMapView();
      }, 100);
    }
  }, [selectedCountry]);
  
  // Exponer la función de reset a través de onResetView
  useEffect(() => {
    if (onResetView) {
      // Asignar la función de reset al callback
      (window as any).resetMapView = resetMapView;
    }
  }, [onResetView]);
  
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

export default WorldMap;
