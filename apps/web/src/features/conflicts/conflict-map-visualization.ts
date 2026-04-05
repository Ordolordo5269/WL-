import mapboxgl from 'mapbox-gl';
import greatCircle from '@turf/great-circle';
import { point } from '@turf/helpers';
import type { Conflict, ConflictFaction, SupportLink, Faction } from './types';
import { COUNTRY_CENTROIDS } from '../demographics/country-centroids';

// ── Shared constants (also used in ConflictTracker.tsx) ─

export const SIDE_COLORS: Record<string, string> = {
  A: '#3b82f6', B: '#ef4444', C: '#f59e0b', D: '#a855f7', E: '#14b8a6',
};
const SUPPORT_COLORS: Record<string, string> = { MILITARY: '#ff3355', DIPLOMATIC: '#00bbff', ECONOMIC: '#00ff88' };
const SUPPORT_LABELS: Record<string, string> = { MILITARY: 'Military', DIPLOMATIC: 'Diplomatic', ECONOMIC: 'Economic' };

const PULSE_SOURCE = 'conflict-dots-source';
const PULSE_LAYER = 'conflict-dots-layer';
const PULSE_OUTER = 'conflict-dots-pulse';
const LINE_SOURCE = 'ct-lines-src';
const LINE_LAYER = 'ct-lines-layer';
const LINE_GLOW = 'ct-lines-glow';
const LINE_DASH = 'ct-lines-dash';

const EU_CENTER: [number, number] = [4.35, 50.85];
const FACTION_ORG_SLUG: Record<string, string> = { 'eu-bloc': 'eu' };

// ── Module state ────────────────────────────────────

let activeMarkers: mapboxgl.Marker[] = [];
let activePopup: mapboxgl.Popup | null = null;
let pulseAnimFrame: number | null = null;

// Store event handler refs for cleanup
let boundClickHandler: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
let boundEnterHandler: (() => void) | null = null;
let boundLeaveHandler: (() => void) | null = null;
let boundLineEnterHandler: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
let boundLineLeaveHandler: (() => void) | null = null;

// ── Shared helpers ──────────────────────────────────

export function fmt(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function getFactionCoords(faction: Faction, fallback: [number, number]): [number, number] {
  if (faction.countryIso && COUNTRY_CENTROIDS[faction.countryIso]) {
    return COUNTRY_CENTROIDS[faction.countryIso];
  }
  if (faction.id.includes('eu')) return EU_CENTER;
  return fallback;
}

/** Offset start/end points perpendicular to the line for parallel arcs */
function offsetEndpoints(from: [number, number], to: [number, number], deg: number): [[number, number], [number, number]] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = -dy / len * deg;
  const py = dx / len * deg;
  return [[from[0] + px, from[1] + py], [to[0] + px, to[1] + py]];
}

/** Great circle arc — npoints scales with distance for efficiency */
function makeArc(from: [number, number], to: [number, number]): GeoJSON.Feature {
  const start = point(from);
  const end = point(to);
  // Scale resolution: short arcs need fewer points
  const dist = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);
  const npoints = Math.max(10, Math.min(50, Math.round(dist * 2)));
  try {
    return greatCircle(start, end, { npoints });
  } catch {
    return { type: 'Feature', geometry: { type: 'LineString', coordinates: [from, to] }, properties: {} };
  }
}

/** Position factions around conflict center — supports any number of sides */
function computeFactionPositions(
  conflict: Conflict,
  factions: ConflictFaction[],
  supportLinks: SupportLink[],
): Map<string, [number, number]> {
  const positions = new Map<string, [number, number]>();
  const { lng, lat } = conflict;

  // Group factions by side dynamically
  const sideGroups = new Map<string, ConflictFaction[]>();
  for (const cf of factions) {
    if (!sideGroups.has(cf.side)) sideGroups.set(cf.side, []);
    sideGroups.get(cf.side)!.push(cf);
  }

  const sideKeys = [...sideGroups.keys()].sort();
  const sideCount = sideKeys.length;

  // Distribute sides radially around the conflict center
  sideKeys.forEach((side, sideIdx) => {
    const members = sideGroups.get(side)!;
    // Angle for this side (evenly spaced around center)
    const angle = (sideIdx / sideCount) * 2 * Math.PI - Math.PI / 2;
    const radius = 4; // degrees from center

    const centerX = lng + Math.cos(angle) * radius;
    const centerY = lat + Math.sin(angle) * radius;

    // Spread members within this side's area
    members.forEach((cf, i) => {
      const spread = 2.5;
      const memberOffset = (i - (members.length - 1) / 2) * spread;
      // Perpendicular to radial direction
      const perpX = -Math.sin(angle) * memberOffset * 0.5;
      const perpY = Math.cos(angle) * memberOffset * 0.5;
      positions.set(cf.factionId, [centerX + perpX, centerY + perpY]);
    });
  });

  // Supporters at real country centroids
  const belligerentIds = new Set(factions.map((f) => f.factionId));
  for (const link of supportLinks) {
    if (!belligerentIds.has(link.fromId) && !positions.has(link.fromId)) {
      positions.set(link.fromId, getFactionCoords(link.from, [lng, lat]));
    }
  }
  return positions;
}

