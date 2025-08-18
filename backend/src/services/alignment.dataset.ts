import { coefToHexRdBu } from './alignment.colors';
import { AlignmentDataset, AlignmentCountryEntry } from '../types/alignment.types';
import { DIMENSIONS, computeDefaultDimensionWeights } from './alignment.config';

// A compact list of ISO3 codes to get you started (can be extended to 100)
const ISO3_LIST: string[] = [
  'USA','CHN','RUS','GBR','FRA','DEU','JPN','IND','BRA','CAN','AUS','ITA','ESP','MEX','ZAF','TUR','KOR','SAU','IRN','ISR','UKR','POL','NLD','SWE','NOR','DNK','FIN','BEL','CHE','AUT','CZE','GRC','PRT','ROU','HUN','SRB','BGR','HRV','SVN','SVK','IRL','ISL','EGY','NGA','ETH','DZA','MAR','TUN','ARE','QAT','KWT','OMN','PAK','IDN','MYS','SGP','VNM','THA','PHL','TWN','HKG','NZL','ARG','CHL','COL','PER','VEN'
];

function hashStringToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let x = seed || 123456789;
  return () => {
    // Xorshift32
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // scale to 0..1
    return ((x >>> 0) % 100000) / 100000;
  };
}

function generateCountryVector(seed: number, dimensions: number): number[] {
  const rand = seededRandom(seed);
  const vec: number[] = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    // Uniform [-1, 1]
    vec[i] = rand() * 2 - 1;
  }
  return vec;
}

export function generateDataset(): AlignmentDataset {
  const now = new Date().toISOString().slice(0, 10);
  const dimCount = DIMENSIONS.length;
  const countries: AlignmentCountryEntry[] = ISO3_LIST.map((iso3) => {
    const seed = hashStringToSeed(iso3);
    const vector = generateCountryVector(seed, dimCount);
    const subindices = {
      diplomacy: vector.slice(0, 5).reduce((a, b) => a + b, 0) / 5,
      military: vector.slice(5, 5 + 33).reduce((a, b) => a + b, 0) / 33,
      econ_fin: vector.slice(38, 38 + 12).reduce((a, b) => a + b, 0) / 12,
      resources: vector.slice(50, 50 + 12).reduce((a, b) => a + b, 0) / 12,
      technology: vector.slice(62, 62 + 5).reduce((a, b) => a + b, 0) / 5,
      soft: vector.slice(67, 67 + 6).reduce((a, b) => a + b, 0) / 6,
      stability: vector.slice(73, 73 + 5).reduce((a, b) => a + b, 0) / 5,
    };
    return {
      name: iso3,
      iso3,
      vector,
      subindices,
      sources: { demo: 'seeded-generator' },
      dataQuality: { missing: 0, imputed: [] },
    };
  });
  return {
    updatedAt: now,
    dimensions: DIMENSIONS,
    countries,
  };
}

export function generateOverlay(min = -1, max = 1) {
  const dataset = generateDataset();
  // Aggregate a single alignment score per country using default dimension weights
  const { vector: weights } = computeDefaultDimensionWeights({
    military: 0.4,
    econ_fin: 0.2,
    diplomacy: 0.15,
    resources: 0.1,
    technology: 0.075,
    soft: 0.05,
    stability: 0.025,
  });
  const colors: Record<string, string> = {};
  for (const c of dataset.countries) {
    const score = c.vector.reduce((s, v, i) => s + v * (weights[i] || 0), 0);
    colors[c.iso3] = coefToHexRdBu(score, min, max);
  }
  return { updatedAt: dataset.updatedAt, min, max, colors };
}

