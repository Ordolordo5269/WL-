// ✅ MEJORADO: Interfaces específicas para evitar tipos 'any'
export interface ConflictData {
  id: string;
  involvedISO?: string[];
  alliesByFaction?: {
    [faction: string]: {
      isoCodes: string[];
      color: string;
    };
  };
  [key: string]: unknown;
}

export interface AlliesByFaction {
  [faction: string]: {
    isoCodes: string[];
    color: string;
  };
}

// Devuelve los códigos ISO de los países involucrados en un conflicto dado su ID
export function getInvolvedISO(conflictId: string, conflicts: ConflictData[]): string[] {
  const conflict = conflicts.find((c) => c.id === conflictId);
  return conflict?.involvedISO || [];
}

export function getAlliesByFaction(conflictId: string, conflicts: ConflictData[]): AlliesByFaction {
  const conflict = conflicts.find((c) => c.id === conflictId);
  return conflict?.alliesByFaction || {};
} 