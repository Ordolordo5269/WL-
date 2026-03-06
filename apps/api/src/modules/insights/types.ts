import { z } from 'zod';
import type { insightRequestSchema } from './schemas.js';

export type InsightRequest = z.infer<typeof insightRequestSchema>;

export interface InsightEvidence {
  source: string;
  text: string;
  relevance: number;
}

export interface InsightResponse {
  summary: string;
  evidence: InsightEvidence[];
  generatedAt: string;
}

export interface LLMAdapter {
  generate(context: LLMContext): Promise<InsightResponse>;
}

export interface LLMContext {
  entityType: 'conflict' | 'country';
  entityName: string;
  entityData: Record<string, unknown>;
  recentEvents: Array<{ title: string; date: string; description?: string }>;
  indicators: Array<{ name: string; value: number | null; year: number }>;
  question?: string;
}
