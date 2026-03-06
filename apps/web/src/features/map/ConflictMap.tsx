import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapbox } from './useMapbox';
import type { ConflictV2 } from '../conflicts/types';
import { statusToSeverity, severityColor, statusLabel } from '../conflicts/types';

interface Props {
  conflicts: ConflictV2[];
  onConflictClick?: (slug: string) => void;
}

function createPopupContent(name: string, status: string, color: string, region: string): HTMLDivElement {
  const container = document.createElement('div');
  container.style.padding = '4px 8px';

  const strong = document.createElement('strong');
  strong.style.color = '#fff';
  strong.textContent = name;
  container.appendChild(strong);

  container.appendChild(document.createElement('br'));

  const statusSpan = document.createElement('span');
  statusSpan.style.color = color;
  statusSpan.style.fontWeight = '600';
  statusSpan.textContent = status;
  container.appendChild(statusSpan);

  const regionSpan = document.createElement('span');
  regionSpan.style.color = '#94a3b8';
  regionSpan.style.marginLeft = '6px';
  regionSpan.textContent = region;
  container.appendChild(regionSpan);

  return container;
}

export default function ConflictMap({ conflicts, onConflictClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map } = useMapbox(containerRef);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const cleanupRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!map) return;

    // Clean up previous markers and listeners
    cleanupRef.current.forEach(fn => fn());
    cleanupRef.current = [];
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    conflicts.forEach(conflict => {
      const severity = statusToSeverity(conflict.status);
      const color = severityColor(severity);
      const size = 10 + severity * 3;

      const el = document.createElement('div');
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '2px solid rgba(255,255,255,0.6)';
      el.style.cursor = 'pointer';
      el.style.boxShadow = `0 0 ${severity * 2}px ${color}80`;

      const popupContent = createPopupContent(
        conflict.name,
        statusLabel(conflict.status),
        color,
        conflict.region,
      );
      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
        .setDOMContent(popupContent);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([conflict.coordinates.lng, conflict.coordinates.lat])
        .setPopup(popup)
        .addTo(map);

      const handler = () => onConflictClick?.(conflict.slug);
      el.addEventListener('click', handler);
      cleanupRef.current.push(() => el.removeEventListener('click', handler));

      markersRef.current.push(marker);
    });

    return () => {
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, conflicts, onConflictClick]);

  if (!import.meta.env.VITE_MAPBOX_TOKEN) {
    return (
      <div className="w-full rounded-xl border border-slate-700/50 bg-slate-800/60 flex items-center justify-center text-slate-400 text-sm" style={{ height: 400 }}>
        Mapbox token not configured. Add VITE_MAPBOX_TOKEN to your .env file.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-slate-700/50"
      style={{ height: 400 }}
    />
  );
}
