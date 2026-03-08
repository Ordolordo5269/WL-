import { useMutation } from '@tanstack/react-query';
import { http } from '../../lib/http';

export interface InsightEvidence {
  source: string;
  text: string;
  relevance: number;
}

export interface InsightData {
  summary: string;
  evidence: InsightEvidence[];
  generatedAt: string;
}

interface InsightRequest {
  entityType: 'conflict' | 'country';
  entityId: string;
  question?: string;
}

interface InsightResponse {
  data: InsightData;
}

export function useGenerateInsight() {
  return useMutation({
    mutationFn: (body: InsightRequest) =>
      http.post<InsightResponse>('/api/insights', body).then(r => r.data),
  });
}
