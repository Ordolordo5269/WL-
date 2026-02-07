import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, MapPin, Palette } from 'lucide-react';
import { TCultureData } from '../services/culture-service';

interface CultureSectionProps {
  data: TCultureData | null;
  isLoading: boolean;
  error: string | null;
}

export default function CultureSection({ data, isLoading, error }: CultureSectionProps) {
  if (isLoading) {
    return <div className="p-4 text-slate-400">Loading culture data...</div>;
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

  if (!data) {
    return <div className="p-4 text-slate-400">No culture data available</div>;
  }

  const sites = data.worldHeritageSites;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 space-y-4"
    >
      <div className="section-card">
        <div className="section-header">
          <Palette className="h-4 w-4" />
          <h3>UNESCO World Heritage</h3>
        </div>
        {sites.length === 0 ? (
          <div className="p-3 text-slate-400">No sites available</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sites.map((s) => {
              const coords = (s.latitude !== null && s.longitude !== null)
                ? `${s.latitude.toFixed(3)}, ${s.longitude.toFixed(3)}`
                : 'N/A';
              return (
                <div key={s.wikidataUrl} className="metric-item">
                  <div className="metric-icon small"><MapPin className="w-4 h-4" /></div>
                  <div className="metric-content">
                    <div className="metric-label">{s.title}</div>
                    <div className="metric-value">{coords}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}



