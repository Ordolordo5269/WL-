import { prisma } from '../../db/client';
import type { Prisma } from '@prisma/client';
import type { ConflictListFilters, EventFilters, TimelineParams } from './types.js';

// ── AcledConflict queries ──

export async function findManyConflicts(filters: ConflictListFilters) {
  const where: Prisma.AcledConflictWhereInput = {};

  if (filters.region) where.region = { contains: filters.region, mode: 'insensitive' };
  if (filters.status) where.status = filters.status;
  if (filters.country) where.country = { contains: filters.country, mode: 'insensitive' };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { country: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.acledConflict.findMany({
      where,
      orderBy: { totalFatalities: 'desc' },
      skip,
      take: limit,
    }),
    prisma.acledConflict.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function findConflictBySlug(slug: string) {
  return prisma.acledConflict.findUnique({
    where: { slug },
  });
}

export async function findConflictById(id: string) {
  return prisma.acledConflict.findUnique({ where: { id } });
}

// ── AcledEvent queries ──

export async function findEventsByConflict(conflictId: string, filters: EventFilters) {
  const where: Prisma.AcledEventWhereInput = { conflictId };

  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.subEventType) where.subEventType = filters.subEventType;
  if (filters.actor) {
    where.OR = [
      { actor1: { contains: filters.actor, mode: 'insensitive' } },
      { actor2: { contains: filters.actor, mode: 'insensitive' } },
    ];
  }
  if (filters.minFatalities) where.fatalities = { gte: filters.minFatalities };
  if (filters.timePrecision) where.timePrecision = filters.timePrecision;

  if (filters.dateFrom || filters.dateTo) {
    where.eventDate = {};
    if (filters.dateFrom) where.eventDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.eventDate.lte = new Date(filters.dateTo);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.acledEvent.findMany({
      where,
      orderBy: { eventDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.acledEvent.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function findRecentEvents(conflictId: string, take: number = 20) {
  return prisma.acledEvent.findMany({
    where: { conflictId },
    orderBy: { eventDate: 'desc' },
    take,
  });
}

export async function getEventHeatmap(conflictId: string) {
  return prisma.acledEvent.findMany({
    where: { conflictId },
    select: {
      latitude: true,
      longitude: true,
      fatalities: true,
      eventType: true,
      eventDate: true,
    },
  });
}

// ── Timeline aggregation ──

export async function getTimeline(conflictId: string, params: TimelineParams) {
  const where: Prisma.AcledEventWhereInput = { conflictId };

  if (params.eventType) where.eventType = params.eventType;
  if (params.dateFrom || params.dateTo) {
    where.eventDate = {};
    if (params.dateFrom) where.eventDate.gte = new Date(params.dateFrom);
    if (params.dateTo) where.eventDate.lte = new Date(params.dateTo);
  }

  const granularity = params.granularity ?? 'month';

  // Use raw SQL for date_trunc aggregation
  const truncExpr =
    granularity === 'day' ? `date_trunc('day', "eventDate")`
    : granularity === 'week' ? `date_trunc('week', "eventDate")`
    : granularity === 'year' ? `date_trunc('year', "eventDate")`
    : `date_trunc('month', "eventDate")`;

  const dateConditions: string[] = [`"conflictId" = '${conflictId}'`];
  if (params.eventType) dateConditions.push(`"eventType" = '${params.eventType}'`);
  if (params.dateFrom) dateConditions.push(`"eventDate" >= '${params.dateFrom}'`);
  if (params.dateTo) dateConditions.push(`"eventDate" <= '${params.dateTo}'`);

  const whereClause = dateConditions.join(' AND ');

  const result = await prisma.$queryRawUnsafe<
    Array<{ period: Date; events: bigint; fatalities: bigint }>
  >(
    `SELECT ${truncExpr} as period, COUNT(*)::bigint as events, COALESCE(SUM(fatalities), 0)::bigint as fatalities
     FROM "AcledEvent"
     WHERE ${whereClause}
     GROUP BY period
     ORDER BY period ASC`
  );

  return result.map((r) => ({
    period: r.period.toISOString().split('T')[0],
    events: Number(r.events),
    fatalities: Number(r.fatalities),
  }));
}

// ── Stats ──

export async function getGlobalStats() {
  const [totalConflicts, totalEvents, totalFatalities, byStatus, byRegion, byEventType] =
    await Promise.all([
      prisma.acledConflict.count(),
      prisma.acledEvent.count(),
      prisma.acledEvent.aggregate({ _sum: { fatalities: true } }),
      prisma.acledConflict.groupBy({ by: ['status'], _count: true }),
      prisma.acledConflict.groupBy({ by: ['region'], _count: true }),
      prisma.acledEvent.groupBy({ by: ['eventType'], _count: true, _sum: { fatalities: true } }),
    ]);

  return {
    totalConflicts,
    totalEvents,
    totalFatalities: totalFatalities._sum.fatalities ?? 0,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    byRegion: byRegion.map((r) => ({ region: r.region, count: r._count })),
    byEventType: byEventType.map((e) => ({
      eventType: e.eventType,
      count: e._count,
      fatalities: e._sum.fatalities ?? 0,
    })),
  };
}

export async function searchConflicts(query: string, limit: number = 20) {
  return prisma.acledConflict.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { country: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { totalFatalities: 'desc' },
  });
}

// ── Sync helpers ──

export async function upsertEvent(data: Prisma.AcledEventCreateInput) {
  return prisma.acledEvent.upsert({
    where: { eventIdCnty: data.eventIdCnty },
    update: { ...data, syncedAt: new Date() },
    create: data,
  });
}

export async function upsertManyEvents(
  events: Array<Omit<Prisma.AcledEventUncheckedCreateInput, 'id'>>
) {
  // Batch upsert using transaction
  const BATCH_SIZE = 500;
  let upserted = 0;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((e) =>
        prisma.acledEvent.upsert({
          where: { eventIdCnty: e.eventIdCnty },
          update: { ...e, syncedAt: new Date() },
          create: e,
        })
      )
    );
    upserted += batch.length;
  }

  return upserted;
}

export async function refreshConflictAggregates(conflictId: string) {
  const agg = await prisma.acledEvent.aggregate({
    where: { conflictId },
    _count: true,
    _sum: { fatalities: true },
    _max: { eventDate: true },
  });

  return prisma.acledConflict.update({
    where: { id: conflictId },
    data: {
      totalEvents: agg._count,
      totalFatalities: agg._sum.fatalities ?? 0,
      lastEventDate: agg._max.eventDate,
    },
  });
}

export async function findAllConflictsForSync() {
  return prisma.acledConflict.findMany({
    select: {
      id: true,
      slug: true,
      filterCountry: true,
      filterIso: true,
      filterActors: true,
      filterDateFrom: true,
      filterDateTo: true,
    },
  });
}
