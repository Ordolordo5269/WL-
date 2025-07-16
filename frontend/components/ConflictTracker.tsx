import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, TrendingUp, Calendar, Users, MapPin, ExternalLink, X } from 'lucide-react';
import type { Conflict } from '../src/types';
import ConflictService from '../services/conflict-service';
import type { NewsArticle } from '../src/types';
import { useConflictActions, type ConflictActionHandlers } from '../services/conflict-actions';
import ConflictDetailCard from './ConflictDetailCard';

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
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);

  // Helper function to load news
  const loadNews = useCallback(async (region?: string) => {
    try {
      setNewsLoading(true);
      let newsData: NewsArticle[];

      if (region && region !== 'All') {
        // Get countries from the selected region
        const regionConflicts = ConflictService.getFilteredConflicts(region);
        const regionCountries = [...new Set(regionConflicts.map(c => c.country))];
        
        // Fetch news for all countries in the region
        const regionNewsPromises = regionCountries.map(country => 
          ConflictService.getNewsForCountry(country)
        );
        
        const regionNewsArrays = await Promise.all(regionNewsPromises);
        const regionNews = regionNewsArrays.flat();
        
        // Remove duplicates and sort by date
        newsData = regionNews.filter((news, index, self) => 
          index === self.findIndex(n => n.title === news.title)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } else {
        // Load general news
        newsData = await ConflictService.getAllNews();
      }
      
      setNews(newsData);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Load conflicts immediately
        const conflictsData = ConflictService.getAllConflicts();
        setConflicts(conflictsData);
        setLoading(false);
        
        // Load initial news
        await loadNews();
      } catch (error) {
        console.error('Error loading conflict data:', error);
        setError('Failed to load conflict data. Please try again later.');
        // Fallback to static data
        setConflicts(ConflictService.getAllConflicts());
      }
    };

    loadData();
  }, [loadNews]);

  // Load region-specific news when news region filter changes
  useEffect(() => {
    if (activeTab === 'news') {
      loadNews(selectedNewsRegion);
    }
  }, [selectedNewsRegion, activeTab, loadNews]);



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

  // Enhanced conflict click handler for detailed view
  const handleConflictClickEnhanced = (conflict: Conflict) => {
    // For Ukraine conflict, show detailed view AND center map
    if (conflict.id === 'russia-ukraine-war') {
      setSelectedConflict(conflict);
      // Also center the map on Ukraine and show the marker
      if (onCenterMap) {
        onCenterMap(conflict.coordinates);
      }
      // Show the conflict marker on the map
      if (onConflictSelect) {
        onConflictSelect(conflict.id);
      }
    } else {
      // For other conflicts, use the original handler
      handleConflictClick(conflict);
    }
  };

  const handleBackToConflicts = () => {
    setSelectedConflict(null);
    // Clear the map selection when going back
    if (onConflictSelect) {
      onConflictSelect(null);
    }
  };

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
        <h1 className="conflict-tracker-title">CONFLICT TRACKER</h1>
        <button onClick={handleBack} className="conflict-tracker-close-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      {!selectedConflict && (
        <>
          {/* Tab Navigation */}
          <div className="conflict-tracker-tabs">
            <button
              className={`conflict-tracker-tab${activeTab === 'conflicts' ? ' active' : ''}`}
              onClick={() => handleTabChange('conflicts')}
            >
              <AlertTriangle size={16} />
              Conflicts <span className="conflict-tracker-tab-count">({filteredConflicts.length})</span>
            </button>
            <button
              className={`conflict-tracker-tab${activeTab === 'news' ? ' active' : ''}`}
              onClick={() => handleTabChange('news')}
            >
              <TrendingUp size={16} />
              News <span className="conflict-tracker-tab-count">({news.length})</span>
            </button>
          </div>

          {/* Filters */}
          {activeTab === 'conflicts' && (
            <div className="conflict-tracker-selects">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
              >
                <option value="All">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'news' && (
            <div className="conflict-tracker-selects">
              <select
                value={selectedNewsRegion}
                onChange={(e) => setSelectedNewsRegion(e.target.value)}
              >
                <option value="All">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* Content */}
      <div className="conflict-tracker-content">
        {activeTab === 'conflicts' ? (
          <div>
            {selectedConflict ? (
              // Detailed view for selected conflict
              <div className="conflict-detail-view">
                <ConflictDetailCard conflict={selectedConflict} onBack={handleBackToConflicts} />
              </div>
            ) : (
              // Regular conflicts list
              <div>
                <div className="conflict-tracker-section-header">
                  <AlertTriangle className="icon" />
                  <h3>Active Conflicts ({filteredConflicts.length})</h3>
                </div>
                {loading ? (
                  <div className="conflict-tracker-loading">
                    <div className="spinner"></div>
                    <p>Loading conflicts...</p>
                  </div>
                ) : error ? (
                  <div className="conflict-tracker-empty">
                    <AlertTriangle className="icon" style={{color: 'rgb(248, 113, 113)'}} />
                    <p style={{color: 'rgb(252, 165, 165)'}}>Error Loading Data</p>
                    <p style={{color: 'rgb(248, 113, 113)'}}>{error}</p>
                  </div>
                ) : filteredConflicts.length === 0 ? (
                  <div className="conflict-tracker-empty">
                    <AlertTriangle className="icon" />
                    <p>No conflicts found</p>
                    <p>Try adjusting your filters</p>
                  </div>
                ) : (
                  <div>
                    {filteredConflicts.map((conflict, index) => (
                      <div
                        key={conflict.id}
                        className="conflict-card"
                        onClick={() => handleConflictClickEnhanced(conflict)}
                      >
                        <div className="conflict-card-header">
                          <MapPin size={16} /> {conflict.country}
                          <span className="conflict-card-status">{conflict.status}</span>
                        </div>
                        <div className="conflict-card-description">{conflict.description}</div>
                        <div className="conflict-card-meta">
                          <span><Users size={14} /> {ConflictService.formatCasualties(conflict.casualties)} casualties</span>
                          <span><Calendar size={14} /> {new Date(conflict.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="conflict-tracker-section-header">
              <TrendingUp className="icon" />
              <h3>Recent News ({news.length})</h3>
            </div>
            {newsLoading ? (
              <div className="conflict-tracker-loading">
                <div className="spinner"></div>
                <p>Loading news...</p>
              </div>
            ) : (
              <div>
                {news.slice(0, 10).map((article, index) => (
                  <div
                    key={article.id}
                    className="conflict-card news"
                    onClick={() => window.open(article.url, '_blank')}
                  >
                    <div className="conflict-card-header">
                      <ExternalLink size={16} /> {article.title}
                    </div>
                    <div className="conflict-card-description">{article.description}</div>
                    <div className="conflict-card-meta">
                      <span>{article.source}</span>
                      <span><Calendar size={14} /> {new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
                {news.length === 0 && (
                  <div className="conflict-tracker-empty">
                    <ExternalLink className="icon" />
                    <p>No news available at the moment</p>
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