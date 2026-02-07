// Ukraine API Service - Enhanced with DeepStateMap capabilities
// Based on Frontlines project analysis and current implementation

// ✅ MEJORADO: Interfaces específicas para evitar tipos 'any'
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString';
    coordinates: number[][][] | number[][];
  };
  properties: {
    [key: string]: unknown;
  };
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface UkraineFrontlineData {
  map: GeoJSONCollection; // ✅ MEJORADO: Tipo específico en lugar de 'any'
  datetime: string;
  id?: string;
}

export interface MapboxPaint {
  'fill-color'?: string | unknown[];
  'fill-opacity'?: number;
  'fill-outline-color'?: string;
  'line-color'?: string | unknown[];
  'line-width'?: number;
  'line-opacity'?: number;
  'circle-color'?: string | unknown[];
  'circle-radius'?: number;
  'circle-opacity'?: number;
  [key: string]: unknown;
}

export interface MapboxLayout {
  visibility?: 'visible' | 'none';
  [key: string]: unknown;
}

export interface UkraineLayerConfig {
  id: string;
  type: 'fill' | 'line' | 'circle';
  source: string;
  filter?: unknown[];
  paint: MapboxPaint;
  layout?: MapboxLayout;
}

export interface HistoricalDataItem {
  datetime?: string;
  id: string;
}

export interface MapboxMap {
  addSource: (id: string, source: unknown) => void;
  addLayer: (layer: UkraineLayerConfig) => void;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  getLayer: (id: string) => unknown;
  getSource: (id: string) => unknown;
  on: (event: string, handler: (e: unknown) => void) => void;
  off: (event: string, handler: (e: unknown) => void) => void;
  getCanvas: () => HTMLCanvasElement;
}

export class UkraineAPIService {
  private static readonly BASE_URL = 'https://deepstatemap.live/api';
  private static readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static lastUpdate: string | null = null;

  /**
   * Fetch the latest frontline data from DeepStateMap API
   */
  static async fetchLatestFrontlineData(): Promise<UkraineFrontlineData> {
    try {
      console.log('[Ukraine API] Fetching latest frontline data...');
      
      // Get the latest data ID
      const lastResponse = await fetch(`${this.BASE_URL}/history/last`);
      if (!lastResponse.ok) {
        throw new Error(`HTTP error! status: ${lastResponse.status}`);
      }
      
      const lastData = await lastResponse.json() as HistoricalDataItem;
      console.log('[Ukraine API] Latest data ID:', lastData.id);
      
      // Get the GeoJSON data for that ID
      const geoResponse = await fetch(`${this.BASE_URL}/history/${lastData.id}/geojson`);
      if (!geoResponse.ok) {
        throw new Error(`HTTP error! status: ${geoResponse.status}`);
      }
      
      const geoData = await geoResponse.json() as GeoJSONCollection;
      
      const result: UkraineFrontlineData = {
        map: geoData,
        datetime: lastData.datetime || new Date().toISOString(),
        id: lastData.id
      };
      
      this.lastUpdate = result.datetime;
      console.log(`[Ukraine API] Data loaded successfully. Last update: ${result.datetime}`);
      console.log(`[Ukraine API] Features loaded: ${result.map.features.length}`);
      
      return result;
    } catch (error) {
      console.error('[Ukraine API] Error fetching frontline data:', error);
      throw error;
    }
  }

