import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { CountryBasicInfo, CountrySearchResponse, CountryBasicInfoResponse } from '../types/country.types';

// REST Countries API base URL
const REST_COUNTRIES_API = 'https://restcountries.com/v3.1';

export async function getCountries() {
  const dataPath = path.join(__dirname, '../../public/data/countries-cache.json');
  const content = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(content);
}

export async function getCountryBasicInfo(countryName: string): Promise<CountryBasicInfoResponse> {
  try {
    const original = (countryName || '').trim();
    // Normalize common problem cases: remove parentheticals and excessive qualifiers
    const stripped = original.replace(/\(.*?\)/g, '').replace(/,.*$/, '').replace(/\s+/g, ' ').trim();
    // Alias map for known synonyms
    const lc = stripped.toLowerCase();
    const aliasMap: Record<string, string> = {
      'burma': 'myanmar',
      'ivory coast': "côte d'ivoire",
      'cote d ivoire': "côte d'ivoire",
      'south korea': 'korea (republic of)',
      'north korea': "korea (democratic people's republic of)",
    };
    const alias = aliasMap[lc] ?? stripped;

    const attempts = [original, alias];

    // Try each attempt: exact match then partial
    for (const attempt of attempts) {
      if (!attempt) continue;
      try {
        const exact = await axios.get(`${REST_COUNTRIES_API}/name/${encodeURIComponent(attempt)}?fullText=true`);
        if (exact.data && exact.data.length > 0) {
          return { data: exact.data[0] };
        }
      } catch (_e) {
        // ignore, fall through to partial search
      }

      try {
        const partial = await axios.get(`${REST_COUNTRIES_API}/name/${encodeURIComponent(attempt)}`);
        if (partial.data && partial.data.length > 0) {
          const bestMatch = partial.data.find((country: CountryBasicInfo) => 
            country.name.common.toLowerCase() === attempt.toLowerCase() ||
            country.name.official.toLowerCase() === attempt.toLowerCase()
          ) || partial.data[0];
          return { data: bestMatch };
        }
      } catch (_e) {
        // continue to next attempt
      }
    }

    return { error: `Country '${countryName}' not found` };
  } catch (error) {
    console.error('Error fetching country basic info:', error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { error: `Country '${countryName}' not found` };
    }
    return { error: 'Failed to fetch country information' };
  }
}

export async function searchCountries(query: string): Promise<CountrySearchResponse> {
  try {
    if (!query || query.length < 2) {
      return { data: [], total: 0 };
    }
    
    const response = await axios.get(`${REST_COUNTRIES_API}/name/${encodeURIComponent(query)}`);
    
    if (response.data && Array.isArray(response.data)) {
      return {
        data: response.data.slice(0, 10), // Limit to 10 results
        total: response.data.length
      };
    }
    
    return { data: [], total: 0 };
  } catch (error) {
    console.error('Error searching countries:', error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { data: [], total: 0 };
    }
    return { data: [], total: 0, error: 'Failed to search countries' };
  }
}

export async function getCountryByCode(code: string): Promise<CountryBasicInfoResponse> {
  try {
    const response = await axios.get(`${REST_COUNTRIES_API}/alpha/${encodeURIComponent(code)}`);
    
    if (response.data && response.data.length > 0) {
      return { data: response.data[0] };
    }
    
    return { error: `Country with code '${code}' not found` };
  } catch (error) {
    console.error('Error fetching country by code:', error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { error: `Country with code '${code}' not found` };
    }
    return { error: 'Failed to fetch country information' };
  }
}

export async function getAllCountries(): Promise<CountrySearchResponse> {
  try {
    const response = await axios.get(`${REST_COUNTRIES_API}/all`);
    
    if (response.data && Array.isArray(response.data)) {
      return {
        data: response.data,
        total: response.data.length
      };
    }
    
    return { data: [], total: 0 };
  } catch (error) {
    console.error('Error fetching all countries:', error);
    return { data: [], total: 0, error: 'Failed to fetch countries' };
  }
}
