import { prisma } from '../../db/client';
import type { Prisma } from '@prisma/client';
import type { ConflictFilters } from './types.js';

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
