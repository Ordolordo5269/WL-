import { Request, Response, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { getLatestIndicatorValueForIso3 } from '../services/indicator.service';

type LatestPoint = { value: number | null; year: number | null };

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const getPoliticsByIso3: RequestHandler = async (req: Request, res: Response) => {
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

    // WGI Indicator codes
    const INDICATORS: Record<string, string> = {
      WGI_POLITICAL_STABILITY: 'PV.EST',
      WGI_VOICE_ACCOUNTABILITY: 'VA.EST',
      WGI_GOVERNMENT_EFFECTIVENESS: 'GE.EST',
      WGI_REGULATORY_QUALITY: 'RQ.EST',
      WGI_RULE_OF_LAW: 'RL.EST',
      WGI_CONTROL_CORRUPTION: 'CC.EST'
    };

    async function latest(code: keyof typeof INDICATORS): Promise<LatestPoint> {
      return await getLatestIndicatorValueForIso3(iso3, code);
    }

    const [
      politicalStability,
      voiceAccountability,
      govEffectiveness,
      regulatoryQuality,
      ruleOfLaw,
      controlCorruption
    ] = await Promise.all([
      latest('WGI_POLITICAL_STABILITY'),
      latest('WGI_VOICE_ACCOUNTABILITY'),
      latest('WGI_GOVERNMENT_EFFECTIVENESS'),
      latest('WGI_REGULATORY_QUALITY'),
      latest('WGI_RULE_OF_LAW'),
      latest('WGI_CONTROL_CORRUPTION')
    ]);

    // Calculate Democracy Index from Voice & Accountability
    // VA.EST ranges from -2.5 to 2.5, normalize to 0-10 scale
    let democracyIndexValue: number | null = null;
    let democracyIndexYear: number | null = voiceAccountability.year;
    
    if (voiceAccountability.value !== null) {
      const normalized = ((voiceAccountability.value + 2.5) / 5) * 10;
      democracyIndexValue = Math.max(0, Math.min(10, Number(normalized.toFixed(2))));
    }

    // Fetch heads of government from existing backend endpoint (Wikidata)
    const base = process.env.API_BASE_URL || 'http://localhost:3001';
    let formOfGovernment: string | null = null;
    let headsOfGovernment: any[] = [];
    
    try {
      const officesRes = await fetch(`${base}/api/politics/offices/${iso3}`);
      if (officesRes.ok) {
        const officesData = await officesRes.json();
        formOfGovernment = officesData.formOfGovernment ?? null;
        headsOfGovernment = Array.isArray(officesData.offices) 
          ? officesData.offices.map((o: any) => ({
              title: `${o.officeLabel} — ${o.personLabel}`,
              url: o.personUrl || '',
              role: o.role,
              office: o.officeLabel,
              person: o.personLabel
            }))
          : [];
      }
    } catch (err) {
      console.warn(`Could not fetch offices for ${iso3}:`, err);
    }

    const response = {
      countryCode3: iso3,
      countryName: entity.name,
      wgiPoliticalStability: {
        value: toNumberOrNull(politicalStability.value),
        year: politicalStability.year
      },
      democracyIndex: {
        value: democracyIndexValue,
        year: democracyIndexYear
      },
      wgiGovernmentEffectiveness: {
        value: toNumberOrNull(govEffectiveness.value),
        year: govEffectiveness.year
      },
      wgiRegulatoryQuality: {
        value: toNumberOrNull(regulatoryQuality.value),
        year: regulatoryQuality.year
      },
      wgiRuleOfLaw: {
        value: toNumberOrNull(ruleOfLaw.value),
        year: ruleOfLaw.year
      },
      wgiControlOfCorruption: {
        value: toNumberOrNull(controlCorruption.value),
        year: controlCorruption.year
      },
      headsOfGovernment,
      formOfGovernment,
      sources: {
        worldBankWgi: 'https://api.worldbank.org/v2/',
        wikidata: 'https://query.wikidata.org/sparql'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('getPoliticsByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch politics data from database' });
  }
};













