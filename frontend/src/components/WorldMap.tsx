import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { applyFog as appearanceApplyFog, setBaseFeaturesVisibility as appearanceSetBaseFeaturesVisibility, applyPhysicalModeTweaks as appearanceApplyPhysical, MAP_STYLES, type StyleKey, type PlanetPreset } from './map/mapAppearance';
import { applyTerrain, reapplyAfterStyleChange, loadPersistedTerrain, persistTerrain } from './map/terrain';
import type { ChoroplethSpec } from '../services/worldbank-gdp';
import type { ChoroplethSpec as GdpPerCapitaChoroplethSpec } from '../services/worldbank-gdp-per-capita';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '../src/styles/geocoder.css';
import { ConflictVisualization } from '../services/conflict-tracker/conflict-visualization';
import { AVAILABLE_HISTORY_YEARS, snapToAvailableYear } from '../src/utils/historical-years';
import { ConflictDataManager, type ConflictData } from '../services/conflict-tracker/conflict-data-manager';

// Mapbox token from environment variable (see frontend/.env)
const _mbToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (!_mbToken) {
  console.error(
    '[WorldMap] VITE_MAPBOX_TOKEN is not defined. ' +
    'Make sure frontend/.env exists, is UTF-8 encoded (no BOM), ' +
    'contains VITE_MAPBOX_TOKEN=pk.xxx, and restart the Vite dev server.'
  );
}
mapboxgl.accessToken = _mbToken || '';

interface WorldMapProps {
  onCountrySelect: (countryName: string) => void;
  selectedCountry: string | null;
  onResetView?: () => void;
  conflicts?: ConflictData[];
  onConflictClick?: (conflictId: string) => void;
  selectedConflictId?: string | null;
  isLeftSidebarOpen?: boolean;
  /** Called once when map tiles + style finish loading (map.on('load')) */
  onMapReady?: () => void;
}

// Tipos específicos para evitar 'any'
interface MapEaseToOptions {
  center?: [number, number];
  zoom?: number;
  duration?: number;
  easing?: (t: number) => number;
  pitch?: number;
  bearing?: number;
}

interface ConflictGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: {
      id: string;
      country: string;
      status: string;
      [key: string]: unknown;
    };
  }>;
}

