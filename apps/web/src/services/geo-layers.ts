/**
 * Service for fetching geo-data layers (tectonic plates, volcanoes, pipelines, minerals, etc.)
 *
 * These endpoints match:
 *   /api/natural/:type  → for NaturalFeature-based layers (tectonic-plates, volcanoes, eez, etc.)
 *   /api/geo-layers/:type → for Entity/Infrastructure-based layers (minerals, pipelines, gas-flaring)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type GeoLayerType =
  | 'tectonic-plates'
  | 'volcanoes'
  | 'coastlines'
  | 'eez'
  | 'protected-areas'
  | 'admin-boundaries'
  | 'minerals'
  | 'pipelines'
  | 'gas-flaring';

// Layers served by /api/natural/:type
const NATURAL_LAYERS: GeoLayerType[] = [
  'tectonic-plates', 'volcanoes', 'coastlines', 'eez',
  'protected-areas', 'admin-boundaries'
];

/**
 * Returns the URL for a geo-layer GeoJSON endpoint.
 * Mapbox can load GeoJSON directly from URLs.
 */
export function getGeoLayerUrl(
  type: GeoLayerType,
  params?: { lod?: string; limit?: number; commodity?: string }
): string {
  const isNatural = NATURAL_LAYERS.includes(type);
  const base = isNatural
    ? `${API_BASE}/api/natural/${type}`
    : `${API_BASE}/api/geo-layers/${type}`;

  const searchParams = new URLSearchParams();
  if (params?.lod) searchParams.set('lod', params.lod);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.commodity) searchParams.set('commodity', params.commodity);

  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Layer visual configuration */
export interface GeoLayerConfig {
  type: GeoLayerType;
  label: string;
  category: 'geological' | 'energy' | 'boundaries' | 'environmental';
  color: string;
  secondaryColor?: string;
  icon: string; // emoji or icon reference
  description: string;
}

export const GEO_LAYER_CONFIGS: GeoLayerConfig[] = [
  {
    type: 'tectonic-plates',
    label: 'Tectonic Plates',
    category: 'geological',
    color: '#ff6b35',
    icon: '🔶',
    description: 'Plate boundaries (Bird 2003)'
  },
  {
    type: 'volcanoes',
    label: 'Volcanoes',
    category: 'geological',
    color: '#ff4444',
    icon: '🌋',
    description: 'Global volcanic activity'
  },
  {
    type: 'pipelines',
    label: 'Oil Pipelines',
    category: 'energy',
    color: '#ffd700',
    icon: '🛢️',
    description: 'Major oil pipeline routes'
  },
  {
    type: 'gas-flaring',
    label: 'Gas Flaring',
    category: 'energy',
    color: '#ff8c00',
    icon: '🔥',
    description: 'Gas flaring sites'
  },
  {
    type: 'minerals',
    label: 'Mineral Deposits',
    category: 'energy',
    color: '#ffd700',
    icon: '💎',
    description: 'Global mineral deposits'
  },
  {
    type: 'eez',
    label: 'Maritime EEZ',
    category: 'boundaries',
    color: '#4169e1',
    icon: '🌊',
    description: 'Exclusive Economic Zones'
  },
  {
    type: 'protected-areas',
    label: 'Protected Areas',
    category: 'environmental',
    color: '#22c55e',
    icon: '🌿',
    description: 'WDPA protected areas'
  },
  {
    type: 'coastlines',
    label: 'Coastlines',
    category: 'geological',
    color: '#4aa3df',
    icon: '🏖️',
    description: 'Global coastline detail'
  },
  {
    type: 'admin-boundaries',
    label: 'Admin Boundaries',
    category: 'boundaries',
    color: '#a78bfa',
    icon: '🗺️',
    description: 'States & provinces'
  }
];

/** Mineral commodity colors for the map */
export const MINERAL_COLORS: Record<string, string> = {
  Gold: '#ffd700',
  Silver: '#c0c0c0',
  Copper: '#b87333',
  Iron: '#8b4513',
  Lithium: '#00ff88',
  Cobalt: '#0047ab',
  Uranium: '#39ff14',
  Platinum: '#e5e4e2',
  'Rare Earth': '#ff69b4'
};
