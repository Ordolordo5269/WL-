import type {
  Conflict,
  Faction,
  ConflictFaction,
  SupportLink,
  ConflictStatus,
  ConflictType,
  FactionType,
  SupportType,
} from '@prisma/client';

// Re-export Prisma types for convenience
export type { Conflict, Faction, ConflictFaction, SupportLink };
export type { ConflictStatus, ConflictType, FactionType, SupportType };

/** Conflict with nested factions */
export interface ConflictWithFactions extends Conflict {
  factions: (ConflictFaction & { faction: Faction })[];
}

/** Conflict detail — factions + support links */
export interface ConflictDetail extends Conflict {
  factions: (ConflictFaction & { faction: Faction })[];
  supportLinks: (SupportLink & { from: Faction; to: Faction })[];
}

/** Faction with all its conflict appearances */
export interface FactionWithConflicts extends Faction {
  conflicts: (ConflictFaction & { conflict: Conflict })[];
}
