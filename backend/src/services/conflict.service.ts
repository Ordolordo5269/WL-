import { prisma } from '../db/client';
import { ConflictStatus } from '@prisma/client';

export interface ConflictFilters {
  region?: string;
  status?: ConflictStatus;
  country?: string;
  conflictType?: string;
  search?: string;
  // Date filters
  startDateFrom?: Date | string;
  startDateTo?: Date | string;
  escalationDateFrom?: Date | string;
  escalationDateTo?: Date | string;
  activeOnly?: boolean; // Conflicts without endDate
  // Casualty filters
  casualtiesMin?: number;
  casualtiesMax?: number;
  // Sorting
  sortBy?: 'startDate' | 'name' | 'casualties' | 'status';
  sortOrder?: 'asc' | 'desc';
  // Pagination
  page?: number;
  limit?: number;
}

export interface CreateConflictData {
  slug: string;
  name: string;
  country: string;
  region: string;
  conflictType: string;
  description: string;
  status: ConflictStatus;
  startDate: Date;
  escalationDate?: Date;
  endDate?: Date;
  coordinates: { lat: number; lng: number };
  involvedISO: string[];
  sources?: string[];
}

/**
 * Calculate total casualties for a conflict
 */
async function getTotalCasualties(conflictId: string): Promise<number> {
  const result = await prisma.conflictCasualty.aggregate({
    where: { conflictId },
    _sum: { total: true }
  });
  return result._sum.total || 0;
}

/**
 * Get all conflicts with optional filters, sorting, and pagination
 */
export async function getAllConflicts(filters?: ConflictFilters) {
  const where: any = {};

  // Basic filters
  if (filters?.region) {
    where.region = filters.region;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.country) {
    where.country = { contains: filters.country, mode: 'insensitive' };
  }

  if (filters?.conflictType) {
    where.conflictType = { contains: filters.conflictType, mode: 'insensitive' };
  }

  // Date filters
  if (filters?.startDateFrom || filters?.startDateTo) {
    where.startDate = {};
    if (filters.startDateFrom) {
      where.startDate.gte = new Date(filters.startDateFrom);
    }
    if (filters.startDateTo) {
      where.startDate.lte = new Date(filters.startDateTo);
    }
  }

  if (filters?.escalationDateFrom || filters?.escalationDateTo) {
    where.escalationDate = {};
    if (filters.escalationDateFrom) {
      where.escalationDate.gte = new Date(filters.escalationDateFrom);
    }
    if (filters.escalationDateTo) {
      where.escalationDate.lte = new Date(filters.escalationDateTo);
    }
  }

  // Active conflicts only (no endDate)
  if (filters?.activeOnly) {
    where.endDate = null;
  }

  // Search filter
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { country: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { conflictType: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  // Sorting
  const sortBy = filters?.sortBy || 'startDate';
  const sortOrder = filters?.sortOrder || 'desc';
  const orderBy: any = { [sortBy]: sortOrder };

  // Pagination
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  // Get conflicts
  const [conflicts, total] = await Promise.all([
    prisma.conflict.findMany({
      where,
      include: {
        factions: {
          include: {
            support: true
          }
        },
        events: {
          orderBy: { date: 'asc' }
        },
        casualties: {
          orderBy: { date: 'desc' },
          take: 10 // Latest 10 casualties
        },
        updates: {
          orderBy: { date: 'desc' },
          take: 5 // Latest 5 updates
        },
        news: {
          orderBy: { publishedAt: 'desc' },
          take: 10 // Latest 10 news
        }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.conflict.count({ where })
  ]);

  // Filter by casualties if needed (post-query filtering since we need to calculate totals)
  let filteredConflicts = conflicts;
  if (filters?.casualtiesMin !== undefined || filters?.casualtiesMax !== undefined) {
    const conflictsWithCasualties = await Promise.all(
      conflicts.map(async (conflict) => {
        const totalCasualties = await getTotalCasualties(conflict.id);
        return { conflict, totalCasualties };
      })
    );

    filteredConflicts = conflictsWithCasualties
      .filter(({ totalCasualties }) => {
        if (filters.casualtiesMin !== undefined && totalCasualties < filters.casualtiesMin) {
          return false;
        }
        if (filters.casualtiesMax !== undefined && totalCasualties > filters.casualtiesMax) {
          return false;
        }
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

/**
 * Get conflict by ID
 */
export async function getConflictById(id: string) {
  return await prisma.conflict.findUnique({
    where: { id },
    include: {
      factions: {
        include: {
          support: true
        }
      },
      events: {
        orderBy: { date: 'asc' }
      },
      casualties: {
        orderBy: { date: 'desc' }
      },
      updates: {
        orderBy: { date: 'desc' }
      },
      news: {
        orderBy: { publishedAt: 'desc' }
      }
    }
  });
}

/**
 * Get conflict by slug
 */
export async function getConflictBySlug(slug: string) {
  return await prisma.conflict.findUnique({
    where: { slug },
    include: {
      factions: {
        include: {
          support: true
        }
      },
      events: {
        orderBy: { date: 'asc' }
      },
      casualties: {
        orderBy: { date: 'desc' }
      },
      updates: {
        orderBy: { date: 'desc' }
      },
      news: {
        orderBy: { publishedAt: 'desc' }
      }
    }
  });
}

/**
 * Create a new conflict
 */
export async function createConflict(data: CreateConflictData) {
  return await prisma.conflict.create({
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

/**
 * Update conflict
 */
export async function updateConflict(id: string, data: Partial<CreateConflictData>) {
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

  return await prisma.conflict.update({
    where: { id },
    data: updateData,
    include: {
      factions: {
        include: {
          support: true
        }
      },
      events: true,
      casualties: true,
      updates: true,
      news: true
    }
  });
}

/**
 * Delete conflict
 */
export async function deleteConflict(id: string) {
  return await prisma.conflict.delete({
    where: { id }
  });
}

/**
 * Get conflict statistics
 */
export async function getConflictStatistics() {
  const [total, byStatus, byRegion] = await Promise.all([
    prisma.conflict.count(),
    prisma.conflict.groupBy({
      by: ['status'],
      _count: true
    }),
    prisma.conflict.groupBy({
      by: ['region'],
      _count: true
    })
  ]);

  const statusCounts = byStatus.reduce((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, {} as Record<ConflictStatus, number>);

  const regionCounts = byRegion.map(item => ({
    region: item.region,
    count: item._count
  }));

  return {
    total,
    byStatus: statusCounts,
    byRegion: regionCounts
  };
}

/**
 * Search conflicts
 */
export async function searchConflicts(query: string, limit: number = 20) {
  return await prisma.conflict.findMany({
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

