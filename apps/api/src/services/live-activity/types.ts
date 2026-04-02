export interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: number[] | number[][] | number[][][] };
  properties: Record<string, any>;
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}
