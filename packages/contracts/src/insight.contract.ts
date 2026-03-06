import { z } from "zod";

// --- Schemas ---

export const insightRequestSchema = z.object({
  entityType: z.enum(["conflict", "country"]),
  entityId: z.string().uuid(),
  question: z.string().optional(),
});

export const insightEvidenceSchema = z.object({
  source: z.string(),
  text: z.string(),
  relevance: z.number().min(0).max(1),
});

export const insightResponseSchema = z.object({
  summary: z.string(),
  evidence: z.array(insightEvidenceSchema),
  generatedAt: z.string(),
});

// --- Types ---

export type InsightRequest = z.infer<typeof insightRequestSchema>;
export type InsightEvidence = z.infer<typeof insightEvidenceSchema>;
export type InsightResponse = z.infer<typeof insightResponseSchema>;
