import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export function useMapbox(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initRef.current) return;

    if (!MAPBOX_TOKEN) {
      console.error('[useMapbox] VITE_MAPBOX_TOKEN is not defined. Add it to your .env file.');
      return;
    }

    initRef.current = true;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const instance = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [20, 20],
      zoom: 1.8,
      projection: 'mercator',
    });

    instance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    instance.on('load', () => setMap(instance));

    return () => {
      instance.remove();
      setMap(null);
      initRef.current = false;
    };
  }, [containerRef]);

  return { map };
}
