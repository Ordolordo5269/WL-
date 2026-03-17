import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { conflictApi } from './api';
import type { ConflictFeature, ConflictSummary } from './types';

export function useConflicts() {
  const [enabled, setEnabled] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ConflictFeature | null>(null);

  const query = useQuery({
    queryKey: ['conflicts', enabled],
    queryFn: () => conflictApi.getEvents(),
    enabled,
    refetchInterval: 10 * 60 * 1000,
    staleTime: 0,
    retry: 2,
  });

  const handleToggle = useCallback((on: boolean) => {
    setEnabled(on);
    if (!on) {
      setSelectedCountry(null);
      setSelectedEvent(null);
    }
  }, []);

  const handleSelectCountry = useCallback(
    (country: string | null) => {
      setSelectedCountry(country);
      setSelectedEvent(null);
    },
    [],
  );

  const handleSelectEvent = useCallback((event: ConflictFeature | null) => {
    setSelectedEvent(event);
  }, []);

  // Events filtered by selected country
  const countryEvents: ConflictFeature[] =
    selectedCountry && query.data
      ? query.data.features.filter(
          (f) => f.properties.country === selectedCountry,
        )
      : [];

  // Summary sorted by fatalities
  const summaries: ConflictSummary[] = query.data?.summary ?? [];

  return {
    enabled,
    handleToggle,
    data: query.data,
    isLoading: query.isLoading || query.isFetching || (enabled && !query.data),
    summaries,
    selectedCountry,
    handleSelectCountry,
    countryEvents,
    selectedEvent,
    handleSelectEvent,
  };
}
