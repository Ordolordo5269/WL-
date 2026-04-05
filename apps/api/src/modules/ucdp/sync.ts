import { logger } from '../../config/logger.js';

export interface SyncResult {
  versionsProcessed: string[];
  eventsIngested: number;
  conflictsCreated: number;
  conflictsUpdated: number;
  errors: string[];
}

/**
 * UCDP sync — disabled after migration to manual Conflict Tracker.
 * Kept as stub for future re-integration.
 */
export async function syncUcdpData(): Promise<SyncResult> {
  logger.warn('UCDP sync is disabled — conflict data is now managed manually');
  return { versionsProcessed: [], eventsIngested: 0, conflictsCreated: 0, conflictsUpdated: 0, errors: [] };
}

export async function getSyncStatus() {
  return { lastSyncedAt: null, totalConflicts: 0, totalEvents: 0 };
}