  /**
   * Get historical data for a specific date
   */
  static async fetchHistoricalData(date: string): Promise<UkraineFrontlineData> {
    try {
      const response = await fetch(`${this.BASE_URL}/history/${date}/geojson`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const geoData = await response.json() as GeoJSONCollection;
      return {
        map: geoData,
        datetime: date,
        id: date
      };
    } catch (error) {
      console.error('[Ukraine API] Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Get available historical dates
   */
  static async getAvailableDates(): Promise<string[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/history`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as HistoricalDataItem[];
      return data.map((item: HistoricalDataItem) => item.datetime || item.id).filter(Boolean);
    } catch (error) {
      console.error('[Ukraine API] Error fetching available dates:', error);
      throw error;
    }
  }

  /**
   * Enhanced layer configuration for Ukraine frontline visualization
   */
  static getLayerConfigurations(): UkraineLayerConfig[] {
    return [
      // Polygon layer for controlled territories
      {
        id: 'ukraine-polygons',
        type: 'fill',
        source: 'ukraine-realtime',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': [
            'case',
            ['has', 'fill'], ['get', 'fill'],
            ['has', 'Color'], ['get', 'Color'],
            '#FF6B6B' // Default red for Russian-controlled areas
          ],
          'fill-opacity': 0.3
        }
      },
      
      // Polygon outline layer
      {
        id: 'ukraine-outlines',
        type: 'line',
        source: 'ukraine-realtime',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'line-color': [
            'case',
            ['has', 'stroke'], ['get', 'stroke'],
            '#d62728'
          ],
          'line-width': 2,
          'line-opacity': 0.8
        }
      },
      
      // Line features (frontlines)
      {
        id: 'ukraine-lines',
        type: 'line',
        source: 'ukraine-realtime',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': [
            'case',
            ['has', 'stroke'], ['get', 'stroke'],
            '#d62728'
          ],
          'line-width': 3,
          'line-opacity': 0.9
        }
      },
      
      // Point features (cities, military objects)
      {
        id: 'ukraine-points',
        type: 'circle',
        source: 'ukraine-realtime',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': [
            'case',
            ['has', 'marker-color'], ['get', 'marker-color'],
            ['has', 'Color'], ['get', 'Color'],
            '#4264fb'
          ],
          'circle-radius': 4,
          'circle-opacity': 0.8,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      }
    ];
  }

  /**
   * Add Ukraine layers to the map with enhanced functionality
   */
  static addUkraineLayers(map: unknown, data: UkraineFrontlineData): void {
    try {
      // Add or update the data source
      if (map.getSource('ukraine-realtime')) {
        (map.getSource('ukraine-realtime') as { setData: (data: GeoJSONCollection) => void }).setData(data.map);
      } else {
        map.addSource('ukraine-realtime', {
          type: 'geojson',
          data: data.map
        });
      }

      // Add layers if they don't exist
      const layerConfigs = this.getLayerConfigurations();
      layerConfigs.forEach(config => {
        if (!map.getLayer(config.id)) {
          map.addLayer(config);
        }
      });

      // Add click handlers for interactivity
      this.addInteractiveHandlers(map, data.datetime);
      
      console.log('[Ukraine API] Layers added successfully');
    } catch (error) {
      console.error('[Ukraine API] Error adding layers:', error);
    }
  }

  /**
   * Add interactive handlers for Ukraine layers
   */
  private static addInteractiveHandlers(map: MapboxMap, lastUpdate: string): void {
    const layerIds = ['ukraine-polygons', 'ukraine-lines', 'ukraine-points'];
    
    layerIds.forEach(layerId => {
      // Click handler
      map.on('click', layerId, (e: unknown) => {
        const event = e as { features?: Array<{ properties?: Record<string, unknown> }>; lngLat?: { lng: number; lat: number } };
        if (!event.features || event.features.length === 0) return;
        
        const feature = event.features[0];
        const props = feature.properties || {};
        
        let popupContent = '<div style="font-family: Arial, sans-serif; max-width: 300px;">';
        if (props.name) {
          popupContent += `<h3 style="margin: 0 0 8px 0; color: #333;">${props.name}</h3>`;
        }
        if (props.description) {
          popupContent += `<p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${props.description}</p>`;
        }
        popupContent += `<p style="margin: 0; font-size: 12px; color: #999;"><strong>Última actualización:</strong> ${new Date(lastUpdate).toLocaleString()}</p>`;
        popupContent += '</div>';
        
        // Use global mapboxgl for popup
        const Popup = (window as { mapboxgl?: { Popup?: new (options: { closeButton: boolean; maxWidth: string }) => { setLngLat: (lngLat: { lng: number; lat: number }) => { setHTML: (html: string) => { addTo: (map: unknown) => void } } } } }).mapboxgl?.Popup;
        if (Popup) {
          new Popup({
            closeButton: true,
            maxWidth: '300px'
          })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map);
        }
      });
      
      // Cursor changes
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });
  }

  /**
   * Remove Ukraine layers from the map
   */
  static removeUkraineLayers(map: unknown): void {
    const layerIds = [
      'ukraine-polygons',
      'ukraine-outlines', 
      'ukraine-lines',
      'ukraine-points'
    ];
    
    layerIds.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });
    
    if (map.getSource('ukraine-realtime')) {
      map.removeSource('ukraine-realtime');
    }
    
    console.log('[Ukraine API] Layers removed successfully');
  }

  /**
   * Start auto-refresh of Ukraine data
   */
  static startAutoRefresh(map: unknown): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = setInterval(async () => {
      try {
        const data = await this.fetchLatestFrontlineData();
        this.addUkraineLayers(map, data);
      } catch (error) {
        console.error('[Ukraine API] Auto-refresh failed:', error);
      }
    }, this.REFRESH_INTERVAL);
    
    console.log('[Ukraine API] Auto-refresh started (5 minute intervals)');
  }

  /**
   * Stop auto-refresh
   */
  static stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[Ukraine API] Auto-refresh stopped');
    }
  }

  /**
   * Get the last update timestamp
   */
  static getLastUpdate(): string | null {
    return this.lastUpdate;
  }

  /**
   * Create a status indicator for Ukraine data
   */
  static createStatusIndicator(): HTMLDivElement {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(255,255,255,0.95);
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      max-width: 350px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif;
    `;
    
    const updateStatus = () => {
      const lastUpdate = this.getLastUpdate();
      indicator.innerHTML = `
        <strong>✅ Real-time Ukraine data</strong><br>
        <strong>Source:</strong> <a href="https://deepstatemap.live" target="_blank" style="color: #0066cc;">DeepStateMap</a><br>
        <strong>Last update:</strong> ${lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Not available'}<br>
        <small>🔴 Red: Russian-controlled territories | 🔵 Blue: Points of interest | ⚫ Lines: Battle fronts</small>
      `;
    };
    
    updateStatus();
    setInterval(updateStatus, 30000); // Update every 30 seconds
    
    return indicator;
  }

  /**
   * Enhanced Ukraine data loading with error handling and user feedback
   */
  static async loadUkraineDataWithFeedback(map: unknown): Promise<void> {
    try {
      // Show loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,123,255,0.9); color: white; padding: 10px; border-radius: 5px; font-size: 12px;">
          🔄 Loading Ukraine data...
        </div>
      `;
      document.body.appendChild(loadingDiv);
      
      const data = await this.fetchLatestFrontlineData();
      this.addUkraineLayers(map, data);
      
      // Remove loading indicator
      if (loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }
      
      // Start auto-refresh (no status indicator since it's now in the Overview)
      this.startAutoRefresh(map);
      
    } catch (error) {
      console.error('[Ukraine API] Failed to load data:', error);
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <div style="position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.9); color: white; padding: 10px; border-radius: 5px; font-size: 12px; max-width: 300px;">
          ❌ Error: Could not load Ukraine data.<br>
          <small>${error instanceof Error ? error.message : 'Unknown error'}</small>
        </div>
      `;
      document.body.appendChild(errorDiv);
      
      // Remove error after 10 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 10000);
    }
  }
} 