import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, TrendingUp, Calendar, Users, MapPin, ExternalLink, X } from 'lucide-react';
import type { Conflict } from '../src/types';
import ConflictService from '../services/conflict-service';
import type { NewsArticle } from '../src/types';
import { useConflictActions, type ConflictActionHandlers } from '../services/conflict-actions';
import ConflictDetailCard from './ConflictDetailCard';
import ConflictSearchBar from './ConflictSearchBar';
import ConflictFilters, { type AdvancedFilters } from './ConflictFilters';
import ConflictAPIService, { type ConflictFilters as APIFilters } from '../services/conflict-api';
import { useConflictWebSocket } from '../hooks/useConflictWebSocket';

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
  
  // New state for enhanced filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, hasMore: false });
  const conflictsRef = useRef<Conflict[]>([]);

  // Helper function to load news
  const loadNews = useCallback(async (region?: string) => {
    try {
      setNewsLoading(true);
      let newsData: NewsArticle[];

      if (region && region !== 'All') {
        // Get countries from the selected region
        const regionConflicts = await ConflictService.getFilteredConflicts(region);
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

  // Reset page to 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [selectedRegion, selectedStatus, searchQuery, advancedFilters]);

  // Load conflicts with filters
  useEffect(() => {
    const loadConflicts = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Build API filters
        const apiFilters: APIFilters = {
          page: pagination.page,
          limit: 20
        };
        
        if (selectedRegion !== 'All') apiFilters.region = selectedRegion;
        if (selectedStatus !== 'All') {
          apiFilters.status = selectedStatus.toUpperCase() as 'WAR' | 'WARM' | 'IMPROVING';
        }
        if (searchQuery) apiFilters.search = searchQuery;
        
        // Add advanced filters
        if (advancedFilters.activeOnly) apiFilters.activeOnly = true;
        if (advancedFilters.sortBy) apiFilters.sortBy = advancedFilters.sortBy;
        if (advancedFilters.sortOrder) apiFilters.sortOrder = advancedFilters.sortOrder;
        
        const result = await ConflictAPIService.getAllConflicts(apiFilters);
        setConflicts(result.data);
        conflictsRef.current = result.data;
        setPagination(result.pagination);
        setLoading(false);
      } catch (error) {
        console.error('Error loading conflict data:', error);
        setError('Failed to load conflict data. Please try again later.');
        // Fallback to static data
        setConflicts(ConflictService.getAllConflictsSync());
        setLoading(false);
      }
    };

    loadConflicts();
  }, [selectedRegion, selectedStatus, searchQuery, advancedFilters, pagination.page]);

  // WebSocket: listen for realtime conflict updates
  useConflictWebSocket((update) => {
    setConflicts((prev) => {
      let next = prev;
      switch (update.type) {
        case 'created':
          if (update.data) {
            next = [update.data as Conflict, ...prev];
          }
          break;
        case 'updated':
        case 'status-changed':
        case 'casualty-updated':
          if (update.data) {
            next = prev.map(c => c.id === update.id ? { ...c, ...(update.data as Partial<Conflict>) } : c);
          }
          break;
        case 'deleted':
          next = prev.filter(c => c.id !== update.id);
          break;
      }
      conflictsRef.current = next;
      return next;
    });
  });

  // Load region-specific news when news region filter changes
  useEffect(() => {
    if (activeTab === 'news') {
      loadNews(selectedNewsRegion);
    }
  }, [selectedNewsRegion, activeTab, loadNews]);

  // Memoized data to prevent unnecessary recalculations
  const regions = useMemo(() => ConflictService.getAvailableRegions(), []);
  const statuses = useMemo(() => ConflictService.getAvailableStatuses(), []);
  
  // Get available conflict types from conflicts
  const availableConflictTypes = useMemo(() => {
    const types = new Set<string>();
    conflicts.forEach(c => {
      if (c.conflictType) types.add(c.conflictType);
    });
    return Array.from(types).sort();
  }, [conflicts]);

  // Use conflicts directly (already filtered by API)
  const filteredConflicts = conflicts;

  // Enhanced conflict click handler
  const handleConflictClickEnhanced = (conflict: Conflict) => {
    setSelectedConflict(conflict);
    if (onConflictSelect) {
      onConflictSelect(conflict.id);
    }
    if (onCenterMap) {
      onCenterMap(conflict.coordinates);
    }
  };

  // Back to conflicts list
  const handleBackToConflicts = () => {
    setSelectedConflict(null);
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
          <h1 className="conflict-tracker-title">CONFLICT TRACKER</h1>
          <button onClick={onBack} className="conflict-tracker-close-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="conflict-tracker-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
            <div style={{ color: '#94a3b8' }}>Loading conflict data...</div>
          </div>
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
        <button onClick={onBack} className="conflict-tracker-close-btn">
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
              Conflicts <span className="conflict-tracker-tab-count">({filteredConflicts.length})</span>
            </button>
            <button
              className={`conflict-tracker-tab${activeTab === 'news' ? ' active' : ''}`}
              onClick={() => handleTabChange('news')}
            >
              News <span className="conflict-tracker-tab-count">({news.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          {activeTab === 'conflicts' && (
            <div style={{ padding: '8px 16px' }}>
              <ConflictSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search conflicts..."
              />
            </div>
          )}

          {/* Basic Filters */}
          {activeTab === 'conflicts' && (
            <div className="conflict-tracker-selects">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="conflict-tracker-filter-select"
              >
                <option value="All">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="conflict-tracker-filter-select"
              >
                <option value="All">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          )}

          {/* Advanced Filters */}
          {activeTab === 'conflicts' && (
            <div style={{ padding: '0 16px 8px' }}>
              <ConflictFilters
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                availableConflictTypes={availableConflictTypes}
                onClear={() => {
                  setAdvancedFilters({});
                  setSearchQuery('');
                  setSelectedRegion('All');
                  setSelectedStatus('All');
                }}
              />
            </div>
          )}
          {activeTab === 'news' && (
            <div className="conflict-tracker-selects">
              <select
                value={selectedNewsRegion}
                onChange={(e) => setSelectedNewsRegion(e.target.value)}
                className="conflict-tracker-filter-select"
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
        {selectedConflict ? (
          // Detailed view for selected conflict
          <ConflictDetailCard conflict={selectedConflict} onBack={handleBackToConflicts} />
        ) : (
          // Regular conflicts list or news
          <div>
            {activeTab === 'conflicts' ? (
              <div>
                <div className="conflict-tracker-section-header">
                  <AlertTriangle size={16} strokeWidth={1.5} />
                  <h3>Active Conflicts ({filteredConflicts.length})</h3>
                </div>
                {error ? (
                  <div className="conflict-tracker-empty">
                    <AlertTriangle size={20} strokeWidth={1.5} style={{ color: '#fca5a5' }} />
                    <p style={{ color: '#fca5a5' }}>Error Loading Data</p>
                    <p style={{ color: '#fca5a5' }}>{error}</p>
                  </div>
                ) : filteredConflicts.length === 0 ? (
                  <div className="conflict-tracker-empty">
                    <AlertTriangle size={20} strokeWidth={1.5} />
                    <p>No conflicts found</p>
                    <p>Try adjusting your filters</p>
                  </div>
                ) : (
                  <div>
                    {filteredConflicts.length > 0 ? (
                      <>
                        {filteredConflicts.map((conflict) => (
                          <motion.div
                            key={conflict.id}
                            className="conflict-card"
                            onClick={() => handleConflictClickEnhanced(conflict)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="conflict-card-header">
                              <MapPin size={16} strokeWidth={1.5} /> {conflict.country}
                              <span className={`conflict-card-status status-${conflict.status.toLowerCase()}`}>{conflict.status}</span>
                            </div>
                            <div className="conflict-card-description">{conflict.description}</div>
                            <div className="conflict-card-meta">
                              <span><Users size={14} strokeWidth={1.5} /> <strong>{ConflictService.formatCasualties(conflict.casualties)}</strong> casualties</span>
                              <span><Calendar size={14} strokeWidth={1.5} /> {new Date(conflict.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                          </motion.div>
                        ))}
                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                          <div className="conflict-pagination">
                            <button
                              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                              disabled={pagination.page === 1}
                              className="pagination-btn"
                            >
                              Previous
                            </button>
                            <span className="pagination-info">
                              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                            </span>
                            <button
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                              disabled={!pagination.hasMore}
                              className="pagination-btn"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="conflict-tracker-empty">
                        <AlertTriangle size={20} strokeWidth={1.5} />
                        <p>No conflicts found</p>
                        <p>Try adjusting your filters</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="conflict-tracker-section-header">
                  <TrendingUp size={16} strokeWidth={1.5} />
                  <h3>Recent News ({news.length})</h3>
                </div>
                {newsLoading ? (
                  <div className="conflict-tracker-loading">
                    <div style={{ width: '20px', height: '20px', border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p>Loading news...</p>
                  </div>
                ) : (
                  <div>
                    {news.slice(0, 10).map((article) => (
                      <div
                        key={article.id}
                        className="conflict-card news"
                        onClick={() => window.open(article.url, '_blank')}
                      >
                        <div className="conflict-card-header">
                          <ExternalLink size={16} strokeWidth={1.5} /> {article.title}
                        </div>
                        <div className="conflict-card-description">{article.description}</div>
                        <div className="conflict-card-meta">
                          <span>{article.source}</span>
                          <span><Calendar size={14} strokeWidth={1.5} /> {new Date(article.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    ))}
                    {news.length === 0 && (
                      <div className="conflict-tracker-empty">
                        <ExternalLink size={20} strokeWidth={1.5} />
                        <p>No news available at the moment</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="conflict-tracker-footer">
        <p className="footer-text">
          Data sources: <a href="#" className="footer-sources">ACLED</a>, <a href="#" className="footer-sources">Crisis Group</a>, <a href="#" className="footer-sources">NewsAPI</a>
        </p>
      </div>
    </motion.div>
  );
}