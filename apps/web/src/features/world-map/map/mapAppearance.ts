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

/* ─── Physical Layers Config ─── */

export type PhysicalLayerType = 'rivers' | 'ranges' | 'peaks' | 'lakes' | 'volcanoes' | 'fault-lines' | 'deserts';

export interface PhysicalLayerConfig {
  label: string;
  color: string;
  legendNote: string;
  legendSource: string;
  expandedDescription: string;
  iconName: string;
  gradient: string;
  /** Inline SVG data URI for the expanded card hero — a unique visual per layer */
  heroSvg: string;
}

/* Inline SVG hero images for expanded layer cards (data URI encoded) */
const LAYER_HERO_SVGS: Record<PhysicalLayerType, string> = {
  rivers: `data:image/svg+xml,${encodeURIComponent('<svg width="680" height="360" viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a1628"/><stop offset="100%" stop-color="#0d2847"/></linearGradient><filter id="rg"><feGaussianBlur stdDeviation="5"/></filter></defs><rect width="680" height="360" fill="url(#rb)"/><g opacity=".05" stroke="#4aa3df" fill="none" stroke-width=".4"><path d="M0 40Q170 20 340 50Q510 80 680 30"/><path d="M0 80Q170 60 340 90Q510 120 680 70"/><path d="M0 120Q170 100 340 130Q510 160 680 110"/><path d="M0 160Q170 140 340 170Q510 200 680 150"/><path d="M0 200Q170 180 340 210Q510 240 680 190"/><path d="M0 240Q170 220 340 250Q510 270 680 230"/><path d="M0 280Q170 260 340 290Q510 310 680 270"/></g><g filter="url(#rg)"><path d="M20 30C100 50 140 120 220 140C300 160 340 110 400 140C460 170 500 230 560 240C620 250 660 220 680 240" stroke="#4aa3df" stroke-opacity=".6" stroke-width="4" fill="none" stroke-linecap="round"/></g><g opacity=".45"><path d="M80 10C110 50 150 90 220 140" stroke="#4aa3df" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".4"/><path d="M300 40C320 80 360 100 400 140" stroke="#4aa3df" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".35"/><path d="M480 80C500 140 530 190 560 240" stroke="#4aa3df" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".35"/></g><g filter="url(#rg)"><path d="M40 360C120 310 200 280 300 260C400 240 450 270 520 290C590 310 650 300 680 320" stroke="#4aa3df" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/></g><ellipse cx="400" cy="180" rx="50" ry="28" fill="#4aa3df" fill-opacity=".08" stroke="#4aa3df" stroke-width="1" stroke-opacity=".2" filter="url(#rg)"/><g fill="#4aa3df" opacity=".5"><circle cx="160" cy="90" r="2"><animate attributeName="opacity" values=".5;.1;.5" dur="3s" repeatCount="indefinite"/></circle><circle cx="330" cy="130" r="2"><animate attributeName="opacity" values=".1;.5;.1" dur="3.5s" repeatCount="indefinite"/></circle><circle cx="500" cy="220" r="2"><animate attributeName="opacity" values=".5;.1;.5" dur="4s" repeatCount="indefinite"/></circle></g></svg>')}`,
  ranges: `data:image/svg+xml,${encodeURIComponent('<svg width="680" height="360" viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f0d08"/><stop offset="100%" stop-color="#1a150c"/></linearGradient><linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c4a882" stop-opacity=".35"/><stop offset="100%" stop-color="#8b6b4a" stop-opacity=".08"/></linearGradient><linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b08968" stop-opacity=".2"/><stop offset="100%" stop-color="#6b4a2a" stop-opacity=".05"/></linearGradient></defs><rect width="680" height="360" fill="url(#mb)"/><g opacity=".05" stroke="#b08968" fill="none" stroke-width=".4"><ellipse cx="250" cy="180" rx="220" ry="100"/><ellipse cx="250" cy="170" rx="180" ry="80"/><ellipse cx="250" cy="160" rx="140" ry="60"/><ellipse cx="250" cy="150" rx="100" ry="40"/><ellipse cx="500" cy="220" rx="150" ry="70"/><ellipse cx="500" cy="210" rx="115" ry="52"/><ellipse cx="500" cy="200" rx="80" ry="35"/></g><path d="M0 360L0 280Q80 260 160 240L240 160L310 210L380 120L440 180L500 80L560 150L620 110L680 180L680 360Z" fill="url(#m2)" opacity=".45"/><path d="M0 360L0 290L100 250L180 180L240 220L300 130L360 190L420 80L480 150L540 100L600 160L680 120L680 360Z" fill="url(#m1)"/><g opacity=".6"><path d="M300 130L318 160L282 160Z" fill="#fff" fill-opacity=".3"/><path d="M420 80L440 114L400 114Z" fill="#fff" fill-opacity=".4"/><path d="M540 100L556 126L524 126Z" fill="#fff" fill-opacity=".35"/></g><g fill="#d4a853" opacity=".6"><circle cx="420" cy="76" r="2.5"><animate attributeName="opacity" values=".6;.2;.6" dur="4s" repeatCount="indefinite"/></circle><circle cx="300" cy="126" r="2"><animate attributeName="opacity" values=".2;.6;.2" dur="3.5s" repeatCount="indefinite"/></circle><circle cx="540" cy="96" r="2"><animate attributeName="opacity" values=".4;.1;.4" dur="4.5s" repeatCount="indefinite"/></circle></g></svg>')}`,
  peaks: `data:image/svg+xml,${encodeURIComponent('<svg width="680" height="360" viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f0d08"/><stop offset="100%" stop-color="#18140c"/></linearGradient><filter id="pg"><feGaussianBlur stdDeviation="4"/></filter></defs><rect width="680" height="360" fill="url(#pb)"/><path d="M0 360L160 280L240 180L320 240L400 100L480 200L560 140L680 220L680 360Z" fill="#3a2a18" opacity=".3"/><g filter="url(#pg)"><path d="M340 60L440 280L240 280Z" fill="#a0855b" fill-opacity=".15" stroke="#a0855b" stroke-width="1" stroke-opacity=".2"/></g><path d="M340 60L375 130L355 120L340 150L325 120L305 130Z" fill="#fff" fill-opacity=".35"/><g filter="url(#pg)"><path d="M180 160L260 320L100 320Z" fill="#8b7648" fill-opacity=".1" stroke="#a0855b" stroke-width=".8" stroke-opacity=".15"/><path d="M540 130L620 300L460 300Z" fill="#8b7648" fill-opacity=".1" stroke="#a0855b" stroke-width=".8" stroke-opacity=".15"/></g><path d="M180 160L198 195L188 190L180 210L172 190L162 195Z" fill="#fff" fill-opacity=".25"/><path d="M540 130L558 168L548 162L540 180L532 162L522 168Z" fill="#fff" fill-opacity=".3"/><g fill="#d4a853" opacity=".8"><circle cx="340" cy="54" r="3.5" filter="url(#pg)"><animate attributeName="opacity" values=".8;.3;.8" dur="3s" repeatCount="indefinite"/></circle><circle cx="180" cy="154" r="2.5"><animate attributeName="opacity" values=".3;.7;.3" dur="3.5s" repeatCount="indefinite"/></circle><circle cx="540" cy="124" r="2.5"><animate attributeName="opacity" values=".5;.2;.5" dur="4s" repeatCount="indefinite"/></circle></g><g font-family="monospace" font-size="8" fill="#a0855b" opacity=".12"><text x="345" y="48">8849m</text><text x="185" y="148">6190m</text><text x="545" y="118">4810m</text></g></svg>')}`,
  lakes: `data:image/svg+xml,${encodeURIComponent('<svg width="680" height="360" viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a1628"/><stop offset="100%" stop-color="#0c1e3a"/></linearGradient><filter id="lg"><feGaussianBlur stdDeviation="8"/></filter><filter id="lg2"><feGaussianBlur stdDeviation="3"/></filter></defs><rect width="680" height="360" fill="url(#lb)"/><g opacity=".04" stroke="#5b9bd5" fill="none" stroke-width=".4"><path d="M0 60Q170 40 340 70Q510 100 680 50"/><path d="M0 120Q170 100 340 130Q510 160 680 110"/><path d="M0 180Q170 160 340 190Q510 220 680 170"/><path d="M0 240Q170 220 340 250Q510 280 680 230"/><path d="M0 300Q170 280 340 310Q510 340 680 290"/></g><g filter="url(#lg)"><ellipse cx="340" cy="170" rx="160" ry="90" fill="#5b9bd5" fill-opacity=".1" stroke="#5b9bd5" stroke-width="1.5" stroke-opacity=".2"/></g><g filter="url(#lg2)" opacity=".5"><ellipse cx="340" cy="170" rx="120" ry="65" fill="none" stroke="#5b9bd5" stroke-width=".5" stroke-opacity=".3"/><ellipse cx="340" cy="170" rx="80" ry="40" fill="none" stroke="#5b9bd5" stroke-width=".5" stroke-opacity=".2"/></g><g opacity=".15" stroke="#5b9bd5" fill="none" stroke-width=".5"><path d="M220 160Q280 150 340 155Q400 160 460 152"/><path d="M240 180Q300 172 340 175Q380 178 440 170"/></g><g filter="url(#lg)"><ellipse cx="140" cy="280" rx="80" ry="45" fill="#5b9bd5" fill-opacity=".06" stroke="#5b9bd5" stroke-width="1" stroke-opacity=".15"/><ellipse cx="560" cy="100" rx="60" ry="35" fill="#5b9bd5" fill-opacity=".06" stroke="#5b9bd5" stroke-width="1" stroke-opacity=".15"/></g><g fill="#5b9bd5" opacity=".4"><circle cx="280" cy="155" r="1.5"><animate attributeName="opacity" values=".4;.1;.4" dur="3s" repeatCount="indefinite"/></circle><circle cx="400" cy="175" r="1.5"><animate attributeName="opacity" values=".1;.4;.1" dur="3.5s" repeatCount="indefinite"/></circle><circle cx="340" cy="165" r="2"><animate attributeName="opacity" values=".3;.1;.3" dur="4s" repeatCount="indefinite"/></circle></g></svg>')}`,
  volcanoes: `data:image/svg+xml,${encodeURIComponent('<svg width="680" height="360" viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="vb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#120808"/><stop offset="60%" stop-color="#1a0c06"/><stop offset="100%" stop-color="#0d0604"/></linearGradient><radialGradient id="vc" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff8c00" stop-opacity=".5"/><stop offset="40%" stop-color="#e84b1a" stop-opacity=".2"/><stop offset="100%" stop-color="#e84b1a" stop-opacity="0"/></radialGradient><filter id="vg"><feGaussianBlur stdDeviation="6"/></filter><filter id="vg2"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="680" height="360" fill="url(#vb)"/><g opacity=".04" stroke="#e84b1a" fill="none" stroke-width=".4"><path d="M0 180Q170 140 340 180Q510 220 680 180"/><path d="M0 160Q170 120 340 160Q510 200 680 160"/><path d="M0 200Q170 160 340 200Q510 240 680 200"/></g><path d="M0 360L120 360L200 260L260 300L300 220L340 360Z" fill="#2a1008" opacity=".5"/><path d="M360 360L440 280L500 320L540 220L580 270L680 360Z" fill="#2a1008" opacity=".4"/><g filter="url(#vg)"><path d="M220 360L380 100L540 360Z" fill="#3a1a0a" opacity=".5"/><path d="M310 360L380 100L450 360Z" fill="#4a2010" opacity=".3"/></g><g filter="url(#vg2)"><ellipse cx="380" cy="92" rx="40" ry="16" fill="url(#vc)"><animate attributeName="opacity" values=".8;.3;.8" dur="3s" repeatCount="indefinite"/></ellipse></g><g opacity=".12" filter="url(#vg)"><ellipse cx="380" cy="55" rx="60" ry="30" fill="#e84b1a" opacity=".1"/><ellipse cx="380" cy="35" rx="40" ry="20" fill="#ff8c00" opacity=".08"/></g><g stroke="#e84b1a" fill="none" stroke-width="1" opacity=".15"><path d="M374 105C360 160 340 220 320 290" stroke-linecap="round"><animate attributeName="opacity" values=".15;.04;.15" dur="4s" repeatCount="indefinite"/></path><path d="M386 105C400 170 420 240 440 310" stroke-linecap="round"><animate attributeName="opacity" values=".04;.15;.04" dur="3.5s" repeatCount="indefinite"/></path></g><g stroke="#ff6b35" fill="none" opacity=".1"><circle cx="380" cy="320" r="30" stroke-width=".5"><animate attributeName="r" values="30;90" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".1;0" dur="4s" repeatCount="indefinite"/></circle></g><g fill="#ff8c00" opacity=".6"><circle cx="200" cy="255" r="2"><animate attributeName="opacity" values=".6;.2;.6" dur="3s" repeatCount="indefinite"/></circle><circle cx="540" cy="215" r="2.5"><animate attributeName="opacity" values=".2;.6;.2" dur="3.5s" repeatCount="indefinite"/></circle><circle cx="380" cy="88" r="3"><animate attributeName="opacity" values=".8;.3;.8" dur="2.5s" repeatCount="indefinite"/></circle></g></svg>')}`,
  'fault-lines': `data:image/svg+xml,${encodeURIComponent('<svg width="680" height="360" viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0d0806"/><stop offset="100%" stop-color="#140c08"/></linearGradient><linearGradient id="fl" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ff6b35" stop-opacity=".6"/><stop offset="50%" stop-color="#ff9a5c" stop-opacity=".8"/><stop offset="100%" stop-color="#ff6b35" stop-opacity=".6"/></linearGradient><filter id="fg"><feGaussianBlur stdDeviation="5"/></filter><filter id="fg2"><feGaussianBlur stdDeviation="10"/></filter></defs><rect width="680" height="360" fill="url(#fb)"/><g opacity=".03" stroke="#ff6b35" fill="none" stroke-width=".3"><path d="M0 30Q170 40 340 25Q510 10 680 35"/><path d="M0 70Q170 80 340 65Q510 50 680 75"/><path d="M0 110Q170 120 340 105Q510 90 680 115"/><path d="M0 150Q170 160 340 145Q510 130 680 155"/><path d="M0 190Q170 200 340 185Q510 170 680 195"/><path d="M0 230Q170 240 340 225Q510 210 680 235"/><path d="M0 270Q170 280 340 265Q510 250 680 275"/><path d="M0 310Q170 320 340 305Q510 290 680 315"/></g><g filter="url(#fg)"><path d="M0 200L80 175L160 195L240 165L320 180L400 150L480 170L560 140L640 160L680 150" stroke="url(#fl)" stroke-width="3" fill="none" stroke-linecap="round"/></g><g stroke="#ff6b35" fill="none" stroke-width=".8" opacity=".2"><path d="M80 175L65 145L55 120"/><path d="M80 175L90 205L85 235"/><path d="M240 165L225 135L230 110"/><path d="M240 165L255 195L250 225"/><path d="M400 150L385 120L390 95"/><path d="M400 150L415 180L410 210"/><path d="M560 140L545 110L550 85"/><path d="M560 140L575 170L570 200"/></g><g filter="url(#fg)" opacity=".35"><path d="M50 300L150 280L250 295L350 270L450 285L550 260L650 280" stroke="#ff6b35" stroke-width="1.5" stroke-dasharray="10 5" fill="none" stroke-linecap="round"/></g><g font-family="monospace" font-size="9" fill="#ff6b35" opacity=".06" letter-spacing="4"><text x="120" y="80">PLATE A</text><text x="400" y="320">PLATE B</text></g><g filter="url(#fg2)"><circle cx="240" cy="165" r="8" fill="#ff6b35" fill-opacity=".15" stroke="#ff6b35" stroke-width=".5" stroke-opacity=".2"><animate attributeName="r" values="8;20" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values=".3;0" dur="3s" repeatCount="indefinite"/></circle><circle cx="400" cy="150" r="10" fill="#ff9a5c" fill-opacity=".2" stroke="#ff6b35" stroke-width=".5" stroke-opacity=".2"><animate attributeName="r" values="10;24" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".3;0" dur="4s" repeatCount="indefinite"/></circle></g><g fill="#ff8c00" opacity=".5"><circle cx="240" cy="165" r="2.5"/><circle cx="400" cy="150" r="3"/><circle cx="560" cy="140" r="2"/><circle cx="160" cy="195" r="1.5" opacity=".3"/></g></svg>')}`,
  deserts: `data:image/svg+xml,${encodeURIComponent('<svg width="680" height="360" viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="db" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a140a"/><stop offset="100%" stop-color="#0f0c06"/></linearGradient><linearGradient id="d1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d4a853" stop-opacity=".22"/><stop offset="100%" stop-color="#b08840" stop-opacity=".06"/></linearGradient><linearGradient id="d2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8c97a" stop-opacity=".12"/><stop offset="100%" stop-color="#c4a050" stop-opacity=".04"/></linearGradient><radialGradient id="ds" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#e8c97a" stop-opacity=".2"/><stop offset="40%" stop-color="#d4a853" stop-opacity=".06"/><stop offset="100%" stop-color="#d4a853" stop-opacity="0"/></radialGradient><filter id="dg"><feGaussianBlur stdDeviation="4"/></filter></defs><rect width="680" height="360" fill="url(#db)"/><g opacity=".04" stroke="#d4a853" fill="none" stroke-width=".3"><path d="M0 40Q170 35 340 45Q510 55 680 40"/><path d="M0 80Q170 75 340 85Q510 95 680 80"/><path d="M0 120Q170 115 340 125Q510 135 680 120"/></g><circle cx="560" cy="60" r="70" fill="url(#ds)"><animate attributeName="opacity" values="1;.5;1" dur="6s" repeatCount="indefinite"/></circle><circle cx="560" cy="60" r="10" fill="#e8c97a" fill-opacity=".15" filter="url(#dg)"/><path d="M0 360L0 250Q90 225 180 240Q270 255 360 230Q450 205 540 225Q630 245 680 220L680 360Z" fill="url(#d2)" opacity=".5"/><path d="M0 360L0 275Q100 255 200 268Q300 280 400 258Q500 235 600 255Q650 265 680 250L680 360Z" fill="url(#d1)" opacity=".7"/><path d="M0 360L0 300Q110 282 220 295Q330 308 440 288Q540 268 640 285L680 278L680 360Z" fill="url(#d1)"/><g stroke="#e8c97a" fill="none" stroke-width=".8" opacity=".12"><path d="M0 275Q100 255 200 268Q300 280 400 258Q500 235 600 255" stroke-linecap="round"/><path d="M0 300Q110 282 220 295Q330 308 440 288Q540 268 640 285" stroke-linecap="round"/></g><g fill="#d4a853" opacity=".2"><circle cx="100" cy="265" r=".8"/><circle cx="200" cy="280" r=".6"/><circle cx="320" cy="270" r=".8"/><circle cx="420" cy="255" r=".7"/><circle cx="500" cy="245" r=".6"/><circle cx="580" cy="260" r=".8"/><circle cx="150" cy="295" r=".5"/><circle cx="350" cy="300" r=".7"/><circle cx="480" cy="275" r=".6"/></g><g stroke="#d4a853" fill="none" opacity=".06" stroke-width=".5"><path d="M80 190Q160 185 240 190Q320 195 400 188"><animate attributeName="opacity" values=".06;.015;.06" dur="5s" repeatCount="indefinite"/></path><path d="M280 170Q360 165 440 170Q510 173 560 168"><animate attributeName="opacity" values=".015;.06;.015" dur="4.5s" repeatCount="indefinite"/></path></g><path d="M30 210Q170 188 340 200Q510 215 660 190" stroke="#d4a853" stroke-width="1" stroke-dasharray="8 5" fill="none" opacity=".08"/></svg>')}`,
};

