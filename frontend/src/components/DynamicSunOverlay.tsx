/**
 * Dynamic sun overlay for the map. Uses an external sun image and SunCalc for position.
 * Only visible when style is "night" and sun is above horizon.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import type mapboxgl from 'mapbox-gl';
import { getSunScreenPosition, type SunScreenPosition, type MapDimensions } from '../utils/sunPosition';
import type { PlanetPreset } from './map/mapAppearance';

/** External sun asset: Feather Icons (MIT) – minimal sun icon, easy to tint with CSS. */
const SUN_IMAGE_URL = 'https://unpkg.com/feather-icons@4.29.0/dist/icons/sun.svg';

const UPDATE_INTERVAL_MS = 60_000;
const MAP_MOVE_DEBOUNCE_MS = 400;

/** Aesthetic: filter and glow per preset so sun matches fog atmosphere. */
const PRESET_STYLES: Record<
  PlanetPreset,
  { filter: string; glowColor: string; glowBlur: number }
> = {
  default: {
    filter: 'brightness(1.05) saturate(0.9)',
    glowColor: 'rgba(36, 92, 223, 0.35)',
    glowBlur: 28,
  },
  nebula: {
    filter: 'brightness(0.95) saturate(0.85) hue-rotate(-15deg)',
    glowColor: 'rgba(120, 80, 200, 0.4)',
    glowBlur: 32,
  },
  sunset: {
    filter: 'brightness(1.1) saturate(1.15)',
    glowColor: 'rgba(200, 90, 60, 0.45)',
    glowBlur: 36,
  },
  dawn: {
    filter: 'brightness(1.05) saturate(1)',
    glowColor: 'rgba(120, 170, 230, 0.4)',
    glowBlur: 30,
  },
};

const TRANSITION_MS = 280;

export interface DynamicSunOverlayProps {
  /** Map container div (for dimensions and overlay coverage). */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Map instance ref (for getCenter, getBearing). */
  mapRef: React.RefObject<mapboxgl.Map | null>;
  styleKey: 'night' | 'light' | 'outdoors';
  planetPreset: PlanetPreset;
}

export function DynamicSunOverlay({
  containerRef,
  mapRef,
  styleKey,
  planetPreset,
}: DynamicSunOverlayProps) {
  const [state, setState] = useState<SunScreenPosition>({
    x: 0,
    y: 0,
    altitude: 0,
    visible: false,
    opacity: 0,
    sizePx: 56,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimensionsRef = useRef<MapDimensions>({ width: 0, height: 0 });

  const update = useCallback(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!container || styleKey !== 'night') {
      setState((prev) => ({ ...prev, visible: false }));
      return;
    }
    const width = container.clientWidth;
    const height = container.clientHeight;
    dimensionsRef.current = { width, height };
    const center = map ? (map.getCenter().toArray() as [number, number]) : null;
    const bearing = map ? map.getBearing() : 0;
    const next = getSunScreenPosition(
      center,
      new Date(),
      { width, height },
      bearing
    );
    setState(next);
  }, [mapRef, containerRef, styleKey]);

  useEffect(() => {
    update();
    const interval = setInterval(update, UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [update]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleKey !== 'night') return;
    const onMove = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(update, MAP_MOVE_DEBOUNCE_MS);
    };
    map.on('moveend', onMove);
    map.on('zoomend', onMove);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.off('moveend', onMove);
      map.off('zoomend', onMove);
    };
  }, [mapRef, styleKey, update]);

  useEffect(() => {
    if (styleKey !== 'night') return;
    const ro = new ResizeObserver(update);
    const el = containerRef.current;
    if (el) ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [styleKey, containerRef, update]);

  if (styleKey !== 'night' || !state.visible) return null;

  const presetStyle = PRESET_STYLES[planetPreset];
  return (
    <div
      className="dynamic-sun-overlay"
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: state.x,
          top: state.y,
          width: state.sizePx,
          height: state.sizePx,
          transform: 'translate(-50%, -50%)',
          opacity: state.opacity,
          filter: presetStyle.filter,
          boxShadow: `0 0 ${presetStyle.glowBlur}px ${presetStyle.glowColor}`,
          transition: `opacity ${TRANSITION_MS}ms ease-out, left ${TRANSITION_MS}ms ease-out, top ${TRANSITION_MS}ms ease-out`,
        }}
      >
        <img
          src={SUN_IMAGE_URL}
          alt=""
          width={state.sizePx}
          height={state.sizePx}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
