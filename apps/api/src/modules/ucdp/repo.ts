import { prisma } from '../../db/client';
import type { Prisma } from '@prisma/client';
import type {
  UcdpEventFilters,
  UcdpConflictFilters,
  UcdpBattleDeathsFilters,
  UcdpNonStateFilters,
  UcdpOneSidedFilters,
} from './types.js';

// ============================
// GED Events
// ============================

export async function findGedEvents(filters: UcdpEventFilters) {
  const where: Prisma.UcdpGedEventWhereInput = {};

  if (filters.year) {
    where.year = filters.year;
  }

  if (filters.country) {
    where.country = { contains: filters.country, mode: 'insensitive' };
  }

  if (filters.region) {
    where.region = { contains: filters.region, mode: 'insensitive' };
  }

  if (filters.typeOfViolence) {
    where.typeOfViolence = filters.typeOfViolence;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.dateStart = {};
    if (filters.dateFrom) where.dateStart.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.dateStart.lte = new Date(filters.dateTo);
  }

  if (filters.bbox) {
    where.latitude = {
      gte: filters.bbox.south,
      lte: filters.bbox.north,
    };
    where.longitude = {
      gte: filters.bbox.west,
      lte: filters.bbox.east,
    };
  }

  return prisma.ucdpGedEvent.findMany({
    where,
    orderBy: { dateStart: 'desc' },
    take: filters.limit,
    skip: filters.offset,
  });
}

export async function findGedEventsGeoJson(filters: UcdpEventFilters) {
  const where: Prisma.UcdpGedEventWhereInput = {};

  if (filters.year) {
    where.year = filters.year;
  }

  if (filters.country) {
    where.country = { contains: filters.country, mode: 'insensitive' };
  }

  if (filters.region) {
    where.region = { contains: filters.region, mode: 'insensitive' };
  }

  if (filters.typeOfViolence) {
    where.typeOfViolence = filters.typeOfViolence;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.dateStart = {};
    if (filters.dateFrom) where.dateStart.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.dateStart.lte = new Date(filters.dateTo);
  }

  if (filters.bbox) {
    where.latitude = {
      gte: filters.bbox.south,
      lte: filters.bbox.north,
    };
    where.longitude = {
      gte: filters.bbox.west,
      lte: filters.bbox.east,
    };
  }

  return prisma.ucdpGedEvent.findMany({
    where,
    select: {
      id: true,
      latitude: true,
      longitude: true,
      bestEstimate: true,
      typeOfViolence: true,
      conflictName: true,
      sideA: true,
      sideB: true,
      dateStart: true,
      country: true,
      deathsCivilians: true,
      deathsA: true,
      deathsB: true,
    },
    orderBy: { dateStart: 'desc' },
    take: filters.limit,
    skip: filters.offset,
  });
}

export async function getGedEventById(id: number) {
  return prisma.ucdpGedEvent.findUnique({
    where: { id },
  });
}

// ============================
// Conflicts
// ============================

export async function findConflicts(filters: UcdpConflictFilters) {
  const where: Prisma.UcdpConflictWhereInput = {};

  if (filters.year) {
    where.year = filters.year;
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  if (filters.intensityLevel) {
    where.intensityLevel = filters.intensityLevel;
  }

  if (filters.typeOfConflict) {
    where.typeOfConflict = filters.typeOfConflict;
  }

  if (filters.region) {
    where.region = filters.region;
  }

  return prisma.ucdpConflict.findMany({
    where,
    orderBy: { year: 'desc' },
  });
}

export async function findConflictById(ucdpConflictId: string) {
  return prisma.ucdpConflict.findFirst({
    where: { ucdpConflictId },
  });
}

export async function getActiveConflicts(year?: number) {
  const targetYear = year ?? new Date().getFullYear();

  return prisma.ucdpConflict.findMany({
    where: {
      year: targetYear,
      epEnd: false,
    },
    orderBy: { location: 'asc' },
  });
}

// ============================
// Battle Deaths
// ============================

export async function findBattleDeaths(filters: UcdpBattleDeathsFilters) {
  const where: Prisma.UcdpBattleDeathsWhereInput = {};

  if (filters.year) {
    where.year = filters.year;
  }

  if (filters.conflictId) {
    where.ucdpConflictId = filters.conflictId;
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  return prisma.ucdpBattleDeaths.findMany({
    where,
    orderBy: { year: 'desc' },
  });
}

// ============================
// Non-State
// ============================

export async function findNonState(filters: UcdpNonStateFilters) {
  const where: Prisma.UcdpNonStateWhereInput = {};

  if (filters.year) {
    where.year = filters.year;
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  return prisma.ucdpNonState.findMany({
    where,
    orderBy: { year: 'desc' },
  });
}

// ============================
// One-Sided
// ============================

export async function findOneSided(filters: UcdpOneSidedFilters) {
  const where: Prisma.UcdpOneSidedWhereInput = {};

  if (filters.year) {
    where.year = filters.year;
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  return prisma.ucdpOneSided.findMany({
    where,
    orderBy: { year: 'desc' },
  });
}

// ============================
// Stats
// ============================

export async function getEventStats() {
  const [total, byYear, byType, byRegion] = await Promise.all([
    prisma.ucdpGedEvent.count(),

    prisma.ucdpGedEvent.groupBy({
      by: ['year'],
      _count: { id: true },
      _sum: { bestEstimate: true },
      orderBy: { year: 'desc' },
    }),

    prisma.ucdpGedEvent.groupBy({
      by: ['typeOfViolence'],
      _count: { id: true },
      _sum: { bestEstimate: true },
    }),

    prisma.ucdpGedEvent.groupBy({
      by: ['region'],
      _count: { id: true },
      _sum: { bestEstimate: true },
      orderBy: { region: 'asc' },
    }),
  ]);

  return { total, byYear, byType, byRegion };
}

// ============================
// Sync Status
// ============================

export async function getSyncStatus() {
  return prisma.ucdpSyncLog.findMany({
    orderBy: { startedAt: 'desc' },
    distinct: ['dataset'],
    take: 10,
  });
}

// ============================
// Conflict Summary (aggregate)
// ============================

export async function getConflictSummary(ucdpConflictId: string) {
  const conflict = await prisma.ucdpConflict.findFirst({
    where: { ucdpConflictId },
  });

  const battleDeaths = await prisma.ucdpBattleDeaths.findMany({
    where: { ucdpConflictId },
    orderBy: { year: 'asc' },
  });

  const totalDeaths = await prisma.ucdpBattleDeaths.aggregate({
    where: { ucdpConflictId },
    _sum: {
      bdBest: true,
    },
  });

  return {
    conflict,
    battleDeaths,
    totalDeaths: totalDeaths._sum.bdBest ?? 0,
  };
}
