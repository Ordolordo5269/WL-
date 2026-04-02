import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { conflictApi } from './api';
import type { ConflictFeature, ConflictSummary } from './types';

export interface ConflictsResult {
  conflicts: ConflictV2[];
  count: number;
}

export function useConflicts(filters: ConflictFiltersParams = {}) {
  return useQuery({
    queryKey: ['conflicts', filters],
    queryFn: async (): Promise<ConflictsResult> => {
      const params = new URLSearchParams();
      if (filters.region) params.set('region', filters.region);
      if (filters.status) params.set('status', filters.status);
      if (filters.country) params.set('country', filters.country);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.dataSource) params.set('dataSource', filters.dataSource);
      if (filters.typeOfViolence) params.set('typeOfViolence', String(filters.typeOfViolence));

      const qs = params.toString();
      const res = await http.get<ApiResponse>(`/api/conflicts${qs ? `?${qs}` : ''}`);
      return { conflicts: res.data, count: res.count };
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
