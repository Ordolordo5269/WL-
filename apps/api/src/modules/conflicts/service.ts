import * as repo from './repo.js';
import { prisma } from '../../db/client';
import type { ConflictFilters } from './types.js';

export async function listConflicts(filters: ConflictFilters) {
  return repo.findMany(filters);
}

export async function getConflictBySlug(slug: string) {
  const conflict = await repo.findBySlug(slug);
  if (!conflict) return null;

  // Enrich with related OSINT events (CONFLICT_SECURITY layer)
  const osintEvents = conflict.involvedISO.length > 0
    ? await prisma.osintEvent.findMany({
        where: {
          countryIso3: { in: conflict.involvedISO },
          macroLayer: 'CONFLICT_SECURITY',
        },
        orderBy: { eventDate: 'desc' },
        take: 50,
      })
    : [];

  return { ...conflict, osintEvents };
}
