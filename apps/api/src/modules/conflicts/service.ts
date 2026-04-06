import * as repo from './repo';
import type { ConflictStatus } from '@prisma/client';

export async function listConflicts(status?: ConflictStatus) {
  return repo.findAllConflicts(status);
}

export async function getConflict(id: string) {
  return repo.findConflictById(id);
}

export async function getConflictFactions(conflictId: string) {
  return repo.findFactionsByConflict(conflictId);
}

export async function getConflictSupportLinks(conflictId: string) {
  return repo.findSupportLinksByConflict(conflictId);
}

export async function listFactions() {
  return repo.findAllFactions();
}

export async function getFactionConflicts(factionId: string) {
  return repo.findConflictsByFaction(factionId);
}

export async function getFactionProfile(factionId: string) {
  return repo.findFactionProfile(factionId);
}
