import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conflict, NewsArticle } from '../data/conflicts-data';
import ConflictService from '../services/conflict-service';
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Calendar, Users, MapPin, ExternalLink } from 'lucide-react';

interface ConflictTrackerProps {
  onBack: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
}

export default function ConflictTracker({ onBack, onCenterMap }: ConflictTrackerProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await ConflictService.fetchLatestConflictData();
        setConflicts(data.conflicts);
        setNews(data.news);
      } catch (error) {
        console.error('Error loading conflict data:', error);
        // Fallback to static data
        setConflicts(ConflictService.getAllConflicts());
        setNews(ConflictService.getAllNews());
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getStatusColor = (status: 'War' | 'Warm' | 'Improving') => {
    return ConflictService.getStatusColor(status);
  };

  const getStatusIcon = (status: 'War' | 'Warm' | 'Improving') => {
    return ConflictService.getStatusIcon(status);
  };

  const formatCasualties = (casualties: number) => {
    return ConflictService.formatCasualties(casualties);
  };

  const handleConflictClick = (conflict: Conflict) => {
    if (onCenterMap) {
      onCenterMap(conflict.coordinates);
    }
    setSelectedConflict(conflict);
  };

  if (loading) {
    return (
      <motion.div 
        className="conflict-tracker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="conflict-tracker-header">
          <button onClick={onBack} className="conflict-tracker-back-btn">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="conflict-tracker-title">Conflict Tracker</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading conflict data...</div>
        </div>
      </motion.div>
    );
  }

  const regions = ConflictService.getAvailableRegions();
  const statuses = ConflictService.getAvailableStatuses();

  const filteredConflicts = ConflictService.getFilteredConflicts(
    selectedRegion === 'All' ? undefined : selectedRegion,
    selectedStatus === 'All' ? undefined : selectedStatus as 'War' | 'Warm' | 'Improving'
  );

  return (
    <motion.div 
      className="conflict-tracker"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }}
    >
      {/* Header */}
      <div className="conflict-tracker-header">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <h2 className="text-xl font-bold text-white">
            Conflict Tracker
          </h2>
        </div>
        
        {/* Filters */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Region</label>
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {regions.map(region => (
                <option key={region} value={region}>
                  {region === 'All' ? 'All Regions' : region}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'All' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="conflict-tracker-content">
        {/* Conflicts Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
            Active Conflicts ({filteredConflicts.length})
          </h3>
          
          <div className="space-y-3">
            {filteredConflicts.map((conflict, index) => (
              <motion.div
                key={conflict.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors cursor-pointer"
                onClick={() => handleConflictClick(conflict)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-slate-400 mr-2" />
                    <span className="font-medium text-white">{conflict.country}</span>
                  </div>
                  <div className={`flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(conflict.status)}`}>
                    <span className="mr-1">{getStatusIcon(conflict.status)}</span>
                    {conflict.status}
                  </div>
                </div>
                
                <p className="text-sm text-slate-300 mb-2">{conflict.description}</p>
                
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{formatCasualties(conflict.casualties)} casualties</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{new Date(conflict.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* News Section */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <ExternalLink className="h-5 w-5 mr-2 text-blue-400" />
            Latest News
          </h3>
          
          <div className="space-y-3">
            {news.slice(0, 5).map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (filteredConflicts.length * 0.1) + (index * 0.1) }}
                className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors cursor-pointer"
              >
                <h4 className="font-medium text-white text-sm mb-1 line-clamp-2">
                  {article.title}
                </h4>
                <p className="text-xs text-slate-400 mb-2">
                  {article.source} • {new Date(article.date).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-300 line-clamp-2">
                  Related to ongoing conflicts in the region
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="conflict-tracker-footer">
        <div className="text-xs text-slate-400 text-center">
          Data sources: ACLED, Crisis Group, NewsAPI
        </div>
      </div>
    </motion.div>
  );
}