import type { ConflictDTO } from './dto'

export async function fetchConflicts(): Promise<ConflictDTO[]> {
  return []
}

export async function fetchConflictById(id: string): Promise<ConflictDTO | null> {
  void id
  return null
}
