// Country Basic Info service for the frontend
// Fetches basic country data from the backend and provides formatting helpers

export interface CountryBasicInfo {
  name: {
    common: string;
    official: string;
    nativeName?: { [key: string]: { official: string; common: string } };
  };
  tld?: string[];
  cca2: string;
  ccn3?: string;
  cca3: string;
  currencies?: { [key: string]: { name: string; symbol: string } };
  capital?: string[];
  region: string;
  subregion?: string;
  languages?: { [key: string]: string };
  latlng?: [number, number];
  borders?: string[];
  area: number;
  population: number;
  flags: {
    png: string;
    svg: string;
    alt?: string;
  };
  coatOfArms?: {
    png?: string;
    svg?: string;
  };
  startOfWeek?: string;
  capitalInfo?: {
    latlng?: [number, number];
  };
  postalCode?: {
    format: string;
    regex?: string;
  };
}

class CountryBasicInfoService {
  private readonly apiBaseUrl: string;

  constructor() {
    // Default to backend port 3001 if no env var is provided
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    this.apiBaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getCountryBasicInfo(countryName: string): Promise<CountryBasicInfo | null> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/countries/${encodeURIComponent(countryName)}/basic-info`
      );

      if (!response.ok) {
        const message = `Failed to fetch country info (${response.status})`;
        throw new Error(message);
      }

      const json = await response.json();
      // Accept both shapes:
      // 1) { data: CountryBasicInfo }
      // 2) CountryBasicInfo (raw object)
      if (json && typeof json === 'object') {
        if ('error' in json && json.error) {
          throw new Error(String(json.error));
        }
        if ('data' in json && json.data) {
          return json.data as CountryBasicInfo;
        }
        if ('name' in json && 'cca2' in json && 'cca3' in json) {
          return json as CountryBasicInfo;
        }
      }

      return null;
    } catch (error) {
      // Surface a concise error message for the hook/UI
      const message = error instanceof Error ? error.message : 'Failed to load country information';
      throw new Error(message);
    }
  }

  formatPopulation(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString();
  }

  formatArea(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toLocaleString()} km²`;
  }

  formatLanguages(languages?: { [key: string]: string }): string {
    if (!languages || Object.keys(languages).length === 0) return 'N/A';
    return Object.values(languages).join(', ');
  }

  formatCurrencies(
    currencies?: { [key: string]: { name: string; symbol: string } }
  ): string {
    if (!currencies) return 'N/A';
    const parts = Object.entries(currencies).map(([code, info]) => {
      const symbol = info?.symbol ? ` (${info.symbol})` : '';
      const name = info?.name ?? code;
      return `${name}${symbol}`;
    });
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }

  getGovernmentType(_country: CountryBasicInfo): string {
    // REST Countries v3.1 dataset does not provide a direct government type consistently.
    // Return N/A to avoid misleading information; can be enhanced later with a mapping source.
    return 'N/A';
  }
}

export const countryBasicInfoService = new CountryBasicInfoService();

export type { CountryBasicInfo as TCountryBasicInfo };


