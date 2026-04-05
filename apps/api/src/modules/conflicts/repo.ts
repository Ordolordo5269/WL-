import { prisma } from '../../db/client';
import type { ConflictStatus } from '@prisma/client';

// ── Conflicts ──────────────────────────────────────────

export async function findAllConflicts(status?: ConflictStatus) {
  return prisma.conflict.findMany({
    where: status ? { status } : undefined,
    include: {
      factions: { include: { faction: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function findConflictById(id: string) {
  return prisma.conflict.findUnique({
    where: { id },
    include: {
      factions: { include: { faction: true } },
      supportLinks: { include: { from: true, to: true } },
    },
  });
}

export async function findFactionsByConflict(conflictId: string) {
  return prisma.conflictFaction.findMany({
    where: { conflictId },
    include: { faction: true },
  });
}

export async function findSupportLinksByConflict(conflictId: string) {
  return prisma.supportLink.findMany({
    where: { conflictId },
    include: { from: true, to: true },
  });
}

// ── Factions ───────────────────────────────────────────

export async function findAllFactions() {
  return prisma.faction.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function findConflictsByFaction(factionId: string) {
  return prisma.conflictFaction.findMany({
    where: { factionId },
    include: { conflict: true },
  });
}

export async function findFactionProfile(factionId: string) {
  const [faction, belligerentIn, supportsFrom, supportsTo] = await Promise.all([
    prisma.faction.findUnique({ where: { id: factionId } }),
    prisma.conflictFaction.findMany({
      where: { factionId },
      include: {
        conflict: {
          include: { factions: { include: { faction: true } } },
        },
      },
    }),
    prisma.supportLink.findMany({
      where: { fromId: factionId },
      include: { conflict: true, to: true },
    }),
    prisma.supportLink.findMany({
      where: { toId: factionId },
      include: { conflict: true, from: true },
    }),
  ]);
  return { faction, belligerentIn, supportsFrom, supportsTo };
}
