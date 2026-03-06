import { Request, Response, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { getLatestIndicatorValueForIso3 } from '../services/indicator.service';

type LatestPoint = { value: number | null; year: number | null };

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const getInternationalByIso3: RequestHandler = async (req: Request, res: Response) => {
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
      ODA_RECEIVED_USD: 'DT.ODA.ALLD.CD',
      TRADE_PERCENT_GDP: 'NE.TRD.GNFS.ZS',
      CURRENT_ACCOUNT_USD: 'BN.CAB.XOKA.CD',
      FDI_NET_INFLOWS_USD: 'BX.KLT.DINV.CD.WD',
      FDI_NET_OUTFLOWS_USD: 'BM.KLT.DINV.CD.WD',
      REMITTANCES_USD: 'BX.TRF.PWKR.CD.DT'
    };

    async function latest(code: keyof typeof INDICATORS): Promise<LatestPoint> {
      return await getLatestIndicatorValueForIso3(iso3, code);
    }

    const [
      odaReceivedUsd,
      tradePercentGdp,
      currentAccountUsd,
      fdiNetInflowsUsd,
      fdiNetOutflowsUsd,
      remittancesUsd
    ] = await Promise.all([
      latest('ODA_RECEIVED_USD'),
      latest('TRADE_PERCENT_GDP'),
      latest('CURRENT_ACCOUNT_USD'),
      latest('FDI_NET_INFLOWS_USD'),
      latest('FDI_NET_OUTFLOWS_USD'),
      latest('REMITTANCES_USD')
    ]);

    const response = {
      countryCode3: iso3,
      countryName: entity.name,
      odaReceivedUsd: { value: toNumberOrNull(odaReceivedUsd.value), year: odaReceivedUsd.year },
      tradePercentGdp: { value: toNumberOrNull(tradePercentGdp.value), year: tradePercentGdp.year },
      currentAccountUsd: { value: toNumberOrNull(currentAccountUsd.value), year: currentAccountUsd.year },
      fdiNetInflowsUsd: { value: toNumberOrNull(fdiNetInflowsUsd.value), year: fdiNetInflowsUsd.year },
      fdiNetOutflowsUsd: { value: toNumberOrNull(fdiNetOutflowsUsd.value), year: fdiNetOutflowsUsd.year },
      remittancesUsd: { value: toNumberOrNull(remittancesUsd.value), year: remittancesUsd.year },
      sources: { worldBank: 'https://api.worldbank.org/v2/' }
    };

    res.json(response);
  } catch (error) {
    console.error('getInternationalByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch international data from database' });
  }
};













