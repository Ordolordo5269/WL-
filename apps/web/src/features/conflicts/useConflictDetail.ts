import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import type { ConflictDetail } from './types';

interface ConflictDetailResponse {
  data: ConflictDetail;
}

export function useConflictDetail(slug: string | undefined) {
  return useQuery({
    queryKey: ['conflict', slug],
    queryFn: () =>
      http.get<ConflictDetailResponse>(`/api/conflicts/v2/${slug}`).then(r => r.data),
    enabled: !!slug,
  });
}
