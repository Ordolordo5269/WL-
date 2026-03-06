import { Request, Response, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { getLatestIndicatorValueForIso3 } from '../services/indicator.service';

type LatestPoint = { value: number | null; year: number | null };

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const getTechnologyByIso3: RequestHandler = async (req: Request, res: Response) => {
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
      RND_EXPENDITURE_PCT_GDP: 'GB.XPD.RSDV.GD.ZS',
      HIGH_TECH_EXPORTS_USD: 'TX.VAL.TECH.CD',
      RESEARCHERS_PER_MILLION: 'SP.POP.SCIE.RD.P6',
      PATENT_APPLICATIONS_RESIDENTS: 'IP.PAT.RESD',
      SCIENTIFIC_JOURNAL_ARTICLES: 'IP.JRN.ARTC.SC'
    };

    async function latest(code: keyof typeof INDICATORS): Promise<LatestPoint> {
      return await getLatestIndicatorValueForIso3(iso3, code);
    }

    const [
      rndExpenditurePctGdp,
      highTechExportsUsd,
      researchersPerMillion,
      patentApplicationsResidents,
      scientificJournalArticles
    ] = await Promise.all([
      latest('RND_EXPENDITURE_PCT_GDP'),
      latest('HIGH_TECH_EXPORTS_USD'),
      latest('RESEARCHERS_PER_MILLION'),
      latest('PATENT_APPLICATIONS_RESIDENTS'),
      latest('SCIENTIFIC_JOURNAL_ARTICLES')
    ]);

    const response = {
      countryCode3: iso3,
      countryName: entity.name,
      rndExpenditurePctGdp: { value: toNumberOrNull(rndExpenditurePctGdp.value), year: rndExpenditurePctGdp.year },
      highTechExportsUsd: { value: toNumberOrNull(highTechExportsUsd.value), year: highTechExportsUsd.year },
      researchersPerMillion: { value: toNumberOrNull(researchersPerMillion.value), year: researchersPerMillion.year },
      patentApplicationsResidents: { value: toNumberOrNull(patentApplicationsResidents.value), year: patentApplicationsResidents.year },
      scientificJournalArticles: { value: toNumberOrNull(scientificJournalArticles.value), year: scientificJournalArticles.year },
      sources: { worldBank: 'https://api.worldbank.org/v2/' }
    };

    res.json(response);
  } catch (error) {
    console.error('getTechnologyByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch technology data from database' });
  }
};













