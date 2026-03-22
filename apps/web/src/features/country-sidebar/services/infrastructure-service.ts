export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface InfrastructureData {
  countryCode3: string;
  countryName: string | null;
  internetUsersPct: IndicatorPoint;
  mobileCellularPer100: IndicatorPoint;
  accessElectricityPct: IndicatorPoint;
  airTransportPassengers: IndicatorPoint;
  secureInternetServersPm: IndicatorPoint;
  // Geopolitical expansion
  railLinesTotalKm: IndicatorPoint;
  roadsPavedPct: IndicatorPoint;
  containerPortTrafficTeu: IndicatorPoint;
  airTransportDepartures: IndicatorPoint;
  airFreightMillionTonKm: IndicatorPoint;
  electricityTransmissionLossesPct: IndicatorPoint;
  electricityFromOilPct: IndicatorPoint;
  sources: { worldBank: string };
}

class InfrastructureService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getInfrastructureData(iso3: string, countryName: string | null): Promise<InfrastructureData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/infrastructure/${encodeURIComponent(iso3.toUpperCase())}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Infrastructure API error: ${response.status}`);
      }
      const data = await response.json();
      return data as InfrastructureData;
    } catch (error) {
      console.error(`Error fetching infrastructure data for ${iso3}:`, error);
      return {
        countryCode3: iso3,
        countryName,
        internetUsersPct: { value: null, year: null },
        mobileCellularPer100: { value: null, year: null },
        accessElectricityPct: { value: null, year: null },
        airTransportPassengers: { value: null, year: null },
        secureInternetServersPm: { value: null, year: null },
        railLinesTotalKm: { value: null, year: null },
        roadsPavedPct: { value: null, year: null },
        containerPortTrafficTeu: { value: null, year: null },
        airTransportDepartures: { value: null, year: null },
        airFreightMillionTonKm: { value: null, year: null },
        electricityTransmissionLossesPct: { value: null, year: null },
        electricityFromOilPct: { value: null, year: null },
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

  formatPerHundred(value: number | null, fractionDigits = 1): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(fractionDigits)} per 100`;
  }

  formatPerMillion(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toLocaleString()} per million`;
  }

  formatKm(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M km`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K km`;
    return `${Number(value).toLocaleString()} km`;
  }

  formatTeu(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M TEU`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K TEU`;
    return `${Number(value).toLocaleString()} TEU`;
  }

  formatCompact(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return Number(value).toLocaleString();
  }
}

export const infrastructureService = new InfrastructureService();
export type { InfrastructureData as TInfrastructureData };
