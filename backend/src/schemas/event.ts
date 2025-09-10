import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

// Event type mapping supported by WorldLore
export const EventTypeSchema = z.enum(['protest', 'riot', 'conflict', 'battle']);
export type EventType = z.infer<typeof EventTypeSchema>;

// Event property schema (non-GeoJSON)
export const EventPropsSchema = z.object({
  id: z.string().regex(/^Q\d+$/),
  title: z.string().min(1),
  type: EventTypeSchema,
  country: z.string().nullable(),
  source: z.literal('wikidata'),
  time: z.string().datetime({ offset: true }).optional(),
  range: z
    .object({ start: z.string().datetime({ offset: true }).optional(), end: z.string().datetime({ offset: true }).optional() })
    .optional(),
  wp_en: z.string().url().nullable().optional()
});
export type EventProps = z.infer<typeof EventPropsSchema>;

// GeoJSON schemas (minimal Feature/FeatureCollection for Points)
export const PointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
});

export const EventFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.string().optional(),
  geometry: PointGeometrySchema,
  properties: EventPropsSchema
});
export type EventFeature = z.infer<typeof EventFeatureSchema>;

export const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(EventFeatureSchema)
});
export type EventFeatureCollection = z.infer<typeof FeatureCollectionSchema>;

// Query param schema for /api/events/wikidata
export const QueryParamsSchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  types: z
    .string()
    .transform((v: unknown) => (typeof v === 'string' && v ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : []))
    .optional()
    .default([])
    .pipe(z.array(EventTypeSchema).optional().default([])),
  bbox: z
    .string()
    .optional()
    .transform((v: unknown) => {
      if (!v) return undefined;
      const parts = (typeof v === 'string' ? v : String(v)).split(',').map((n: string) => Number(n));
      if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return undefined;
      const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
      if (
        minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180 ||
        minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90
      )
        return undefined;
      return { minLon, minLat, maxLon, maxLat } as const;
    })
});
export type EventsQueryParams = z.infer<typeof QueryParamsSchema>;

// Helpers
export function isWithinBbox(coord: [number, number], bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number }) {
  if (!bbox) return true;
  const [lon, lat] = coord;
  return lon >= bbox.minLon && lon <= bbox.maxLon && lat >= bbox.minLat && lat <= bbox.maxLat;
}