export const PHYSICAL_LAYER_CONFIG: Record<PhysicalLayerType, PhysicalLayerConfig> = {
  rivers: {
    label: 'Rivers',
    color: '#4aa3df',
    legendNote: 'Arterial networks mapped across every continent',
    legendSource: 'WorldLore • Hydrology',
    expandedDescription: 'WorldLore\u2019s hydrological monitoring network traces every major river system on Earth \u2014 from the arterial Amazon basin to the frozen deltas of Siberia. Each watercourse is catalogued by discharge volume, watershed, and seasonal flow patterns.',
    iconName: 'Waves',
    gradient: 'linear-gradient(135deg, #1a3a5c 0%, #4aa3df 60%, #2a6fa8 100%)',
    heroSvg: LAYER_HERO_SVGS.rivers,
  },
  ranges: {
    label: 'Mountain Ranges',
    color: '#b08968',
    legendNote: 'Tectonic formations rising from Earth\u2019s crust',
    legendSource: 'WorldLore • Terrain',
    expandedDescription: 'Continental mountain ranges catalogued by our terrain intelligence division. Every major orogen \u2014 from the Himalayan collision zone to the ancient Appalachian fold belt \u2014 is mapped with elevation profiles, geological age, and tectonic origin.',
    iconName: 'Mountain',
    gradient: 'linear-gradient(135deg, #5c3a1a 0%, #b08968 60%, #8b6b4a 100%)',
    heroSvg: LAYER_HERO_SVGS.ranges,
  },
  peaks: {
    label: 'Peaks',
    color: '#a0855b',
    legendNote: 'The planet\u2019s highest summits, catalogued',
    legendSource: 'WorldLore • Elevation',
    expandedDescription: 'WorldLore\u2019s elevation index tracks every significant summit on the planet. Each peak is recorded with precise altitude, topographic prominence, and first ascent data \u2014 from the 8,000-metre giants of the Karakoram to isolated volcanic cones.',
    iconName: 'MountainSnow',
    gradient: 'linear-gradient(135deg, #6b5a3a 0%, #a0855b 50%, #d4c5a0 100%)',
    heroSvg: LAYER_HERO_SVGS.peaks,
  },
  lakes: {
    label: 'Lakes',
    color: '#5b9bd5',
    legendNote: 'Inland water masses tracked globally',
    legendSource: 'WorldLore • Hydrology',
    expandedDescription: 'Every major inland water body on Earth \u2014 glacial lakes, rift basins, reservoirs, and endorheic seas \u2014 catalogued by surface area, depth, and hydrological connectivity. Our network monitors seasonal fluctuations and long-term trends.',
    iconName: 'Droplets',
    gradient: 'linear-gradient(135deg, #1a3a6c 0%, #5b9bd5 60%, #2e78c4 100%)',
    heroSvg: LAYER_HERO_SVGS.lakes,
  },
  volcanoes: {
    label: 'Volcanoes',
    color: '#e84b1a',
    legendNote: 'Holocene volcanic activity monitored globally',
    legendSource: 'WorldLore • Geothermal',
    expandedDescription: 'WorldLore\u2019s geothermal surveillance tracks every Holocene volcano on the planet. Each entry records eruption history, volcanic type, current alert level, and tectonic setting \u2014 from the Ring of Fire\u2019s subduction arcs to mid-ocean ridge hotspots.',
    iconName: 'Flame',
    gradient: 'linear-gradient(135deg, #4a1a0a 0%, #e84b1a 50%, #ff8c00 100%)',
    heroSvg: LAYER_HERO_SVGS.volcanoes,
  },
  'fault-lines': {
    label: 'Fault Lines',
    color: '#ff6b35',
    legendNote: 'Crustal fracture zones under continuous watch',
    legendSource: 'WorldLore • Tectonics',
    expandedDescription: 'Tectonic plate boundaries and major crustal fracture zones mapped by WorldLore\u2019s seismic intelligence division. Every convergent, divergent, and transform boundary is traced \u2014 the living scars where Earth\u2019s lithosphere breaks and reshapes itself.',
    iconName: 'Zap',
    gradient: 'linear-gradient(135deg, #4a2010 0%, #ff6b35 50%, #ff9a5c 100%)',
    heroSvg: LAYER_HERO_SVGS['fault-lines'],
  },
  deserts: {
    label: 'Deserts',
    color: '#d4a853',
    legendNote: 'Arid expanses charted across the subtropics',
    legendSource: 'WorldLore • Arid Zones',
    expandedDescription: 'WorldLore\u2019s climate division maps every major arid and hyper-arid region on the planet. From the Sahara\u2019s ergs to the Atacama\u2019s absolute desert, each zone is classified by aridity index, surface type, and desertification trends.',
    iconName: 'Sun',
    gradient: 'linear-gradient(135deg, #6b4a1a 0%, #d4a853 50%, #e8c97a 100%)',
    heroSvg: LAYER_HERO_SVGS.deserts,
  },
};

