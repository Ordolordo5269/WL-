import { http } from '../../lib/http';
import type { Conflict, ConflictFaction, SupportLink, Faction, FactionProfile } from './types';

export function fetchConflicts(status?: string) {
  const query = status ? `?status=${status}` : '';
  return http.get<Conflict[]>(`/api/conflicts${query}`);
}

export function fetchConflict(id: string) {
  return http.get<Conflict>(`/api/conflicts/${id}`);
}

export function fetchConflictFactions(conflictId: string) {
  return http.get<ConflictFaction[]>(`/api/conflicts/${conflictId}/factions`);
}

export function fetchConflictSupportLinks(conflictId: string) {
  return http.get<SupportLink[]>(`/api/conflicts/${conflictId}/support-links`);
}

export function fetchFactions() {
  return http.get<Faction[]>(`/api/conflicts/factions/all`);
}

export function fetchFactionConflicts(factionId: string) {
  return http.get<{ conflict: Conflict }[]>(`/api/conflicts/factions/${factionId}/conflicts`);
}

export function fetchFactionProfile(factionId: string) {
  return http.get<FactionProfile>(`/api/conflicts/factions/${factionId}/profile`);
}
