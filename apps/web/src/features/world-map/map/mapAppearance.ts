export type StyleKey = 'night' | 'light' | 'outdoors' | 'dark' | 'satellite-streets' | 'navigation-day' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble';
export const MAP_STYLES: Record<StyleKey, string> = {
  night: 'mapbox://styles/mapbox/navigation-night-v1',
  light: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  'navigation-day': 'mapbox://styles/mapbox/navigation-day-v1',
  'earth-at-night': 'mapbox://styles/mapbox/dark-v11',
  'nasa-night-lights': 'mapbox://styles/mapbox/dark-v11',
  'nasa-black-marble': 'mapbox://styles/mapbox/dark-v11'
};

export const EARTH_AT_NIGHT_OVERLAY: RasterOverlay = {
  sourceId: 'nasa-black-marble',
  tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'],
  tileSize: 256,
  maxzoom: 8,
  attribution: 'WorldLore'
};

export const NASA_NIGHT_LIGHTS_OVERLAY: RasterOverlay = {
  sourceId: 'nasa-dnb',
  tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg'],
  tileSize: 256,
  maxzoom: 8,
  attribution: 'WorldLore'
};

// 4 dates of the same At_Sensor_Radiance product stacked for full coverage
const DNB_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_At_Sensor_Radiance/default';
const DNB_SUFFIX = '/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
export const NASA_BLACK_MARBLE_OVERLAYS: RasterOverlay[] = [
  { sourceId: 'nasa-bm-d1', tiles: [`${DNB_BASE}/2022-02-03${DNB_SUFFIX}`], tileSize: 256, maxzoom: 8, attribution: 'WorldLore' },
  { sourceId: 'nasa-bm-d2', tiles: [`${DNB_BASE}/2022-02-04${DNB_SUFFIX}`], tileSize: 256, maxzoom: 8, attribution: 'WorldLore' },
  { sourceId: 'nasa-bm-d3', tiles: [`${DNB_BASE}/2022-02-05${DNB_SUFFIX}`], tileSize: 256, maxzoom: 8, attribution: 'WorldLore' },
  { sourceId: 'nasa-bm-d4', tiles: [`${DNB_BASE}/2022-02-06${DNB_SUFFIX}`], tileSize: 256, maxzoom: 8, attribution: 'WorldLore' },
];

export const NASA_OVERLAY_SOURCES = ['nasa-black-marble', 'nasa-dnb', 'nasa-bm-d1', 'nasa-bm-d2', 'nasa-bm-d3', 'nasa-bm-d4'];

/* ─── Satellite Intel Overlays ─── */

export type NasaOverlayType = 'fires' | 'vegetation' | 'sst' | 'precipitation' | 'snow' | 'soil-moisture' | 'co' | 'water-vapor' | 'night-lights';

export interface NasaEarthOverlay {
  label: string;
  description: string;
  /** Short evocative text for the floating legend overlay */
  legendNote: string;
  /** Satellite source tag shown in legend (e.g. "NASA VIIRS • Daily") */
  legendSource: string;
  /** Long evocative description for the expanded card popup */
  expandedDescription: string;
  /** 'daily' uses -3 days, '8day' snaps to MODIS 8-day cycle, 'monthly' uses -2 months, 'quarterly' uses -6 months */
  cadence: 'daily' | '8day' | 'monthly' | 'quarterly';
  /** Override default cadence date offset in days */
  dateOffsetDays?: number;
  /** One or more raster sources */
  sources: Array<{
    sourceId: string;
    gibsLayer: string;
    gibsLevel: number;
    tileSize?: number;
    attribution?: string;
    /** If set, use this URL directly instead of building from gibsLayer (for WMS endpoints) */
    directTileUrl?: string;
    /** Per-source date offset override (takes precedence over overlay-level dateOffsetDays) */
    dateOffsetDays?: number;
  }>;
}

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

