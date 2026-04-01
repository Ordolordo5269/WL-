import { http } from '../../lib/http';

export interface RadarData {
  tileUrl: string;
  timestamp: number;
}

export const liveActivityApi = {
  getEarthquakes: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/earthquakes'),
  getFires: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/fires'),
  getRadar: () => http.get<RadarData>('/api/live-activity/radar'),
  getAirTraffic: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/air-traffic'),
  getMarineTraffic: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/marine-traffic'),
  getSatellites: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/satellites'),
  getSatelliteOrbit: (noradId: number) => http.get<GeoJSON.FeatureCollection>(`/api/live-activity/satellites/${noradId}/orbit`),
};
