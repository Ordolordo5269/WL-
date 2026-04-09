import { http } from '../../lib/http';

export const liveActivityApi = {
  getEarthquakes: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/earthquakes'),
  getFires: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/fires'),
  getAirTraffic: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/air-traffic'),
  getMarineTraffic: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/marine-traffic'),
  getActiveVolcanoes: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/active-volcanoes'),
  getTsunamis: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/tsunamis'),
  getStorms: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/storms'),
  getLightning: () => http.get<GeoJSON.FeatureCollection>('/api/live-activity/lightning'),
};
