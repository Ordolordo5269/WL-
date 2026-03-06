import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export function useMapbox(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [20, 20],
      zoom: 1.8,
      projection: 'mercator',
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => setIsReady(true));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsReady(false);
    };
  }, [containerRef]);

  return { map: mapRef.current, isReady };
}
