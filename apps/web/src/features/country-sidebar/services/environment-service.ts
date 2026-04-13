export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface EnvironmentData {
  countryCode3: string;
  countryName: string | null;
  // Climate & Emissions
  co2EmissionsPerCapita: IndicatorPoint;
  co2EmissionsTotalKt: IndicatorPoint;
  pm25AirPollution: IndicatorPoint;
  co2FromElectricityPct: IndicatorPoint;
  methaneEmissionsKtCo2eq: IndicatorPoint;
  // Natural Resources
  forestAreaPct: IndicatorPoint;
  terrestrialProtectedAreasPct: IndicatorPoint;
  accessCleanWaterPct: IndicatorPoint;
  forestRentsPctGdp: IndicatorPoint;
  // Energy Transition
  renewableEnergyConsumptionPct: IndicatorPoint;
  renewableElectricityOutputPct: IndicatorPoint;
  // Geopolitical expansion
  ghgEmissionsTotalKt: IndicatorPoint;
  fossilFuelConsumptionPct: IndicatorPoint;
  landAreaSqKm: IndicatorPoint;
  // P6 Phase A: Climate Risk & Vulnerability
  ndGain?: {
    index: IndicatorPoint;
    vulnerability: IndicatorPoint;
    readiness: IndicatorPoint;
  };
  worldRiskIndex?: {
    score: IndicatorPoint;
    exposure: IndicatorPoint;
    vulnerability: IndicatorPoint;
  };
  // P6 Phase A: CO2 by fuel source
  co2BySource?: {
    coal: IndicatorPoint;
    oil: IndicatorPoint;
    gas: IndicatorPoint;
    cement: IndicatorPoint;
    flaring: IndicatorPoint;
    consumption: IndicatorPoint;
  };
  // P6 Phase B: Deforestation (GFW) + air quality coverage (OpenAQ)
  forestLossHa?: IndicatorPoint;
  airQualityStationsCount?: IndicatorPoint;
  sources: { worldBank: string };
}

class EnvironmentService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getEnvironmentData(iso3: string, countryName: string | null): Promise<EnvironmentData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/environment/${encodeURIComponent(iso3.toUpperCase())}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Environment API error: ${response.status}`);
      }
      const data = await response.json();
      return data as EnvironmentData;
    } catch (error) {
      console.error(`Error fetching environment data for ${iso3}:`, error);
      const empty: IndicatorPoint = { value: null, year: null };
      return {
        countryCode3: iso3,
        countryName,
        co2EmissionsPerCapita: empty,
        co2EmissionsTotalKt: empty,
        pm25AirPollution: empty,
        co2FromElectricityPct: empty,
        methaneEmissionsKtCo2eq: empty,
        forestAreaPct: empty,
        terrestrialProtectedAreasPct: empty,
        accessCleanWaterPct: empty,
        forestRentsPctGdp: empty,
        renewableEnergyConsumptionPct: empty,
        renewableElectricityOutputPct: empty,
        ghgEmissionsTotalKt: empty,
        fossilFuelConsumptionPct: empty,
        landAreaSqKm: empty,
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

  formatMetricTons(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(2)} t`;
  }

  formatKt(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}B kt`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}M kt`;
    return `${Number(value).toLocaleString()} kt`;
  }

  formatMtCo2e(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)} Gt`;
    return `${Number(value).toFixed(1)} Mt`;
  }

  formatUgM3(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(1)} µg/m³`;
  }

  formatSqKm(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M km²`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K km²`;
    return `${Number(value).toLocaleString()} km²`;
  }
}

export const environmentService = new EnvironmentService();
export type { EnvironmentData as TEnvironmentData };
