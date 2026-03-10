import React from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  MapPin, 
  Users, 
  Languages, 
  DollarSign, 
  Hash, 
  Building2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { CountryBasicInfo } from '../services/country-basic-info.service';
import { countryBasicInfoService } from '../services/country-basic-info.service';

interface BasicInfoSectionProps {
  countryData: CountryBasicInfo | null;
  isLoading: boolean;
  error: string | null;
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

export default function BasicInfoSection({ countryData, isLoading, error }: BasicInfoSectionProps) {
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

  const { capital, population, area, languages, currencies, cca2, cca3, region, subregion } = countryData;

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
        <InfoItem icon={<Hash className="w-4 h-4" />} label="ISO Code" value={`${cca2} / ${cca3}`} />
        <InfoItem icon={<Building2 className="w-4 h-4" />} label="Continent" value={subregion ? `${region} - ${subregion}` : region} />
        <InfoItem icon={<Building2 className="w-4 h-4" />} label="Government Type" value={countryBasicInfoService.getGovernmentType(countryData)} />
      </div>

      {/* Additional Info section intentionally removed per UX request */}
    </motion.div>
  );
} 