// ── Country highlighting (async — expands orgs) ─────

async function fetchOrgMembers(slug: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/organizations/${slug}/members`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.members ?? []).map((m: { iso3: string }) => m.iso3);
  } catch { return []; }
}

export async function getInvolvedCountryIsos(conflict: Conflict): Promise<Record<string, string>> {
  const isoToColor: Record<string, string> = {};
  const factions = conflict.factions ?? [];
  const links = conflict.supportLinks ?? [];

  for (const cf of factions) {
    if (cf.faction.countryIso) isoToColor[cf.faction.countryIso] = SIDE_COLORS[cf.side] ?? '#888';
  }

  const belligerentIds = new Set(factions.map((f) => f.factionId));
  const expansions: Promise<void>[] = [];

  for (const link of links) {
    if (belligerentIds.has(link.fromId)) continue;
    const color = SUPPORT_COLORS[link.type] ?? '#6b7280';
    const orgSlug = FACTION_ORG_SLUG[link.fromId];
    if (orgSlug) {
      expansions.push(fetchOrgMembers(orgSlug).then((m) => { for (const iso of m) if (!isoToColor[iso]) isoToColor[iso] = color; }));
    } else if (link.from.countryIso && !isoToColor[link.from.countryIso]) {
      isoToColor[link.from.countryIso] = color;
    }
  }
  await Promise.all(expansions);
  return isoToColor;
}

// ── Pulsing conflict dots (State 1) ─────────────────

function cleanupDotListeners(map: mapboxgl.Map) {
  if (boundClickHandler && map.getLayer(PULSE_LAYER)) { map.off('click', PULSE_LAYER, boundClickHandler); boundClickHandler = null; }
  if (boundEnterHandler && map.getLayer(PULSE_LAYER)) { map.off('mouseenter', PULSE_LAYER, boundEnterHandler); boundEnterHandler = null; }
  if (boundLeaveHandler && map.getLayer(PULSE_LAYER)) { map.off('mouseleave', PULSE_LAYER, boundLeaveHandler); boundLeaveHandler = null; }
}

export function showConflictDots(map: mapboxgl.Map, conflicts: Conflict[]) {
  removeConflictDots(map);
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: conflicts.map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
      properties: { id: c.id, name: c.name },
    })),
  };
  map.addSource(PULSE_SOURCE, { type: 'geojson', data: geojson });
  map.addLayer({ id: PULSE_OUTER, type: 'circle', source: PULSE_SOURCE, paint: { 'circle-radius': 18, 'circle-color': '#ef4444', 'circle-opacity': 0.25 } });
  map.addLayer({ id: PULSE_LAYER, type: 'circle', source: PULSE_SOURCE, paint: { 'circle-radius': 7, 'circle-color': '#ef4444', 'circle-opacity': 0.9, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });

  let growing = true, radius = 18;
  const animate = () => {
    if (!map.getLayer(PULSE_OUTER)) return;
    radius += growing ? 0.4 : -0.4;
    if (radius >= 26) growing = false;
    if (radius <= 18) growing = true;
    map.setPaintProperty(PULSE_OUTER, 'circle-radius', radius);
    map.setPaintProperty(PULSE_OUTER, 'circle-opacity', 0.35 - (radius - 18) * 0.03);
    pulseAnimFrame = requestAnimationFrame(animate);
  };
  pulseAnimFrame = requestAnimationFrame(animate);

  // Store handler refs for proper cleanup
  boundClickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (f?.properties?.id) window.dispatchEvent(new CustomEvent('conflict-dot-click', { detail: { id: f.properties.id } }));
  };
  boundEnterHandler = () => { map.getCanvas().style.cursor = 'pointer'; };
  boundLeaveHandler = () => { map.getCanvas().style.cursor = ''; };

  map.on('click', PULSE_LAYER, boundClickHandler);
  map.on('mouseenter', PULSE_LAYER, boundEnterHandler);
  map.on('mouseleave', PULSE_LAYER, boundLeaveHandler);
}

export function removeConflictDots(map: mapboxgl.Map) {
  if (pulseAnimFrame) { cancelAnimationFrame(pulseAnimFrame); pulseAnimFrame = null; }
  cleanupDotListeners(map);
  if (map.getLayer(PULSE_OUTER)) map.removeLayer(PULSE_OUTER);
  if (map.getLayer(PULSE_LAYER)) map.removeLayer(PULSE_LAYER);
  if (map.getSource(PULSE_SOURCE)) map.removeSource(PULSE_SOURCE);
}

// ── Faction markers ─────────────────────────────────

function createFactionMarkerEl(
  faction: Faction,
  side: string | null,
  casualties: number | null,
  isSupporter: boolean,
  isSelected: boolean,
): HTMLDivElement {
  const color = isSelected ? '#ffffff' : (side ? (SIDE_COLORS[side] ?? '#6b7280') : '#6b7280');
  const el = document.createElement('div');
  el.className = `ct-marker${isSelected ? ' ct-marker--selected' : ''}${isSupporter ? ' ct-marker--supporter' : ''}`;
  el.style.setProperty('--ring-color', color);

  const flagHtml = faction.flagUrl
    ? `<img src="${faction.flagUrl}" class="ct-marker-flag" style="border-color:${color}" />`
    : `<div class="ct-marker-flag ct-marker-flag--empty" style="border-color:${color}"></div>`;

  el.innerHTML = `${flagHtml}<span class="ct-marker-name">${faction.name}</span>${casualties !== null ? `<span class="ct-marker-casualties">${fmt(casualties)}</span>` : ''}`;
  return el;
}

export function showFactionNodes(map: mapboxgl.Map, conflict: Conflict, selectedFactionId: string | null, onFactionClick: (id: string) => void) {
  clearFactionNodes(map);
  const factions = conflict.factions ?? [];
  const links = conflict.supportLinks ?? [];
  const positions = computeFactionPositions(conflict, factions, links);
  const belligerentIds = new Set(factions.map((f) => f.factionId));

  for (const cf of factions) {
    const pos = positions.get(cf.factionId);
    if (!pos) continue;
    const el = createFactionMarkerEl(cf.faction, cf.side, cf.casualties, false, cf.factionId === selectedFactionId);
    el.addEventListener('click', (e) => { e.stopPropagation(); onFactionClick(cf.factionId); });
    activeMarkers.push(new mapboxgl.Marker({ element: el, anchor: 'center', pitchAlignment: 'map', rotationAlignment: 'map' }).setLngLat(pos).addTo(map));
  }

  const added = new Set<string>();
  for (const link of links) {
    const sid = belligerentIds.has(link.fromId) ? null : link.fromId;
    if (!sid || added.has(sid)) continue;
    added.add(sid);
    const pos = positions.get(sid);
    if (!pos) continue;
    const el = createFactionMarkerEl(link.from, null, null, true, sid === selectedFactionId);
    el.addEventListener('click', (e) => { e.stopPropagation(); onFactionClick(sid); });
    activeMarkers.push(new mapboxgl.Marker({ element: el, anchor: 'center', pitchAlignment: 'map', rotationAlignment: 'map' }).setLngLat(pos).addTo(map));
  }

  showSupportLines(map, conflict, positions, selectedFactionId);
}

export function clearFactionNodes(map?: mapboxgl.Map) {
  for (const m of activeMarkers) m.remove();
  activeMarkers = [];
  if (activePopup) { activePopup.remove(); activePopup = null; }
  if (map) removeSupportLines(map);
}

// ── Support lines — great circle arcs ───────────────

function cleanupLineListeners(map: mapboxgl.Map) {
  if (boundLineEnterHandler && map.getLayer(LINE_LAYER)) { map.off('mouseenter', LINE_LAYER, boundLineEnterHandler); boundLineEnterHandler = null; }
  if (boundLineLeaveHandler && map.getLayer(LINE_LAYER)) { map.off('mouseleave', LINE_LAYER, boundLineLeaveHandler); boundLineLeaveHandler = null; }
}

function showSupportLines(map: mapboxgl.Map, conflict: Conflict, positions: Map<string, [number, number]>, selectedFactionId: string | null) {
  removeSupportLines(map);
  const links = conflict.supportLinks ?? [];
  if (links.length === 0) return;

  // Group by pair to offset parallel arcs
  const pairMap = new Map<string, SupportLink[]>();
  for (const link of links) {
    const key = `${link.fromId}|${link.toId}`;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key)!.push(link);
  }

  const features: GeoJSON.Feature[] = [];
  for (const [, pairLinks] of pairMap) {
    const count = pairLinks.length;
    pairLinks.forEach((link, i) => {
      const from = positions.get(link.fromId);
      const to = positions.get(link.toId);
      if (!from || !to) return;

      const isHighlighted = !selectedFactionId || link.fromId === selectedFactionId || link.toId === selectedFactionId;
      const offset = count > 1 ? (i - (count - 1) / 2) * 0.7 : 0;
      const [oFrom, oTo] = offset !== 0 ? offsetEndpoints(from, to, offset) : [from, to];

      const arc = makeArc(oFrom, oTo);
      arc.properties = {
        description: link.description ?? '',
        label: SUPPORT_LABELS[link.type] ?? link.type,
        color: SUPPORT_COLORS[link.type] ?? '#888',
        width: isHighlighted ? (link.intensity ?? 1) + 2 : 1,
        opacity: isHighlighted ? 1 : 0.12,
      };
      features.push(arc);
    });
  }

  map.addSource(LINE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features } });

  // Glow layer
  map.addLayer({
    id: LINE_GLOW, type: 'line', source: LINE_SOURCE,
    paint: { 'line-color': ['get', 'color'], 'line-width': ['*', ['get', 'width'], 5], 'line-opacity': ['*', ['get', 'opacity'], 0.2], 'line-blur': 8 },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  });

  // Core line
  map.addLayer({
    id: LINE_LAYER, type: 'line', source: LINE_SOURCE,
    paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'] },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  });

  // Static dashed overlay (no animation — removed wasteful rAF loop)
  map.addLayer({
    id: LINE_DASH, type: 'line', source: LINE_SOURCE,
    paint: { 'line-color': '#ffffff', 'line-width': ['*', ['get', 'width'], 0.5], 'line-opacity': ['*', ['get', 'opacity'], 0.35], 'line-dasharray': [2, 4] },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  });

  // Hover popup — store refs for cleanup
  boundLineEnterHandler = (e: mapboxgl.MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer';
    const p = e.features?.[0]?.properties;
    if (!p) return;
    activePopup?.remove();
    activePopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: 'ct-line-popup', offset: 12 })
      .setLngLat(e.lngLat)
      .setHTML(
        `<div style="font-size:12px;font-weight:700;color:${p.color}">${p.label}</div>` +
        (p.description ? `<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:3px">${p.description}</div>` : ''),
      )
      .addTo(map);
  };
  boundLineLeaveHandler = () => { map.getCanvas().style.cursor = ''; activePopup?.remove(); activePopup = null; };

  map.on('mouseenter', LINE_LAYER, boundLineEnterHandler);
  map.on('mouseleave', LINE_LAYER, boundLineLeaveHandler);
}

export function removeSupportLines(map: mapboxgl.Map) {
  cleanupLineListeners(map);
  if (map.getLayer(LINE_DASH)) map.removeLayer(LINE_DASH);
  if (map.getLayer(LINE_LAYER)) map.removeLayer(LINE_LAYER);
  if (map.getLayer(LINE_GLOW)) map.removeLayer(LINE_GLOW);
  if (map.getSource(LINE_SOURCE)) map.removeSource(LINE_SOURCE);
}

// ── Full cleanup ────────────────────────────────────

export function clearAllConflictVisuals(map: mapboxgl.Map) {
  removeConflictDots(map);
  clearFactionNodes(map);
}