/** Get the latest available GIBS date string for a given cadence */
export function getGibsDate(cadence: 'daily' | '8day' | 'monthly' | 'quarterly', offsetDays?: number): string {
  const d = new Date();
  if (cadence === 'daily') {
    d.setDate(d.getDate() - (offsetDays ?? 3));
  } else if (cadence === '8day') {
    // MODIS 8-day composites start on day-of-year 1, 9, 17, ...
    d.setDate(d.getDate() - 12); // go back enough to ensure product is available
    const year = d.getFullYear();
    const start = new Date(year, 0, 1);
    const doy = Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
    const period = Math.floor((doy - 1) / 8) * 8 + 1;
    const periodDate = new Date(year, 0, period);
    return periodDate.toISOString().split('T')[0];
  } else if (cadence === 'quarterly') {
    // Some products (e.g. SMAP L4) have long processing delay
    d.setMonth(d.getMonth() - 6);
    d.setDate(1);
  } else {
    // monthly: go back 2 months to be safe
    d.setMonth(d.getMonth() - 2);
    d.setDate(1);
  }
  return d.toISOString().split('T')[0];
}

/** Build a resolved tile URL with actual date and correct TileMatrixSet level */
function gibsUrl(layer: string, cadence: 'daily' | '8day' | 'monthly' | 'quarterly', level: number, offsetDays?: number): string {
  return `${GIBS}/${layer}/default/${getGibsDate(cadence, offsetDays)}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.png`;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const FIRES_PROXY_URL = `${API_URL}/api/fire/tile?bbox={bbox-epsg-3857}&width=256&height=256`;

export const NASA_EARTH_OVERLAYS: Record<NasaOverlayType, NasaEarthOverlay> = {
  fires: {
    label: 'Active Fires',
    description: 'Global fire hotspots detected from orbit (last 24 h, ~3 h delay).',
    legendNote: 'Thermal anomalies detected across the planet',
    legendSource: 'WorldLore • ~3 h delay',
    expandedDescription: 'Our orbital network detects thermal anomalies across Earth\u2019s surface every few hours \u2014 wildfires, volcanic eruptions, and industrial heat sources rendered in real time from 830 km above.',
    cadence: 'daily',
    sources: [{
      sourceId: 'earth-fires',
      gibsLayer: '', gibsLevel: 0,
      tileSize: 256,
      attribution: 'WorldLore',
      directTileUrl: FIRES_PROXY_URL,
    }],
  },
  vegetation: {
    label: 'Vegetation (NDVI)',
    description: 'Vegetation health index (8-day composite).',
    legendNote: 'Planetary vegetation health observed from orbit',
    legendSource: 'WorldLore • 8-day composite',
    expandedDescription: 'Eight days of reflected light compressed into a single map. Our sensors track the Normalized Difference Vegetation Index to reveal where photosynthesis thrives and where ecosystems are under stress.',
    cadence: '8day',
    sources: [{ sourceId: 'earth-ndvi', gibsLayer: 'MODIS_Terra_NDVI_8Day', gibsLevel: 9, tileSize: 256, attribution: 'WorldLore' }],
  },
  sst: {
    label: 'Sea Surface Temp',
    description: 'Ocean surface temperature (daily, ~2 day delay).',
    legendNote: 'Ocean thermal signatures across all basins',
    legendSource: 'WorldLore • Daily',
    expandedDescription: 'Our infrared observation network measures the ocean\u2019s skin temperature with sub-degree precision. Currents, upwellings, and marine heatwaves become visible patterns on a planetary canvas.',
    cadence: 'daily',
    dateOffsetDays: 2,
    sources: [{ sourceId: 'earth-sst', gibsLayer: 'GHRSST_L4_MUR_Sea_Surface_Temperature', gibsLevel: 7, tileSize: 256, attribution: 'WorldLore' }],
  },
  precipitation: {
    label: 'Precipitation',
    description: 'Global satellite rainfall (30-min snapshot, same day).',
    legendNote: 'Real-time rainfall patterns captured from orbit',
    legendSource: 'WorldLore • Same day',
    expandedDescription: 'Our satellite constellation tracks every raindrop on Earth. This 30-minute global snapshot captures the planet\u2019s hydrological cycle in motion.',
    cadence: 'daily',
    dateOffsetDays: 0,
    sources: [{ sourceId: 'earth-precip', gibsLayer: 'IMERG_Precipitation_Rate_30min', gibsLevel: 6, tileSize: 256, attribution: 'WorldLore' }],
  },
  snow: {
    label: 'Snow Cover',
    description: 'Snow and ice extent (daily, ~1 day delay).',
    legendNote: 'Cryosphere extent monitored daily from space',
    legendSource: 'WorldLore • Daily',
    expandedDescription: 'The cryosphere \u2014 Earth\u2019s frozen frontier. Our daily observations reveal the advancing and retreating boundary between ice and land across all continents.',
    cadence: 'daily',
    dateOffsetDays: 1,
    sources: [{ sourceId: 'earth-snow', gibsLayer: 'MODIS_Terra_NDSI_Snow_Cover', gibsLevel: 8, tileSize: 256, attribution: 'WorldLore' }],
  },
  'soil-moisture': {
    label: 'Soil Moisture',
    description: 'Root-zone soil moisture analysis.',
    legendNote: 'Subsurface water content analysis',
    legendSource: 'WorldLore • Quarterly',
    expandedDescription: 'Our microwave radiometry network penetrates the surface to map water content in the root zone. A hidden dimension of Earth\u2019s landscape, critical for agriculture and drought monitoring.',
    cadence: 'quarterly',
    sources: [{ sourceId: 'earth-smap', gibsLayer: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', gibsLevel: 6, tileSize: 256, attribution: 'WorldLore' }],
  },
  'water-vapor': {
    label: 'Water Vapor',
    description: 'Atmospheric moisture from dual-orbit sensors (daily, ~1 day delay).',
    legendNote: 'Atmospheric moisture distribution worldwide',
    legendSource: 'WorldLore • Daily',
    expandedDescription: 'Our dual-orbit observation system captures atmospheric moisture from complementary passes. Together they map the invisible rivers of water flowing through our atmosphere.',
    cadence: 'daily',
    dateOffsetDays: 1,
    sources: [
      { sourceId: 'earth-wv-terra', gibsLayer: 'MODIS_Terra_Water_Vapor_5km_Day', gibsLevel: 6, tileSize: 256, attribution: 'WorldLore' },
      { sourceId: 'earth-wv-aqua', gibsLayer: 'MODIS_Aqua_Water_Vapor_5km_Day', gibsLevel: 6, tileSize: 256, attribution: 'WorldLore' },
    ],
  },
  co: {
    label: 'CO Emissions',
    description: 'Carbon monoxide emission sources worldwide (~3 month delay).',
    legendNote: 'Industrial emission signatures worldwide',
    legendSource: 'WorldLore • Monthly',
    expandedDescription: 'Our reanalysis models combine satellite observations with atmospheric physics to trace carbon monoxide from its industrial and wildfire sources across the globe.',
    cadence: 'quarterly',
    sources: [{ sourceId: 'earth-co', gibsLayer: 'MERRA2_Carbon_Monoxide_Emission_Monthly', gibsLevel: 6, tileSize: 256, attribution: 'WorldLore' }],
  },
  'night-lights': {
    label: 'Night Lights',
    description: 'City lights from orbit — dual-satellite observation (daily, ~1 day delay). Best on dark maps.',
    legendNote: 'Global civilization observed from orbit',
    legendSource: 'WorldLore • Daily',
    expandedDescription: 'Every city, highway, and fishing fleet illuminated from orbit. Our daily portrait of human civilization as seen from 830 kilometers above, where the boundary between day and night dissolves.',
    cadence: 'daily',
    dateOffsetDays: 1,
    sources: [
      // Older night first (bottom layer — fills gaps)
      { sourceId: 'earth-dnb-snpp-2', gibsLayer: 'VIIRS_SNPP_DayNightBand_At_Sensor_Radiance', gibsLevel: 8, tileSize: 256, attribution: 'WorldLore', dateOffsetDays: 2 },
      { sourceId: 'earth-dnb-noaa20-2', gibsLayer: 'VIIRS_NOAA20_DayNightBand_At_Sensor_Radiance', gibsLevel: 8, tileSize: 256, attribution: 'WorldLore', dateOffsetDays: 2 },
      // Latest night on top (freshest data)
      { sourceId: 'earth-dnb-snpp', gibsLayer: 'VIIRS_SNPP_DayNightBand_At_Sensor_Radiance', gibsLevel: 8, tileSize: 256, attribution: 'WorldLore', dateOffsetDays: 1 },
      { sourceId: 'earth-dnb-noaa20', gibsLayer: 'VIIRS_NOAA20_DayNightBand_At_Sensor_Radiance', gibsLevel: 8, tileSize: 256, attribution: 'WorldLore', dateOffsetDays: 1 },
    ],
  },
};

export const NASA_EARTH_OVERLAY_KEYS: NasaOverlayType[] = Object.keys(NASA_EARTH_OVERLAYS) as NasaOverlayType[];

/* ─── Instrument / Satellite Metadata ─── */

export type InstrumentKey = 'viirs-fires' | 'viirs-nightlights' | 'modis-terra' | 'multi-sensor-sst' | 'gmi-dpr-gpm' | 'smap-radiometer' | 'modis-terra-aqua' | 'merra2-reanalysis';

export interface InstrumentInfo {
  instrumentName: string;
  instrumentDescription: string;
  satellites: string[];
  orbitType: string;
  altitude: string;
  orbitDescription: string;
  image: string;
}

export const INSTRUMENT_INFO: Record<InstrumentKey, InstrumentInfo> = {
  'viirs-fires': {
    instrumentName: 'VIIRS Active Fire Detector',
    instrumentDescription: 'Our thermal infrared channels scan the planet for heat anomalies — detecting active fires as small as a single burning building. Each hotspot is confirmed across multiple spectral bands to filter false alarms from sunglint, volcanoes, and industrial heat.',
    satellites: ['Suomi NPP', 'NOAA-20'],
    orbitType: 'Sun-synchronous polar',
    altitude: '~830 km',
    orbitDescription: 'Two platforms in tandem orbit, each completing a revolution every 101 minutes. Their staggered equatorial crossings deliver global fire detection coverage twice daily.',
    image: '/instruments/suomi-npp.webp',
  },
  'viirs-nightlights': {
    instrumentName: 'VIIRS Day/Night Band',
    instrumentDescription: 'Our ultra-sensitive panchromatic sensor detects light emissions down to a single streetlamp. From city grids to fishing fleets, the Day/Night Band reveals human presence across the planet — updated with fresh satellite imagery every night.',
    satellites: ['Suomi NPP', 'NOAA-20'],
    orbitType: 'Sun-synchronous polar',
    altitude: '~830 km',
    orbitDescription: 'Two platforms in tandem orbit, each completing a revolution every 101 minutes. Nightside passes capture light emissions under consistent darkness conditions.',
    image: '/instruments/suomi-npp.webp',
  },
  'modis-terra': {
    instrumentName: 'MODIS Spectroradiometer',
    instrumentDescription: 'Our flagship Earth observation sensor sweeps 36 spectral channels in a 2,330 km swath, building a complete portrait of land surfaces, vegetation, and cryosphere with each polar pass.',
    satellites: ['Terra'],
    orbitType: 'Sun-synchronous polar',
    altitude: '~705 km',
    orbitDescription: 'Descending node crosses the equator at 10:30 AM local time — optimized for consistent solar illumination of land surfaces across every pass.',
    image: '/instruments/terra.webp',
  },
  'multi-sensor-sst': {
    instrumentName: 'Multi-Sensor Fusion Array',
    instrumentDescription: 'Our ocean intelligence fuses infrared and microwave observations from four orbital platforms into a single unified thermal map — achieving sub-degree precision across every ocean basin on Earth.',
    satellites: ['Terra', 'Aqua', 'GCOM-W1', 'Suomi NPP'],
    orbitType: 'Multiple polar orbits',
    altitude: '~700–830 km',
    orbitDescription: 'Four platforms at different altitudes and inclinations — their overlapping coverage eliminates gaps and enables the fusion of complementary sensor technologies.',
    image: '/instruments/multi-sensor.webp',
  },
  'gmi-dpr-gpm': {
    instrumentName: 'GMI Microwave Imager',
    instrumentDescription: 'Our precipitation observatory carries a dual-frequency radar and 13-channel microwave imager — the only system capable of measuring rainfall structure in three dimensions from orbit.',
    satellites: ['GPM Core Observatory'],
    orbitType: 'Non-sun-synchronous',
    altitude: '~407 km',
    orbitDescription: 'A unique 65° inclination orbit samples the tropics and mid-latitudes where most precipitation occurs. The low altitude enables detailed 3D rain structure measurement.',
    image: '/instruments/gpm.webp',
  },
  'smap-radiometer': {
    instrumentName: 'L-Band Microwave Radiometer',
    instrumentDescription: 'Our rotating mesh antenna spans 6 meters — the largest ever deployed for Earth observation. Its L-band microwave pulses penetrate vegetation and surface to reveal the hidden water content beneath.',
    satellites: ['SMAP'],
    orbitType: 'Sun-synchronous polar',
    altitude: '~685 km',
    orbitDescription: 'An 8-day exact repeat cycle ensures every point on Earth is observed with identical geometry — critical for detecting subtle changes in soil moisture over time.',
    image: '/instruments/smap.webp',
  },
  'modis-terra-aqua': {
    instrumentName: 'MODIS Dual-Orbit System',
    instrumentDescription: 'Two identical spectroradiometers on complementary orbital paths — one crossing the equator in the morning, the other in the afternoon. Together they capture the full diurnal cycle of atmospheric moisture.',
    satellites: ['Terra', 'Aqua'],
    orbitType: 'Sun-synchronous polar',
    altitude: '~705 km',
    orbitDescription: 'Morning and afternoon equatorial crossings provide complementary snapshots of the atmosphere under different solar heating conditions.',
    image: '/instruments/terra-aqua.webp',
  },
  'merra2-reanalysis': {
    instrumentName: 'Atmospheric Reanalysis Engine',
    instrumentDescription: 'Not a single instrument but an ensemble — our computational model assimilates observations from dozens of satellites and ground stations, reconstructing atmospheric chemistry through physics-based simulation.',
    satellites: ['Multi-source'],
    orbitType: 'N/A — computational',
    altitude: 'N/A',
    orbitDescription: 'Global atmospheric state reconstructed on a 0.5° × 0.625° grid from 1980 to present. Hourly temporal resolution driven by data assimilation cycles.',
    image: '/instruments/merra2.webp',
  },
};

export const OVERLAY_INSTRUMENT_MAP: Record<NasaOverlayType, InstrumentKey> = {
  'fires': 'viirs-fires',
  'vegetation': 'modis-terra',
  'sst': 'multi-sensor-sst',
  'precipitation': 'gmi-dpr-gpm',
  'snow': 'modis-terra',
  'soil-moisture': 'smap-radiometer',
  'water-vapor': 'modis-terra-aqua',
  'co': 'merra2-reanalysis',
  'night-lights': 'viirs-nightlights',
};

/** Get the observation date string for a given overlay (e.g. "2026-03-18") */
export function getNasaObservationDate(type: NasaOverlayType): string {
  const cfg = NASA_EARTH_OVERLAYS[type];
  if (!cfg) return '';
  if (type === 'fires') return getGibsDate('daily', 1);
  const source = cfg.sources[0];
  const offsetDays = source.dateOffsetDays ?? cfg.dateOffsetDays;
  return getGibsDate(cfg.cadence, offsetDays);
}

/** Generate a GIBS WMS global snapshot URL for a given overlay (used for expanded card preview) */
export function getNasaPreviewUrl(type: NasaOverlayType): string {
  const cfg = NASA_EARTH_OVERLAYS[type];
  if (!cfg) return '';
  // WMS 1.3.0 with EPSG:4326 uses BBOX order: minLat,minLon,maxLat,maxLon
  const base = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&WIDTH=480&HEIGHT=240&BBOX=-90,-180,90,180&CRS=EPSG:4326';
  // Special preview layers — optimized for thumbnail visibility at global scale
  if (type === 'fires') {
    const date = getGibsDate('daily', 1);
    return `${base}&LAYERS=VIIRS_SNPP_Thermal_Anomalies_375m_All&TIME=${date}`;
  }
  if (type === 'night-lights') {
    // Use 2-day offset to avoid partial orbital gaps in the preview thumbnail
    const date = getGibsDate('daily', 2);
    return `${base}&LAYERS=VIIRS_SNPP_DayNightBand_At_Sensor_Radiance,VIIRS_NOAA20_DayNightBand_At_Sensor_Radiance&TIME=${date}`;
  }
  const source = cfg.sources[0];
  const offsetDays = source.dateOffsetDays ?? cfg.dateOffsetDays;
  const date = getGibsDate(cfg.cadence, offsetDays);
  return `${base}&LAYERS=${source.gibsLayer}&TIME=${date}`;
}

/** Resolve all sources for an overlay type with fresh dates */
export function resolveNasaOverlaySources(type: NasaOverlayType): RasterOverlay[] {
  const cfg = NASA_EARTH_OVERLAYS[type];
  return cfg.sources.map(s => {
    return {
      sourceId: s.sourceId,
      tiles: [s.directTileUrl ?? gibsUrl(s.gibsLayer, cfg.cadence, s.gibsLevel, s.dateOffsetDays ?? cfg.dateOffsetDays)],
      tileSize: s.tileSize ?? 256,
      maxzoom: s.directTileUrl ? 14 : s.gibsLevel,
      attribution: s.attribution || '',
    };
  });
}

/** @deprecated — use resolveNasaOverlaySources instead */
export function refreshNasaOverlayTiles(type: NasaOverlayType): RasterOverlay {
  const sources = resolveNasaOverlaySources(type);
  return sources[0];
}

export type PlanetPreset = 'default' | 'nebula' | 'sunset' | 'dawn' | 'arctic' | 'volcanic' | 'emerald' | 'midnight' | 'aurora' | 'sahara' | 'storm' | 'crimson' | 'rose' | 'void' | 'coral' | 'violet' | 'orbital';

const PLANET_PRESETS: Record<PlanetPreset, any> = {
  default: { color: 'rgb(186, 210, 235)', 'high-color': 'rgb(36, 92, 223)', 'horizon-blend': 0, 'space-color': 'rgb(11, 11, 25)', 'star-intensity': 0.6 },
  nebula: { color: 'rgb(180, 200, 255)', 'high-color': 'rgb(120, 80, 200)', 'horizon-blend': 0.045, 'space-color': 'rgb(8, 10, 20)', 'star-intensity': 0.8 },
  sunset: { color: 'rgb(240, 190, 150)', 'high-color': 'rgb(200, 90, 60)', 'horizon-blend': 0.06, 'space-color': 'rgb(14, 8, 10)', 'star-intensity': 0.5 },
  dawn: { color: 'rgb(210, 225, 240)', 'high-color': 'rgb(120, 170, 230)', 'horizon-blend': 0.035, 'space-color': 'rgb(10, 12, 22)', 'star-intensity': 0.7 },
  arctic: { color: 'rgb(210, 245, 240)', 'high-color': 'rgb(140, 210, 220)', 'horizon-blend': 0.02, 'space-color': 'rgb(2, 3, 8)', 'star-intensity': 0.95 },
  volcanic: { color: 'rgb(255, 120, 50)', 'high-color': 'rgb(180, 40, 10)', 'horizon-blend': 0.07, 'space-color': 'rgb(10, 5, 5)', 'star-intensity': 0.3 },
  emerald: { color: 'rgb(150, 220, 170)', 'high-color': 'rgb(30, 130, 80)', 'horizon-blend': 0.05, 'space-color': 'rgb(5, 12, 8)', 'star-intensity': 0.65 },
  midnight: { color: 'rgb(30, 50, 120)', 'high-color': 'rgb(10, 20, 80)', 'horizon-blend': 0.055, 'space-color': 'rgb(3, 3, 10)', 'star-intensity': 0.95 },
  aurora: { color: 'rgb(100, 220, 180)', 'high-color': 'rgb(30, 140, 120)', 'horizon-blend': 0.04, 'space-color': 'rgb(5, 10, 15)', 'star-intensity': 0.9 },
  sahara: { color: 'rgb(245, 210, 140)', 'high-color': 'rgb(180, 120, 50)', 'horizon-blend': 0.065, 'space-color': 'rgb(12, 8, 5)', 'star-intensity': 0.55 },
  storm: { color: 'rgb(140, 145, 160)', 'high-color': 'rgb(60, 65, 90)', 'horizon-blend': 0.06, 'space-color': 'rgb(8, 8, 12)', 'star-intensity': 0.2 },
  crimson: { color: 'rgb(180, 30, 40)', 'high-color': 'rgb(80, 10, 15)', 'horizon-blend': 0.065, 'space-color': 'rgb(6, 2, 2)', 'star-intensity': 0.4 },
  rose: { color: 'rgb(240, 160, 190)', 'high-color': 'rgb(180, 60, 130)', 'horizon-blend': 0.05, 'space-color': 'rgb(10, 4, 10)', 'star-intensity': 0.7 },
  void: { color: 'rgb(10, 10, 15)', 'high-color': 'rgb(5, 5, 10)', 'horizon-blend': 0.01, 'space-color': 'rgb(1, 1, 2)', 'star-intensity': 1.0 },
  'orbital': { color: 'rgb(30, 60, 130)', 'high-color': 'rgb(10, 25, 70)', 'horizon-blend': 0.012, 'space-color': 'rgb(2, 2, 6)', 'star-intensity': 1.0 },
  coral: { color: 'rgb(255, 150, 130)', 'high-color': 'rgb(200, 80, 70)', 'horizon-blend': 0.055, 'space-color': 'rgb(10, 5, 5)', 'star-intensity': 0.6 },
  violet: { color: 'rgb(170, 100, 240)', 'high-color': 'rgb(90, 30, 180)', 'horizon-blend': 0.05, 'space-color': 'rgb(6, 3, 15)', 'star-intensity': 0.85 },
};

export function applyFog(map: mapboxgl.Map, preset: PlanetPreset) {
  try { map.setFog(PLANET_PRESETS[preset] as any); } catch {}
}

/** Batch planet + space + star intensity into a single setFog call (used by globe themes) */
export function applyThemeAtmosphere(map: mapboxgl.Map, planet: PlanetPreset, space: SpacePreset, starIntensity: number) {
  const base = PLANET_PRESETS[planet] || PLANET_PRESETS['default'];
  const spaceOverrides = SPACE_PRESETS[space];
  try {
    map.setFog({
      ...base,
      'space-color': spaceOverrides['space-color'],
      'star-intensity': starIntensity,
    } as any);
  } catch {}
}

export type SpacePreset = 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson';

export const SPACE_PRESETS: Record<SpacePreset, { 'space-color': string; 'star-intensity': number }> = {
  void:    { 'space-color': 'rgb(0, 0, 0)',    'star-intensity': 0.15 },
  deep:    { 'space-color': 'rgb(5, 5, 18)',   'star-intensity': 0.9 },
  nebula:  { 'space-color': 'rgb(45, 10, 80)', 'star-intensity': 0.85 },
  galaxy:  { 'space-color': 'rgb(10, 25, 70)', 'star-intensity': 1.0 },
  crimson: { 'space-color': 'rgb(50, 8, 8)',   'star-intensity': 0.6 },
};

export type GlobeThemeKey = 'mars' | 'lunar' | 'venus' | 'ice-world' | 'cyberpunk' | 'golden-age' | 'alien' | 'deep-ocean' | 'earth-at-night' | 'nasa-night-lights' | 'nasa-black-marble';

export interface RasterOverlay {
  sourceId: string;
  tiles: string[];
  tileSize?: number;
  maxzoom?: number;
  attribution?: string;
}

export interface GlobeTheme {
  label: string;
  baseMap: StyleKey;
  planet: PlanetPreset;
  space: SpacePreset;
  starIntensity: number;
  rasterOverlay?: RasterOverlay | RasterOverlay[];
}

export const GLOBE_THEMES: Record<GlobeThemeKey, GlobeTheme> = {
  mars: { label: 'Mars', baseMap: 'outdoors', planet: 'crimson', space: 'void', starIntensity: 0.25 },
  lunar: { label: 'Lunar', baseMap: 'dark', planet: 'void', space: 'void', starIntensity: 1.0 },
  venus: { label: 'Venus', baseMap: 'navigation-day', planet: 'sahara', space: 'crimson', starIntensity: 0.2 },
  'ice-world': { label: 'Ice World', baseMap: 'light', planet: 'arctic', space: 'deep', starIntensity: 0.95 },
  cyberpunk: { label: 'Cyberpunk', baseMap: 'dark', planet: 'violet', space: 'galaxy', starIntensity: 0.9 },
  'golden-age': { label: 'Golden Age', baseMap: 'outdoors', planet: 'sahara', space: 'deep', starIntensity: 0.55 },
  alien: { label: 'Alien', baseMap: 'night', planet: 'emerald', space: 'nebula', starIntensity: 0.65 },
  'deep-ocean': { label: 'Deep Ocean', baseMap: 'satellite-streets', planet: 'midnight', space: 'deep', starIntensity: 0.95 },
  'earth-at-night': {
    label: 'Earth at Night',
    baseMap: 'earth-at-night',
    planet: 'dawn',
    space: 'deep',
    starIntensity: 0.95,
    rasterOverlay: EARTH_AT_NIGHT_OVERLAY
  },
  'nasa-night-lights': {
    label: 'Night Lights',
    baseMap: 'nasa-night-lights',
    planet: 'arctic',
    space: 'void',
    starIntensity: 1.0,
    rasterOverlay: NASA_NIGHT_LIGHTS_OVERLAY
  },
  'nasa-black-marble': {
    label: 'Black Marble',
    baseMap: 'nasa-black-marble',
    planet: 'arctic',
    space: 'void',
    starIntensity: 1.0,
    rasterOverlay: NASA_BLACK_MARBLE_OVERLAYS
  },
};

export function applyStarIntensity(map: mapboxgl.Map, value: number) {
  try {
    const current = (map as any).getFog?.() || {};
    map.setFog({ ...current, 'star-intensity': value } as any);
  } catch {}
}

export function applySpacePreset(map: mapboxgl.Map, preset: SpacePreset) {
  try {
    const current = (map as any).getFog?.() || {};
    map.setFog({ ...current, ...SPACE_PRESETS[preset] } as any);
  } catch {}
}

export function setBaseFeaturesVisibility(map: mapboxgl.Map, hide: boolean) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id;
    const type = (layer as any).type;
    const match = type === 'symbol' || /\b(admin|boundary|country|state|disputed|road|rail|aeroway|place|poi)\b/i.test(id);
    if (match) {
      try { map.setLayoutProperty(id, 'visibility', hide ? 'none' : 'visible'); } catch {}
    }
  }
}

export function removeRasterOverlay(map: mapboxgl.Map, sourceId: string) {
  const layerId = `${sourceId}-layer`;
  try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
  try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}
}

