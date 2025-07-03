import mapboxgl from 'mapbox-gl';

export interface ConflictData {
  id: string;
  country: string;
  status: 'War' | 'Warm' | 'Improving';
  coordinates: { lat: number; lng: number };
  description: string;
  casualties: number;
}

export interface ConflictGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      id: string;
      country: string;
      status: string;
      description: string;
      casualties: number;
    };
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }>;
}

export interface ConflictSourceConfig {
  cluster: boolean;
  buffer: number;
  maxzoom: number;
  tolerance: number;
}

const DEFAULT_CONFIG: ConflictSourceConfig = {
  cluster: false,
  buffer: 32,
  maxzoom: 12,
  tolerance: 0.375
};

export class ConflictDataManager {
  private map: mapboxgl.Map | null = null;
  private config: ConflictSourceConfig;
  private sourceId: string;

  constructor(sourceId: string = 'conflicts', config: Partial<ConflictSourceConfig> = {}) {
    this.sourceId = sourceId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the conflict data manager with a map instance
   */
  initialize(map: mapboxgl.Map): void {
    this.map = map;
  }

  /**
   * Create GeoJSON from conflict data
   */
  createGeoJSON(conflicts: ConflictData[]): ConflictGeoJSON {
    return {
      type: 'FeatureCollection',
      features: conflicts.map(conflict => ({
        type: 'Feature',
        properties: {
          id: conflict.id,
          country: conflict.country,
          status: conflict.status,
          description: conflict.description,
          casualties: conflict.casualties
        },
        geometry: {
          type: 'Point',
          coordinates: [conflict.coordinates.lng, conflict.coordinates.lat]
        }
      }))
    };
  }

  /**
   * Add conflict data source to the map
   */
  addConflictSource(conflicts: ConflictData[]): void {
    if (!this.map) {
      console.warn('ConflictDataManager: Map not initialized');
      return;
    }

    const geoJSON = this.createGeoJSON(conflicts);
    
    this.map.addSource(this.sourceId, {
      type: 'geojson',
      data: geoJSON,
      ...this.config
    });
  }

  /**
   * Update conflict data in the existing source
   */
  updateConflictData(conflicts: ConflictData[]): void {
    if (!this.map) {
      console.warn('ConflictDataManager: Map not initialized');
      return;
    }

    const source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource;
    if (!source) {
      console.warn(`ConflictDataManager: Source '${this.sourceId}' not found`);
      return;
    }

    const geoJSON = this.createGeoJSON(conflicts);
    source.setData(geoJSON);
  }

  /**
   * Remove conflict source from the map
   */
  removeConflictSource(): void {
    if (!this.map || (this.map as any)._removed) {
      // Map not initialized or already removed
      return;
    }
    if (this.map.getSource(this.sourceId)) {
      this.map.removeSource(this.sourceId);
    }
  }

  /**
   * Check if conflict source exists
   */
  hasConflictSource(): boolean {
    if (!this.map) return false;
    return !!this.map.getSource(this.sourceId);
  }

  /**
   * Get the source ID
   */
  getSourceId(): string {
    return this.sourceId;
  }

  /**
   * Get current configuration
   */
  getConfig(): ConflictSourceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConflictSourceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.debug('ConflictDataManager: cleanup called');
    this.removeConflictSource();
    this.map = null;
  }
}

// Export a default instance for convenience
export const defaultConflictDataManager = new ConflictDataManager();