type MetricId = 'gdp' | 'inflation' | 'gdp-per-capita' | 'gini' | 'exports' | 'life-expectancy' | 'military-expenditure' | 'democracy-index' | 'trade-gdp';
const WorldMap = forwardRef<{ easeTo: (options: MapEaseToOptions) => void; getMap: () => mapboxgl.Map | null; setChoropleth?: (metric: MetricId, spec: ChoroplethSpec | GdpPerCapitaChoroplethSpec | null) => void; setActiveChoropleth?: (metric: MetricId | null) => void; setHistoryEnabled?: (enabled: boolean) => void; setHistoryYear?: (year: number) => void; highlightIso3List?: (iso: string[], colorHex?: string) => void; highlightIso3ToColorMap?: (isoToColor: Record<string,string>) => void; setTerrainEnabled?: (v: boolean) => void; setTerrainExaggeration?: (n: number) => void }, WorldMapProps>(({ onCountrySelect, selectedCountry, onResetView, conflicts = [], selectedConflictId, isLeftSidebarOpen = false, onMapReady }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedCountryId = useRef<string | number | null>(null);
  // Removed unused markersRef to prevent memory leaks
  const animationFrameRef = useRef<number | undefined>(undefined);
  const conflictDataManager = useRef<ConflictDataManager | null>(null);
  const isLeftSidebarOpenRef = useRef(isLeftSidebarOpen);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const historyEnabledRef = useRef<boolean>(false);
  const historyYearRef = useRef<number>(1880);
  const availableHistoryYearsRef = useRef<number[]>(AVAILABLE_HISTORY_YEARS);
  const subjectToColorRef = useRef<Record<string, string>>({});
  const historyCacheRef = useRef<Map<number, any>>(new Map());
  const historyRequestIdRef = useRef<number>(0);
  const historyDebounceRef = useRef<number | null>(null);
  const historySelectedCanonicalRef = useRef<string | null>(null);
  const historyPopupRef = useRef<mapboxgl.Popup | null>(null);
  const naturalPopupRef = useRef<mapboxgl.Popup | null>(null);
  
  // ✅ NUEVO: Refs para prevenir memory leaks
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rotationSpeedRef = useRef<number>(3);
  const spinRafRef = useRef<number | null>(null);
  const userInteractingRef = useRef<boolean>(false);
  const eventListenersRef = useRef<EventListenerRecord[]>([]);
  const choroplethSpecRef = useRef<Record<MetricId, ChoroplethSpec | GdpPerCapitaChoroplethSpec | null>>({ 
    gdp: null, 
    inflation: null, 
    'gdp-per-capita': null, 
    gini: null, 
    exports: null,
    'life-expectancy': null,
    'military-expenditure': null,
    'democracy-index': null,
    'trade-gdp': null
  });
  const activeChoroplethRef = useRef<MetricId | null>(null);
  const highlightedIsoOrgRef = useRef<string[]>([]);

  // Estilos centralizados en mapAppearance
  const [styleKey, setStyleKey] = useState<StyleKey>('night');
  const styleKeyRef = useRef<StyleKey>(styleKey);
  useEffect(() => { styleKeyRef.current = styleKey; }, [styleKey]);
  
  // Terrain (relieve)
  const [terrainOn, setTerrainOn] = useState<boolean>(false);
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1);
  // 3D Buildings
  const [buildings3DOn, setBuildings3DOn] = useState<boolean>(false);
  
  // Presets de planeta (atmósfera)
  const [planetPreset, setPlanetPreset] = useState<PlanetPreset>('default');
  // Ocultar nombres/carreteras/fronteras
  const [minimalModeOn, setMinimalModeOn] = useState(false);
  // Natural layers: state refs
  type NaturalLod = 'auto' | 'low' | 'med' | 'high';
  type NaturalLayerType = 'rivers' | 'ranges' | 'peaks';
  const naturalEnabledRef = useRef<{ rivers: boolean; ranges: boolean; peaks: boolean }>({ rivers: false, ranges: false, peaks: false });
  const naturalLodRef = useRef<NaturalLod>('auto');
  const peaksIconLoadedRef = useRef<boolean>(false);
  
  // ✅ NUEVO: Tipos específicos para event listeners
  type MapMouseEventHandler = (e: mapboxgl.MapMouseEvent) => void;
  type MapTouchEventHandler = (e: mapboxgl.MapTouchEvent) => void;
  type GeocoderEventHandler = (e: unknown) => void;
  
  interface EventListenerRecord {
    event: string;
    handler: MapMouseEventHandler | MapTouchEventHandler | GeocoderEventHandler;
    layer?: string;
  }

  // Inicializar el conflict data manager
  useEffect(() => {
    if (!conflictDataManager.current) {
      conflictDataManager.current = new ConflictDataManager('conflicts');
    }
  }, []);

  // ✅ MEJORADO: Optimized map methods con tipos específicos
  const easeTo = useCallback((options: MapEaseToOptions) => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        ...options,
        easing: options.easing || ((t: number) => 1 - Math.pow(1 - t, 3)) // Smooth easing
      });
    }
  }, []);

  // Función para validar y manejar selección de países
  const handleCountrySelection = useCallback((countryName: string) => {
    onCountrySelect(countryName);
  }, [onCountrySelect]);

  // ✅ MEJORADO: Función de cleanup para prevenir memory leaks
  const cleanupResources = useCallback(() => {
    // Limpiar timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
    
    // Limpiar animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    if (spinRafRef.current !== null) {
      cancelAnimationFrame(spinRafRef.current);
      spinRafRef.current = null;
    }
    
    // ✅ MEJORADO: Limpiar event listeners con manejo de capas
    if (mapRef.current) {
      eventListenersRef.current.forEach(({ event, handler, layer }) => {
        try {
          if (layer) {
            mapRef.current?.off(event, layer, handler as MapMouseEventHandler);
          } else {
            mapRef.current?.off(event, handler);
          }
        } catch (error) {
          console.warn(`Error removing event listener for ${event}${layer ? ` on layer ${layer}` : ''}:`, error);
        }
      });
      eventListenersRef.current = [];
    }
  }, []);

  // Exponer métodos del mapa al componente padre (se define más abajo tras helpers)

  // Reaplicar niebla/atmósfera con fondo estrellado
  const applyFog = useCallback((preset: PlanetPreset = planetPreset) => {
    if (!mapRef.current) return;
    appearanceApplyFog(mapRef.current, preset);
  }, [planetPreset]);

  // (Terrain removido)

  // Ocultar capas políticas y overlays en modo físico
  const applyPhysicalModeTweaks = useCallback(() => {
    if (!mapRef.current) return;
    appearanceApplyPhysical(mapRef.current);
  }, []);

  // Añadir capa de edificios 3D (idempotente)
  const add3DBuildingsLayer = useCallback((map: mapboxgl.Map) => {
    try {
      const style = map.getStyle();
      const layers = style?.layers || [];
      // Insertar antes de la primera capa de símbolo (labels)
      const labelLayerId = layers.find(l => (l.type === 'symbol' && (l as any).layout?.['text-field']))?.id;
      if (!map.getLayer('3d-buildings')) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          // Mostrar edificios con altura o min_altura disponibles (más robusto que 'extrude')
          filter: ['any', ['has', 'height'], ['has', 'min_height']],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6
          }
        } as any, labelLayerId);
      }
    } catch {}
  }, []);

  // Mostrar/ocultar nombres, carreteras y fronteras en cualquier estilo
  const setBaseFeaturesVisibility = useCallback((hide: boolean) => {
    if (!mapRef.current) return;
    appearanceSetBaseFeaturesVisibility(mapRef.current, hide);
  }, []);

  // Helper: add/update/remove GDP choropleth layer
  const applyChoropleth = useCallback((metric: MetricId) => {
    const map = mapRef.current;
    const spec = choroplethSpecRef.current[metric];
    if (!map) return;
    if (!map.getSource('country-boundaries')) return;

    const layerMap: Record<MetricId, string> = {
      gdp: 'gdp-fill',
      'gdp-per-capita': 'gdp-per-capita-fill',
      inflation: 'inflation-fill',
      gini: 'gini-fill',
      exports: 'exports-fill',
      'life-expectancy': 'life-expectancy-fill',
      'military-expenditure': 'military-expenditure-fill',
      'democracy-index': 'democracy-index-fill',
      'trade-gdp': 'trade-gdp-fill'
    };
    const layerId = layerMap[metric];
    const sourceLayer = 'country_boundaries';

    // Remove if no spec
    if (!spec) {
      try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
      return;
    }

    // If mapping is empty, avoid adding a 'match' expression with no pairs
    const hasColors = spec.iso3ToColor && Object.keys(spec.iso3ToColor).length > 0;
    if (!hasColors) {
      try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
      return;
    }

    // Build a match expression on ISO3 code using multiple potential fields
    // Normalize to uppercase to ensure consistency with WB ISO3 keys
    const isoExpr: any[] = ['upcase', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ['get', 'wb_a3'], ['get', 'adm0_a3'], ['get', 'iso_3166_1']]];
    const expr: any[] = ['match', isoExpr];
    for (const [iso3, color] of Object.entries(spec.iso3ToColor)) {
      expr.push(iso3, color);
    }
    // Use transparent for countries without data to avoid darkening the map
    expr.push('rgba(0,0,0,0)');

    // Filter to only show countries that have data
    const iso3List = Object.keys(spec.iso3ToColor).map(iso => iso.toUpperCase());
    const filter: any = iso3List.length > 0
      ? ['in', isoExpr, ['literal', iso3List]]
      : ['==', ['literal', 1], 2]; // Match nothing if no data

    if (!map.getLayer(layerId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        if (beforeId) {
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: 'country-boundaries',
            'source-layer': sourceLayer,
            filter: filter,
            paint: {
              'fill-color': expr as any,
              'fill-opacity': 0.6
            }
          } as any, beforeId);
        } else {
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: 'country-boundaries',
            'source-layer': sourceLayer,
            filter: filter,
            paint: {
              'fill-color': expr as any,
              'fill-opacity': 0.6
            }
          } as any);
        }
      } catch {}
    } else {
      try { map.setFilter(layerId, filter); } catch {}
      try { map.setPaintProperty(layerId, 'fill-color', expr as any); } catch {}
      try { 
        map.setPaintProperty(layerId, 'fill-opacity', 0.6); 
      } catch {}
    }
  }, []);

  // Update layer opacities based on current style
  const updateLayerOpacitiesForStyle = useCallback((currentStyle: StyleKey) => {
    const map = mapRef.current;
    if (!map) return;
    const choroplethOpacity = 0.6;
    const orgOpacity = 0.28;
    
    // Update choropleth layers
    const layerMap: Record<MetricId, string> = {
      gdp: 'gdp-fill',
      'gdp-per-capita': 'gdp-per-capita-fill',
      inflation: 'inflation-fill',
      gini: 'gini-fill',
      exports: 'exports-fill',
      'life-expectancy': 'life-expectancy-fill',
      'military-expenditure': 'military-expenditure-fill',
      'democracy-index': 'democracy-index-fill',
      'trade-gdp': 'trade-gdp-fill'
    };
    
    Object.values(layerMap).forEach(layerId => {
      if (map.getLayer(layerId)) {
        try { map.setPaintProperty(layerId, 'fill-opacity', choroplethOpacity); } catch {}
      }
    });
    
    // Update org highlight layers
    if (map.getLayer('org-members-fill')) {
      try { map.setPaintProperty('org-members-fill', 'fill-opacity', orgOpacity); } catch {}
    }
  }, []);

  const ensureOrgHighlightLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getSource('country-boundaries')) return;
    const fillId = 'org-members-fill';
    const borderId = 'org-members-border';
    const source = 'country-boundaries';
    const sourceLayer = 'country_boundaries';
    if (!map.getLayer(fillId)) {
      try {
        map.addLayer({
          id: fillId,
          type: 'fill',
          source,
          'source-layer': sourceLayer,
          filter: ['==', ['literal', 1], 2],
          paint: { 
            'fill-color': '#22c55e', 
            'fill-opacity': 0.28 
          }
        } as any);
      } catch {}
    }
    if (!map.getLayer(borderId)) {
      try {
        map.addLayer({
          id: borderId,
          type: 'line',
          source,
          'source-layer': sourceLayer,
          filter: ['==', ['literal', 1], 2],
          paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-opacity': 0.9 }
        } as any);
      } catch {}
    }
  }, []);

  const updateOrgHighlightFilter = useCallback((iso3List: string[], colorHex?: string) => {
    const map = mapRef.current;
    if (!map) return;
    ensureOrgHighlightLayers();
    const filter: any = iso3List.length > 0
      ? ['in', ['upcase', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ['get', 'wb_a3'], ['get', 'adm0_a3'], ['get', 'iso_3166_1']]], ['literal', iso3List.map(s => s.toUpperCase())]]
      : ['==', ['literal', 1], 2];
    try { map.setFilter('org-members-fill', filter as any); } catch {}
    try { map.setFilter('org-members-border', filter as any); } catch {}
    if (colorHex) {
      try { map.setPaintProperty('org-members-fill', 'fill-color', colorHex); } catch {}
      try { map.setPaintProperty('org-members-border', 'line-color', colorHex); } catch {}
    }
  }, [ensureOrgHighlightLayers]);

  const updateOrgHighlightMap = useCallback((isoToColor: Record<string,string>) => {
    const map = mapRef.current;
    if (!map) return;
    ensureOrgHighlightLayers();
    const isoKeys = Object.keys(isoToColor || {});
    const filter: any = isoKeys.length > 0
      ? ['in', ['upcase', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ['get', 'wb_a3'], ['get', 'adm0_a3'], ['get', 'iso_3166_1']]], ['literal', isoKeys.map(s => s.toUpperCase())]]
      : ['==', ['literal', 1], 2];
    try { map.setFilter('org-members-fill', filter as any); } catch {}
    try { map.setFilter('org-members-border', filter as any); } catch {}
    
    // Build a match expression for per-country color
    // If empty or only one color, use simple color instead of match expression
    if (isoKeys.length === 0) {
      // No countries selected, use default color
      try { map.setPaintProperty('org-members-fill', 'fill-color', '#22c55e'); } catch {}
      try { map.setPaintProperty('org-members-border', 'line-color', '#22c55e'); } catch {}
    } else if (isoKeys.length === 1) {
      // Single country, use its color directly
      const singleColor = Object.values(isoToColor)[0] || '#22c55e';
      try { map.setPaintProperty('org-members-fill', 'fill-color', singleColor); } catch {}
      try { map.setPaintProperty('org-members-border', 'line-color', singleColor); } catch {}
    } else {
      // Multiple countries, use match expression
      const isoExpr: any[] = ['upcase', ['coalesce', ['get', 'iso_3166_1_alpha_3'], ['get', 'wb_a3'], ['get', 'adm0_a3'], ['get', 'iso_3166_1']]];
      const matchExpr: any[] = ['match', isoExpr];
      for (const [iso, col] of Object.entries(isoToColor)) {
        matchExpr.push(iso.toUpperCase(), col);
      }
      matchExpr.push('#22c55e'); // fallback
      try { map.setPaintProperty('org-members-fill', 'fill-color', matchExpr as any); } catch {}
      try { map.setPaintProperty('org-members-border', 'line-color', matchExpr as any); } catch {}
    }
  }, [ensureOrgHighlightLayers]);

  // Build URL for natural layers served by Vite (static first iteration)
  const selectLodByZoom = useCallback((zoom: number): Exclude<NaturalLod, 'auto'> => {
    if (zoom < 3) return 'low';
    if (zoom < 6) return 'med';
    return 'high';
  }, []);
  const getNaturalGeoJsonUrl = useCallback((type: NaturalLayerType, lod: NaturalLod): string => {
    const map = mapRef.current;
    const eff: Exclude<NaturalLod,'auto'> = lod === 'auto' && map ? selectLodByZoom(map.getZoom()) : (lod === 'auto' ? 'med' : lod);
    // API base (fallback to 3001 where backend dev listens)
    const API_BASE = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001';
    // API type mapping: ranges -> mountain-ranges
    const apiType = type === 'ranges' ? 'mountain-ranges' : type;
    // Keep it simple; server defaults limit, but we can pass a modest cap
    const limit = eff === 'low' ? 1000 : eff === 'med' ? 2000 : 5000;
    return `${API_BASE}/api/natural/${apiType}?lod=${eff}&limit=${limit}`;
  }, [selectLodByZoom]);

  const ensureNaturalSource = useCallback((type: NaturalLayerType, lod: NaturalLod) => {
    const map = mapRef.current;
    if (!map) return;
    const sourceId = `${type}-source`;
    const existing = map.getSource(sourceId) as any;
    const url = getNaturalGeoJsonUrl(type, lod);
    if (!existing) {
      try {
        map.addSource(sourceId, { type: 'geojson', data: url } as any);
      } catch {}
    } else {
      try { existing.setData(url); } catch {}
    }
  }, [getNaturalGeoJsonUrl]);

  const ensureRiversLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const layerId = 'rivers-line';
    if (!map.getLayer(layerId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: layerId,
          type: 'line',
          source: 'rivers-source',
          paint: {
            'line-color': '#4aa3df',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              0, 0.2,
              3, 0.4,
              5, 0.8,
              7, 1.2
            ],
            'line-opacity': 0.8
          }
        } as any, beforeId);
      } catch {}
    }
  }, []);

  const ensureRangesLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const fillId = 'ranges-fill';
    const layerId = 'ranges-line';
    // Add fill first (subtle interior color)
    if (!map.getLayer(fillId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: 'ranges-source',
          paint: {
            'fill-color': '#b08968',
            'fill-opacity': 0.22
          }
        } as any, beforeId);
      } catch {}
    }
    // Add outline/line on top
    if (!map.getLayer(layerId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: layerId,
          type: 'line',
          source: 'ranges-source',
          paint: {
            'line-color': '#8b6b4a',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              0, 0.2,
              3, 0.5,
              6, 0.8
            ],
            'line-opacity': 0.8,
            'line-dasharray': [2, 2]
          }
        } as any, beforeId);
      } catch {}
    }
  }, []);

  const ensurePeaksIcon = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    // If style already has the image, mark as loaded and exit
    try {
      // @ts-ignore mapbox v3 may have hasImage
      if (typeof (map as any).hasImage === 'function' && (map as any).hasImage('peak-icon')) {
        peaksIconLoadedRef.current = true;
        return;
      }
    } catch {}
    // If our ref says loaded but style lost images (after setStyle), reset and proceed
    if (peaksIconLoadedRef.current) {
      peaksIconLoadedRef.current = false;
    }
    const image = new Image(64, 64);
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        // @ts-ignore addImage accepts HTMLImageElement
        map.addImage('peak-icon', image as any, { sdf: false } as any);
        peaksIconLoadedRef.current = true;
      } catch {}
    };
    image.src = '/icons/peak.svg';
  }, []);

  const ensurePeaksLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    ensurePeaksIcon();
    // Remove old circle layer if present (migrate to symbol)
    try { if (map.getLayer('peaks-circle')) map.removeLayer('peaks-circle'); } catch {}
    const layerId = 'peaks-symbol';
    if (!map.getLayer(layerId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: 'peaks-source',
          minzoom: 2,
          layout: {
            'icon-image': 'peak-icon',
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              2, 0.35,
              4, 0.45,
              6, 0.6,
              9, 0.8
            ]
          },
          paint: {}
        } as any, beforeId);
      } catch {}
    }
  }, []);

  const updateNaturalVisibility = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const cfg = naturalEnabledRef.current;
    const pairs: Array<[string, boolean]> = [
      ['rivers-line', cfg.rivers],
      ['ranges-fill', cfg.ranges],
      ['ranges-line', cfg.ranges],
      ['peaks-symbol', cfg.peaks],
    ];
    pairs.forEach(([id, on]) => {
      if (!map.getLayer(id)) return;
      try { map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); } catch {}
    });
  }, []);

  const refreshNaturalByLod = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const lod = naturalLodRef.current;
    if (naturalEnabledRef.current.rivers) {
      ensureNaturalSource('rivers', lod);
      ensureRiversLayer();
    }
    if (naturalEnabledRef.current.ranges) {
      ensureNaturalSource('ranges', lod);
      ensureRangesLayer();
    }
    if (naturalEnabledRef.current.peaks) {
      ensureNaturalSource('peaks', lod);
      ensurePeaksLayer();
    }
    updateNaturalVisibility();
  }, [ensureNaturalSource, ensureRiversLayer, ensureRangesLayer, ensurePeaksLayer, updateNaturalVisibility]);

  const ensureNaturalInteractivity = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers: Array<{ id: string; type: NaturalLayerType }> = [
      { id: 'rivers-line', type: 'rivers' },
      { id: 'ranges-line', type: 'ranges' },
      { id: 'peaks-symbol', type: 'peaks' }
    ];
    layers.forEach(({ id, type }) => {
      if (!map.getLayer(id)) return;
      // Hover pointer
      const onMove = (e: mapboxgl.MapMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
      };
      const onLeave = () => {
        map.getCanvas().style.cursor = isLeftSidebarOpenRef.current ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%2387CEEB' stroke-width='1.5' opacity='0.9'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%2387CEEB' opacity='0.7'/%3E%3C/svg%3E\") 10 10, auto" : 'grab';
      };
      const onClick = (e: mapboxgl.MapMouseEvent) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: [id] });
        if (!feats || feats.length === 0) return;
        const f: any = feats[0];
        const props = f.properties || {};
        let title = props.name || props.NAME || (type === 'peaks' ? 'Peak' : type === 'rivers' ? 'River' : 'Range');
        const lines: string[] = [];
        if (type === 'peaks') {
          if (props.elevation_m) lines.push(`Elevation: ${props.elevation_m} m`);
          if (props.prominence_m) lines.push(`Prominence: ${props.prominence_m} m`);
        } else if (type === 'rivers') {
          if (props.class) lines.push(`Class: ${props.class}`);
          if (props.length_km) lines.push(`Length: ${props.length_km} km`);
        }
        if (props.source_ref) lines.push(`Source: ${props.source_ref}`);
        const html = `
          <div class="natural-popup">
            <div class="popup-title">${title}</div>
            ${lines.length ? `<div class="popup-body">${lines.map(l => `<div>${l}</div>`).join('')}</div>` : ''}
          </div>
        `;
        if (naturalPopupRef.current) { try { naturalPopupRef.current.remove(); } catch {} }
        naturalPopupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, className: 'natural-popup' })
          .setLngLat((e.lngLat as any))
          .setHTML(html)
          .addTo(map);
      };
      try {
        map.on('mousemove', id, onMove);
        map.on('mouseleave', id, onLeave);
        map.on('click', id, onClick);
        eventListenersRef.current.push(
          { event: 'mousemove', handler: onMove as any, layer: id },
          { event: 'mouseleave', handler: onLeave as any, layer: id },
          { event: 'click', handler: onClick as any, layer: id }
        );
      } catch {}
    });
  }, []);

  // Helper: build URL for historical basemap GeoJSON served by Vite
  const getHistoryGeoJsonUrl = useCallback((year: number) => {
    const nearest = snapToAvailableYear(year, availableHistoryYearsRef.current);
    const API_BASE = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001';
    // Switch to backend history API (DB-backed)
    return `${API_BASE}/api/history?year=${nearest}`;
  }, []);

  const ensureHistorySource = useCallback((year: number, dataObj?: any) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const sourceId = 'history-source';
    const existing = map.getSource(sourceId) as any;
    if (!existing) {
      try {
        map.addSource(sourceId, {
          type: 'geojson',
          data: dataObj ?? getHistoryGeoJsonUrl(year)
        } as any);
      } catch {}
    } else {
      try { existing.setData(dataObj ?? getHistoryGeoJsonUrl(year)); } catch {}
    }
  }, [getHistoryGeoJsonUrl]);

  const ensureHistoryLayers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const fillId = 'history-fill';
    const outlineId = 'history-outline';
    const selectedFillId = 'history-selected-fill';
    const selectedOutlineId = 'history-selected-outline';
    const sourceId = 'history-source';

    if (!map.getLayer(fillId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: sourceId,
          paint: {
            // Opacity by BORDERPRECISION if present; fallback to 0.25
            'fill-opacity': [
              'coalesce',
              [
                'match',
                ['to-number', ['get', 'BORDERPRECISION']],
                1, 0.18,
                2, 0.28,
                3, 0.36,
                0.25
              ],
              0.25
            ],
            // Use precomputed COLOR property when available for stability across years
            'fill-color': ['coalesce', ['get', 'COLOR'], '#a7b3c2']
          }
        } as any, beforeId);
      } catch {}
    }

    if (!map.getLayer(outlineId)) {
      try {
        map.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#6c7a89',
            'line-width': 0.6,
            'line-opacity': 0.6
          }
        } as any);
      } catch {}
    }

    // Selected territory highlight (hidden by default)
    if (!map.getLayer(selectedFillId)) {
      try {
        map.addLayer({
          id: selectedFillId,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['get', 'CANONICAL'], '__none__'],
          paint: {
            'fill-color': ['coalesce', ['get', 'COLOR'], '#ffffff'],
            'fill-opacity': 0.55
          }
        } as any);
      } catch {}
    }
    if (!map.getLayer(selectedOutlineId)) {
      try {
        map.addLayer({
          id: selectedOutlineId,
          type: 'line',
          source: sourceId,
          filter: ['==', ['get', 'CANONICAL'], '__none__'],
          paint: {
            'line-color': '#ffffff',
            'line-width': 1.2,
            'line-opacity': 0.9
          }
        } as any);
      } catch {}
    }
  }, []);

  // Deterministic HSL palette for categorical values
  function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  function normalizeString(input: string): string {
    try {
      return input
        .normalize('NFD')
        // @ts-ignore - unicode property escapes supported in modern engines
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      return input.toLowerCase().trim();
    }
  }

  function canonicalizeSovereignName(raw: string): string {
    const s = normalizeString(raw);
    const aliases: Record<string, string> = {
      'uk': 'united kingdom',
      'great britain': 'united kingdom',
      'united kingdom of great britain and ireland': 'united kingdom',
      'england': 'united kingdom',
      'britain': 'united kingdom',
      'british empire': 'united kingdom',
      'france': 'france',
      'french republic': 'france',
      'spain': 'spain',
      'kingdom of spain': 'spain',
      'portugal': 'portugal',
      'kingdom of portugal': 'portugal',
      'netherlands': 'netherlands',
      'kingdom of the netherlands': 'netherlands',
      'holland': 'netherlands',
      'belgium': 'belgium',
      'kingdom of belgium': 'belgium',
      'russia': 'russia',
      'russian empire': 'russia',
      'soviet union': 'russia',
      'sweden': 'sweden',
      'kingdom of sweden': 'sweden',
      'denmark': 'denmark',
      'kingdom of denmark': 'denmark',
      'italy': 'italy',
      'kingdom of italy': 'italy',
      'germany': 'germany',
      'german empire': 'germany',
      'prussia': 'germany',
      'austria': 'austria',
      'austrian empire': 'austria',
      'ottoman empire': 'ottoman empire',
      'turkey': 'turkey',
      'kingdom of norway': 'norway',
      'norway': 'norway',
      'greece': 'greece',
      'kingdom of greece': 'greece'
    };
    return aliases[s] ?? s;
  }

  function deriveSovereignFromName(rawName: string): string | null {
    const n = normalizeString(rawName);
    // adjective-based mapping for colonies
    if (n.includes('french ')) return 'france';
    if (n.includes('british ') || n.includes('english ')) return 'united kingdom';
    if (n.includes('spanish ')) return 'spain';
    if (n.includes('portuguese ')) return 'portugal';
    if (n.includes('dutch ') || n.includes('netherlands') || n.includes('holland')) return 'netherlands';
    if (n.includes('belgian ') || n.includes('belgium')) return 'belgium';
    if (n.includes('russian ') || n.includes('soviet ')) return 'russia';
    if (n.includes('swedish ')) return 'sweden';
    if (n.includes('danish ')) return 'denmark';
    if (n.includes('italian ')) return 'italy';
    if (n.includes('german ') || n.includes('prussian ')) return 'germany';
    if (n.includes('austrian ') || n.includes('habsburg')) return 'austria';
    if (n.includes('ottoman ') || n.includes('turkish ')) return 'ottoman empire';
    return null;
  }

  function colorFromKey(key: string): string {
    // Deterministic string hash (FNV-1a like)
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    const hue = hash % 360;
    return hslToHex(hue, 55, 62);
  }

  // Not used anymore; coloring comes from COLOR property on features

  function colorizeHistoryData(data: any): any {
    if (!data || !Array.isArray(data.features)) return data;
    // Determine color by canonical sovereign: SUBJECTO (if present) else NAME
    for (const f of data.features) {
      const props = (f.properties ||= {});
      const subj = props.SUBJECTO ? String(props.SUBJECTO) : '';
      let base = subj.trim().length > 0 ? subj : String(props.NAME ?? props.PARTOF ?? 'Unknown');
      // If SUBJECTO is missing, try to derive from NAME (e.g., "British Virgin Islands")
      if (!subj || subj.trim().length === 0) {
        const derived = deriveSovereignFromName(String(props.NAME ?? ''));
        if (derived) base = derived;
      }
      const canonical = canonicalizeSovereignName(base);
      props.CANONICAL = canonical;
      props.COLOR = colorFromKey(canonical);
    }
    return data;
  }

  // computeAndApplyHistoryColorsFromData is no longer used; colors are embedded via COLOR

  const updateHistory = useCallback(async (year: number) => {
    const nearest = snapToAvailableYear(year, availableHistoryYearsRef.current);
    const requestId = ++historyRequestIdRef.current;
    const cached = historyCacheRef.current.get(nearest);
    if (cached) {
      ensureHistorySource(nearest, cached);
      ensureHistoryLayers();
      // Colors are embedded in data
      applyHistoryColors();
      return;
    }
    try {
      const res = await fetch(getHistoryGeoJsonUrl(nearest));
      const raw = await res.json();
      const data = colorizeHistoryData(raw);
      // Only apply if still latest request
      if (requestId !== historyRequestIdRef.current) return;
      historyCacheRef.current.set(nearest, data);
      ensureHistorySource(nearest, data);
      ensureHistoryLayers();
      applyHistoryColors();
    } catch {
      // fallback to URL-based update
      if (requestId !== historyRequestIdRef.current) return;
      ensureHistorySource(nearest);
      ensureHistoryLayers();
      // colors will fallback to default
      subjectToColorRef.current = {};
      applyHistoryColors();
    }
  }, [ensureHistorySource, ensureHistoryLayers, getHistoryGeoJsonUrl]);

  const applyHistoryColors = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const fillId = 'history-fill';
    if (!map.getLayer(fillId)) return;
    // Always prefer embedded COLOR; fallback to a neutral color
    const expr: any[] = ['coalesce', ['get', 'COLOR'], '#a7b3c2'];
    try {
      map.setPaintProperty(fillId, 'fill-color', expr as any);
    } catch {}
  }, []);

  // Exponer métodos del mapa al componente padre (incluye estilo/preset/relieve)
  useImperativeHandle(ref, () => ({
    easeTo,
    getMap: () => mapRef.current,
    setNaturalLayerEnabled: (type: NaturalLayerType, enabled: boolean) => {
      naturalEnabledRef.current = { ...naturalEnabledRef.current, [type]: enabled };
      if (!mapRef.current) return;
      if (enabled) {
        ensureNaturalSource(type, naturalLodRef.current);
        if (type === 'rivers') ensureRiversLayer();
        if (type === 'ranges') ensureRangesLayer();
        if (type === 'peaks') ensurePeaksLayer();
        // Ensure interactivity hooks once layers exist
        ensureNaturalInteractivity();
      }
      updateNaturalVisibility();
    },
    setNaturalLod: (lod: NaturalLod) => {
      naturalLodRef.current = lod;
      refreshNaturalByLod();
    },
    setChoropleth: (metric: MetricId, spec: ChoroplethSpec | null) => {
      choroplethSpecRef.current[metric] = spec;
      applyChoropleth(metric);
    },
    setActiveChoropleth: (metric: MetricId | null) => {
      activeChoroplethRef.current = metric;
      const map = mapRef.current;
      if (!map) return;
      const layers: Record<MetricId, string> = {
        gdp: 'gdp-fill',
        'gdp-per-capita': 'gdp-per-capita-fill',
        inflation: 'inflation-fill',
        gini: 'gini-fill',
        exports: 'exports-fill',
        'life-expectancy': 'life-expectancy-fill',
        'military-expenditure': 'military-expenditure-fill',
        'democracy-index': 'democracy-index-fill',
        'trade-gdp': 'trade-gdp-fill'
      };
      (Object.keys(layers) as MetricId[]).forEach((m) => {
        const id = layers[m];
        if (!map.getLayer(id)) return;
        try { map.setLayoutProperty(id, 'visibility', metric === m ? 'visible' : 'none'); } catch {}
      });
    },
    highlightIso3List: (iso: string[], colorHex?: string) => {
      highlightedIsoOrgRef.current = Array.isArray(iso) ? iso : [];
      updateOrgHighlightFilter(highlightedIsoOrgRef.current, colorHex);
    },
    highlightIso3ToColorMap: (isoToColor: Record<string,string>) => {
      updateOrgHighlightMap(isoToColor || {});
    },
    setHistoryEnabled: (enabled: boolean) => {
      historyEnabledRef.current = enabled;
      const map = mapRef.current;
      if (!map) return;
      const fillId = 'history-fill';
      const outlineId = 'history-outline';
      const selectedFillId = 'history-selected-fill';
      const selectedOutlineId = 'history-selected-outline';
      const sourceId = 'history-source';
      if (enabled) {
        updateHistory(historyYearRef.current);
        if (map.getLayer(fillId)) {
          try { map.setLayoutProperty(fillId, 'visibility', 'visible'); } catch {}
        }
        if (map.getLayer(outlineId)) {
          try { map.setLayoutProperty(outlineId, 'visibility', 'visible'); } catch {}
        }
        if (map.getLayer(selectedFillId)) {
          try { map.setLayoutProperty(selectedFillId, 'visibility', 'visible'); } catch {}
        }
        if (map.getLayer(selectedOutlineId)) {
          try { map.setLayoutProperty(selectedOutlineId, 'visibility', 'visible'); } catch {}
        }
      } else {
        try { if (map.getLayer(fillId)) map.removeLayer(fillId); } catch {}
        try { if (map.getLayer(outlineId)) map.removeLayer(outlineId); } catch {}
        try { if (map.getLayer(selectedFillId)) map.removeLayer(selectedFillId); } catch {}
        try { if (map.getLayer(selectedOutlineId)) map.removeLayer(selectedOutlineId); } catch {}
        try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}
        // cleanup popup
        if (historyPopupRef.current) {
          try { historyPopupRef.current.remove(); } catch {}
          historyPopupRef.current = null;
        }
      }
    },
    setHistoryYear: (year: number) => {
      historyYearRef.current = year;
      if (!mapRef.current) return;
      if (!historyEnabledRef.current) return;
      if (historyDebounceRef.current !== null) {
        cancelAnimationFrame(historyDebounceRef.current);
        historyDebounceRef.current = null;
      }
      historyDebounceRef.current = requestAnimationFrame(() => {
        updateHistory(year);
      });
    },
    setBaseMapStyle: (next: StyleKey) => {
      setStyleKey(next);
      if (!mapRef.current) return;
      const map = mapRef.current;
      try {
        map.setStyle(MAP_STYLES[next], { diff: false } as any);
        map.once('style.load', () => {
          applyFog();
          // Reaplicar terreno si estaba activo
          reapplyAfterStyleChange(map, { enabled: terrainOn, exaggeration: terrainExaggeration, useHillshade: false });
          reinitializeInteractiveLayers();
          // Update opacities for existing layers based on style
          updateLayerOpacitiesForStyle(next);
          // Re-ensure history layers if enabled after style change
          if (historyEnabledRef.current) {
            ensureHistorySource(historyYearRef.current);
            ensureHistoryLayers();
          }
          // Reaplicar edificios 3D
          if (buildings3DOn) {
            try { add3DBuildingsLayer(map); } catch {}
          }
        });
      } catch {}
    },
    setPlanetPreset: (preset: PlanetPreset) => {
      setPlanetPreset(preset);
      applyFog(preset);
    },
    // Terrain API
    setTerrainEnabled: (v: boolean) => {
      const map = mapRef.current;
      if (!map) { setTerrainOn(v); return; }
      // Aumentar exageración mínima para visibilidad
      let nextEx = terrainExaggeration;
      if (v && (typeof nextEx !== 'number' || nextEx < 1.5)) {
        nextEx = 1.5;
        setTerrainExaggeration(nextEx);
      }
      setTerrainOn(v);
      applyTerrain(map, { enabled: v, exaggeration: nextEx, useHillshade: false });
      // Aumentar ligeramente el pitch para que el relieve sea visible
      if (v) {
        try {
          const currentPitch = map.getPitch();
          const currentZoom = map.getZoom();
          if (currentPitch < 40 || currentZoom < 3.6) {
            map.easeTo({
              pitch: Math.max(45, currentPitch),
              bearing: 330,
              zoom: Math.max(3.6, currentZoom),
              duration: 800,
              easing: (t: number) => 1 - Math.pow(1 - t, 3)
            });
          }
        } catch {}
      } else {
        // Al desactivar el relieve, restablecer la vista (sin alterar centro/zoom)
        try {
          map.easeTo({
            pitch: 0,
            bearing: 0,
            duration: 600,
            easing: (t: number) => 1 - Math.pow(1 - t, 3)
          });
        } catch {}
      }
      persistTerrain(v, nextEx);
    },
    setTerrainExaggeration: (ex: number) => {
      const val = Math.max(0, Number.isFinite(ex) ? ex : 1);
      setTerrainExaggeration(val);
      const map = mapRef.current;
      if (!map) return;
      if (terrainOn) applyTerrain(map, { enabled: true, exaggeration: val, useHillshade: false });
      persistTerrain(terrainOn, val);
    },
    setBuildings3DEnabled: (v: boolean) => {
      setBuildings3DOn(v);
      const map = mapRef.current;
      if (!map) return;
      if (v) {
        add3DBuildingsLayer(map);
        try {
          const current = map.getZoom();
          const nextZoom = Math.max(15, current);
          map.easeTo({
            zoom: nextZoom,
            pitch: Math.max(50, map.getPitch()),
            duration: 600,
            easing: (t: number) => 1 - Math.pow(1 - t, 3)
          });
        } catch {}
      } else {
        try { if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings'); } catch {}
      }
    },
    setMinimalMode: (v: boolean) => { setMinimalModeOn(v); setBaseFeaturesVisibility(v); },
    // NEW: Globe rotation controls (smooth RAF-based)
    setAutoRotate: (enabled: boolean) => {
      // Stop any interval-based fallback if present
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
      // Stop existing RAF loop
      if (!enabled) {
        if (spinRafRef.current !== null) {
          cancelAnimationFrame(spinRafRef.current);
          spinRafRef.current = null;
        }
        return;
      }
      // Start RAF loop
      let lastTs = 0;
      const step = (ts: number) => {
        const map = mapRef.current;
        if (!map) {
          spinRafRef.current = null;
          return;
        }
        if (lastTs === 0) lastTs = ts;
        const dt = Math.max(0, (ts - lastTs) / 1000);
        lastTs = ts;
        const zoom = map.getZoom();
        const isMoving = (map as any).isMoving?.() ?? false;
        if (!isMoving && !userInteractingRef.current && zoom < 5) {
          const center = map.getCenter();
          center.lng -= rotationSpeedRef.current * dt;
          // Use setCenter for immediate, smooth updates each frame
          map.setCenter(center);
        }
        spinRafRef.current = requestAnimationFrame(step);
      };
      if (spinRafRef.current !== null) cancelAnimationFrame(spinRafRef.current);
      spinRafRef.current = requestAnimationFrame(step);
    },
    setRotateSpeed: (degPerSec: number) => {
      rotationSpeedRef.current = Math.max(0, Number.isFinite(degPerSec) ? degPerSec : 0);
    }
  }), [easeTo, applyFog, applyPhysicalModeTweaks, styleKey, setBaseFeaturesVisibility, updateOrgHighlightFilter, terrainOn, terrainExaggeration]);

  // Helper para reinstalar fuentes/capas y eventos tras cambio de estilo
  const reinitializeInteractiveLayers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Asegurar atmósfera/fog tras cambio de estilo
    applyFog();
    setBaseFeaturesVisibility(minimalModeOn);

    // Fuente de límites de países
    if (!map.getSource('country-boundaries')) {
      try {
        map.addSource('country-boundaries', {
          type: 'vector',
          url: 'mapbox://mapbox.country-boundaries-v1'
        } as any);
      } catch {}
    }

    // Apply any existing choropleths and reassert visibility
    (['gdp','gdp-per-capita','inflation','gini','exports','life-expectancy','military-expenditure','democracy-index','trade-gdp'] as MetricId[]).forEach((m) => {
      if (choroplethSpecRef.current[m]) applyChoropleth(m);
    });

    const map2 = mapRef.current;
    if (map2) {
      const layers: Record<MetricId, string> = {
        gdp: 'gdp-fill',
        'gdp-per-capita': 'gdp-per-capita-fill',
        inflation: 'inflation-fill',
        gini: 'gini-fill',
        exports: 'exports-fill',
        'life-expectancy': 'life-expectancy-fill',
        'military-expenditure': 'military-expenditure-fill',
        'democracy-index': 'democracy-index-fill',
        'trade-gdp': 'trade-gdp-fill'
      };
      (Object.keys(layers) as MetricId[]).forEach((m) => {
        const id = layers[m];
        if (!map2.getLayer(id)) return;
        const visible = activeChoroplethRef.current === m;
        const visibility = activeChoroplethRef.current ? (visible ? 'visible' : 'none') : 'none';
        try { map2.setLayoutProperty(id, 'visibility', visibility); } catch {}
      });
    }

    // PRIMARY HIT-TESTING LAYER for country interactions
    // This fill layer covers the entire country geometry and receives all pointer events
    // (click, mousemove, etc.). Even with fill-opacity: 0, the geometry remains interactive.
    // Use this layer ID ('country-highlight') for:
    //   - map.on('click', 'country-highlight', handler)
    //   - map.on('mousemove', 'country-highlight', handler)
    //   - Any future interior interactions (markers, overlays, region selection)
    // The hover effect (0.3 opacity) provides visual feedback on mouse over.
    if (!map.getLayer('country-highlight')) {
      try {
        map.addLayer({
          id: 'country-highlight',
          type: 'fill',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          paint: {
            'fill-color': '#87CEEB',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.3,
              0
            ]
          }
        } as any);
      } catch {}
    }

    // Capa seleccionado (subtle fill for visual cue + hit-testing fallback)
    // NOTE: The interior remains fully interactive via 'country-highlight' layer which
    // always covers the country geometry for pointer events. This layer provides a subtle
    // tint (~8%) while keeping the interior clickable for future features (markers, overlays, etc.)
    if (!map.getLayer('country-selected')) {
      try {
        map.addLayer({
          id: 'country-selected',
          type: 'fill',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          paint: {
            'fill-color': '#4A90E2',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              0.08, // Subtle tint ~8% opacity - keeps interior visible and interactive
              0
            ]
          }
        } as any);
      } catch {}
    }

    // Outline layer for selected country (visible boundary line)
    // This provides the clear visual boundary while the fill layer above handles hit-testing
    if (!map.getLayer('country-selected-outline')) {
      try {
        map.addLayer({
          id: 'country-selected-outline',
          type: 'line',
          source: 'country-boundaries',
          'source-layer': 'country_boundaries',
          paint: {
            'line-color': '#4A90E2',
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              2.5,
              0
            ],
            'line-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              0.9,
              0
            ]
          }
        } as any);
      } catch {}
    }

    // Reagregar visualización de conflictos
    try {
      const conflictGeoJSON = conflictsToGeoJSON(conflicts);
      ConflictVisualization.addLayers(map, 'country-boundaries', conflictGeoJSON);
    } catch {}

    // Ensure org highlight layers exist after style changes
    ensureOrgHighlightLayers();
    updateOrgHighlightFilter(highlightedIsoOrgRef.current);

    // Re-ensure natural layers after style changes
    if (naturalEnabledRef.current.rivers) {
      ensureNaturalSource('rivers', naturalLodRef.current);
      ensureRiversLayer();
    }
    if (naturalEnabledRef.current.ranges) {
      ensureNaturalSource('ranges', naturalLodRef.current);
      ensureRangesLayer();
    }
    if (naturalEnabledRef.current.peaks) {
      ensureNaturalSource('peaks', naturalLodRef.current);
      ensurePeaksLayer();
    }
    updateNaturalVisibility();
    ensureNaturalInteractivity();

    // 3D buildings según toggle
    if (buildings3DOn) {
      add3DBuildingsLayer(map);
    } else {
      try { if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings'); } catch {}
    }

    // Re-registrar eventos mínimos (hover y click)
    let hoveredId: number | string | null = null;

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      // Permit clicks en modo historia incluso si la sidebar está abierta
      if (isLeftSidebarOpenRef.current && !historyEnabledRef.current) {
        map.getCanvas().style.cursor = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%2387CEEB' stroke-width='1.5' opacity='0.9'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%2387CEEB' opacity='0.7'/%3E%3C/svg%3E\") 10 10, auto";
        return;
      }
      if (e.features && e.features.length > 0) {
        const id = e.features[0].id as any;
        if (id !== hoveredId) {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          if (hoveredId !== null) {
            try {
              map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: false });
            } catch {}
          }
          hoveredId = id;
          hoverTimeoutRef.current = setTimeout(() => {
            if (hoveredId !== null) {
              try {
                map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: true });
              } catch {}
            }
          }, 50);
        }
      }
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (hoveredId !== null) {
        try {
          map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: false });
        } catch {}
      }
      hoveredId = null;
      map.getCanvas().style.cursor = 'grab';
    };

    const handleCountryClick = (e: mapboxgl.MapMouseEvent) => {
      // 0) Validación: fuera de modo historia, si la sidebar está abierta no permitimos click
      //    (se mantiene exactamente el comportamiento existente).
      if (isLeftSidebarOpenRef.current && !historyEnabledRef.current) return;

      // 1) Validación: necesitamos un feature del país
      if (!e.features || e.features.length === 0) return;
      const feature: any = e.features[0];

      // 2) Derivar nombre e id (se mantiene el mismo criterio)
      const countryName = feature.properties?.name_en || feature.properties?.name || 'Unknown Country';
      const featureId = feature.id;
      if (featureId === undefined || featureId === null) return;

      // 3) Mantener lógica de selección visual (setFeatureState) exactamente como antes
      if (selectedCountryId.current !== null) {
        try {
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: selectedCountryId.current },
            { selected: false }
          );
        } catch {}
      }
      selectedCountryId.current = featureId as any;
      try {
        map.setFeatureState(
          { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: featureId },
          { selected: true }
        );
      } catch {}

      // 4) Nuevo sistema de enfoque:
      //    - Calcula bbox del país desde su geometría (Polygon/MultiPolygon)
      //    - Calcula un centroide "geométrico" (con fórmula de área para el anillo exterior)
      //    - Usa map.fitBounds para que el zoom se ajuste automáticamente al tamaño del país
      //    - Fallback: si no hay geometría o hay error, centra en el punto del click con zoom medio
      const easing = (t: number) => 1 - Math.pow(1 - t, 3);
      const fallbackCenter: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      try {
        const geometry: any = feature.geometry;
        if (!geometry || !geometry.type || !geometry.coordinates) {
          throw new Error('Country geometry not available');
        }

        // 4.1) Extraer todos los puntos [lng, lat] de la geometría para poder calcular el bbox
        const points: Array<[number, number]> = [];
        const pushPoint = (pt: any) => {
          if (!Array.isArray(pt) || pt.length < 2) return;
          const lng = Number(pt[0]);
          const lat = Number(pt[1]);
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
          points.push([lng, lat]);
        };

        if (geometry.type === 'Polygon') {
          for (const ring of geometry.coordinates as any[]) {
            for (const pt of ring as any[]) pushPoint(pt);
          }
        } else if (geometry.type === 'MultiPolygon') {
          for (const polygon of geometry.coordinates as any[]) {
            for (const ring of polygon as any[]) {
              for (const pt of ring as any[]) pushPoint(pt);
            }
          }
        } else {
          // No debería ocurrir en la capa de países, pero dejamos un error explícito.
          throw new Error(`Unsupported country geometry type: ${String(geometry.type)}`);
        }

        if (points.length === 0) throw new Error('Country geometry has no coordinates');

        // 4.2) Calcular bounding box: [[minLng, minLat], [maxLng, maxLat]]
        let minLng = Infinity;
        let minLat = Infinity;
        let maxLng = -Infinity;
        let maxLat = -Infinity;
        for (const [lng, lat] of points) {
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        }

        // Validación extra por seguridad
        if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
          throw new Error('Invalid bbox values from geometry');
        }

        const bbox: mapboxgl.LngLatBoundsLike = [
          [minLng, minLat],
          [maxLng, maxLat],
        ];

        // 4.3) Calcular centroide:
        //      - Intentamos centroide del anillo exterior con fórmula de área (shoelace)
        //      - Si falla (área ~ 0), usamos el centro del bbox como fallback robusto
        const bboxCenter: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

        const centroidFromRing = (ring: Array<[number, number]>) => {
          if (ring.length < 3) return { centroid: bboxCenter, areaAbs: 0 };
          let area2 = 0; // 2*A (signed)
          let cx6a = 0;  // 6*A*Cx
          let cy6a = 0;  // 6*A*Cy

          for (let i = 0; i < ring.length; i++) {
            const [x0, y0] = ring[i];
            const [x1, y1] = ring[(i + 1) % ring.length];
            const cross = x0 * y1 - x1 * y0;
            area2 += cross;
            cx6a += (x0 + x1) * cross;
            cy6a += (y0 + y1) * cross;
          }

          const area = area2 / 2;
          const areaAbs = Math.abs(area);
          if (areaAbs < 1e-12) return { centroid: bboxCenter, areaAbs: 0 };
          return { centroid: [cx6a / (6 * area), cy6a / (6 * area)] as [number, number], areaAbs };
        };

        const computeCentroid = (): [number, number] => {
          try {
            // Para MultiPolygon, elegimos el polígono con mayor área del anillo exterior
            if (geometry.type === 'Polygon') {
              const outerRing = (geometry.coordinates?.[0] || []).map((p: any) => [Number(p[0]), Number(p[1])] as [number, number]);
              return centroidFromRing(outerRing).centroid;
            }

            if (geometry.type === 'MultiPolygon') {
              let best = { centroid: bboxCenter, areaAbs: 0 };
              for (const polygon of geometry.coordinates as any[]) {
                const outerRing = (polygon?.[0] || []).map((p: any) => [Number(p[0]), Number(p[1])] as [number, number]);
                const c = centroidFromRing(outerRing);
                if (c.areaAbs > best.areaAbs) best = c;
              }
              return best.centroid;
            }

            return bboxCenter;
          } catch {
            return bboxCenter;
          }
        };

        const centroid = computeCentroid();

        // 4.4) ⚡ Performance/robustez:
        //      El "lagazo" venía de hacer 2 movimientos (fitBounds + luego easeTo en moveend),
        //      y además los clicks rápidos podían aplicar el centroide anterior cuando terminaba
        //      la animación previa. Para evitarlo:
        //        - Cancelamos cualquier animación en curso (map.stop()).
        //        - Calculamos el zoom automáticamente con cameraForBounds (misma idea que fitBounds).
        //        - Hacemos UNA sola animación easeTo al centroide con ese zoom.
        try { map.stop(); } catch {}

        const camera = map.cameraForBounds(bbox, { padding: 50 });
        if (!camera || camera.zoom === undefined || camera.zoom === null) throw new Error('cameraForBounds failed');

        map.easeTo({
          center: centroid,
          zoom: camera.zoom,
          duration: 1200,
          easing
        });
      } catch {
        // 4.5) Fallback simple: centrar en el click con zoom medio
        map.easeTo({
          center: fallbackCenter,
          zoom: 3.5,
          duration: 1200,
          easing
        });
      }

      // 5) Mantener callback de selección (carga de sidebar, etc.)
      handleCountrySelection(countryName);
    };

    try {
      map.on('mousemove', 'country-highlight', handleMouseMove);
      map.on('mouseleave', 'country-highlight', handleMouseLeave);
      map.on('click', 'country-highlight', handleCountryClick);
      eventListenersRef.current.push(
        { event: 'mousemove', handler: handleMouseMove, layer: 'country-highlight' },
        { event: 'mouseleave', handler: handleMouseLeave, layer: 'country-highlight' },
        { event: 'click', handler: handleCountryClick, layer: 'country-highlight' }
      );
    } catch {}
  }, [conflicts, handleCountrySelection, applyFog, applyPhysicalModeTweaks, styleKey, minimalModeOn, setBaseFeaturesVisibility]);

  // El toggle inline fue movido a la sidebar (Settings)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[styleKey],
      center: [0, 20],
      zoom: 2,
      minZoom: 0.5,
      maxZoom: 20,
      projection: 'globe',
      antialias: true,
      scrollZoom: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
      boxZoom: true,
      keyboard: true,
      renderWorldCopies: false,
      performanceMetricsCollection: false, // Mejorar rendimiento
      
      fadeDuration: 300, // Smooth transitions
      crossSourceCollisions: false, // Better performance
      attributionControl: false // Eliminar marca de agua de Mapbox
    });

    mapRef.current = map;

    // Buscador de países en inglés
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken || '',
      // @ts-expect-error mapbox-gl-geocoder types expect full module; runtime is fine
      mapboxgl: mapboxgl as unknown as typeof mapboxgl,
      types: 'country',
      language: 'en',
      placeholder: 'Search country',
      clearOnBlur: true,
      clearAndBlurOnEsc: true,
      collapsed: false
    });
    
    // Evento cuando se selecciona un país desde el geocoder
    const handleGeocoderResult = (e: unknown) => {
      const event = e as { result: { place_name?: string; text?: string; center: [number, number] } };
      const countryName = event.result.place_name || event.result.text || 'Unknown Country';
      const coordinates = event.result.center;
      
      // Buscar el país en las capas del mapa para obtener su feature
      const features = map.querySourceFeatures('country-boundaries', {
        sourceLayer: 'country_boundaries'
      });
      
      // Encontrar el feature que corresponde al país seleccionado
      const matchingFeature = features.find(feature => {
        const featureName = feature.properties?.name_en || feature.properties?.name || '';
        return featureName.toLowerCase().includes(countryName.toLowerCase()) ||
               countryName.toLowerCase().includes(featureName.toLowerCase());
      });
      
      if (matchingFeature && matchingFeature.id) {
        // Limpiar selección anterior
        if (selectedCountryId.current !== null) {
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: selectedCountryId.current },
            { selected: false }
          );
        }
        
        // Establecer nueva selección
        selectedCountryId.current = matchingFeature.id as string | number;
        map.setFeatureState(
          { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: matchingFeature.id },
          { selected: true }
        );
        
        // Llamar a la función de selección de país
        const finalCountryName = matchingFeature.properties?.name_en || matchingFeature.properties?.name || countryName;
        
        // Enfoque por geometría (bbox + centroide) para ajustar zoom automáticamente al tamaño del país.
        // Fallback: si no hay geometría, centramos en las coordenadas del geocoder con un zoom medio.
        const easing = (t: number) => 1 - Math.pow(1 - t, 3);
        const fallbackCenter: [number, number] = coordinates;

        try {
          const geometry: any = (matchingFeature as any).geometry;
          if (!geometry || !geometry.type || !geometry.coordinates) throw new Error('No geometry for matchingFeature');

          const points: Array<[number, number]> = [];
          const pushPoint = (pt: any) => {
            if (!Array.isArray(pt) || pt.length < 2) return;
            const lng = Number(pt[0]);
            const lat = Number(pt[1]);
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
            points.push([lng, lat]);
          };

          if (geometry.type === 'Polygon') {
            for (const ring of geometry.coordinates as any[]) for (const pt of ring as any[]) pushPoint(pt);
          } else if (geometry.type === 'MultiPolygon') {
            for (const polygon of geometry.coordinates as any[]) for (const ring of polygon as any[]) for (const pt of ring as any[]) pushPoint(pt);
          } else {
            throw new Error(`Unsupported geometry type: ${String(geometry.type)}`);
          }

          if (points.length === 0) throw new Error('Geometry has no coordinates');

          let minLng = Infinity;
          let minLat = Infinity;
          let maxLng = -Infinity;
          let maxLat = -Infinity;
          for (const [lng, lat] of points) {
            if (lng < minLng) minLng = lng;
            if (lat < minLat) minLat = lat;
            if (lng > maxLng) maxLng = lng;
            if (lat > maxLat) maxLat = lat;
          }

          const bbox: mapboxgl.LngLatBoundsLike = [
            [minLng, minLat],
            [maxLng, maxLat]
          ];

          const bboxCenter: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
          const centroidFromRing = (ring: Array<[number, number]>) => {
            if (ring.length < 3) return { centroid: bboxCenter, areaAbs: 0 };
            let area2 = 0;
            let cx6a = 0;
            let cy6a = 0;
            for (let i = 0; i < ring.length; i++) {
              const [x0, y0] = ring[i];
              const [x1, y1] = ring[(i + 1) % ring.length];
              const cross = x0 * y1 - x1 * y0;
              area2 += cross;
              cx6a += (x0 + x1) * cross;
              cy6a += (y0 + y1) * cross;
            }
            const area = area2 / 2;
            const areaAbs = Math.abs(area);
            if (areaAbs < 1e-12) return { centroid: bboxCenter, areaAbs: 0 };
            return { centroid: [cx6a / (6 * area), cy6a / (6 * area)] as [number, number], areaAbs };
          };

          const computeCentroid = (): [number, number] => {
            try {
              if (geometry.type === 'Polygon') {
                const outerRing = (geometry.coordinates?.[0] || []).map((p: any) => [Number(p[0]), Number(p[1])] as [number, number]);
                return centroidFromRing(outerRing).centroid;
              }
              if (geometry.type === 'MultiPolygon') {
                let best = { centroid: bboxCenter, areaAbs: 0 };
                for (const polygon of geometry.coordinates as any[]) {
                  const outerRing = (polygon?.[0] || []).map((p: any) => [Number(p[0]), Number(p[1])] as [number, number]);
                  const c = centroidFromRing(outerRing);
                  if (c.areaAbs > best.areaAbs) best = c;
                }
                return best.centroid;
              }
              return bboxCenter;
            } catch {
              return bboxCenter;
            }
          };

          const centroid = computeCentroid();

          // Evitar doble movimiento y race conditions igual que en click:
          try { map.stop(); } catch {}

          const camera = map.cameraForBounds(bbox, { padding: 50 });
          if (!camera || camera.zoom === undefined || camera.zoom === null) throw new Error('cameraForBounds failed');

          map.easeTo({
            center: centroid,
            zoom: camera.zoom,
            duration: 1200,
            easing
          });
        } catch {
          map.easeTo({
            center: fallbackCenter,
            zoom: 3.5,
            duration: 1200,
            easing
          });
        }
        
        handleCountrySelection(finalCountryName);
       } else {
         // Si no se encuentra el feature, al menos centrar en las coordenadas
         map.easeTo({
           center: coordinates,
           zoom: 3.5, // Zoom medio como fallback cuando no encontramos el feature
           duration: 1200,
           easing: (t: number) => 1 - Math.pow(1 - t, 3)
         });
         
         // Llamar a la función de selección con el nombre del geocoder
         handleCountrySelection(countryName);
       }
       
       // Limpiar el input del geocoder para permitir nuevas búsquedas
       setTimeout(() => {
         geocoder.clear();
       }, 100);
    };
    
    geocoder.on('result', handleGeocoderResult);
    
    if (geocoderContainer.current) {
      geocoderContainer.current.innerHTML = '';
      geocoderContainer.current.appendChild(geocoder.onAdd(map));
    }

    // Habilitar controles de navegación
    map.addControl(new mapboxgl.NavigationControl());
    
    // Configurar zoom fluido y suave
    map.scrollZoom.setWheelZoomRate(1/450); // Más suave
    map.scrollZoom.setZoomRate(1/150); // Más controlado
    
    // ✅ MEJORADO: Configurar transiciones suaves para el mapa con cleanup
    const handleMoveStart = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
    
    const handleMoveEnd = () => {
      // Optimizar renderizado después del movimiento
      animationFrameRef.current = requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.triggerRepaint();
        }
      });
      // Refrescar LOD natural si está en auto y hay capas activas
      try {
        const anyEnabled = naturalEnabledRef.current.rivers || naturalEnabledRef.current.ranges || naturalEnabledRef.current.peaks;
        if (anyEnabled && naturalLodRef.current === 'auto') {
          refreshNaturalByLod();
        }
      } catch {}
    };
    
    // ✅ MEJORADO: Registrar event listeners para cleanup posterior
    map.on('movestart', handleMoveStart);
    map.on('moveend', handleMoveEnd);
    eventListenersRef.current.push(
      { event: 'movestart', handler: handleMoveStart },
      { event: 'moveend', handler: handleMoveEnd }
    );
    
    // Configurar el globo y capas cuando el mapa esté cargado
    map.on('load', () => {
      setIsMapLoaded(true);
      onMapReady?.();
      // Configurar la atmósfera del globo con fondo estrellado
      applyFog();
      // Restaurar y aplicar terreno si estaba activo
      const persisted = loadPersistedTerrain();
      setTerrainOn(persisted.on);
      setTerrainExaggeration(persisted.ex);
      if (persisted.on) {
        applyTerrain(map, { enabled: true, exaggeration: Math.max(1.5, persisted.ex), useHillshade: false });
      }

      // Initialize conflict data manager and add conflict source
      if (conflictDataManager.current) {
        conflictDataManager.current.initialize(map);
        conflictDataManager.current.addConflictSource(conflicts);
      }

      // Conflict visualization is now handled by CountryConflictVisualization

    // Reusar helper estándar
    reinitializeInteractiveLayers();

    // Click handlers for historical selection
    const onHistoryClick = (e: mapboxgl.MapMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const features = map.queryRenderedFeatures(e.point, { layers: ['history-fill'] });
      if (!features || features.length === 0) return;
      const f = features[0] as any;
      const canonical = f?.properties?.CANONICAL || null;
      if (!canonical) return;
      historySelectedCanonicalRef.current = canonical;
      try { map.setFilter('history-selected-fill', ['==', ['get', 'CANONICAL'], canonical]); } catch {}
      try { map.setFilter('history-selected-outline', ['==', ['get', 'CANONICAL'], canonical]); } catch {}
      // popup with official-like name and Wikipedia link
      const name = String(f?.properties?.NAME ?? canonical).trim();
      const subject = String(f?.properties?.SUBJECTO ?? '').trim();
      const title = subject && subject.length > 0 ? `${name} — ${subject}` : name;
      const wikiName = encodeURIComponent(name.replace(/\s+/g, '_'));
      const wikiUrl = `https://en.wikipedia.org/wiki/${wikiName}`;
      const popupHtml = `
        <div class="history-popup-content">
          <div class="popup-title">${title}</div>
          <div class="popup-row">
            <span class="popup-meta">Year ${historyYearRef.current}</span>
            <a class="popup-link" href="${wikiUrl}" target="_blank" rel="noopener noreferrer">Wikipedia</a>
          </div>
        </div>`;
      if (historyPopupRef.current) { try { historyPopupRef.current.remove(); } catch {} }
      historyPopupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, className: 'history-popup' })
        .setLngLat((e.lngLat as any))
        .setHTML(popupHtml)
        .addTo(map);
    };

    map.on('click', 'history-fill', onHistoryClick);
    eventListenersRef.current.push({ event: 'click', handler: onHistoryClick, layer: 'history-fill' });
    });

    // ✅ MEJORADO: Animación de rotación automática con cleanup
    let userInteracting = false;
    const spinEnabled = false;

    const spinGlobe = () => {
      const zoom = map.getZoom();
      if (spinEnabled && !userInteracting && zoom < 5) {
        const distancePerSecond = 360 / 120;
        const center = map.getCenter();
        center.lng -= distancePerSecond;
        map.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    };

    // ✅ MEJORADO: Event handlers con cleanup
    const handleMouseDown = () => { userInteracting = true; userInteractingRef.current = true; };
    const handleMouseUp = () => { 
      userInteracting = false; 
      userInteractingRef.current = false;
      spinGlobe(); 
    };
    const handleDragEnd = () => { 
      userInteracting = false; 
      userInteractingRef.current = false;
      spinGlobe(); 
    };
    const handlePitchEnd = () => { 
      userInteracting = false; 
      userInteractingRef.current = false;
      spinGlobe(); 
    };
    const handleRotateEnd = () => { 
      userInteracting = false; 
      userInteractingRef.current = false;
      spinGlobe(); 
    };
    const handleMoveEndGlobe = () => { 
      spinGlobe(); 
    };

    // ✅ NUEVO: Registrar todos los event listeners para cleanup
    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);
    map.on('dragend', handleDragEnd);
    map.on('pitchend', handlePitchEnd);
    map.on('rotateend', handleRotateEnd);
    map.on('moveend', handleMoveEndGlobe);
    
    eventListenersRef.current.push(
      { event: 'mousedown', handler: handleMouseDown },
      { event: 'mouseup', handler: handleMouseUp },
      { event: 'dragend', handler: handleDragEnd },
      { event: 'pitchend', handler: handlePitchEnd },
      { event: 'rotateend', handler: handleRotateEnd },
      { event: 'moveend', handler: handleMoveEndGlobe }
    );

    // Iniciar la rotación
    spinGlobe();

    // ✅ MEJORADO: Cleanup completo para prevenir memory leaks
    return () => {
      // Limpiar todos los recursos
      cleanupResources();
      
      // Limpiar geocoder
      if (geocoder) {
        try {
          geocoder.off('result', handleGeocoderResult);
          geocoder.onRemove();
        } catch (error) {
          console.warn('Error cleaning up geocoder:', error);
        }
      }
      
      // Limpiar conflict data manager
      if (conflictDataManager.current) {
        conflictDataManager.current.cleanup();
      }
      
      // Limpiar capas de visualización de conflictos
      if (mapRef.current) {
        try {
          ConflictVisualization.cleanup(mapRef.current);
        } catch (error) {
          console.warn('Error cleaning up conflict visualization:', error);
        }
      }
      
      // Limpiar mapa
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
        mapRef.current = null;
      }
    };
  }, []); // Solo ejecutar una vez

  // Efecto para actualizar conflictos cuando cambien
  useEffect(() => {
    if (conflictDataManager.current?.hasConflictSource()) {
      conflictDataManager.current.updateConflictData(conflicts);
    }
  }, [conflicts]);

  // ✅ MEJORADO: Actualizar marcadores y países en conflicto con cleanup
  useEffect(() => {
    const update = () => {
      if (mapRef.current && isMapLoaded) {
        const conflictGeoJSON = conflictsToGeoJSON(conflicts as any);
        ConflictVisualization.updateConflictMarkers(mapRef.current, conflictGeoJSON as any);
        ConflictVisualization.updateVisualization(mapRef.current, selectedConflictId ?? null, conflicts as any);
      } else {
        // ✅ MEJORADO: Usar ref para timeout y limpiarlo
        const timeoutId = setTimeout(update, 100);
        // Guardar el timeout ID para cleanup si es necesario
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = timeoutId;
      }
    };
    update();
    
    // ✅ NUEVO: Cleanup del timeout si el componente se desmonta
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, [conflicts, selectedConflictId, isMapLoaded]);

  // Función para resetear la vista del mapa
  const resetMapView = () => {
    if (!mapRef.current) return;
    
    // Limpiar selección actual
    if (selectedCountryId.current) {
      mapRef.current.setFeatureState(
        { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: selectedCountryId.current },
        { selected: false }
      );
      selectedCountryId.current = null;
    }
    
    // Detener cualquier animación en curso
    mapRef.current.stop();
    
    // Regresar a la vista principal del globo con coordenadas exactas
    mapRef.current.easeTo({
      center: [0, 20], // Coordenadas exactas de inicialización
      zoom: 2,
      pitch: 0, // Asegurar que no hay inclinación
      bearing: 0, // Asegurar que no hay rotación
      duration: 1200,
      easing: (t: number) => 1 - Math.pow(1 - t, 3) // Mismo easing que la inicialización
    });
  };

  // Efecto para manejar cambios en el país seleccionado
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Solo resetear si selectedCountry cambió de un valor a null
    // y hay una selección actual en el mapa
    if (!selectedCountry && selectedCountryId.current) {
      // Pequeño delay para evitar conflictos con otras animaciones
      const timeoutId = setTimeout(() => {
        resetMapView();
      }, 100);
      
      // ✅ MEJORADO: Guardar timeout para cleanup
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = timeoutId;
    }
  }, [selectedCountry]);
  
  // Exponer la función de reset a través de onResetView
  useEffect(() => {
    if (onResetView) {
      // Asignar la función de reset al callback
      (window as any).resetMapView = resetMapView;
    }
  }, [onResetView]);
  
  // Efecto para actualizar el ref cuando cambia el estado de sidebar izquierda
  useEffect(() => {
    isLeftSidebarOpenRef.current = isLeftSidebarOpen;
    if (mapRef.current && isMapLoaded) {
      const canvas = mapRef.current.getCanvas();
      if (isLeftSidebarOpen) {
        // Cursor personalizado minimalista y elegante
        canvas.style.cursor = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%2387CEEB' stroke-width='1.5' opacity='0.9'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%2387CEEB' opacity='0.7'/%3E%3C/svg%3E\") 10 10, auto";
        // Agregar una clase CSS para efectos adicionales
        canvas.classList.add('sidebar-open-cursor');
      } else {
        canvas.style.cursor = 'grab';
        canvas.classList.remove('sidebar-open-cursor');
      }
    }
  }, [isLeftSidebarOpen, isMapLoaded]);

  // Efecto separado para manejar la función de selección
  useEffect(() => {
    // Este efecto se ejecuta cuando cambia onCountrySelect pero no recrea el mapa
  }, [onCountrySelect]);

  // Persistencia ligera: cargar ajustes iniciales
  useEffect(() => {
    try {
      const b3d = localStorage.getItem('wl_buildings3d');
      if (b3d !== null) setBuildings3DOn(b3d === '1');
    } catch {}
  }, []);

  // Guardar y aplicar exageración cuando cambie
  // (Terrain removido)

  // Guardar y aplicar 3D buildings cuando cambie
  useEffect(() => {
    try { localStorage.setItem('wl_buildings3d', buildings3DOn ? '1' : '0'); } catch {}
    const map = mapRef.current;
    if (!map) return;
    if (buildings3DOn) {
      add3DBuildingsLayer(map);
    } else {
      try { if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings'); } catch {}
    }
  }, [buildings3DOn, add3DBuildingsLayer]);

  return (
    <>
      <div
        ref={mapContainer}
        className="fixed inset-0 w-full h-full"
        style={{ cursor: 'grab' }}
      />
      {/* Control de estilo movido a la LeftSidebar > Settings */}
      <div 
        ref={geocoderContainer} 
        className="geocoder-container absolute left-1/2 transform -translate-x-1/2 z-20 w-80"
        style={{ top: '16px' }}
      />
      <script dangerouslySetInnerHTML={{ __html: `
        window.__wl_mapRef = {
          highlightIso3List: ${(() => 'function(iso,color){try{var r=document.__wl_map_comp; if(r && r.highlightIso3List) r.highlightIso3List(iso,color);}catch(e){}}')()},
          highlightIso3ToColorMap: ${(() => 'function(map){try{var r=document.__wl_map_comp; if(r && r.highlightIso3ToColorMap) r.highlightIso3ToColorMap(map);}catch(e){}}')()}
        };
      `}} />
    </>
  );
});

WorldMap.displayName = 'WorldMap';

// ✅ MEJORADO: Helper con tipos específicos
function conflictsToGeoJSON(conflicts: ConflictData[]): ConflictGeoJSON {
  return {
    type: 'FeatureCollection',
    features: conflicts.map(conflict => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [conflict.coordinates.lng, conflict.coordinates.lat]
      },
      properties: {
        ...conflict,
        id: conflict.id,
        country: conflict.country,
        status: conflict.status
      }
    }))
  };
}

export default WorldMap;
