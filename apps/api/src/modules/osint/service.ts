import * as repo from './repo.js';
import type { OsintEventFilters, OsintAlertFilters } from './types.js';

export async function listEvents(filters: OsintEventFilters) {
  return repo.findEvents(filters);
}

export async function getEvent(id: string) {
  return repo.findEventById(id);
}

export async function listAlerts(filters: OsintAlertFilters) {
  return repo.findAlerts(filters);
}

export async function getSourcesHealth() {
  return repo.getSourcesHealth();
}
