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
    // Try exact name match first
    let response = await axios.get(`${REST_COUNTRIES_API}/name/${encodeURIComponent(countryName)}?fullText=true`);
    
    if (response.data && response.data.length > 0) {
      return { data: response.data[0] };
    }
    
    // If exact match fails, try partial match
    response = await axios.get(`${REST_COUNTRIES_API}/name/${encodeURIComponent(countryName)}`);
    
    if (response.data && response.data.length > 0) {
      // Find the best match
      const bestMatch = response.data.find((country: CountryBasicInfo) => 
        country.name.common.toLowerCase() === countryName.toLowerCase() ||
        country.name.official.toLowerCase() === countryName.toLowerCase()
      ) || response.data[0];
      
      return { data: bestMatch };
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
