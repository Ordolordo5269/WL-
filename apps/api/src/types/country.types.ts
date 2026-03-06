export interface CountryBasicInfo {
  name: {
    common: string;
    official: string;
    nativeName?: { [key: string]: { official: string; common: string } };
  };
  tld?: string[];
  cca2: string; // ISO 3166-1 alpha-2
  ccn3?: string; // ISO 3166-1 numeric
  cca3: string; // ISO 3166-1 alpha-3
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

export interface CountrySearchResponse {
  data: CountryBasicInfo[];
  total: number;
  error?: string;
}

export interface CountryBasicInfoResponse {
  data?: CountryBasicInfo;
  error?: string;
} 