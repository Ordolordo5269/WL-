export interface Faction {
  id: string;
  name: string;
  type: 'STATE' | 'MILITIA' | 'REBEL' | 'TERRORIST' | 'OTHER';
  countryIso: string | null;
  flagUrl: string | null;
}

export interface ConflictFaction {
  conflictId: string;
  factionId: string;
  side: string;
  casualties: number | null;
  faction: Faction;
}

export interface SupportLink {
  id: number;
  conflictId: string;
  fromId: string;
  toId: string;
  type: 'MILITARY' | 'DIPLOMATIC' | 'ECONOMIC';
  intensity: number | null;
  description: string | null;
  sourceUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
  from: Faction;
  to: Faction;
}

export interface Conflict {
  id: string;
  name: string;
  countryIso: string;
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'FROZEN' | 'ENDED';
  type: 'INTERSTATE' | 'CIVIL_WAR' | 'INSURGENCY' | 'TERRITORIAL' | 'ETHNIC' | 'OTHER';
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  casualtiesEstimate: number | null;
  factions?: ConflictFaction[];
  supportLinks?: SupportLink[];
}

/** Faction profile — aggregated from all conflicts */
export interface FactionProfile {
  faction: Faction;
  belligerentIn: Array<{
    conflictId: string;
    factionId: string;
    side: string;
    casualties: number | null;
    conflict: Conflict & { factions?: ConflictFaction[] };
  }>;
  supportsFrom: Array<SupportLink & { conflict: Conflict }>;
  supportsTo: Array<SupportLink & { conflict: Conflict }>;
}

/** The UI states for the conflict tracker */
export type ConflictViewState = 'global' | 'conflict' | 'relationship' | 'faction';
