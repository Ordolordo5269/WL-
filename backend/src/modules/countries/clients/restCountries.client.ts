import { httpGet } from '../../../core/http/httpClient';

const BASE = 'https://restcountries.com/v3.1';

export const restCountriesClient = {
  all: () => httpGet<any[]>(`${BASE}/all`),
  byName: (name: string) => httpGet<any[]>(`${BASE}/name/${encodeURIComponent(name)}`),
  byNameFullText: (name: string) => httpGet<any[]>(`${BASE}/name/${encodeURIComponent(name)}?fullText=true`),
  byCode: (code: string) => httpGet<any[]>(`${BASE}/alpha/${encodeURIComponent(code)}`)
};

