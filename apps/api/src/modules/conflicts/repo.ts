import { prisma } from '../../db/client';
import type { Prisma } from '@prisma/client';
import type { ConflictFilters, LegacyConflictFilters, CreateConflictData } from './types.js';

// ── V2 queries (list + detail with OSINT enrichment) ──

export async function findMany(filters: ConflictFilters) {
  const where: Prisma.ConflictWhereInput = {};

  if (filters.region) {
    where.region = { contains: filters.region, mode: 'insensitive' };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.country) {
    where.country = { contains: filters.country, mode: 'insensitive' };
  }

  if (filters.from || filters.to) {
    where.startDate = {};
    if (filters.from) where.startDate.gte = new Date(filters.from);
    if (filters.to) where.startDate.lte = new Date(filters.to);
  }

  return prisma.conflict.findMany({
    where,
    include: {
      casualties: true,
      factions: { include: { support: true } },
      _count: { select: { events: true } },
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function findBySlug(slug: string) {
  return prisma.conflict.findUnique({
    where: { slug },
    include: {
      casualties: true,
      factions: { include: { support: true } },
      events: { orderBy: { date: 'desc' } },
      updates: { orderBy: { date: 'desc' } },
      news: { orderBy: { publishedAt: 'desc' }, take: 20 },
    },
  });
}

export async function findById(id: string) {
  return prisma.conflict.findUnique({
    where: { id },
    include: {
      casualties: true,
      factions: { include: { support: true } },
      events: { orderBy: { date: 'desc' } },
      updates: { orderBy: { date: 'desc' } },
      news: { orderBy: { publishedAt: 'desc' }, take: 20 },
    },
  });
}

// ── Legacy CRUD queries ──

export async function findAllWithFilters(filters: LegacyConflictFilters) {
  const where: any = {};

  if (filters.region) where.region = filters.region;
  if (filters.status) where.status = filters.status;
  if (filters.country) where.country = { contains: filters.country, mode: 'insensitive' };
  if (filters.conflictType) where.conflictType = { contains: filters.conflictType, mode: 'insensitive' };

  if (filters.startDateFrom || filters.startDateTo) {
    where.startDate = {};
    if (filters.startDateFrom) where.startDate.gte = new Date(filters.startDateFrom);
    if (filters.startDateTo) where.startDate.lte = new Date(filters.startDateTo);
  }

  if (filters.escalationDateFrom || filters.escalationDateTo) {
    where.escalationDate = {};
    if (filters.escalationDateFrom) where.escalationDate.gte = new Date(filters.escalationDateFrom);
    if (filters.escalationDateTo) where.escalationDate.lte = new Date(filters.escalationDateTo);
  }

  if (filters.activeOnly) where.endDate = null;

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { country: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { conflictType: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const sortBy = filters.sortBy || 'startDate';
  const sortOrder = filters.sortOrder || 'desc';
  const orderBy: any = { [sortBy]: sortOrder };

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const [conflicts, total] = await Promise.all([
    prisma.conflict.findMany({
      where,
      include: {
        factions: { include: { support: true } },
        events: { orderBy: { date: 'asc' } },
        casualties: { orderBy: { date: 'desc' }, take: 10 },
        updates: { orderBy: { date: 'desc' }, take: 5 },
        news: { orderBy: { publishedAt: 'desc' }, take: 10 }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.conflict.count({ where })
  ]);

  return { conflicts, total, page, limit };
}

export async function aggregateCasualties(conflictId: string): Promise<number> {
  const result = await prisma.conflictCasualty.aggregate({
    where: { conflictId },
    _sum: { total: true }
  });
  return result._sum.total || 0;
}

export async function create(data: CreateConflictData) {
  return prisma.conflict.create({
    data: {
      slug: data.slug,
      name: data.name,
      country: data.country,
      region: data.region,
      conflictType: data.conflictType,
      description: data.description,
      status: data.status,
      startDate: data.startDate,
      escalationDate: data.escalationDate,
      endDate: data.endDate,
      coordinates: data.coordinates,
      involvedISO: data.involvedISO,
      sources: data.sources || []
    },
    include: {
      factions: true,
      events: true,
      casualties: true,
      updates: true,
      news: true
    }
  });
}

export async function update(id: string, data: Partial<CreateConflictData>) {
  const updateData: any = {};

  if (data.name) updateData.name = data.name;
  if (data.country) updateData.country = data.country;
  if (data.region) updateData.region = data.region;
  if (data.conflictType) updateData.conflictType = data.conflictType;
  if (data.description) updateData.description = data.description;
  if (data.status) updateData.status = data.status;
  if (data.startDate) updateData.startDate = data.startDate;
  if (data.escalationDate !== undefined) updateData.escalationDate = data.escalationDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.coordinates) updateData.coordinates = data.coordinates;
  if (data.involvedISO) updateData.involvedISO = data.involvedISO;
  if (data.sources) updateData.sources = data.sources;

  return prisma.conflict.update({
    where: { id },
    data: updateData,
    include: {
      factions: { include: { support: true } },
      events: true,
      casualties: true,
      updates: true,
      news: true
    }
  });
}

export async function remove(id: string) {
  return prisma.conflict.delete({ where: { id } });
}

export async function getStats() {
  const [total, byStatus, byRegion] = await Promise.all([
    prisma.conflict.count(),
    prisma.conflict.groupBy({ by: ['status'], _count: true }),
    prisma.conflict.groupBy({ by: ['region'], _count: true })
  ]);

  return { total, byStatus, byRegion };
}

export async function search(query: string, limit: number = 20) {
  return prisma.conflict.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { country: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { conflictType: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: limit,
    orderBy: { startDate: 'desc' }
  });
}
