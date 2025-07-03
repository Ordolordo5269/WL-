// Devuelve los países involucrados en un conflicto dado su ID
export function getCountriesInConflict(conflictId: string, conflicts: any[]): string[] {
  const conflict = conflicts.find((c) => c.id === conflictId);
  if (!conflict) return [];
  // Permitir que el campo country sea un string o array
  if (Array.isArray(conflict.country)) return conflict.country;
  if (typeof conflict.country === 'string') return [conflict.country];
  return [];
}

// Determina si un nombre de país está en la lista de países en conflicto
export function isCountryInConflict(countryName: string, countriesInConflict: string[]): boolean {
  if (!countryName || !countriesInConflict) return false;
  return countriesInConflict.some(
    (c) => c.toLowerCase().includes(countryName.toLowerCase()) || countryName.toLowerCase().includes(c.toLowerCase())
  );
} 