/** Find the first symbol/interactive layer to use as insertion point for raster overlays */
export function findRasterInsertionPoint(map: mapboxgl.Map): string | undefined {
  const layers = map.getStyle()?.layers || [];
  for (const layer of layers) {
    if ((layer as any).type === 'symbol' || layer.id === 'country-highlight') {
      return layer.id;
    }
  }
  return undefined;
}

export function applyRasterOverlay(map: mapboxgl.Map, overlay: RasterOverlay, cachedBeforeId?: string, opacity = 1.0) {
  const { sourceId, tiles, tileSize = 256, maxzoom = 8, attribution } = overlay;
  removeRasterOverlay(map, sourceId);
  try {
    map.addSource(sourceId, {
      type: 'raster',
      tiles,
      tileSize,
      maxzoom,
      attribution: attribution || ''
    });
    const beforeId = cachedBeforeId !== undefined ? cachedBeforeId : findRasterInsertionPoint(map);
    map.addLayer({
      id: `${sourceId}-layer`,
      type: 'raster',
      source: sourceId,
      paint: { 'raster-opacity': opacity, 'raster-fade-duration': 0 }
    }, beforeId);
  } catch (e) {
    console.warn('[mapAppearance] Failed to apply raster overlay:', e);
  }
}

export function applyPhysicalModeTweaks(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id;
    const type = (layer as any).type;
    const shouldHide = type === 'symbol' || /\b(admin|boundary|country|state|disputed|road|rail|aeroway|poi|place|airport|ferry|building)\b/i.test(id);
    if (shouldHide) {
      try { map.setLayoutProperty(id, 'visibility', 'none'); } catch {}
    }
  }
  const toHide = [
    'country-highlight', 'country-selected',
    'country-conflict-fill','country-conflict-border',
    'conflict-marker','conflict-ripple-0','conflict-ripple-1',
    'ally-fill-faction1','ally-border-faction1',
    'ally-fill-faction2','ally-border-faction2'
  ];
  toHide.forEach(id => { try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); } catch {} });
}

