import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  MapPin, 
  Users, 
  Languages, 
  DollarSign, 
  Hash, 
  Building2,
  Loader2,
  AlertCircle,
  ChevronDown,
  Navigation,
  Star,
  MapPinned
} from 'lucide-react';
import type { CountryBasicInfo } from '../services/country-basic-info.service';
import { countryBasicInfoService } from '../services/country-basic-info.service';
import { useGeoData } from '../hooks/useGeoData';
import { geoService, GeoCity, GeoRegion } from '../services/geo.service';

interface BasicInfoSectionProps {
  countryData: CountryBasicInfo | null;
  isLoading: boolean;
  error: string | null;
  onNavigateToCity?: (lat: number, lng: number, cityName: string) => void;
  onToggleCityFavorite?: (cityId: number, cityName: string, countryIso3: string) => void;
  favoriteCityIds?: Set<number>;
  onCitiesLoaded?: (cities: GeoCity[]) => void;
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLoading?: boolean;
}

function InfoItem({ icon, label, value, isLoading }: InfoItemProps) {
  return (
    <div className="metric-item">
      <div className="metric-icon small">
        {icon}
      </div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </div>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}

export default function BasicInfoSection({ 
  countryData, 
  isLoading, 
  error,
  onNavigateToCity,
  onToggleCityFavorite,
  favoriteCityIds = new Set(),
  onCitiesLoaded
}: BasicInfoSectionProps) {
  const [citiesExpanded, setCitiesExpanded] = useState(false);
  const [regionsExpanded, setRegionsExpanded] = useState(false);

  // Get ISO2 from country data for geo queries
  const iso2 = countryData?.cca2 || null;
  const iso3 = countryData?.cca3 || null;
  
  // Always load cities when country changes (for map display)
  // Also load regions when that section is expanded
  const { cities, regions, isLoading: geoLoading } = useGeoData(iso2, true);

  // Notify parent when cities are loaded (for map markers)
  useEffect(() => {
    if (cities.length > 0 && onCitiesLoaded) {
      onCitiesLoaded(cities);
    }
  }, [cities, onCitiesLoaded]);

  const handleNavigateToCity = useCallback((city: GeoCity) => {
    if (onNavigateToCity) {
      onNavigateToCity(city.latitude, city.longitude, city.name);
    }
  }, [onNavigateToCity]);

  const handleToggleCityFavorite = useCallback((city: GeoCity) => {
    if (onToggleCityFavorite && iso3) {
      onToggleCityFavorite(city.id, city.name, iso3);
    }
  }, [onToggleCityFavorite, iso3]);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading country information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!countryData) {
    return (
      <div className="p-4">
        <div className="text-center text-slate-400">
          <p>No country data available</p>
        </div>
      </div>
    );
  }

  const { capital, population, area, languages, currencies, cca2: countryIso2, cca3: countryIso3, region, subregion } = countryData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      {/* Basic Information Grid */}
      <div className="secondary-metrics">
        <InfoItem icon={<MapPin className="w-4 h-4" />} label="Capital" value={capital ? capital.join(', ') : 'No data available'} />
        <InfoItem icon={<Users className="w-4 h-4" />} label="Population" value={countryBasicInfoService.formatPopulation(population)} />
        <InfoItem icon={<Globe className="w-4 h-4" />} label="Surface Area" value={countryBasicInfoService.formatArea(area)} />
        <InfoItem icon={<Languages className="w-4 h-4" />} label="Languages" value={countryBasicInfoService.formatLanguages(languages)} />
        <InfoItem icon={<DollarSign className="w-4 h-4" />} label="Currency" value={countryBasicInfoService.formatCurrencies(currencies)} />
        <InfoItem icon={<Hash className="w-4 h-4" />} label="ISO Code" value={`${countryIso2} / ${countryIso3}`} />
        <InfoItem icon={<Building2 className="w-4 h-4" />} label="Continent" value={subregion ? `${region} - ${subregion}` : region} />
        <InfoItem icon={<Building2 className="w-4 h-4" />} label="Government Type" value={countryBasicInfoService.getGovernmentType(countryData)} />
      </div>

      {/* Cities Section - Collapsible */}
      <div className="geo-section">
        <button
          onClick={() => setCitiesExpanded(!citiesExpanded)}
          className="geo-section-header"
          aria-expanded={citiesExpanded}
        >
          <div className="geo-section-title">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Major Cities</span>
            {cities.length > 0 && (
              <span className="geo-section-count">{cities.length}</span>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              citiesExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        
        <AnimatePresence>
          {citiesExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="geo-section-content"
            >
              {geoLoading ? (
                <div className="geo-loading">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading cities...</span>
                </div>
              ) : cities.length === 0 ? (
                <div className="geo-empty">No city data available</div>
              ) : (
                <div className="cities-list">
                  {cities.map((city) => (
                    <div key={city.id} className="city-item">
                      <div className="city-item-info">
                        <div className="city-name">{city.name}</div>
                        <div className="city-meta">
                          {geoService.formatPopulation(city.population)} · {city.region || 'N/A'}
                        </div>
                      </div>
                      <div className="city-actions">
                        {onNavigateToCity && (
                          <button
                            onClick={() => handleNavigateToCity(city)}
                            className="city-action-btn"
                            title="Navigate to city"
                            aria-label={`Navigate to ${city.name}`}
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onToggleCityFavorite && (
                          <button
                            onClick={() => handleToggleCityFavorite(city)}
                            className={`city-action-btn ${favoriteCityIds.has(city.id) ? 'active' : ''}`}
                            title={favoriteCityIds.has(city.id) ? 'Remove from favorites' : 'Add to favorites'}
                            aria-label={`${favoriteCityIds.has(city.id) ? 'Remove' : 'Add'} ${city.name} ${favoriteCityIds.has(city.id) ? 'from' : 'to'} favorites`}
                          >
                            <Star className={`w-3.5 h-3.5 ${favoriteCityIds.has(city.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Regions Section - Collapsible */}
      <div className="geo-section">
        <button
          onClick={() => setRegionsExpanded(!regionsExpanded)}
          className="geo-section-header"
          aria-expanded={regionsExpanded}
        >
          <div className="geo-section-title">
            <MapPinned className="w-4 h-4 text-emerald-400" />
            <span>Administrative Regions</span>
            {regions.length > 0 && (
              <span className="geo-section-count">{regions.length}</span>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              regionsExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        
        <AnimatePresence>
          {regionsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="geo-section-content"
            >
              {geoLoading ? (
                <div className="geo-loading">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading regions...</span>
                </div>
              ) : regions.length === 0 ? (
                <div className="geo-empty">No region data available</div>
              ) : (
                <div className="regions-list">
                  {regions.map((region) => (
                    <div key={region.isoCode || region.name} className="region-item">
                      <div className="region-name">{region.name}</div>
                      {region.isoCode && (
                        <div className="region-code">{region.isoCode}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
} 