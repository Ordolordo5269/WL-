import { useState, useMemo } from 'react';
import { INDICATOR_CONFIGS, CATEGORIES } from './services/indicator-config';
import type { IndicatorCategory } from './services/indicator-config';
import type { ChoroplethState } from './useChoropleth';

interface StatisticsPanelProps {
  choropleth: ChoroplethState;
}

export default function StatisticsPanel({ choropleth }: StatisticsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | IndicatorCategory>('All');

  const filteredIndicators = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return INDICATOR_CONFIGS.filter(cfg => {
      const matchesTab = activeTab === 'All' || cfg.category === activeTab;
      const matchesSearch = !q || cfg.name.toLowerCase().includes(q) || cfg.description.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [searchQuery, activeTab]);

  const visibleCount = choropleth.activeIndicator ? 1 : 0;

  return (
    <div className="stats-panel">
      {/* Header */}
      <div className="stats-panel-header">
        <div className="stats-panel-title">
          <div className="stats-panel-icon">
            <svg viewBox="0 0 16 16" strokeWidth="1.5">
              <rect x="2" y="8" width="3" height="6" rx="1" />
              <rect x="6.5" y="4" width="3" height="10" rx="1" />
              <rect x="11" y="1" width="3" height="13" rx="1" />
            </svg>
          </div>
          Statistics
        </div>
        <span className="stats-panel-badge">{INDICATOR_CONFIGS.length} indicators</span>
      </div>

      {/* Search */}
      <div className="stats-search-box">
        <div className="stats-search-wrap">
          <svg viewBox="0 0 16 16" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            className="stats-search-input"
            type="text"
            placeholder="Search indicators..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="stats-category-tabs">
        <button
          className={`stats-category-tab ${activeTab === 'All' ? 'active' : ''}`}
          onClick={() => setActiveTab('All')}
        >All</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`stats-category-tab ${activeTab === cat ? 'active' : ''}`}
            onClick={() => setActiveTab(cat)}
          >{cat}</button>
        ))}
      </div>

      {/* Indicator List */}
      <div className="stats-indicator-list">
        {filteredIndicators.map(cfg => {
          const isActive = choropleth.activeIndicator === cfg.id;
          return (
            <div key={cfg.id}>
              <div className="stats-indicator-row">
                <div className="stats-indicator-accent" style={{ backgroundColor: cfg.accentColor }} />
                <div className="stats-indicator-info">
                  <div className="stats-indicator-name">{cfg.name}</div>
                  <div className="stats-indicator-meta">{cfg.description}</div>
                </div>
                <button
                  className={`stats-toggle ${isActive ? 'on' : ''}`}
                  onClick={() => choropleth.handleToggleIndicator(cfg.id)}
                  aria-pressed={isActive}
                  aria-label={`Toggle ${cfg.name}`}
                />
              </div>
              {/* Legend (shown when active) */}
              {isActive && choropleth.activeLegend.length > 0 && (
                <div className="stats-indicator-legend">
                  <div className="legend-card">
                    <div className="legend-label">Legend</div>
                    <div className="choropleth-legend-bar">
                      {choropleth.activeLegend.map((b, i) => (
                        <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                      ))}
                    </div>
                    <div className="choropleth-legend-scale">
                      <span>low</span>
                      <span>high</span>
                    </div>
                    <div className="legend-source">Source: World Bank ({cfg.sourceCode})</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredIndicators.length === 0 && (
          <div style={{ padding: '20px 14px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
            No indicators match your search
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="stats-panel-footer">
        <span className="stats-visible-count">{visibleCount} visible</span>
        <button className="stats-footer-btn" onClick={choropleth.handleHideAll}>Hide all</button>
      </div>
    </div>
  );
}
