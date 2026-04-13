import { useQuery } from '@tanstack/react-query';
import { liveActivityApi } from './api';

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

export function useActiveVolcanoesData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'active-volcanoes'],
    queryFn: liveActivityApi.getActiveVolcanoes,
    enabled,
    refetchInterval: 10 * 60 * 1000, // 10 min
    staleTime: 9 * 60 * 1000,
  });
}

export function useTsunamisData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'tsunamis'],
    queryFn: liveActivityApi.getTsunamis,
    enabled,
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 4 * 60 * 1000,
  });
}

export function useStormsData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'storms'],
    queryFn: liveActivityApi.getStorms,
    enabled,
    refetchInterval: 10 * 60 * 1000, // 10 min
    staleTime: 9 * 60 * 1000,
  });
}

export function useLightningData(enabled: boolean) {
  return useQuery({
    queryKey: ['live-activity', 'lightning'],
    queryFn: liveActivityApi.getLightning,
    enabled,
    refetchInterval: 10 * 1000, // 10 sec — lightning is very dynamic
    staleTime: 8 * 1000,
  });
}
