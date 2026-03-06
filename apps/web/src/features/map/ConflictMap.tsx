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

export default function ConflictMap({ conflicts, onConflictClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, isReady } = useMapbox(containerRef);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map || !isReady) return;

    // Clear previous markers
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

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(
        `<div style="padding:4px 8px">
          <strong style="color:#fff">${conflict.name}</strong><br/>
          <span style="color:${color};font-weight:600">${statusLabel(conflict.status)}</span>
          <span style="color:#94a3b8;margin-left:6px">${conflict.region}</span>
        </div>`
      );

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([conflict.coordinates.lng, conflict.coordinates.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => onConflictClick?.(conflict.slug));

      markersRef.current.push(marker);
    });
  }, [map, isReady, conflicts, onConflictClick]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-slate-700/50"
      style={{ height: 400 }}
    />
  );
}
