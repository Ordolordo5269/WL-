import * as repo from './repo.js';
import { prisma } from '../../db/client';
import type { ConflictFilters, LegacyConflictFilters, CreateConflictData } from './types.js';
import { ConflictStatus } from '@prisma/client';

// ── V2 endpoints (list + detail with OSINT enrichment) ──

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

// ── Legacy CRUD operations ──

export async function getAllConflicts(filters: LegacyConflictFilters) {
  const { conflicts, total, page, limit } = await repo.findAllWithFilters(filters);

  // Post-query casualty filtering
  let filteredConflicts = conflicts;
  if (filters.casualtiesMin !== undefined || filters.casualtiesMax !== undefined) {
    const conflictsWithCasualties = await Promise.all(
      conflicts.map(async (conflict) => {
        const totalCasualties = await repo.aggregateCasualties(conflict.id);
        return { conflict, totalCasualties };
      })
    );

    filteredConflicts = conflictsWithCasualties
      .filter(({ totalCasualties }) => {
        if (filters.casualtiesMin !== undefined && totalCasualties < filters.casualtiesMin) return false;
        if (filters.casualtiesMax !== undefined && totalCasualties > filters.casualtiesMax) return false;
        return true;
      })
      .map(({ conflict }) => conflict);
  }

  return {
    data: filteredConflicts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  };
}

export async function getConflictById(id: string) {
  return repo.findById(id);
}

export async function createConflict(data: CreateConflictData) {
  return repo.create(data);
}

export async function updateConflict(id: string, data: Partial<CreateConflictData>) {
  return repo.update(id, data);
}

export async function deleteConflict(id: string) {
  return repo.remove(id);
}

export async function getConflictStatistics() {
  const { total, byStatus, byRegion } = await repo.getStats();

  const statusCounts = byStatus.reduce((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, {} as Record<ConflictStatus, number>);

  const regionCounts = byRegion.map(item => ({
    region: item.region,
    count: item._count
  }));

  return { total, byStatus: statusCounts, byRegion: regionCounts };
}

export async function searchConflicts(query: string, limit: number = 20) {
  return repo.search(query, limit);
}
