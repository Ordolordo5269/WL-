import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { useEffect, useRef } from 'react';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN;

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [0, 20],
      zoom: 2,
      minZoom: 0.5,
      maxZoom: 20,
      projection: 'globe',
      antialias: true,
      scrollZoom: true, // Habilitar zoom simple con scroll
      doubleClickZoom: true,
      touchZoomRotate: true,
      boxZoom: true,
      keyboard: true,
      renderWorldCopies: false
    });

    mapRef.current = map;

    // Buscador de países en inglés
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      types: 'country',
      language: 'en',
      placeholder: 'Search country'
    });
    if (geocoderContainer.current) {
      geocoderContainer.current.innerHTML = '';
      geocoderContainer.current.appendChild(geocoder.onAdd(map));
    }

    // Habilitar controles de navegación
    map.addControl(new mapboxgl.NavigationControl());
    
    // Configurar zoom fluido sin presionar rueda
    map.scrollZoom.setWheelZoomRate(1/300); // Sensibilidad reducida (era 1/100)
    map.scrollZoom.setZoomRate(1/100); // Velocidad más lenta (era 1/30)
    
    // Configurar el globo y capas cuando el mapa esté cargado
    map.on('load', () => {
      // Configurar la atmósfera del globo
      map.setFog({
        'color': 'rgb(186, 210, 235)', // Color azul claro
        'high-color': 'rgb(36, 92, 223)', // Color azul más oscuro en el horizonte
        'horizon-blend': 0.02, // Suavidad del horizonte
        'space-color': 'rgb(11, 11, 25)', // Color del espacio
        'star-intensity': 0.6 // Intensidad de las estrellas
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
          'fill-color': '#87CEEB', // Color azul cielo más suave
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.2, // Opacidad mucho más suave (era 0.5)
            0
          ]
        }
      });

      let hoveredId: number | string | null = null;

      map.on('mousemove', 'country-highlight', (e) => {
        if (e.features && e.features.length > 0) {
          const id = e.features[0].id;
          if (hoveredId !== null) {
            map.setFeatureState(
              { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId },
              { hover: false }
            );
          }
          hoveredId = id as number | string | null;
          if (hoveredId !== null) {
            map.setFeatureState(
              { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId },
              { hover: true }
            );
          }
        }
      });

      map.on('mouseleave', 'country-highlight', () => {
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId },
            { hover: false }
          );
        }
        hoveredId = null;
      });
    });

    // Animación de rotación automática (comentado temporalmente)
    let userInteracting = false;
    const spinEnabled = false; // Deshabilitado para probar zoom

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
      geocoder.onRemove();
      map.remove();
    };
  }, []);

  return (
    <>
      <div
        ref={mapContainer}
        className="fixed inset-0 w-full h-full"
        style={{ cursor: 'grab' }}
      />
      <div ref={geocoderContainer} className="absolute top-4 right-4 z-10 w-64" />
    </>
  );
}
