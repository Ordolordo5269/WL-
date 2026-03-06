import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCountryOverview } from '../features/country/useCountryOverview';
import CountryOverview from '../features/country/CountryOverview';
import CountryIndicators from '../features/country/CountryIndicators';

export default function Country() {
  const { iso3 } = useParams<{ iso3: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useCountryOverview(iso3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
          whileHover={{ x: -4 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-red-400 font-medium">Country not found</p>
            <p className="text-sm text-slate-400 mt-1">Could not load data for "{iso3}"</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <CountryOverview data={data} />
            <CountryIndicators data={data} />
          </div>
        )}
      </div>
    </div>
  );
}
