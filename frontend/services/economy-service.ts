import economyDataJson from '../data/economy_data.json';

export interface EconomyData {
  country_id: string;
  gdp_usd: number | null;
  gdp_per_capita_usd: number | null;
  inflation_rate_percent: number | null;
  gini_index: number | null;
  agriculture_percent: number | null;
  industry_percent: number | null;
  services_percent: number | null;
  exports_usd: number | null;
  imports_usd: number | null;
  external_debt_usd: number | null;
  unemployment_rate_percent: number | null;
  country_name: string;
  region: string;
  income_level: string;
  trade_balance_usd: number | null;
  gdp_year: number;
  data_quality: string;
}

class EconomyService {
  private economyData: EconomyData[] = [];
  private isLoaded = false;

  loadEconomyData(): void {
    if (this.isLoaded) return;

    try {
      // Import the JSON data directly instead of fetching
      this.economyData = economyDataJson as EconomyData[];
      this.isLoaded = true;
    } catch (error) {
      console.error('Error loading economy data:', error);
      this.economyData = [];
    }
  }

  getEconomyDataByCountry(countryName: string): EconomyData | null {
    if (!this.isLoaded) {
      this.loadEconomyData();
    }

    // Try exact match first
    let economyData = this.economyData.find(
      data => data.country_name.toLowerCase() === countryName.toLowerCase()
    );

    // If not found, try partial matches
    if (!economyData) {
      economyData = this.economyData.find(
        data => data.country_name.toLowerCase().includes(countryName.toLowerCase()) ||
                countryName.toLowerCase().includes(data.country_name.toLowerCase())
      );
    }

    // Try common country name variations
    if (!economyData) {
      const variations = this.getCountryNameVariations(countryName);
      for (const variation of variations) {
        economyData = this.economyData.find(
          data => data.country_name.toLowerCase() === variation.toLowerCase()
        );
        if (economyData) break;
      }
    }

    return economyData || null;
  }

  private getCountryNameVariations(countryName: string): string[] {
    const variations: { [key: string]: string[] } = {
      'United States': ['United States of America', 'USA', 'US'],
      'United Kingdom': ['UK', 'Britain', 'Great Britain'],
      'Russia': ['Russian Federation'],
      'Iran': ['Iran, Islamic Rep.'],
      'Venezuela': ['Venezuela, RB'],
      'Egypt': ['Egypt, Arab Rep.'],
      'South Korea': ['Korea, Rep.'],
      'North Korea': ['Korea, Dem. People\'s Rep.'],
      'Democratic Republic of the Congo': ['Congo, Dem. Rep.'],
      'Republic of the Congo': ['Congo, Rep.'],
      'Bahamas': ['Bahamas, The'],
      'Gambia': ['Gambia, The'],
      'Czech Republic': ['Czechia'],
      'Slovakia': ['Slovak Republic']
    };

    const result = [countryName];
    
    // Check if the country name has variations
    for (const [key, vars] of Object.entries(variations)) {
      if (countryName.toLowerCase().includes(key.toLowerCase()) || 
          vars.some(v => countryName.toLowerCase().includes(v.toLowerCase()))) {
        result.push(key, ...vars);
      }
    }

    return [...new Set(result)]; // Remove duplicates
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  }

  formatPercentage(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  }

  formatNumber(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString();
  }

  getDataQualityColor(quality: string): string {
    switch (quality.toLowerCase()) {
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-orange-400';
      case 'no data': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  getDataQualityIcon(quality: string): string {
    switch (quality.toLowerCase()) {
      case 'good': return '●';
      case 'fair': return '◐';
      case 'poor': return '◑';
      case 'no data': return '○';
      default: return '○';
    }
  }
}

export const economyService = new EconomyService(); 