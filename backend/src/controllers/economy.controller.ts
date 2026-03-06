import { Request, Response, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { getLatestIndicatorValueForIso3 } from '../services/indicator.service';

type LatestPoint = { value: number | null; year: number | null };

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const getEconomyByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }

    const entity = await prisma.entity.findFirst({
      where: { type: 'COUNTRY', iso3: iso3Param },
      select: { id: true, name: true, region: true, props: true, iso3: true }
    });
    if (!entity) {
      return res.status(404).json({ error: 'Country not found' });
    }
    const iso3 = entity.iso3 as string;

    // Indicator codes mapping (aligned with DB codes from ingest-worldbank-economy.ts)
    const INDICATORS: Record<string, string> = {
      GDP_USD: 'NY.GDP.MKTP.CD',
      GDP_PC_USD: 'NY.GDP.PCAP.CD',
      INFLATION_CPI_YOY_PCT: 'FP.CPI.TOTL.ZG',
      GINI_INDEX: 'SI.POV.GINI',
      AGRICULTURE_PERCENT_GDP: 'NV.AGR.TOTL.ZS',
      INDUSTRY_PERCENT_GDP: 'NV.IND.TOTL.ZS',
      SERVICES_PERCENT_GDP: 'NV.SRV.TOTL.ZS',
      EXPORTS_USD: 'NE.EXP.GNFS.CD',
      IMPORTS_USD: 'NE.IMP.GNFS.CD',
      EXTERNAL_DEBT_USD: 'DT.DOD.DECT.CD',
      UNEMPLOYMENT_RATE_PERCENT: 'SL.UEM.TOTL.ZS'
    };

    async function latest(code: keyof typeof INDICATORS): Promise<LatestPoint> {
      return await getLatestIndicatorValueForIso3(iso3, code);
    }

    const [
      gdp,
      gdpPc,
      inflation,
      gini,
      agr,
      ind,
      srv,
      exp,
      imp,
      debt,
      unemp
    ] = await Promise.all([
      latest('GDP_USD'),
      latest('GDP_PC_USD'),
      latest('INFLATION_CPI_YOY_PCT'),
      latest('GINI_INDEX'),
      latest('AGRICULTURE_PERCENT_GDP'),
      latest('INDUSTRY_PERCENT_GDP'),
      latest('SERVICES_PERCENT_GDP'),
      latest('EXPORTS_USD'),
      latest('IMPORTS_USD'),
      latest('EXTERNAL_DEBT_USD'),
      latest('UNEMPLOYMENT_RATE_PERCENT')
    ]);

    const exportsUsd = toNumberOrNull(exp.value);
    const importsUsd = toNumberOrNull(imp.value);
    const tradeBalance =
      exportsUsd !== null && importsUsd !== null ? exportsUsd - importsUsd : null;

    const response = {
      country_id: iso3,
      gdp_usd: toNumberOrNull(gdp.value),
      gdp_per_capita_usd: toNumberOrNull(gdpPc.value),
      inflation_rate_percent: toNumberOrNull(inflation.value),
      gini_index: toNumberOrNull(gini.value),
      agriculture_percent: toNumberOrNull(agr.value),
      industry_percent: toNumberOrNull(ind.value),
      services_percent: toNumberOrNull(srv.value),
      exports_usd: exportsUsd,
      imports_usd: importsUsd,
      external_debt_usd: toNumberOrNull(debt.value),
      unemployment_rate_percent: toNumberOrNull(unemp.value),
      country_name: entity.name,
      region: entity.region ?? 'N/A',
      income_level: (entity.props as any)?.incomeLevel ?? 'N/A',
      trade_balance_usd: tradeBalance,
      gdp_year: gdp.year ?? null
    };

    res.json(response);
  } catch (error) {
    console.error('getEconomyByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch economy data from database' });
  }
};


