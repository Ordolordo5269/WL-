import React from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { useEffect, useRef } from 'react';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '../src/styles/geocoder.css';

mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN;

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  onResetView?: () => void;
}

export default function WorldMap({ onCountrySelect, selectedCountry, onResetView }: WorldMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedCountryId = useRef<string | number | null>(null);

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
      performanceMetricsCollection: false // Mejorar rendimiento
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
    
    // Configurar zoom fluido sin presionar rueda
    map.scrollZoom.setWheelZoomRate(1/300);
    map.scrollZoom.setZoomRate(1/100);
    
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
                padding: { top: 100, bottom: 100, left: 100, right: 450 }, // Espacio para el sidebar
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
    
    // Regresar a la vista principal del globo
    mapRef.current.easeTo({
      center: [0, 20],
      zoom: 2,
      duration: 1500,
      easing: (t: number) => 1 - Math.pow(1 - t, 3)
    });
  };

  // Efecto para manejar cambios en el país seleccionado
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (!selectedCountry && selectedCountryId.current) {
      resetMapView();
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
}
