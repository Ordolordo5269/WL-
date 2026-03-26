import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { applyFog as appearanceApplyFog, setBaseFeaturesVisibility as appearanceSetBaseFeaturesVisibility, applyPhysicalModeTweaks as appearanceApplyPhysical, MAP_STYLES, type StyleKey, type PlanetPreset, applyStarIntensity as appearanceApplyStarIntensity, applySpacePreset as appearanceApplySpacePreset, applyThemeAtmosphere as appearanceApplyThemeAtmosphere, type SpacePreset, type GlobeThemeKey, GLOBE_THEMES, applyRasterOverlay, removeRasterOverlay, findRasterInsertionPoint, EARTH_AT_NIGHT_OVERLAY, NASA_NIGHT_LIGHTS_OVERLAY, NASA_BLACK_MARBLE_OVERLAYS, type RasterOverlay, type NasaOverlayType, NASA_EARTH_OVERLAYS, resolveNasaOverlaySources, warmUpResources } from './map/mapAppearance';
import { applyTerrain, reapplyAfterStyleChange, loadPersistedTerrain, persistTerrain } from './map/terrain';
import type { ChoroplethSpec } from './services/worldbank-gdp';
import type { ChoroplethSpec as GdpPerCapitaChoroplethSpec } from './services/worldbank-gdp-per-capita';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '../../styles/geocoder.css';
import { ConflictVisualization } from '../conflicts/services/conflict-tracker/conflict-visualization';
import { SatelliteVisualization } from './map/satellite-visualization';
import { AVAILABLE_HISTORY_YEARS, snapToAvailableYear } from '../../utils/historical-years';
import { ConflictDataManager, type ConflictData } from '../conflicts/services/conflict-tracker/conflict-data-manager';

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
  conflicts?: ConflictData[];
  onConflictClick?: (conflictId: string) => void;
  selectedConflictId?: string | null;
  isLeftSidebarOpen?: boolean;
  /** Called once when map tiles + style finish loading (map.on('load')) */
  onMapReady?: () => void;
  onResetView?: () => void;
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

