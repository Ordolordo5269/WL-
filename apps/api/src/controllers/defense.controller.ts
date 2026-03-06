import { Request, Response, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { getLatestIndicatorValueForIso3 } from '../services/indicator.service';

type LatestPoint = { value: number | null; year: number | null };

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const getDefenseByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }

    const entity = await prisma.entity.findFirst({
      where: { type: 'COUNTRY', iso3: iso3Param },
      select: { id: true, name: true, iso3: true }
    });
    if (!entity) {
      return res.status(404).json({ error: 'Country not found' });
    }
    const iso3 = entity.iso3 as string;

    const INDICATORS: Record<string, string> = {
      MILITARY_EXPENDITURE_PCT_GDP: 'MS.MIL.XPND.GD.ZS',
      MILITARY_EXPENDITURE_USD: 'MS.MIL.XPND.CD',
      ARMED_FORCES_PERSONNEL_TOTAL: 'MS.MIL.TOTL.P1',
      ARMS_IMPORTS_TIV: 'MS.MIL.MPRT.KD',
      ARMS_EXPORTS_TIV: 'MS.MIL.XPRT.KD',
      BATTLE_RELATED_DEATHS: 'VC.BTL.DETH',
      POPULATION_TOTAL: 'SP.POP.TOTL'
    };

    async function latest(code: keyof typeof INDICATORS): Promise<LatestPoint> {
      return await getLatestIndicatorValueForIso3(iso3, code);
    }

    const [
      militaryExpenditurePctGdp,
      militaryExpenditureUsd,
      armedForcesPersonnelTotal,
      armsImportsTiv,
      armsExportsTiv,
      battleRelatedDeaths,
      populationTotal
    ] = await Promise.all([
      latest('MILITARY_EXPENDITURE_PCT_GDP'),
      latest('MILITARY_EXPENDITURE_USD'),
      latest('ARMED_FORCES_PERSONNEL_TOTAL'),
      latest('ARMS_IMPORTS_TIV'),
      latest('ARMS_EXPORTS_TIV'),
      latest('BATTLE_RELATED_DEATHS'),
      latest('POPULATION_TOTAL')
    ]);

    const response = {
      countryCode3: iso3,
      countryName: entity.name,
      militaryExpenditurePctGdp: { value: toNumberOrNull(militaryExpenditurePctGdp.value), year: militaryExpenditurePctGdp.year },
      militaryExpenditureUsd: { value: toNumberOrNull(militaryExpenditureUsd.value), year: militaryExpenditureUsd.year },
      armedForcesPersonnelTotal: { value: toNumberOrNull(armedForcesPersonnelTotal.value), year: armedForcesPersonnelTotal.year },
      armsImportsTiv: { value: toNumberOrNull(armsImportsTiv.value), year: armsImportsTiv.year },
      armsExportsTiv: { value: toNumberOrNull(armsExportsTiv.value), year: armsExportsTiv.year },
      battleRelatedDeaths: { value: toNumberOrNull(battleRelatedDeaths.value), year: battleRelatedDeaths.year },
      populationTotal: { value: toNumberOrNull(populationTotal.value), year: populationTotal.year },
      sources: { worldBank: 'https://api.worldbank.org/v2/' }
    };

    res.json(response);
  } catch (error) {
    console.error('getDefenseByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch defense data from database' });
  }
};













