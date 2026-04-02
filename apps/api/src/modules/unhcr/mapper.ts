import type { UNHCRRawCorridor } from './client.js';

export interface MappedCorridor {
  originIso3: string;
  originName: string;
  destinationIso3: string;
  destinationName: string;
  year: number;
  refugees: number;
  asylumSeekers: number;
  returnedRefugees: number;
  idps: number;
  stateless: number;
  otherOfConcern: number;
  otherInNeed: number;
  hostCommunity: number;
}

/** Parse UNHCR mixed types: numbers, "0", "-" → number */
function parseNum(v: number | string): number {
  if (typeof v === 'number') return v;
  if (v === '-' || v === '' || v === null || v === undefined) return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

export function mapCorridors(raw: UNHCRRawCorridor[]): MappedCorridor[] {
  return raw
    .filter(r => r.coo_iso && r.coa_iso && r.coo_iso.length === 3 && r.coa_iso.length === 3)
    .map(r => ({
      originIso3: r.coo_iso,
      originName: r.coo_name,
      destinationIso3: r.coa_iso,
      destinationName: r.coa_name,
      year: r.year,
      refugees: parseNum(r.refugees),
      asylumSeekers: parseNum(r.asylum_seekers),
      returnedRefugees: parseNum(r.returned_refugees),
      idps: parseNum(r.idps),
      stateless: parseNum(r.stateless),
      otherOfConcern: parseNum(r.ooc),
      otherInNeed: parseNum(r.oip),
      hostCommunity: parseNum(r.hst),
    }))
    // Filter out corridors where everything is 0
    .filter(c => c.refugees + c.asylumSeekers + c.idps + c.stateless + c.otherOfConcern > 0);
}
