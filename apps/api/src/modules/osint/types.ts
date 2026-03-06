import { z } from 'zod';
import type {
  osintEventFiltersSchema,
  osintAlertFiltersSchema,
  osintEventParamsSchema,
} from './schemas.js';

export type OsintEventFilters = z.infer<typeof osintEventFiltersSchema>;
export type OsintAlertFilters = z.infer<typeof osintAlertFiltersSchema>;
export type OsintEventParams = z.infer<typeof osintEventParamsSchema>;

/** Maps the 12 OSINT categories to their macro-layer */
export const CATEGORY_TO_MACRO_LAYER: Record<string, string> = {
  COUP_REGIME_CHANGE: 'CONFLICT_SECURITY',
  MILITARY_MOVEMENT: 'CONFLICT_SECURITY',
  TERRORISM: 'CONFLICT_SECURITY',
  BORDER_INCIDENT: 'CONFLICT_SECURITY',
  ELECTION: 'GOVERNANCE_DIPLOMACY',
  TREATY: 'GOVERNANCE_DIPLOMACY',
  OFFICIAL_DECLARATION: 'GOVERNANCE_DIPLOMACY',
  SANCTIONS: 'ECONOMIC_COERCION',
  EMBARGO: 'ECONOMIC_COERCION',
  NATURAL_DISASTER: 'HUMANITARIAN_DISASTER',
  HUMANITARIAN_CRISIS: 'HUMANITARIAN_DISASTER',
  CYBER_ATTACK: 'CYBER_INFO',
};
