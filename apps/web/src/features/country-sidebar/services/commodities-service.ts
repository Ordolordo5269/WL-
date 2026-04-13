export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface CommoditiesData {
  countryCode3: string;
  countryName: string | null;
  // Energy
  energyImportsPct: IndicatorPoint;
  fuelExportsPct: IndicatorPoint;
  fuelImportsPct: IndicatorPoint;
  energyUsePerCapita: IndicatorPoint;
  electricityRenewablesPct: IndicatorPoint;
  // Strategic Minerals
  mineralRentsPctGdp: IndicatorPoint;
  oreMetalExportsPct: IndicatorPoint;
  // Agriculture
  cerealProductionMt: IndicatorPoint;
  cerealYieldKgHa: IndicatorPoint;
  foodExportsPct: IndicatorPoint;
  foodImportsPct: IndicatorPoint;
  arableLandPct: IndicatorPoint;
  // P3 A1: Primary energy production (TWh — what this country extracts)
  energyProduction?: {
    oil: IndicatorPoint;
    gas: IndicatorPoint;
    coal: IndicatorPoint;
  };
  // P3 A1: Electricity mix (TWh generated + shares)
  energyMix?: {
    totalTwh: IndicatorPoint;
    nuclear: IndicatorPoint;
    solar: IndicatorPoint;
    wind: IndicatorPoint;
    hydro: IndicatorPoint;
    coalElec: IndicatorPoint;
    gasElec: IndicatorPoint;
    oilElec: IndicatorPoint;
    renewablesSharePct: IndicatorPoint;
    fossilSharePct: IndicatorPoint;
  };
  // P3 A4: Crop-specific production (tonnes)
  crops?: {
    wheat: IndicatorPoint;
    maize: IndicatorPoint;
    rice: IndicatorPoint;
    soybean: IndicatorPoint;
    barley: IndicatorPoint;
  };
  sources: { worldBank: string };
}

class CommoditiesService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getCommoditiesData(iso3: string, countryName: string | null): Promise<CommoditiesData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/commodities/${encodeURIComponent(iso3.toUpperCase())}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Commodities API error: ${response.status}`);
      }
      const data = await response.json();
      return data as CommoditiesData;
    } catch (error) {
      console.error(`Error fetching commodities data for ${iso3}:`, error);
      const empty: IndicatorPoint = { value: null, year: null };
      return {
        countryCode3: iso3,
        countryName,
        energyImportsPct: empty,
        fuelExportsPct: empty,
        fuelImportsPct: empty,
        energyUsePerCapita: empty,
        electricityRenewablesPct: empty,
        mineralRentsPctGdp: empty,
        oreMetalExportsPct: empty,
        cerealProductionMt: empty,
        cerealYieldKgHa: empty,
        foodExportsPct: empty,
        foodImportsPct: empty,
        arableLandPct: empty,
        sources: { worldBank: 'https://api.worldbank.org/v2/' }
      };
    }
  }

  formatPercent(value: number | null, fractionDigits = 2): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(fractionDigits)}%`;
  }

  formatNumber(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toLocaleString();
  }

  formatTonnes(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B t`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M t`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K t`;
    return `${value.toLocaleString()} t`;
  }

  formatKgOilEq(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toLocaleString()} kg`;
  }
}

export const commoditiesService = new CommoditiesService();
export type { CommoditiesData as TCommoditiesData };
