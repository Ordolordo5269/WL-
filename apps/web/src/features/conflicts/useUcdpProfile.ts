import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import type { UcdpCandidateProfile } from './types';

export function useUcdpProfile(slug: string | undefined) {
  return useQuery<UcdpCandidateProfile>({
    queryKey: ['ucdp-profile', slug],
    queryFn: () =>
      http.get<UcdpCandidateProfile>(`/api/conflicts/${slug}/ucdp-profile`),
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,  // 1h — backend cache is 1h
    retry: false,               // 404 = no 2026 data, don't retry
  });
}
