export type OrgKey =
  | 'un' | 'who' | 'unesco' | 'unicef' | 'wfp'
  | 'nato' | 'eu' | 'asean' | 'au' | 'oas' | 'ecowas' | 'sadc' | 'mercosur'
  | 'wto' | 'efta' | 'usmca'
  | 'sco' | 'csto';
export interface OrgHighlightSpec { iso3: string[]; color: string; }

export function normalizeOrgQuery(q: string): OrgKey | null {
  const s = (q || '').toLowerCase().trim();
  if (!s) return null;
  // Spanish and English aliases
  const natoAliases = ['nato', 'otan', 'north atlantic treaty organization', 'organizacion del tratado del atlantico norte', 'organización del tratado del atlántico norte'];
  const euAliases = ['eu', 'ue', 'european union', 'union europea', 'unión europea'];
  if (natoAliases.includes(s)) return 'nato';
  if (euAliases.includes(s)) return 'eu';
  // fuzzy contains
  if (s.includes('otan') || s.includes('nato')) return 'nato';
  if (s.includes('union europea') || s.includes('unión europea') || s.includes('european union') || s === 'ue' || s === 'eu') return 'eu';
  return null;
}

export async function fetchOrgMembersIso3(org: OrgKey): Promise<string[]> {
  try {
    const base = (import.meta as any)?.env?.VITE_API_URL || (window as any)?.VITE_API_URL || 'http://localhost:3001';
    const url = `${String(base).replace(/\/$/, '')}/api/organizations/${encodeURIComponent(org)}/members`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as { members?: Array<{ iso3: string }>; };
    const arr = Array.isArray(data.members) ? data.members : [];
    return arr.map(m => (m.iso3 || '').toUpperCase()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function buildOrgHighlight(org: OrgKey): Promise<OrgHighlightSpec> {
  const iso3 = await fetchOrgMembersIso3(org);
  // Prefer color from orgs-config; fallback generic
  try {
    const { ORGANIZATIONS } = await import('../services/orgs-config');
    const meta = ORGANIZATIONS.find(o => o.key === org);
    return { iso3, color: meta?.color || '#22c55e' };
  } catch {
    return { iso3, color: '#22c55e' };
  }
}


