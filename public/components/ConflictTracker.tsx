import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conflict } from '../data/conflicts-data';
import ConflictService from '../services/conflict-service';
import { NewsArticle } from '../services/news-api';
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Calendar, Users, MapPin, ExternalLink } from 'lucide-react';

interface ConflictTrackerProps {
  onBack: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onConflictSelect?: (conflictId: string | null) => void;
}

export default function ConflictTracker({ onBack, onCenterMap, onConflictSelect }: ConflictTrackerProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedNewsRegion, setSelectedNewsRegion] = useState<string>('All');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conflicts' | 'news'>('conflicts');

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setNewsLoading(true);
        
        // Load conflicts immediately
        const conflictsData = ConflictService.getAllConflicts();
        setConflicts(conflictsData);
        setLoading(false);
        
        // Load news from NewsAPI
        const newsData = await ConflictService.getAllNews();
        setNews(newsData);
      } catch (error) {
        console.error('Error loading conflict data:', error);
        // Fallback to static data
        setConflicts(ConflictService.getAllConflicts());
      } finally {
        setNewsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load region-specific news when news region filter changes
  useEffect(() => {
    const loadRegionNews = async () => {
      if (activeTab === 'news' && selectedNewsRegion !== 'All') {
        try {
          setNewsLoading(true);
          // Get countries from the selected region
          const regionConflicts = ConflictService.getFilteredConflicts(selectedNewsRegion);
          const regionCountries = [...new Set(regionConflicts.map(c => c.country))];
          
          // Fetch news for all countries in the region
          const regionNewsPromises = regionCountries.map(country => 
            ConflictService.getNewsForCountry(country)
          );
          
          const regionNewsArrays = await Promise.all(regionNewsPromises);
          const regionNews = regionNewsArrays.flat();
          
          // Remove duplicates and sort by date
          const uniqueNews = regionNews.filter((news, index, self) => 
            index === self.findIndex(n => n.title === news.title)
          ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setNews(uniqueNews);
        } catch (error) {
          console.error('Error loading region news:', error);
        } finally {
          setNewsLoading(false);
        }
      } else if (activeTab === 'news' && selectedNewsRegion === 'All') {
        // Load general news when 'All' is selected
        const loadAllNews = async () => {
          try {
            setNewsLoading(true);
            const newsData = await ConflictService.getAllNews();
            setNews(newsData);
          } catch (error) {
            console.error('Error loading all news:', error);
          } finally {
            setNewsLoading(false);
          }
        };
        loadAllNews();
      }
    };

    loadRegionNews();
  }, [selectedNewsRegion, activeTab]);

  const getStatusColor = (status: 'War' | 'Warm' | 'Improving') => {
    return ConflictService.getStatusColor(status);
  };

  const getStatusIcon = (status: 'War' | 'Warm' | 'Improving') => {
    return ConflictService.getStatusIcon(status);
  };

  const formatCasualties = (casualties: number) => {
    return ConflictService.formatCasualties(casualties);
  };

  // Memoized data to prevent unnecessary recalculations
  const regions = useMemo(() => ConflictService.getAvailableRegions(), []);
  const statuses = useMemo(() => ConflictService.getAvailableStatuses(), []);

  const filteredConflicts = useMemo(() => 
    ConflictService.getFilteredConflicts(
      selectedRegion === 'All' ? undefined : selectedRegion,
      selectedStatus === 'All' ? undefined : selectedStatus as 'War' | 'Warm' | 'Improving'
    ), [selectedRegion, selectedStatus]
  );

  // Optimized handlers with useCallback
  const handleConflictClick = useCallback((conflict: Conflict) => {
    if (onCenterMap) {
      onCenterMap(conflict.coordinates);
    }
    setSelectedConflict(conflict);
    if (onConflictSelect) {
      onConflictSelect(conflict.id);
    }
  }, [onCenterMap, onConflictSelect]);

  // Limpiar selección cuando se cierra el tracker
  const handleBack = useCallback(() => {
    if (onConflictSelect) {
      onConflictSelect(null);
    }
    onBack();
  }, [onConflictSelect, onBack]);

  // Optimized tab change handler
  const handleTabChange = useCallback((tab: 'conflicts' | 'news') => {
    setActiveTab(tab);
  }, []);

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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <motion.button
              onClick={handleBack}
              className="relative p-3 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-slate-700/50 hover:border-blue-400/50 backdrop-blur-sm shadow-lg hover:shadow-blue-500/20 transition-all duration-500 group overflow-hidden"
              whileHover={{ scale: 1.05, rotateY: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <ArrowLeft className="relative h-5 w-5 text-slate-300 group-hover:text-blue-400 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            </motion.button>
            <h2 className="text-xl font-bold text-white bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              🌍 Conflict Tracker
            </h2>
            <div className="w-10"></div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-gradient-to-r from-slate-800/40 to-slate-900/60 rounded-2xl p-1.5 mb-4 border border-slate-700/30 backdrop-blur-sm shadow-xl">
            <motion.button
              onClick={() => handleTabChange('conflicts')}
              className={`relative flex-1 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-500 overflow-hidden group ${
                activeTab === 'conflicts'
                  ? 'bg-gradient-to-r from-blue-500/30 to-blue-600/40 text-blue-300 border border-blue-400/40 shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-gradient-to-r hover:from-slate-700/40 hover:to-slate-600/50'
              }`}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {activeTab === 'conflicts' && (
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-cyan-400/10 to-blue-500/20 rounded-xl"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              <div className="relative flex items-center justify-center">
                <AlertTriangle className={`h-4 w-4 mr-2 transition-all duration-300 ${
                  activeTab === 'conflicts' ? 'drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]' : ''
                }`} />
                Conflicts ({filteredConflicts.length})
              </div>
            </motion.button>
            <motion.button
              onClick={() => handleTabChange('news')}
              className={`relative flex-1 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-500 overflow-hidden group ${
                activeTab === 'news'
                  ? 'bg-gradient-to-r from-green-500/30 to-emerald-600/40 text-green-300 border border-green-400/40 shadow-lg shadow-green-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-gradient-to-r hover:from-slate-700/40 hover:to-slate-600/50'
              }`}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {activeTab === 'news' && (
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-400/10 to-green-500/20 rounded-xl"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              <div className="relative flex items-center justify-center">
                <TrendingUp className={`h-4 w-4 mr-2 transition-all duration-300 ${
                  activeTab === 'news' ? 'drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : ''
                }`} />
                News ({news.length}){selectedNewsRegion !== 'All' ? ` - ${selectedNewsRegion}` : ''}
              </div>
            </motion.button>
          </div>
        </div>
        
        {/* Filters */}
        {activeTab === 'conflicts' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Region</label>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-5 py-4 bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-slate-600/40 rounded-2xl text-white text-sm font-medium shadow-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60 focus:shadow-blue-500/20 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer"
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
                className="w-full px-5 py-4 bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-slate-600/40 rounded-2xl text-white text-sm font-medium shadow-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60 focus:shadow-blue-500/20 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'All' ? 'All Statuses' : status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {/* News Filters */}
        {activeTab === 'news' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Region</label>
              <select 
                value={selectedNewsRegion}
                onChange={(e) => setSelectedNewsRegion(e.target.value)}
                className="w-full px-5 py-4 bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-slate-600/40 rounded-2xl text-white text-sm font-medium shadow-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-400/60 focus:border-green-400/60 focus:shadow-green-500/20 hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-500 cursor-pointer"
              >
                {regions.map(region => (
                  <option key={region} value={region}>
                    {region === 'All' ? 'All Regions' : region}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="conflict-tracker-content">
        {/* Content based on active tab */}
        {activeTab === 'conflicts' ? (
          /* Active Conflicts */
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">
                Active Conflicts ({filteredConflicts.length})
              </h3>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                <p className="text-slate-400 mt-2">Loading conflicts...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredConflicts.map((conflict, index) => (
                  <motion.div
                    key={conflict.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative p-5 bg-gradient-to-br from-slate-800/30 to-slate-900/50 rounded-2xl border border-slate-600/30 hover:border-blue-400/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 cursor-pointer group overflow-hidden"
                    onClick={() => handleConflictClick(conflict)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="font-medium text-white">{conflict.country}</span>
                      </div>
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(conflict.status)}`}>
                        <span className="mr-1">{getStatusIcon(conflict.status)}</span>
                        {conflict.status}
                      </div>
                    </div>
                    
                    <p className="relative text-sm text-slate-300 mb-2">{conflict.description}</p>
                    
                    <div className="relative flex items-center justify-between text-xs text-slate-400">
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
            )}
          </div>
        ) : (
          /* Recent News */
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">
                Recent News ({news.length})
              </h3>
            </div>
            
            {newsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                <p className="text-slate-400 mt-2">Loading news...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {news.slice(0, 10).map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative p-5 bg-gradient-to-br from-slate-800/30 to-slate-900/50 rounded-2xl border border-slate-600/30 hover:border-green-400/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-500 cursor-pointer group overflow-hidden"
                    onClick={() => window.open(article.url, '_blank')}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <h4 className="relative font-medium text-white text-sm mb-1 line-clamp-2">
                      {article.title}
                    </h4>
                    <p className="relative text-xs text-slate-400 mb-2">
                      {article.source} • {new Date(article.date).toLocaleDateString()}
                    </p>
                    {article.description && (
                      <p className="relative text-xs text-slate-300 line-clamp-2">
                        {article.description}
                      </p>
                    )}
                  </motion.div>
                ))}
                {news.length === 0 && (
                  <div className="p-4 bg-slate-800/20 rounded-xl border border-blue-500/10 text-center">
                    <p className="text-slate-400 text-sm">No news available at the moment</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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