import { getAllCountries, searchCountries, getCountryByCode, getCountryBasicInfo } from '../../services/country.service';
import { CountryBasicInfoResponse, CountrySearchResponse } from '../../types/country.types';

export async function listAllCountries(): Promise<CountrySearchResponse> {
  return getAllCountries();
}

export async function findCountriesByName(query: string): Promise<CountrySearchResponse> {
  return searchCountries(query);
}

export async function getCountryByIsoCode(code: string): Promise<CountryBasicInfoResponse> {
  return getCountryByCode(code);
}

export async function getCountryBasicInfoByName(name: string): Promise<CountryBasicInfoResponse> {
  return getCountryBasicInfo(name);
}
