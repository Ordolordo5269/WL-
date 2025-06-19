import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Calendar, Users, MapPin, ExternalLink, X, Globe, Filter, ChevronDown } from 'lucide-react';
import { Conflict } from '../data/conflicts-data';
import ConflictService from '../services/conflict-service';
import { NewsArticle } from '../services/news-api';
import { useConflictActions, ConflictActionHandlers } from '../services/conflict-actions';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conflicts' | 'news'>('conflicts');

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
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
        setError('Failed to load conflict data. Please try again later.');
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

  // Use conflict actions service
  const conflictActionHandlers: ConflictActionHandlers = {
    onCenterMap,
    onConflictSelect,
    onBack
  };
  
  const { handleConflictClick, handleBack } = useConflictActions(conflictActionHandlers);

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
      <div style={{
        padding: '16px 16px 16px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)'
      }}>
        {/* Main Title */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '16px', 
          paddingTop: '8px',
          marginLeft: '40px', // Espacio para evitar el botón del menú
          marginRight: '40px' // Espacio para evitar el botón de cerrar
        }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#ffffff',
            letterSpacing: '0.1em',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            margin: '0'
          }}>
            CONFLICT TRACKER
          </h1>
        </div>
        
        {/* Close Button - Top Right */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
          <motion.button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: 'linear-gradient(to right, rgba(239, 68, 68, 0.6), rgba(220, 38, 38, 0.6))',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(to right, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))';
              e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(to right, rgba(239, 68, 68, 0.6), rgba(220, 38, 38, 0.6))';
              e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <motion.button
            onClick={() => handleTabChange('conflicts')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-500 backdrop-blur-sm shadow-md ${
              activeTab === 'conflicts'
                ? 'bg-gradient-to-r from-red-500/25 to-orange-500/25 text-red-200 border border-red-400/50 shadow-red-500/20'
                : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 text-slate-300 hover:text-white hover:from-slate-700/70 hover:to-slate-600/70 border border-slate-600/40 hover:border-slate-500/60'
            }`}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <div className="flex flex-col items-center">
              <span>Conflicts</span>
              <span className="text-xs opacity-80 font-normal">({filteredConflicts.length})</span>
            </div>
          </motion.button>
          
          <motion.button
            onClick={() => handleTabChange('news')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-500 backdrop-blur-sm shadow-md ${
              activeTab === 'news'
                ? 'bg-gradient-to-r from-blue-500/25 to-cyan-500/25 text-blue-200 border border-blue-400/50 shadow-blue-500/20'
                : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 text-slate-300 hover:text-white hover:from-slate-700/70 hover:to-slate-600/70 border border-slate-600/40 hover:border-slate-500/60'
            }`}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <div className="flex flex-col items-center">
              <span>News</span>
              <span className="text-xs opacity-80 font-normal">({news.length})</span>
            </div>
          </motion.button>
        </div>
        
        {/* Filters */}
        {activeTab === 'conflicts' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 px-1">REGION</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gradient-to-r from-slate-800/70 to-slate-700/70 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 shadow-md backdrop-blur-sm"
              >
                <option value="All">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 px-1">STATUS</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gradient-to-r from-slate-800/70 to-slate-700/70 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 shadow-md backdrop-blur-sm"
              >
                <option value="All">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {activeTab === 'news' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-300 mb-1.5 px-1">REGION</label>
            <select
              value={selectedNewsRegion}
              onChange={(e) => setSelectedNewsRegion(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gradient-to-r from-slate-800/70 to-slate-700/70 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 shadow-md backdrop-blur-sm"
            >
              <option value="All">All Regions</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
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
            ) : error ? (
              <div className="p-6 bg-red-900/20 rounded-xl border border-red-500/20 text-center">
                <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-300 text-sm mb-1">Error Loading Data</p>
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            ) : filteredConflicts.length === 0 ? (
              <div className="p-6 bg-slate-800/20 rounded-xl border border-orange-500/10 text-center">
                <AlertTriangle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                <p className="text-slate-300 text-sm mb-1">No conflicts found</p>
                <p className="text-slate-400 text-xs">Try adjusting your filters</p>
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
                        <span className="font-medium">{formatCasualties(conflict.casualties)} casualties</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{new Date(conflict.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}</span>
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
                      {article.source} • {new Date(article.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
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