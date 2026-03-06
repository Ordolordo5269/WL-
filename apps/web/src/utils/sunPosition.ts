/**
 * Sun position on screen from geographic position and time.
 * Uses SunCalc (external) for astronomy; we only map angles to overlay coordinates.
 *
 * Convention: zenith at top-center, horizon as a line near bottom.
 * North = azimuth 0 = top; azimuth increases clockwise (east = π/2).
 * Bearing rotates the sky so it matches the map's north.
 */

import * as SunCalc from 'suncalc';

export interface SunScreenPosition {
  x: number;
  y: number;
  altitude: number;
  visible: boolean;
  opacity: number;
  sizePx: number;
}

export interface MapDimensions {
  width: number;
  height: number;
}

/** Default center when map is not ready (e.g. Madrid). Same order as map.getCenter().toArray(): [lng, lat]. */
const DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168];

/** Zenith Y as fraction of height (0 = top). Horizon ends near bottom. */
const ZENITH_Y_FRAC = 0.22;
const HORIZON_Y_FRAC = 0.88;

/** Opacity: full at high altitude, fade near horizon. */
const OPACITY_AT_ZENITH = 0.92;
const OPACITY_AT_HORIZON = 0.5;

/** Size: slightly larger near horizon (sunset effect). Base size in px. */
const SUN_SIZE_BASE_PX = 56;
const SUN_SIZE_HORIZON_MULTIPLIER = 1.35;

/**
 * Get sun position in overlay pixel coordinates.
 * Uses client time and map center (or default) for SunCalc.
 */
export function getSunScreenPosition(
  centerLngLat: [number, number] | null,
  date: Date,
  dimensions: MapDimensions,
  bearingDeg: number = 0
): SunScreenPosition {
  const { width, height } = dimensions;
  const [lng, lat] = centerLngLat ?? DEFAULT_CENTER;
  const pos = SunCalc.getPosition(date, lat, lng);
  const altitude = pos.altitude; // radians, 0 = horizon, > 0 above
  let azimuth = pos.azimuth; // radians, 0 = north, clockwise
  const bearingRad = (bearingDeg * Math.PI) / 180;
  azimuth = azimuth - bearingRad;

  const visible = altitude >= 0 && width > 0 && height > 0;
  const horizonY = height * HORIZON_Y_FRAC;
  const zenithY = height * ZENITH_Y_FRAC;
  const altFrac = Math.min(1, Math.max(0, altitude / (Math.PI / 2)));
  const y = horizonY - (horizonY - zenithY) * altFrac;
  const radiusAtHorizon = width * 0.48;
  const radiusFrac = 1 - altFrac;
  const x = width / 2 + radiusAtHorizon * Math.sin(azimuth) * radiusFrac;

  const opacity =
    visible ?
      OPACITY_AT_HORIZON + (OPACITY_AT_ZENITH - OPACITY_AT_HORIZON) * altFrac
    : 0;
  const sizePx =
    SUN_SIZE_BASE_PX *
    (1 + (SUN_SIZE_HORIZON_MULTIPLIER - 1) * (1 - altFrac));

  return { x, y, altitude, visible, opacity, sizePx };
}
