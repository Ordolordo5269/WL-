import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapbox } from './useMapbox';
import type { ConflictV2 } from '../conflicts/types';
import { statusToSeverity, severityColor, statusLabel } from '../conflicts/types';
import { violenceTypeLabel } from '../ucdp/types';

interface Props {
  conflicts: ConflictV2[];
  onConflictClick?: (slug: string) => void;
  ucdpGeoJson?: GeoJSON.FeatureCollection;
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

function createUcdpPopupContent(props: Record<string, unknown>): HTMLDivElement {
  const container = document.createElement('div');
  container.style.padding = '6px 10px';
  container.style.maxWidth = '280px';

  const title = document.createElement('strong');
  title.style.color = '#fff';
  title.style.display = 'block';
  title.style.marginBottom = '4px';
  title.textContent = String(props.conflictName ?? 'Unknown conflict');
  container.appendChild(title);

  const sides = document.createElement('div');
  sides.style.color = '#cbd5e1';
  sides.style.fontSize = '12px';
  sides.style.marginBottom = '4px';
  sides.textContent = `${props.sideA ?? '?'} vs ${props.sideB ?? '?'}`;
  container.appendChild(sides);

  const typeOfViolence = Number(props.typeOfViolence ?? 0);
  const typeBadge = document.createElement('span');
  typeBadge.style.fontSize = '11px';
  typeBadge.style.padding = '1px 6px';
  typeBadge.style.borderRadius = '9999px';
  typeBadge.style.marginBottom = '4px';
  typeBadge.style.display = 'inline-block';
  if (typeOfViolence === 1) {
    typeBadge.style.backgroundColor = 'rgba(239,68,68,0.2)';
    typeBadge.style.color = '#ef4444';
  } else if (typeOfViolence === 2) {
    typeBadge.style.backgroundColor = 'rgba(249,115,22,0.2)';
    typeBadge.style.color = '#f97316';
  } else {
    typeBadge.style.backgroundColor = 'rgba(234,179,8,0.2)';
    typeBadge.style.color = '#eab308';
  }
  typeBadge.textContent = violenceTypeLabel(typeOfViolence);
  container.appendChild(typeBadge);

  const details = document.createElement('div');
  details.style.color = '#94a3b8';
  details.style.fontSize = '11px';
  details.style.marginTop = '4px';
  const bestEstimate = Number(props.bestEstimate ?? 0);
  const deathsCivilians = Number(props.deathsCivilians ?? 0);
  details.innerHTML = `Deaths: <span style="color:#fff;font-weight:600">${bestEstimate}</span>`;
  if (deathsCivilians > 0) {
    details.innerHTML += ` (${deathsCivilians} civilians)`;
  }
  container.appendChild(details);

  const meta = document.createElement('div');
  meta.style.color = '#64748b';
  meta.style.fontSize = '11px';
  meta.style.marginTop = '2px';
  const country = String(props.country ?? '');
  const dateStart = String(props.dateStart ?? '');
  const datePart = dateStart ? new Date(dateStart).toLocaleDateString() : '';
  meta.textContent = [country, datePart].filter(Boolean).join(' · ');
  container.appendChild(meta);

  return container;
}

const UCDP_SOURCE_ID = 'ucdp-events';
const UCDP_LAYER_ID = 'ucdp-events-layer';

export default function ConflictMap({ conflicts, onConflictClick, ucdpGeoJson }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map } = useMapbox(containerRef);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const cleanupRef = useRef<Array<() => void>>([]);
  const ucdpPopupRef = useRef<mapboxgl.Popup | null>(null);
  const ucdpInitRef = useRef(false);

  // Existing ConflictV2 markers
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

  // UCDP GeoJSON layer setup
  useEffect(() => {
    if (!map) return;

    // Initialize source and layer once
    if (!ucdpInitRef.current) {
      ucdpInitRef.current = true;

      const emptyCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      };

      map.addSource(UCDP_SOURCE_ID, {
        type: 'geojson',
        data: ucdpGeoJson ?? emptyCollection,
      });

      map.addLayer({
        id: UCDP_LAYER_ID,
        type: 'circle',
        source: UCDP_SOURCE_ID,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'bestEstimate'],
            1, 3,
            10, 5,
            50, 8,
            200, 11,
            1000, 15,
          ],
          'circle-color': [
            'match', ['get', 'typeOfViolence'],
            1, '#ef4444',
            2, '#f97316',
            3, '#eab308',
            '#6b7280',
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.3)',
        },
      });

      // Hover popup
      const hoverPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
      });
      ucdpPopupRef.current = hoverPopup;

      const onMouseEnter = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) => {
        map.getCanvas().style.cursor = 'pointer';
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const props = feature.properties ?? {};

        // Handle popup position wrapping
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
        }

        const content = createUcdpPopupContent(props);
        hoverPopup.setLngLat(coords).setDOMContent(content).addTo(map);
      };

      const onMouseLeave = () => {
        map.getCanvas().style.cursor = '';
        hoverPopup.remove();
      };

      map.on('mouseenter', UCDP_LAYER_ID, onMouseEnter);
      map.on('mouseleave', UCDP_LAYER_ID, onMouseLeave);
    } else if (ucdpGeoJson) {
      // Update data on existing source
      const source = map.getSource(UCDP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(ucdpGeoJson);
      }
    }
  }, [map, ucdpGeoJson]);

  // Cleanup UCDP layer on unmount
  useEffect(() => {
    return () => {
      ucdpPopupRef.current?.remove();
      ucdpInitRef.current = false;
    };
  }, []);

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
