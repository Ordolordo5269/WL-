import React from 'react';
import { MapPin, Hash, Globe, Languages } from 'lucide-react';
import type { CountryBasicInfo } from '../services/country-basic-info.service';
import { countryBasicInfoService } from '../services/country-basic-info.service';

interface CountryStaticDataProps {
  countryData: CountryBasicInfo | null;
  isLoading?: boolean;
}

export default function CountryStaticData({ countryData, isLoading }: CountryStaticDataProps) {
  if (isLoading || !countryData) {
    return (
      <div className="country-static-card">
        <div className="country-card-title">Identity</div>
        <div className="country-static-list">
          <div className="country-static-item">—</div>
          <div className="country-static-item">—</div>
          <div className="country-static-item">—</div>
        </div>
      </div>
    );
  }

  const { capital, cca2, cca3, region, subregion, languages } = countryData;

  return (
    <div className="country-static-card">
      <div className="country-card-title">Identity</div>
      <div className="country-static-list">
        {capital && capital.length > 0 && (
          <div className="country-static-item">
            <MapPin className="country-static-icon" />
            <div className="country-static-content">
              <div className="country-static-label">Capital</div>
              <div className="country-static-value">{capital.join(', ')}</div>
            </div>
          </div>
        )}
        
        <div className="country-static-item">
          <Globe className="country-static-icon" />
          <div className="country-static-content">
            <div className="country-static-label">Continent</div>
            <div className="country-static-value">
              {subregion ? `${region} - ${subregion}` : region}
            </div>
          </div>
        </div>

        <div className="country-static-item">
          <Hash className="country-static-icon" />
          <div className="country-static-content">
            <div className="country-static-label">ISO Code</div>
            <div className="country-static-value">{cca2} / {cca3}</div>
          </div>
        </div>

        {languages && Object.keys(languages).length > 0 && (
          <div className="country-static-item">
            <Languages className="country-static-icon" />
            <div className="country-static-content">
              <div className="country-static-label">Languages</div>
              <div className="country-static-value">
                {countryBasicInfoService.formatLanguages(languages)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

