// Devuelve los códigos ISO de los países involucrados en un conflicto dado su ID
export function getInvolvedISO(conflictId: string, conflicts: any[]): string[] {
  const conflict = conflicts.find((c) => c.id === conflictId);
  return conflict?.involvedISO || [];
}

export function getAlliesByFaction(conflictId: string, conflicts: any[]): { [faction: string]: { isoCodes: string[]; color: string } } {
  const conflict = conflicts.find((c) => c.id === conflictId);
  return conflict?.alliesByFaction || {};
} 