type MetricId = 'gdp' | 'inflation' | 'gdp-per-capita' | 'gini' | 'exports' | 'life-expectancy' | 'military-expenditure' | 'democracy-index' | 'trade-gdp' | 'fuel-exports' | 'mineral-rents' | 'energy-imports' | 'cereal-production';
const WorldMap = forwardRef<{ easeTo: (options: MapEaseToOptions) => void; getMap: () => mapboxgl.Map | null; setChoropleth?: (metric: MetricId, spec: ChoroplethSpec | GdpPerCapitaChoroplethSpec | null) => void; setActiveChoropleth?: (metric: MetricId | null) => void; setHistoryEnabled?: (enabled: boolean) => void; setHistoryYear?: (year: number) => void; highlightIso3List?: (iso: string[], colorHex?: string) => void; highlightIso3ToColorMap?: (isoToColor: Record<string,string>) => void; setTerrainEnabled?: (v: boolean) => void; setTerrainExaggeration?: (n: number) => void }, WorldMapProps>(({ onCountrySelect, selectedCountry, conflicts = [], selectedConflictId, isLeftSidebarOpen = false, onMapReady }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedCountryId = useRef<string | number | null>(null);
  const conflictDataManager = useRef<ConflictDataManager | null>(null);
  const isLeftSidebarOpenRef = useRef(isLeftSidebarOpen);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const historyEnabledRef = useRef<boolean>(false);
  const historyDataLoadedRef = useRef<boolean>(false); // true once user picks a year
  const historyYearRef = useRef<number>(2010);
  const availableHistoryYearsRef = useRef<number[]>(AVAILABLE_HISTORY_YEARS);
  const historyCacheRef = useRef<Map<number, any>>(new Map());
  const historyRequestIdRef = useRef<number>(0);
  const historyDebounceRef = useRef<number | null>(null);
  const historySelectedCanonicalRef = useRef<string | null>(null);
  const historyPopupRef = useRef<mapboxgl.Popup | null>(null);
  const naturalPopupRef = useRef<mapboxgl.Popup | null>(null);
  const satelliteClickRegistered = useRef(false);
  const satelliteTrackingActiveRef = useRef(false);
  // Satellite POV mode
  const povRafRef = useRef<number | null>(null);
  const povNoradIdRef = useRef<number | null>(null);
  const povPositionsRef = useRef<any[]>([]);
  const povPrevState = useRef<{ style: StyleKey; planet: PlanetPreset; star: number; zoom: number; pitch: number; bearing: number; center: [number, number] } | null>(null);
  
  const deferredTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rotationSpeedRef = useRef<number>(3);
  const spinRafRef = useRef<number | null>(null);
  const pendingAutoRotateRef = useRef<boolean>(false);
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
    'trade-gdp': null,
    'fuel-exports': null,
    'mineral-rents': null,
    'energy-imports': null,
    'cereal-production': null
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
  const planetPresetRef = useRef<PlanetPreset>(planetPreset);
  useEffect(() => { planetPresetRef.current = planetPreset; }, [planetPreset]);
  const [starIntensity, setStarIntensityState] = useState<number>(0.6);
  // Counter to invalidate pending globe theme style.load callbacks
  const globeThemeLoadId = useRef(0);
  // Counter to invalidate pending base map style.load callbacks
  const styleChangeLoadId = useRef(0);
  // Track active NASA overlay source IDs for efficient cleanup
  const activeNasaSourceIds = useRef<string[]>([]);
  // Track active Earth Data overlay types (toggleable layers)
  const activeEarthOverlaysRef = useRef<Set<NasaOverlayType>>(new Set());
  // Night Lights: save previous style/fog to restore on disable
  const nightLightsPrevStyle = useRef<{ style: StyleKey; planet: PlanetPreset; star: number } | null>(null);
  // Ocultar nombres/carreteras/fronteras
  const [minimalModeOn, setMinimalModeOn] = useState(false);
  const minimalModeRef = useRef(false);
  // Natural layers: state refs
  type NaturalLod = 'auto' | 'low' | 'med' | 'high';
  type NaturalLayerType = 'rivers' | 'ranges' | 'peaks' | 'lakes' | 'volcanoes' | 'fault-lines' | 'deserts';
  const naturalEnabledRef = useRef<{ rivers: boolean; ranges: boolean; peaks: boolean; lakes: boolean; volcanoes: boolean; 'fault-lines': boolean; deserts: boolean }>({ rivers: false, ranges: false, peaks: false, lakes: false, volcanoes: false, 'fault-lines': false, deserts: false });
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

  const cleanupResources = useCallback(() => {
    if (deferredTimeoutRef.current) {
      clearTimeout(deferredTimeoutRef.current);
      deferredTimeoutRef.current = null;
    }
    if (spinRafRef.current !== null) {
      cancelAnimationFrame(spinRafRef.current);
      spinRafRef.current = null;
    }
    if (mapRef.current) {
      eventListenersRef.current.forEach(({ event, handler, layer }) => {
        try {
          if (layer) {
            mapRef.current?.off(event, layer, handler as MapMouseEventHandler);
          } else {
            mapRef.current?.off(event, handler);
          }
        } catch {}
      });
      eventListenersRef.current = [];
    }
  }, []);
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
      'trade-gdp': 'trade-gdp-fill',
      'fuel-exports': 'fuel-exports-fill',
      'mineral-rents': 'mineral-rents-fill',
      'energy-imports': 'energy-imports-fill',
      'cereal-production': 'cereal-production-fill'
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
  const updateLayerOpacitiesForStyle = useCallback((_currentStyle: StyleKey) => {
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
      'trade-gdp': 'trade-gdp-fill',
      'fuel-exports': 'fuel-exports-fill',
      'mineral-rents': 'mineral-rents-fill',
      'energy-imports': 'energy-imports-fill',
      'cereal-production': 'cereal-production-fill'
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
    let eff: Exclude<NaturalLod,'auto'> = lod === 'auto' && map ? selectLodByZoom(map.getZoom()) : (lod === 'auto' ? 'med' : lod);
    // Volcanoes, fault-lines, deserts: never drop to 'low' (sparse data or same across all LODs)
    if ((type === 'volcanoes' || type === 'fault-lines' || type === 'deserts') && eff === 'low') eff = 'med';
    // API base (fallback to 3001 where backend dev listens)
    const API_BASE = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001';
    // API type mapping
    const apiTypeMap: Record<NaturalLayerType, string> = {
      rivers: 'rivers', ranges: 'mountain-ranges', peaks: 'peaks',
      lakes: 'lakes', volcanoes: 'volcanoes', 'fault-lines': 'fault-lines', deserts: 'deserts'
    };
    const apiType = apiTypeMap[type] ?? type;
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

  const ensureLakesLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const fillId = 'lakes-fill';
    const lineId = 'lakes-line';
    if (!map.getLayer(fillId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: 'lakes-source',
          paint: { 'fill-color': '#5b9bd5', 'fill-opacity': 0.45 }
        } as any, beforeId);
      } catch {}
    }
    if (!map.getLayer(lineId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: lineId,
          type: 'line',
          source: 'lakes-source',
          paint: {
            'line-color': '#2e78c4',
            'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.3, 5, 0.8],
            'line-opacity': 0.7
          }
        } as any, beforeId);
      } catch {}
    }
  }, []);

  const ensureVolcanoesLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const layerId = 'volcanoes-circle';
    if (!map.getLayer(layerId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: 'volcanoes-source',
          paint: {
            'circle-color': '#e84b1a',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 2, 4, 5, 6, 8, 8],
            'circle-opacity': 0.9,
            'circle-stroke-color': '#ff8c00',
            'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 1, 8, 1.5]
          }
        } as any, beforeId);
      } catch {}
    }
  }, []);

  const ensureFaultLinesLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const layerId = 'fault-lines-line';
    if (!map.getLayer(layerId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: layerId,
          type: 'line',
          source: 'fault-lines-source',
          paint: {
            'line-color': '#ff6b35',
            'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1.2, 3, 1.5, 6, 2, 9, 2.5],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 4, 0.8, 8, 0.7],
            'line-dasharray': [3, 2]
          }
        } as any, beforeId);
      } catch {}
    }
  }, []);

  const ensureDesertsLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const fillId = 'deserts-fill';
    const lineId = 'deserts-line';
    if (!map.getLayer(fillId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: 'deserts-source',
          paint: { 'fill-color': '#d4a853', 'fill-opacity': 0.28 }
        } as any, beforeId);
      } catch {}
    }
    if (!map.getLayer(lineId)) {
      try {
        const beforeId = map.getLayer('country-highlight') ? 'country-highlight' : undefined;
        map.addLayer({
          id: lineId,
          type: 'line',
          source: 'deserts-source',
          paint: {
            'line-color': '#b8860b',
            'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.3, 5, 0.7],
            'line-opacity': 0.6,
            'line-dasharray': [4, 3]
          }
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
      ['lakes-fill', cfg.lakes],
      ['lakes-line', cfg.lakes],
      ['volcanoes-circle', cfg.volcanoes],
      ['fault-lines-line', cfg['fault-lines']],
      ['deserts-fill', cfg.deserts],
      ['deserts-line', cfg.deserts],
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
    if (naturalEnabledRef.current.lakes) {
      ensureNaturalSource('lakes', lod);
      ensureLakesLayer();
    }
    if (naturalEnabledRef.current.volcanoes) {
      ensureNaturalSource('volcanoes', lod);
      ensureVolcanoesLayer();
    }
    if (naturalEnabledRef.current['fault-lines']) {
      ensureNaturalSource('fault-lines', lod);
      ensureFaultLinesLayer();
    }
    if (naturalEnabledRef.current.deserts) {
      ensureNaturalSource('deserts', lod);
      ensureDesertsLayer();
    }
    updateNaturalVisibility();
  }, [ensureNaturalSource, ensureRiversLayer, ensureRangesLayer, ensurePeaksLayer, ensureLakesLayer, ensureVolcanoesLayer, ensureFaultLinesLayer, ensureDesertsLayer, updateNaturalVisibility]);

  const ensureNaturalInteractivity = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers: Array<{ id: string; type: NaturalLayerType }> = [
      { id: 'rivers-line', type: 'rivers' },
      { id: 'ranges-line', type: 'ranges' },
      { id: 'peaks-symbol', type: 'peaks' },
      { id: 'lakes-fill', type: 'lakes' },
      { id: 'volcanoes-circle', type: 'volcanoes' },
      { id: 'fault-lines-line', type: 'fault-lines' },
      { id: 'deserts-fill', type: 'deserts' },
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
        const defaultTitle: Record<NaturalLayerType, string> = { rivers: 'River', ranges: 'Range', peaks: 'Peak', lakes: 'Lake', volcanoes: 'Volcano', 'fault-lines': 'Fault Line', deserts: 'Desert' };
        let title = props.name || props.NAME || props.Volcano_Name || defaultTitle[type];
        const lines: string[] = [];
        if (type === 'peaks') {
          if (props.elevation_m) lines.push(`Elevation: ${props.elevation_m} m`);
          if (props.prominence_m) lines.push(`Prominence: ${props.prominence_m} m`);
        } else if (type === 'rivers') {
          if (props.class) lines.push(`Class: ${props.class}`);
          if (props.length_km) lines.push(`Length: ${props.length_km} km`);
        } else if (type === 'volcanoes') {
          if (props.Primary_Volcano_Type) lines.push(`Type: ${props.Primary_Volcano_Type}`);
          if (props.Last_Known_Eruption) lines.push(`Last eruption: ${props.Last_Known_Eruption}`);
          if (props.Country) lines.push(`Country: ${props.Country}`);
        } else if (type === 'deserts') {
          if (props.name_en || props.NAME_EN) lines.push(`Region: ${props.name_en || props.NAME_EN}`);
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

    // Re-register history click listener (may have been removed by reinitializeInteractiveLayers)
    if (map.getLayer(fillId)) {
      // Remove any stale listener first
      const existing = eventListenersRef.current.find(r => r.layer === fillId && r.event === 'click');
      if (existing) {
        try { map.off('click', fillId, existing.handler as any); } catch {}
        eventListenersRef.current = eventListenersRef.current.filter(r => r !== existing);
      }
      const onHistoryClick = (e: mapboxgl.MapMouseEvent) => {
        if (!mapRef.current) return;
        const features = mapRef.current.queryRenderedFeatures(e.point, { layers: [fillId] });
        if (!features || features.length === 0) return;
        const f = features[0] as any;
        const canonical = f?.properties?.CANONICAL || null;
        if (!canonical) return;
        historySelectedCanonicalRef.current = canonical;
        try { mapRef.current.setFilter(selectedFillId, ['==', ['get', 'CANONICAL'], canonical]); } catch {}
        try { mapRef.current.setFilter(selectedOutlineId, ['==', ['get', 'CANONICAL'], canonical]); } catch {}
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
          .addTo(mapRef.current);
      };
      map.on('click', fillId, onHistoryClick);
      eventListenersRef.current.push({ event: 'click', handler: onHistoryClick, layer: fillId });
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
    getBaseMapStyle: () => styleKeyRef.current,
    getAutoRotate: () => spinRafRef.current !== null,
    getRotateSpeed: () => rotationSpeedRef.current,
    getStarIntensity: () => starIntensity,
    // Allow external code to pre-set the style that Night Lights will restore on deactivation.
    // Used when transitioning from History Mode → Satellite Intel so that the original
    // (pre-History) style is captured instead of the transient 'navigation-day'.
    setNightLightsPrevStyleOverride: (style: string, planet: string, star: number) => {
      nightLightsPrevStyle.current = { style: style as any, planet: planet as any, star };
    },
    // Clear the night-lights restore state so deactivation won't trigger a style change.
    // Used when transitioning from Satellite Intel → History Mode.
    clearNightLightsPrevStyle: () => { nightLightsPrevStyle.current = null; },
    // Read the saved pre-night-lights style (the user's original style before Satellite Intel).
    getNightLightsPrevStyle: () => nightLightsPrevStyle.current ? { ...nightLightsPrevStyle.current } : null,
    setNaturalLayerEnabled: (type: NaturalLayerType, enabled: boolean) => {
      naturalEnabledRef.current = { ...naturalEnabledRef.current, [type]: enabled };
      if (!mapRef.current) return;
      if (enabled) {
        ensureNaturalSource(type, naturalLodRef.current);
        if (type === 'rivers') ensureRiversLayer();
        if (type === 'ranges') ensureRangesLayer();
        if (type === 'peaks') ensurePeaksLayer();
        if (type === 'lakes') ensureLakesLayer();
        if (type === 'volcanoes') ensureVolcanoesLayer();
        if (type === 'fault-lines') ensureFaultLinesLayer();
        if (type === 'deserts') ensureDesertsLayer();
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
        'trade-gdp': 'trade-gdp-fill',
        'fuel-exports': 'fuel-exports-fill',
        'mineral-rents': 'mineral-rents-fill',
        'energy-imports': 'energy-imports-fill',
        'cereal-production': 'cereal-production-fill'
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
    dismissHistoryPopup: () => {
      if (historyPopupRef.current) {
        try { historyPopupRef.current.remove(); } catch {}
        historyPopupRef.current = null;
      }
      historySelectedCanonicalRef.current = null;
      const map = mapRef.current;
      if (map) {
        try { map.setFilter('history-selected-fill', ['==', ['get', 'CANONICAL'], '__none__']); } catch {}
        try { map.setFilter('history-selected-outline', ['==', ['get', 'CANONICAL'], '__none__']); } catch {}
      }
    },
    setHistoryEnabled: (enabled: boolean) => {
      historyEnabledRef.current = enabled;
      if (!enabled) {
        historyDataLoadedRef.current = false;
      } else {
        // Reset to presentation mode: default year, data not yet "user-picked"
        historyDataLoadedRef.current = false;
        historyYearRef.current = 2010;
      }
      const map = mapRef.current;
      if (!map) return;
      const fillId = 'history-fill';
      const outlineId = 'history-outline';
      const selectedFillId = 'history-selected-fill';
      const selectedOutlineId = 'history-selected-outline';
      const sourceId = 'history-source';
      if (enabled) {
        // Load territories for the default year — colored territories over visible
        // country labels create the "history mode" presentation look.
        // Don't set historyDataLoadedRef here — that flag is only for when
        // the user explicitly picks a year (switches to territory-only view).
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
        // Hide layers instead of removing them so that the click handler
        // registered on 'history-fill' during map init stays alive.
        try { if (map.getLayer(fillId)) map.setLayoutProperty(fillId, 'visibility', 'none'); } catch {}
        try { if (map.getLayer(outlineId)) map.setLayoutProperty(outlineId, 'visibility', 'none'); } catch {}
        try { if (map.getLayer(selectedFillId)) map.setLayoutProperty(selectedFillId, 'visibility', 'none'); } catch {}
        try { if (map.getLayer(selectedOutlineId)) map.setLayoutProperty(selectedOutlineId, 'visibility', 'none'); } catch {}
        // Reset selection filter so stale highlight doesn't reappear on re-enable
        try { map.setFilter(selectedFillId, ['==', ['get', 'CANONICAL'], '__none__']); } catch {}
        try { map.setFilter(selectedOutlineId, ['==', ['get', 'CANONICAL'], '__none__']); } catch {}
        historySelectedCanonicalRef.current = null;
        // cleanup popup
        if (historyPopupRef.current) {
          try { historyPopupRef.current.remove(); } catch {}
          historyPopupRef.current = null;
        }
      }
    },
    setHistoryYear: (year: number) => {
      historyYearRef.current = year;
      historyDataLoadedRef.current = true;
      // Dismiss any open territory popup & selection highlight
      if (historyPopupRef.current) {
        try { historyPopupRef.current.remove(); } catch {}
        historyPopupRef.current = null;
      }
      historySelectedCanonicalRef.current = null;
      if (mapRef.current) {
        try { mapRef.current.setFilter('history-selected-fill', ['==', ['get', 'CANONICAL'], '__none__']); } catch {}
        try { mapRef.current.setFilter('history-selected-outline', ['==', ['get', 'CANONICAL'], '__none__']); } catch {}
      }
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
    setBaseMapStyle: (next: StyleKey, opts?: { skipFade?: boolean }) => {
      const loadId = ++styleChangeLoadId.current;
      globeThemeLoadId.current++; // Cancel any pending theme callbacks
      // If user manually changes style, invalidate Night Lights saved state
      // so re-entering Satellite Intel captures the fresh style instead
      nightLightsPrevStyle.current = null;
      const sameUrl = MAP_STYLES[styleKeyRef.current] === MAP_STYLES[next];
      setStyleKey(next);
      styleKeyRef.current = next; // Update ref immediately to avoid stale checks on subsequent calls
      if (!mapRef.current) return;
      const map = mapRef.current;
      const nasaOverlays: RasterOverlay[] = next === 'earth-at-night' ? [EARTH_AT_NIGHT_OVERLAY]
        : next === 'nasa-night-lights' ? [NASA_NIGHT_LIGHTS_OVERLAY]
        : next === 'nasa-black-marble' ? NASA_BLACK_MARBLE_OVERLAYS : [];
      const applyOverlays = (m: mapboxgl.Map) => {
        const beforeId = findRasterInsertionPoint(m);
        nasaOverlays.forEach(o => applyRasterOverlay(m, o, beforeId));
        activeNasaSourceIds.current = nasaOverlays.map(o => o.sourceId);
        // Re-apply active Earth Data overlays after style change
        activeEarthOverlaysRef.current.forEach(type => {
          resolveNasaOverlaySources(type).forEach(src => {
            if (src.tiles.length > 0) applyRasterOverlay(m, src, beforeId);
          });
        });
      };
      try {
        // Clean up only active NASA overlays
        activeNasaSourceIds.current.forEach(id => removeRasterOverlay(map, id));
        activeNasaSourceIds.current = [];
        if (sameUrl) {
          // Same underlying Mapbox style — skip reload, just toggle overlay
          applyOverlays(map);
        } else {
          // Fade out canvas to hide style-change flash (skip when caller
          // wants the globe to stay visible, e.g. entering History Mode so
          // rotation is visible while textures load in the background).
          const container = map.getContainer();
          const skipFade = !!opts?.skipFade;
          if (!skipFade) {
            container.style.transition = 'opacity 0.18s ease-out';
            container.style.opacity = '0';
          }
          map.setStyle(MAP_STYLES[next], { diff: false } as any);
          map.once('style.load', () => {
            if (styleChangeLoadId.current !== loadId) return; // Stale — a newer change superseded this
            appearanceApplyFog(map, planetPresetRef.current);
            reapplyAfterStyleChange(map, { enabled: terrainOn, exaggeration: terrainExaggeration, useHillshade: false });
            reinitializeInteractiveLayers();
            updateLayerOpacitiesForStyle(next);
            if (historyEnabledRef.current) {
              updateHistory(historyYearRef.current);
            }
            if (buildings3DOn) {
              try { add3DBuildingsLayer(map); } catch {}
            }
            applyOverlays(map);
            // Start or re-kick auto-rotation after style change completes
            if (pendingAutoRotateRef.current) {
              if (spinRafRef.current !== null) cancelAnimationFrame(spinRafRef.current);
              let lastTs = 0;
              const step = (ts: number) => {
                const m = mapRef.current;
                if (!m) { spinRafRef.current = null; return; }
                if (lastTs === 0) lastTs = ts;
                const dt = Math.max(0, (ts - lastTs) / 1000);
                lastTs = ts;
                const zoom = m.getZoom();
                const isMoving = (m as any).isMoving?.() ?? false;
                if (!isMoving && !userInteractingRef.current && zoom < 5) {
                  const center = m.getCenter();
                  center.lng -= rotationSpeedRef.current * dt;
                  m.setCenter(center);
                }
                spinRafRef.current = requestAnimationFrame(step);
              };
              spinRafRef.current = requestAnimationFrame(step);
            }
            // Fade canvas back in after style is ready
            if (!skipFade) {
              requestAnimationFrame(() => {
                container.style.transition = 'opacity 0.3s ease-in';
                container.style.opacity = '1';
              });
            }
          });
        }
      } catch {}
    },
    setPlanetPreset: (preset: PlanetPreset) => {
      globeThemeLoadId.current++; // Cancel any pending theme style.load
      nightLightsPrevStyle.current = null;
      setPlanetPreset(preset);
      planetPresetRef.current = preset; // Update ref immediately for other handlers
      if (mapRef.current) appearanceApplyFog(mapRef.current, preset);
    },
    setStarIntensity: (v: number) => {
      globeThemeLoadId.current++; // Cancel any pending theme style.load
      const clamped = Math.min(1, Math.max(0, v));
      setStarIntensityState(clamped);
      if (mapRef.current) appearanceApplyStarIntensity(mapRef.current, clamped);
    },
    setSpacePreset: (preset: SpacePreset) => {
      globeThemeLoadId.current++; // Cancel any pending theme style.load
      if (mapRef.current) appearanceApplySpacePreset(mapRef.current, preset);
    },
    setGlobeTheme: (themeKey: GlobeThemeKey) => {
      nightLightsPrevStyle.current = null;
      const theme = GLOBE_THEMES[themeKey];
      if (!theme || !mapRef.current) return;
      const map = mapRef.current;
      const loadId = ++globeThemeLoadId.current;
      styleChangeLoadId.current++; // Cancel any pending base map callbacks
      const sameStyle = MAP_STYLES[styleKeyRef.current] === MAP_STYLES[theme.baseMap];
      setStyleKey(theme.baseMap);
      styleKeyRef.current = theme.baseMap;
      setPlanetPreset(theme.planet);
      setStarIntensityState(theme.starIntensity);
      const applyThemeEffects = () => {
        appearanceApplyThemeAtmosphere(map, theme.planet, theme.space, theme.starIntensity);
        // Clean up only active NASA overlays, then apply new ones if present
        activeNasaSourceIds.current.forEach(id => removeRasterOverlay(map, id));
        activeNasaSourceIds.current = [];
        if (theme.rasterOverlay) {
          const overlays: RasterOverlay[] = Array.isArray(theme.rasterOverlay) ? theme.rasterOverlay : [theme.rasterOverlay as RasterOverlay];
          const beforeId = findRasterInsertionPoint(map);
          overlays.forEach(o => applyRasterOverlay(map, o, beforeId));
          activeNasaSourceIds.current = overlays.map(o => o.sourceId);
        }
        // Re-apply active Earth Data overlays
        const bId = findRasterInsertionPoint(map);
        activeEarthOverlaysRef.current.forEach(type => {
          const ovOpacity = type === 'night-lights' ? 0.45 : 1.0;
          resolveNasaOverlaySources(type).forEach(src => {
            if (src.tiles.length > 0) applyRasterOverlay(map, src, bId, ovOpacity);
          });
        });
      };
      if (sameStyle) {
        try { applyThemeEffects(); } catch {}
      } else {
        try {
          // Fade out canvas to hide style-change flash
          const container = map.getContainer();
          container.style.transition = 'opacity 0.18s ease-out';
          container.style.opacity = '0';
          map.setStyle(MAP_STYLES[theme.baseMap], { diff: false } as any);
          map.once('style.load', () => {
            const cancelled = globeThemeLoadId.current !== loadId;
            // Always re-initialize layers after style change
            reapplyAfterStyleChange(map, { enabled: terrainOn, exaggeration: terrainExaggeration, useHillshade: false });
            reinitializeInteractiveLayers();
            updateLayerOpacitiesForStyle(theme.baseMap);
            if (historyEnabledRef.current) {
              updateHistory(historyYearRef.current);
            }
            if (buildings3DOn) {
              try { add3DBuildingsLayer(map); } catch {}
            }
            if (cancelled) {
              appearanceApplyFog(map, planetPresetRef.current);
            } else {
              applyThemeEffects();
            }
            // Fade canvas back in after style is ready
            requestAnimationFrame(() => {
              container.style.transition = 'opacity 0.3s ease-in';
              container.style.opacity = '1';
            });
          });
        } catch {}
      }
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
    setMinimalMode: (v: boolean) => { setMinimalModeOn(v); minimalModeRef.current = v; setBaseFeaturesVisibility(v); },
    // NEW: Globe rotation controls (smooth RAF-based)
    setAutoRotate: (enabled: boolean) => {
      pendingAutoRotateRef.current = enabled;
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
    },
    // Earth Data overlays (toggleable NASA GIBS layers)
    // Satellite live tracking layers
    setSatelliteTrackingLayers: (enabled: boolean) => {
      satelliteTrackingActiveRef.current = enabled;
      const map = mapRef.current;
      if (!map) return;
      if (enabled) {
        ensureSatelliteLayers(map);
      } else {
        SatelliteVisualization.cleanup(map);
        satelliteClickRegistered.current = false;
      }
    },
    updateSatellitePositions: (features: any[]) => {
      const map = mapRef.current;
      if (!map) return;
      SatelliteVisualization.updatePositions(map, features);
    },
    showSatelliteGroundTrack: (coords: [number, number][], category: string) => {
      const map = mapRef.current;
      if (!map) return;
      SatelliteVisualization.showGroundTrack(map, coords, category);
    },
    removeSatelliteGroundTrack: () => {
      const map = mapRef.current;
      if (!map) return;
      SatelliteVisualization.removeGroundTrack(map);
    },
    // ── Satellite POV Mode ──
    enterSatellitePOV: (noradId: number, category?: string) => {
      const map = mapRef.current;
      if (!map) return;
      povNoradIdRef.current = noradId;

      // Save current state for restoration
      const c = map.getCenter();
      povPrevState.current = {
        style: styleKeyRef.current,
        planet: planetPresetRef.current,
        star: starIntensity,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        center: [c.lng, c.lat],
      };

      // Stop auto-rotate if active
      if (spinRafRef.current !== null) {
        cancelAnimationFrame(spinRafRef.current);
        spinRafRef.current = null;
      }

      // Find satellite's current position from last positions
      const sat = povPositionsRef.current.find((f: any) => f.properties?.noradId === noradId);
      const satCoords = sat?.geometry?.coordinates || [0, 20];

      // Apply category-specific atmosphere (Phase 4)
      const SAT_ATMOSPHERE: Record<string, { planet: PlanetPreset; space: 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson'; star: number }> = {
        military:   { planet: 'crimson', space: 'void', star: 0.4 },
        navigation: { planet: 'sunset', space: 'deep', star: 0.8 },
        weather:    { planet: 'arctic', space: 'deep', star: 0.95 },
        stations:   { planet: 'orbital', space: 'deep', star: 1.0 },
        starlink:   { planet: 'violet', space: 'galaxy', star: 0.9 },
      };
      const atmo = SAT_ATMOSPHERE[category || ''] || SAT_ATMOSPHERE.military;
      appearanceApplyThemeAtmosphere(map, atmo.planet, atmo.space, atmo.star);

      // Fly to satellite — top-down view (pitch 0) at continent scale (zoom 3.5)
      // so you see the ground track curvature and the satellite moving along it
      map.flyTo({
        center: satCoords as [number, number],
        zoom: 3.5,
        pitch: 0,
        bearing: 0,
        duration: 1400,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
      });

      // Request ground track so the trajectory line stays visible during POV
      window.dispatchEvent(new CustomEvent('wl-satellite-pov-track', { detail: { noradId } }));

      // Start POV follow loop — updates every 2s matching worker tick
      if (povRafRef.current !== null) cancelAnimationFrame(povRafRef.current);
      let lastUpdateTs = 0;
      const step = (ts: number) => {
        const m = mapRef.current;
        if (!m || povNoradIdRef.current === null) {
          povRafRef.current = null;
          return;
        }
        // Throttle easeTo to every ~2s to match worker updates
        if (ts - lastUpdateTs > 1800) {
          lastUpdateTs = ts;
          const target = povPositionsRef.current.find((f: any) => f.properties?.noradId === povNoradIdRef.current);
          if (target) {
            const coords = target.geometry.coordinates as [number, number];
            m.easeTo({
              center: coords,
              duration: 2000,
              easing: (t: number) => t, // linear for smooth tracking
            });
          }
        }
        povRafRef.current = requestAnimationFrame(step);
      };
      // Wait for flyTo to finish before starting follow loop
      setTimeout(() => {
        if (povNoradIdRef.current !== null) {
          povRafRef.current = requestAnimationFrame(step);
        }
      }, 1500);

      // Dispatch event so App.tsx can show HUD
      window.dispatchEvent(new CustomEvent('wl-satellite-pov', { detail: { active: true, noradId } }));
    },
    exitSatellitePOV: () => {
      const map = mapRef.current;
      povNoradIdRef.current = null;

      // Stop RAF loop
      if (povRafRef.current !== null) {
        cancelAnimationFrame(povRafRef.current);
        povRafRef.current = null;
      }

      if (!map) return;

      // Restore previous state
      const prev = povPrevState.current;
      if (prev) {
        appearanceApplyFog(map, prev.planet);
        map.flyTo({
          center: prev.center,
          zoom: prev.zoom,
          pitch: prev.pitch,
          bearing: prev.bearing,
          duration: 1200,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
        });
        povPrevState.current = null;
      } else {
        appearanceApplyFog(map, 'default');
        map.flyTo({ center: [0, 20], zoom: 2, pitch: 0, bearing: 0, duration: 1200 });
      }

      window.dispatchEvent(new CustomEvent('wl-satellite-pov', { detail: { active: false } }));
    },
    updateSatellitePOVPositions: (features: any[]) => {
      povPositionsRef.current = features;
    },
    isSatellitePOVActive: () => povNoradIdRef.current !== null,
    setNasaOverlayEnabled: (type: NasaOverlayType, enabled: boolean) => {
      const map = mapRef.current;
      if (!map) return;
      const cfg = NASA_EARTH_OVERLAYS[type];
      if (!cfg) return;
      if (enabled) {
        // Night Lights: switch to dark immersive mode
        if (type === 'night-lights') {
          if (!nightLightsPrevStyle.current) {
            nightLightsPrevStyle.current = { style: styleKeyRef.current, planet: planetPresetRef.current, star: starIntensity };
          }
          const alreadyDark = MAP_STYLES[styleKeyRef.current] === MAP_STYLES['dark'];
          setStyleKey('dark');
          styleKeyRef.current = 'dark';
          activeEarthOverlaysRef.current.add(type);
          const applyImmersive = () => {
            appearanceApplyThemeAtmosphere(map, 'orbital', 'void', 1.0);
            // Add all earth overlay tiles (including the one we just enabled)
            activeEarthOverlaysRef.current.forEach(ovType => {
              const ovCfg = NASA_EARTH_OVERLAYS[ovType];
              if (ovCfg) {
                const bid = findRasterInsertionPoint(map);
                const opacity = ovType === 'night-lights' ? 0.45 : 1.0;
                resolveNasaOverlaySources(ovType).forEach(src => {
                  if (src.tiles.length > 0) applyRasterOverlay(map, src, bid, opacity);
                });
              }
            });
            reinitializeInteractiveLayers();
          };
          if (alreadyDark) {
            applyImmersive();
          } else {
            map.setStyle(MAP_STYLES['dark']);
            map.once('style.load', applyImmersive);
          }
          setPlanetPreset('orbital');
          planetPresetRef.current = 'orbital';
          setStarIntensityState(1.0);
          return; // Skip the default tile-add below — applyImmersive handles it
        }
        const beforeId = findRasterInsertionPoint(map);
        resolveNasaOverlaySources(type).forEach(src => {
          if (src.tiles.length > 0) applyRasterOverlay(map, src, beforeId);
        });
        activeEarthOverlaysRef.current.add(type);
      } else {
        cfg.sources.forEach(s => removeRasterOverlay(map, s.sourceId));
        activeEarthOverlaysRef.current.delete(type);
        // Night Lights: deactivate ALL other overlays and restore previous style.
        // This gives a clean exit from Satellite Intel immersive mode.
        if (type === 'night-lights') {
          // Remove tiles of any remaining active overlays
          activeEarthOverlaysRef.current.forEach(ovType => {
            const ovCfg = NASA_EARTH_OVERLAYS[ovType];
            if (ovCfg) ovCfg.sources.forEach(s => removeRasterOverlay(map, s.sourceId));
          });
          activeEarthOverlaysRef.current.clear();
          // Restore previous style & fog
          if (nightLightsPrevStyle.current) {
            const prev = nightLightsPrevStyle.current;
            nightLightsPrevStyle.current = null;
            const needsStyleChange = MAP_STYLES[styleKeyRef.current] !== MAP_STYLES[prev.style];
            if (needsStyleChange) {
              setStyleKey(prev.style);
              styleKeyRef.current = prev.style;
              map.setStyle(MAP_STYLES[prev.style]);
              map.once('style.load', () => {
                appearanceApplyFog(map, prev.planet);
                reapplyAfterStyleChange(map, { enabled: terrainOn, exaggeration: terrainExaggeration, useHillshade: false });
                reinitializeInteractiveLayers();
                if (historyEnabledRef.current) {
                  updateHistory(historyYearRef.current);
                }
              });
            } else {
              appearanceApplyFog(map, prev.planet);
            }
            setPlanetPreset(prev.planet);
            planetPresetRef.current = prev.planet;
            setStarIntensityState(prev.star);
          }
        }
      }
    },
  }), [easeTo, applyPhysicalModeTweaks, styleKey, setBaseFeaturesVisibility, updateOrgHighlightFilter, terrainOn, terrainExaggeration]);

  // Helper: (re-)add satellite layers + click handler if tracking is active
  const ensureSatelliteLayers = useCallback(async (map: mapboxgl.Map) => {
    await SatelliteVisualization.addLayers(map);
    if (!satelliteClickRegistered.current) {
      satelliteClickRegistered.current = true;
      const layerIds = SatelliteVisualization.getLayerIds();
      const clickHandler = (e: mapboxgl.MapMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties || {};
        const coords = (feature.geometry as any).coordinates as [number, number];
        const noradId = props.noradId;
        if (noradId) {
          // Remove previous ground track
          SatelliteVisualization.removeGroundTrack(map);
          window.dispatchEvent(new CustomEvent('wl-satellite-click', {
            detail: {
              noradId,
              name: props.name,
              category: props.category,
              alt: props.alt,
              objectId: props.objectId,
              country: props.country,
              lon: coords[0],
              lat: coords[1],
            },
          }));
        }
      };
      for (const layerId of layerIds) {
        map.on('click', layerId, clickHandler);
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
      }
    }
  }, []);

  // Helper para reinstalar fuentes/capas y eventos tras cambio de estilo
  const reinitializeInteractiveLayers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove previously registered layer-specific listeners to prevent accumulation
    const layerListeners = eventListenersRef.current.filter(r => r.layer);
    layerListeners.forEach(({ event, handler, layer }) => {
      try { map.off(event, layer!, handler as any); } catch {}
    });
    eventListenersRef.current = eventListenersRef.current.filter(r => !r.layer);

    // Use the ref (always current) instead of the state (stale in async callbacks)
    setBaseFeaturesVisibility(minimalModeRef.current);

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
    (['gdp','gdp-per-capita','inflation','gini','exports','life-expectancy','military-expenditure','democracy-index','trade-gdp','fuel-exports','mineral-rents','energy-imports','cereal-production'] as MetricId[]).forEach((m) => {
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
        'trade-gdp': 'trade-gdp-fill',
        'fuel-exports': 'fuel-exports-fill',
        'mineral-rents': 'mineral-rents-fill',
        'energy-imports': 'energy-imports-fill',
        'cereal-production': 'cereal-production-fill'
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
    if (naturalEnabledRef.current.rivers) { ensureNaturalSource('rivers', naturalLodRef.current); ensureRiversLayer(); }
    if (naturalEnabledRef.current.ranges) { ensureNaturalSource('ranges', naturalLodRef.current); ensureRangesLayer(); }
    if (naturalEnabledRef.current.peaks) { ensureNaturalSource('peaks', naturalLodRef.current); ensurePeaksLayer(); }
    if (naturalEnabledRef.current.lakes) { ensureNaturalSource('lakes', naturalLodRef.current); ensureLakesLayer(); }
    if (naturalEnabledRef.current.volcanoes) { ensureNaturalSource('volcanoes', naturalLodRef.current); ensureVolcanoesLayer(); }
    if (naturalEnabledRef.current['fault-lines']) { ensureNaturalSource('fault-lines', naturalLodRef.current); ensureFaultLinesLayer(); }
    if (naturalEnabledRef.current.deserts) { ensureNaturalSource('deserts', naturalLodRef.current); ensureDesertsLayer(); }
    updateNaturalVisibility();
    ensureNaturalInteractivity();

    // 3D buildings según toggle
    if (buildings3DOn) {
      add3DBuildingsLayer(map);
    } else {
      try { if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings'); } catch {}
    }

    // Reusable source identifier to avoid object allocations in hot paths
    const SRC_ID = { source: 'country-boundaries' as const, sourceLayer: 'country_boundaries' as const };

    // Hover state — RAF-throttled to avoid blocking the main thread on rapid mouse moves
    let hoveredId: number | string | null = null;
    let hoverRafPending = false;

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      // Block hover when user has picked a year (territory-only view)
      if (historyEnabledRef.current && historyDataLoadedRef.current) return;
      if (isLeftSidebarOpenRef.current) return;
      if (!e.features || e.features.length === 0) return;
      const id = e.features[0].id as any;
      if (id === hoveredId) return; // same feature — nothing to do

      // Defer the setFeatureState to next animation frame (avoids piling up work on mousemove)
      if (hoveredId !== null) {
        try { map.setFeatureState({ ...SRC_ID, id: hoveredId }, { hover: false }); } catch {}
      }
      hoveredId = id;
      if (!hoverRafPending) {
        hoverRafPending = true;
        requestAnimationFrame(() => {
          hoverRafPending = false;
          if (hoveredId !== null) {
            try { map.setFeatureState({ ...SRC_ID, id: hoveredId }, { hover: true }); } catch {}
          }
        });
      }
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      if (hoveredId !== null) {
        try { map.setFeatureState({ ...SRC_ID, id: hoveredId }, { hover: false }); } catch {}
      }
      hoveredId = null;
      map.getCanvas().style.cursor = 'grab';
    };

    // Shared cubic ease-out
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const handleCountryClick = (e: mapboxgl.MapMouseEvent) => {
      // Block country clicks when user has picked a year (territory-only view)
      if (historyEnabledRef.current && historyDataLoadedRef.current) return;
      if (isLeftSidebarOpenRef.current) return;
      if (!e.features || e.features.length === 0) return;
      const feature: any = e.features[0];

      const countryName = feature.properties?.name_en || feature.properties?.name || 'Unknown Country';

      // History presentation mode: show Wikipedia popup instead of opening sidebar
      if (historyEnabledRef.current && !historyDataLoadedRef.current) {
        const wikiName = encodeURIComponent(countryName.replace(/\s+/g, '_'));
        const wikiUrl = `https://en.wikipedia.org/wiki/${wikiName}`;
        const popupHtml = `
          <div class="history-popup-content">
            <div class="popup-title">${countryName}</div>
            <div class="popup-row">
              <a class="popup-link" href="${wikiUrl}" target="_blank" rel="noopener noreferrer">Wikipedia</a>
            </div>
          </div>`;
        if (historyPopupRef.current) { try { historyPopupRef.current.remove(); } catch {} }
        historyPopupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, className: 'history-popup' })
          .setLngLat(e.lngLat)
          .setHTML(popupHtml)
          .addTo(map);
        return;
      }
      const featureId = feature.id;
      if (featureId === undefined || featureId === null) return;

      // Visual selection state
      if (selectedCountryId.current !== null) {
        try { map.setFeatureState({ ...SRC_ID, id: selectedCountryId.current }, { selected: false }); } catch {}
      }
      selectedCountryId.current = featureId as any;
      try { map.setFeatureState({ ...SRC_ID, id: featureId }, { selected: true }); } catch {}

      // --- Compute target & start animation BEFORE triggering React state updates ---
      const fallbackCenter: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      try { map.stop(); } catch {}

      try {
        const geometry: any = feature.geometry;
        if (!geometry || !geometry.coordinates) throw 0;

        // Single-pass bbox — no intermediate arrays
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        let n = 0;
        const rings: any[][] = geometry.type === 'Polygon'
          ? geometry.coordinates
          : geometry.type === 'MultiPolygon'
            ? geometry.coordinates.flat()
            : null;
        if (!rings) throw 0;
        for (let r = 0; r < rings.length; r++) {
          const ring = rings[r];
          for (let i = 0; i < ring.length; i++) {
            const lng = ring[i][0], lat = ring[i][1];
            if (lng < minLng) minLng = lng;
            if (lat < minLat) minLat = lat;
            if (lng > maxLng) maxLng = lng;
            if (lat > maxLat) maxLat = lat;
            n++;
          }
        }
        if (n === 0) throw 0;

        const bbox: mapboxgl.LngLatBoundsLike = [[minLng, minLat], [maxLng, maxLat]];
        const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

        const camera = map.cameraForBounds(bbox, { padding: 50 });
        if (!camera || camera.zoom == null) throw 0;

        map.flyTo({
          center,
          zoom: camera.zoom,
          duration: 900,
          essential: true,
          curve: 1.42,
          minZoom: Math.min(camera.zoom, map.getZoom()) - 0.5,
          easing: easeOut
        });
      } catch {
        map.flyTo({
          center: fallbackCenter,
          zoom: 3.5,
          duration: 900,
          essential: true,
          curve: 1.42,
          easing: easeOut
        });
      }

      // Defer React state update to next frame so the animation starts immediately
      requestAnimationFrame(() => handleCountrySelection(countryName));
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

    // Re-add satellite tracking layers if they were active before the style change
    if (satelliteTrackingActiveRef.current) {
      satelliteClickRegistered.current = false;
      SatelliteVisualization.resetIcons(); // Icons lost on style change
      ensureSatelliteLayers(map);
    }
  }, [conflicts, handleCountrySelection, applyPhysicalModeTweaks, styleKey, minimalModeOn, setBaseFeaturesVisibility, ensureSatelliteLayers]);

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
      performanceMetricsCollection: false,
      fadeDuration: 0,
      crossSourceCollisions: false,
      attributionControl: false,
      localIdeographFontFamily: 'sans-serif',
      maxTileCacheSize: 200
    } as any);

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
    const geoEaseOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const handleGeocoderResult = (e: unknown) => {
      const event = e as { result: { place_name?: string; text?: string; center: [number, number] } };
      const countryName = event.result.place_name || event.result.text || 'Unknown Country';
      const coordinates = event.result.center;

      const features = map.querySourceFeatures('country-boundaries', { sourceLayer: 'country_boundaries' });
      const lcName = countryName.toLowerCase();
      const matchingFeature = features.find(f => {
        const n = (f.properties?.name_en || f.properties?.name || '').toLowerCase();
        return n.includes(lcName) || lcName.includes(n);
      });

      try { map.stop(); } catch {}

      if (matchingFeature && matchingFeature.id) {
        if (selectedCountryId.current !== null) {
          try { map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: selectedCountryId.current }, { selected: false }); } catch {}
        }
        selectedCountryId.current = matchingFeature.id as string | number;
        try { map.setFeatureState({ source: 'country-boundaries', sourceLayer: 'country_boundaries', id: matchingFeature.id }, { selected: true }); } catch {}

        const finalCountryName = matchingFeature.properties?.name_en || matchingFeature.properties?.name || countryName;

        try {
          const geometry: any = (matchingFeature as any).geometry;
          if (!geometry || !geometry.coordinates) throw 0;

          let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
          let n = 0;
          const rings: any[][] = geometry.type === 'Polygon'
            ? geometry.coordinates
            : geometry.type === 'MultiPolygon'
              ? geometry.coordinates.flat()
              : null;
          if (!rings) throw 0;
          for (let r = 0; r < rings.length; r++) {
            const ring = rings[r];
            for (let i = 0; i < ring.length; i++) {
              const lng = ring[i][0], lat = ring[i][1];
              if (lng < minLng) minLng = lng;
              if (lat < minLat) minLat = lat;
              if (lng > maxLng) maxLng = lng;
              if (lat > maxLat) maxLat = lat;
              n++;
            }
          }
          if (n === 0) throw 0;

          const bbox: mapboxgl.LngLatBoundsLike = [[minLng, minLat], [maxLng, maxLat]];
          const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

          const camera = map.cameraForBounds(bbox, { padding: 50 });
          if (!camera || camera.zoom == null) throw 0;

          map.flyTo({ center, zoom: camera.zoom, duration: 900, essential: true, curve: 1.42, minZoom: Math.min(camera.zoom, map.getZoom()) - 0.5, easing: geoEaseOut });
        } catch {
          map.flyTo({ center: coordinates, zoom: 3.5, duration: 900, essential: true, curve: 1.42, easing: geoEaseOut });
        }

        requestAnimationFrame(() => handleCountrySelection(finalCountryName));
      } else {
        map.flyTo({ center: coordinates, zoom: 3.5, duration: 900, essential: true, curve: 1.42, easing: geoEaseOut });
        requestAnimationFrame(() => handleCountrySelection(countryName));
      }

      setTimeout(() => { geocoder.clear(); }, 100);
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
    
    // Refresh natural layers LOD on move end (only when auto LOD is active)
    const handleMoveEnd = () => {
      try {
        const anyEnabled = naturalEnabledRef.current.rivers || naturalEnabledRef.current.ranges || naturalEnabledRef.current.peaks || naturalEnabledRef.current.lakes || naturalEnabledRef.current.volcanoes || naturalEnabledRef.current['fault-lines'] || naturalEnabledRef.current.deserts;
        if (anyEnabled && naturalLodRef.current === 'auto') {
          refreshNaturalByLod();
        }
      } catch {}
    };
    map.on('moveend', handleMoveEnd);
    eventListenersRef.current.push({ event: 'moveend', handler: handleMoveEnd });
    
    // Configurar el globo y capas cuando el mapa esté cargado
    map.on('load', () => {
      setIsMapLoaded(true);
      onMapReady?.();
      // Configurar la atmósfera del globo con fondo estrellado
      appearanceApplyFog(map, planetPresetRef.current);
      // Warm up CDN caches for dark style + GIBS Night Lights tiles
      warmUpResources(mapboxgl.accessToken || '');
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

    // Clear persisted natural layers — they should only be active within the Physical Layers section
    try { localStorage.removeItem('wl-natural-layers'); } catch {}
    naturalEnabledRef.current = {
      rivers: false, ranges: false, peaks: false, lakes: false,
      volcanoes: false, 'fault-lines': false, deserts: false,
    };

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

    // Track user interaction for RAF-based auto-rotation (setAutoRotate)
    const handleInteractStart = () => { userInteractingRef.current = true; };
    const handleInteractEnd = () => { userInteractingRef.current = false; };

    map.on('mousedown', handleInteractStart);
    map.on('mouseup', handleInteractEnd);
    map.on('dragend', handleInteractEnd);
    map.on('pitchend', handleInteractEnd);
    map.on('rotateend', handleInteractEnd);

    eventListenersRef.current.push(
      { event: 'mousedown', handler: handleInteractStart },
      { event: 'mouseup', handler: handleInteractEnd },
      { event: 'dragend', handler: handleInteractEnd },
      { event: 'pitchend', handler: handleInteractEnd },
      { event: 'rotateend', handler: handleInteractEnd }
    );
    return () => {
      cleanupResources();
      try { geocoder.off('result', handleGeocoderResult); geocoder.onRemove(); } catch {}
      try { conflictDataManager.current?.cleanup(); } catch {}
      if (mapRef.current) {
        try { ConflictVisualization.cleanup(mapRef.current); } catch {}
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, []);

  // Auto-refresh active Earth Data overlays every 10 minutes (real-time data)
  useEffect(() => {
    const REFRESH_MS = 10 * 60 * 1000; // 10 minutes
    const tid = setInterval(() => {
      const map = mapRef.current;
      if (!map || activeEarthOverlaysRef.current.size === 0) return;
      const beforeId = findRasterInsertionPoint(map);
      activeEarthOverlaysRef.current.forEach(type => {
        const cfg = NASA_EARTH_OVERLAYS[type];
        if (!cfg) return;
        // Remove old sources and re-apply with fresh date
        cfg.sources.forEach(s => removeRasterOverlay(map, s.sourceId));
        const refreshOpacity = type === 'night-lights' ? 0.45 : 1.0;
        resolveNasaOverlaySources(type).forEach(src => {
          if (src.tiles.length > 0) applyRasterOverlay(map, src, beforeId, refreshOpacity);
        });
      });
    }, REFRESH_MS);
    return () => clearInterval(tid);
  }, []);

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
        if (deferredTimeoutRef.current) {
          clearTimeout(deferredTimeoutRef.current);
        }
        deferredTimeoutRef.current = timeoutId;
      }
    };
    update();
    
    // ✅ NUEVO: Cleanup del timeout si el componente se desmonta
    return () => {
      if (deferredTimeoutRef.current) {
        clearTimeout(deferredTimeoutRef.current);
        deferredTimeoutRef.current = null;
      }
    };
  }, [conflicts, selectedConflictId, isMapLoaded]);

  // Función para resetear la vista del mapa
  const resetMapView = () => {
    const map = mapRef.current;
    if (!map) return;

    // Stop any in-progress animation first
    try { map.stop(); } catch {}

    // Start flyTo immediately — before any feature-state work
    map.flyTo({
      center: [0, 20],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      duration: 800,
      essential: true,
      easing: (t: number) => 1 - Math.pow(1 - t, 3)
    });

    // Defer feature-state clear to next frame so the flyTo gets to paint first
    const prevId = selectedCountryId.current;
    selectedCountryId.current = null;
    if (prevId !== null) {
      requestAnimationFrame(() => {
        try {
          map.setFeatureState(
            { source: 'country-boundaries', sourceLayer: 'country_boundaries', id: prevId },
            { selected: false }
          );
        } catch {}
      });
    }
  };

  // Efecto para manejar cambios en el país seleccionado
  useEffect(() => {
    if (!mapRef.current) return;

    // Solo resetear si selectedCountry cambió de un valor a null
    // y hay una selección actual en el mapa
    if (!selectedCountry && selectedCountryId.current) {
      // Defer to next paint frame so React finishes its render batch first
      requestAnimationFrame(() => {
        resetMapView();
      });
    }
  }, [selectedCountry]);
  
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

  // Persistencia ligera: cargar ajustes iniciales
  useEffect(() => {
    try {
      const b3d = localStorage.getItem('wl_buildings3d');
      if (b3d !== null) setBuildings3DOn(b3d === '1');
    } catch {}
  }, []);

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
