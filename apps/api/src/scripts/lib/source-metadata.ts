/**
 * Centralized source version metadata.
 *
 * When a source publishes a new version (e.g., V-Dem v15), update ONE line here.
 * All ingestion scripts inherit the change automatically.
 */

export interface SourceMetadata {
  sourceVersion: string | null;
  sourceReleaseDate: Date | null;
}

const SOURCE_VERSIONS: Record<string, SourceMetadata> = {
  // V-Dem Institute — Varieties of Democracy
  // Dataset version published by V-Dem Project. Check: https://v-dem.net/data/
  'V-Dem Institute': {
    sourceVersion: 'v14',
    sourceReleaseDate: new Date('2024-03-01'),
  },
  'V-Dem Institute via OWID': {
    sourceVersion: 'v14',
    sourceReleaseDate: new Date('2024-03-01'),
  },

  // Freedom House — Freedom in the World
  // Annual report. Check: https://freedomhouse.org/report/freedom-world
  'Freedom House': {
    sourceVersion: 'FITW 2025',
    sourceReleaseDate: new Date('2025-02-27'),
  },
  'Freedom House via OWID': {
    sourceVersion: 'FITW 2025',
    sourceReleaseDate: new Date('2025-02-27'),
  },

  // Polity5 — Center for Systemic Peace
  // Discontinued in 2020. No new versions expected.
  'Polity5 (CSP)': {
    sourceVersion: 'p5v2018',
    sourceReleaseDate: new Date('2020-08-31'),
  },
  'Center for Systemic Peace via OWID': {
    sourceVersion: 'p5v2018',
    sourceReleaseDate: new Date('2020-08-31'),
  },

  // Transparency International — Corruption Perceptions Index
  // Annual report in January. Check: https://www.transparency.org/cpi
  'Transparency International': {
    sourceVersion: 'CPI 2024',
    sourceReleaseDate: new Date('2025-01-30'),
  },
  'Transparency International via OWID': {
    sourceVersion: 'CPI 2024',
    sourceReleaseDate: new Date('2025-01-30'),
  },

  // Fund for Peace — Fragile States Index
  // Annual report ~May/June. Check: https://fragilestatesindex.org
  'Fund for Peace': {
    sourceVersion: 'FSI 2024',
    sourceReleaseDate: new Date('2024-06-01'),
  },

  // Institute for Economics & Peace — Global Peace Index
  // Annual report ~June. Check: https://www.visionofhumanity.org
  'IEP': {
    sourceVersion: 'GPI 2025',
    sourceReleaseDate: new Date('2025-06-11'),
  },
  'Institute for Economics & Peace': {
    sourceVersion: 'GPI 2025',
    sourceReleaseDate: new Date('2025-06-11'),
  },

  // World Bank — World Development Indicators
  // Updated quarterly. Check: https://datatopics.worldbank.org/world-development-indicators/
  'World Bank': {
    sourceVersion: 'WDI 2025Q1',
    sourceReleaseDate: new Date('2025-03-20'),
  },

  // OpenSanctions — continuous feed, no discrete versions
  // ingestedAt serves as the version marker
  'OpenSanctions': {
    sourceVersion: null,
    sourceReleaseDate: null,
  },

  // CIA World Factbook
  'CIA World Factbook': {
    sourceVersion: '2024',
    sourceReleaseDate: new Date('2024-09-01'),
  },

  // ND-GAIN — Notre Dame Global Adaptation Initiative
  // Annual release. Check: https://gain.nd.edu/our-work/country-index/
  'ND-GAIN': {
    sourceVersion: 'ND-GAIN 2026',
    sourceReleaseDate: new Date('2026-01-23'),
  },

  // Bündnis Entwicklung Hilft / IFHV — World Risk Index
  // Annual report. Check: https://weltrisikobericht.de/en/
  'Bündnis Entwicklung Hilft': {
    sourceVersion: 'WRI 2025',
    sourceReleaseDate: new Date('2025-09-11'),
  },

  // Global Carbon Project — fuel-specific CO2 emissions
  // Annual release in November. Mirror: github.com/owid/co2-data
  'Global Carbon Project': {
    sourceVersion: 'GCB 2024',
    sourceReleaseDate: new Date('2024-11-13'),
  },

  // Global Forest Watch / Hansen/UMD — tree cover loss
  // Upstream: Hansen et al. v1.12 (University of Maryland)
  // Delivered via: OWID mirror at ourworldindata.org/grapher/tree-cover-loss
  // If OWID stops updating, fallback is GFW's data-api.globalforestwatch.org (requires key)
  'Global Forest Watch / UMD': {
    sourceVersion: 'Hansen v1.12 via OWID 2025-03',
    sourceReleaseDate: new Date('2025-04-02'),
  },

  // OpenAQ — air quality monitoring station coverage
  // Real-time network, we snapshot station count at ingestion time
  'OpenAQ': {
    sourceVersion: null, // continuous; ingestedAt is the effective version
    sourceReleaseDate: null,
  },

  // OWID Energy Data — consolidated energy production, electricity generation, mix shares
  // Upstream: Energy Institute Statistical Review + EIA + Ember
  // Mirror: github.com/owid/energy-data (no auth)
  'OWID Energy Data': {
    sourceVersion: 'Energy Institute 2024 + EIA via OWID 2025-01',
    sourceReleaseDate: new Date('2025-01-01'),
  },
};

export function getSourceMetadata(source: string): SourceMetadata {
  return SOURCE_VERSIONS[source] ?? { sourceVersion: null, sourceReleaseDate: null };
}
