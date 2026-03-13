import { useQuery } from '@tanstack/react-query';
import { liveActivityApi } from './api';
import type { RadarData } from './api';

export function useEarthquakesData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'earthquakes'],
    queryFn: liveActivityApi.getEarthquakes,
    enabled,
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 4 * 60 * 1000,
  });
}

export function useFiresData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'fires'],
    queryFn: liveActivityApi.getFires,
    enabled,
    refetchInterval: 15 * 60 * 1000, // 15 min
    staleTime: 14 * 60 * 1000,
  });
}

export function useRadarData(enabled: boolean) {
  return useQuery<RadarData>({
    queryKey: ['live-activity', 'radar'],
    queryFn: liveActivityApi.getRadar,
    enabled,
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 4 * 60 * 1000,
  });
}

export function useAirTrafficData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'air-traffic'],
    queryFn: liveActivityApi.getAirTraffic,
    enabled,
    refetchInterval: 15 * 1000, // 15 sec
    staleTime: 10 * 1000,
  });
}

export function useMarineTrafficData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'marine-traffic'],
    queryFn: liveActivityApi.getMarineTraffic,
    enabled,
    refetchInterval: 30 * 1000, // 30 sec
    staleTime: 20 * 1000,
  });
}

export function useSatellitesData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'satellites'],
    queryFn: liveActivityApi.getSatellites,
    enabled,
    refetchInterval: 30 * 1000, // 30 sec
    staleTime: 20 * 1000,
  });
}
