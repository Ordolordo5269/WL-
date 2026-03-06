import { z } from 'zod';

const osintSeverityEnum = z.enum(['CRITICAL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW']);

const osintMacroLayerEnum = z.enum([
  'CONFLICT_SECURITY',
  'GOVERNANCE_DIPLOMACY',
  'ECONOMIC_COERCION',
  'HUMANITARIAN_DISASTER',
  'CYBER_INFO',
]);

export const osintEventFiltersSchema = z.object({
  macroLayer: osintMacroLayerEnum.optional(),
  severity: z.union([osintSeverityEnum, z.array(osintSeverityEnum)]).optional(),
  countryIso3: z.string().length(3).optional(),
  region: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  bounds: z
    .object({
      north: z.coerce.number().min(-90).max(90),
      south: z.coerce.number().min(-90).max(90),
      east: z.coerce.number().min(-180).max(180),
      west: z.coerce.number().min(-180).max(180),
    })
    .optional(),
});

export const osintAlertFiltersSchema = z.object({
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  severity: osintSeverityEnum.optional(),
});

export const osintEventParamsSchema = z.object({
  id: z.string().uuid(),
});