/**
 * Warm up CDN caches for frequently used styles and tiles.
 * Called once after the initial map load to preload resources the user is likely to need.
 * - Prefetches the Mapbox dark style JSON (used by Satellite Intel immersive mode)
 * - Prefetches a few low-zoom Night Lights GIBS tiles (first ones the user will see)
 */
export function warmUpResources(mapboxToken: string): void {
  // Prefetch dark style JSON (Satellite Intel always switches to this)
  const darkStyleUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${mapboxToken}`;
  fetch(darkStyleUrl, { priority: 'low' } as any).catch(() => {});

  // Prefetch a few low-zoom Night Lights GIBS tiles (z=1..2)
  const date = getGibsDate('daily', 1);
  const gibsBase = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_At_Sensor_Radiance/default/${date}/GoogleMapsCompatible_Level8`;
  const tilesToWarm = [
    `${gibsBase}/1/0/0.png`, `${gibsBase}/1/0/1.png`,
    `${gibsBase}/1/1/0.png`, `${gibsBase}/1/1/1.png`,
    `${gibsBase}/2/1/1.png`, `${gibsBase}/2/1/2.png`,
    `${gibsBase}/2/2/1.png`, `${gibsBase}/2/2/2.png`,
  ];
  tilesToWarm.forEach(url => fetch(url, { priority: 'low' } as any).catch(() => {}));
}

