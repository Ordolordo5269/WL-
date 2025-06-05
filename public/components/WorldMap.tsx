import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [0, 20],
      zoom: 2,
      projection: 'globe', // Proyección de globo 3D
      antialias: true
    });

    // Habilitar controles de navegación
    map.addControl(new mapboxgl.NavigationControl());
    
    // Configurar el globo cuando el mapa esté cargado
    map.on('load', () => {
      // Configurar la atmósfera del globo
      map.setFog({
        'color': 'rgb(186, 210, 235)', // Color azul claro
        'high-color': 'rgb(36, 92, 223)', // Color azul más oscuro en el horizonte
        'horizon-blend': 0.02, // Suavidad del horizonte
        'space-color': 'rgb(11, 11, 25)', // Color del espacio
        'star-intensity': 0.6 // Intensidad de las estrellas
      });
    });

    // Animación de rotación automática (opcional)
    let userInteracting = false;
    let spinEnabled = true;

    function spinGlobe() {
      const zoom = map.getZoom();
      if (spinEnabled && !userInteracting && zoom < 5) {
        let distancePerSecond = 360 / 120; // Una rotación completa cada 2 minutos
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
    return () => map.remove();
  }, []);

  return (
    <div 
      ref={mapContainer} 
      className="fixed inset-0 w-full h-full" 
      style={{ cursor: 'grab' }}
    />
  );
}
