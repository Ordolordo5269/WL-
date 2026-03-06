import { prisma } from '../../db/client.js';
import type { OsintEventFilters, OsintAlertFilters } from './types.js';
import type { Prisma } from '@prisma/client';

const MAX_EVENTS = 200;

export async function findEvents(filters: OsintEventFilters) {
  const where: Prisma.OsintEventWhereInput = {};

  if (filters.macroLayer) {
    where.macroLayer = filters.macroLayer;
  }

  if (filters.severity) {
    where.severity = Array.isArray(filters.severity)
      ? { in: filters.severity }
      : filters.severity;
  }

  if (filters.countryIso3) {
    where.countryIso3 = filters.countryIso3;
  }

  if (filters.region) {
    where.region = { contains: filters.region, mode: 'insensitive' };
  }

  if (filters.from || filters.to) {
    where.eventDate = {};
    if (filters.from) where.eventDate.gte = new Date(filters.from);
    if (filters.to) where.eventDate.lte = new Date(filters.to);
  }

  if (filters.bounds) {
    const { north, south, east, west } = filters.bounds;
    where.lat = { gte: south, lte: north };
    where.lng = { gte: west, lte: east };
  }

  return prisma.osintEvent.findMany({
    where,
    orderBy: { eventDate: 'desc' },
    take: MAX_EVENTS,
  });
}

export async function findEventById(id: string) {
  return prisma.osintEvent.findUnique({
    where: { id },
    include: { alerts: true },
  });
}

export async function findAlerts(filters: OsintAlertFilters) {
  const where: Prisma.OsintAlertWhereInput = {};

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.severity) {
    where.severity = filters.severity;
  }

  return prisma.osintAlert.findMany({
    where,
    include: { event: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSourcesHealth() {
  return prisma.osintSource.findMany();
}