export const PHYSICAL_LAYER_KEYS: PhysicalLayerType[] = Object.keys(PHYSICAL_LAYER_CONFIG) as PhysicalLayerType[];

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

/**
 * Prefetch Night Lights tiles into the browser cache so activation feels instant.
 * Call this when the user opens Satellite Intel (before they toggle anything).
 * Uses low-priority fetch to avoid blocking other requests.
 */
let _nightLightsPrefetched = false;
export function prefetchNightLightsTiles(): void {
  if (_nightLightsPrefetched) return;
  _nightLightsPrefetched = true;
  const sources = resolveNasaOverlaySources('night-lights');
  // Prefetch tiles for zoom levels 0–3 (globe view) — these are the tiles
  // visible when the user first activates Night Lights.
  const zoomTiles: Array<{ z: number; x: number; y: number }> = [];
  // z0: 1 tile, z1: 4 tiles, z2: 16 tiles, z3: 64 tiles = 85 tiles per source
  for (let z = 0; z <= 3; z++) {
    const count = 1 << z; // 2^z
    for (let y = 0; y < count; y++) {
      for (let x = 0; x < count; x++) {
        zoomTiles.push({ z, x, y });
      }
    }
  }
  for (const src of sources) {
    const template = src.tiles[0];
    if (!template) continue;
    for (const { z, x, y } of zoomTiles) {
      const url = template.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x));
      // Use <link rel=prefetch> when available (lowest priority, doesn't block)
      // Fall back to fetch with low priority signal
      if (typeof document !== 'undefined' && document.createElement) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
      }
    }
  }
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

