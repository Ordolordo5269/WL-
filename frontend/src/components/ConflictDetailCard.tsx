import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, Calendar, Users, Home, Link, Shield } from 'lucide-react';
import type { Conflict } from '../src/types';
import ConflictFactions from './ConflictFactions';
import ConflictTimeline from './ConflictTimeline';
import ConflictStats from './ConflictStats';

interface ConflictDetailCardProps {
  conflict: Conflict;
  onBack?: () => void;
}

const ConflictDetailCard: React.FC<ConflictDetailCardProps> = ({ conflict, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'factions' | 'timeline' | 'stats'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'factions', label: 'Factions' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'stats', label: 'Statistics' }
  ] as const;

  return (
    <div className="conflict-detail-view">
      {/* Header */}
      <div className="conflict-detail-header">
        <h2 className="conflict-detail-title">{conflict.country}</h2>
        {onBack && (
          <button
            onClick={onBack}
            title="Back to conflicts"
            className="conflict-detail-back-btn"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="conflict-tracker-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`conflict-tracker-tab${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <>
                <div className="content-section">
                  <h3 className="section-title">
                    <FileText size={16} />
                    Description
                  </h3>
                  <p className="section-content">{conflict.description}</p>
                </div>

                <div className="content-section">
                  <h3 className="section-title">
                    <Calendar size={16} />
                    Basic Information
                  </h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Start date</span>
                      <span className="stat-value">{new Date(conflict.date).toLocaleDateString('en-GB')}</span>
                    </div>
                    {conflict.startDate && conflict.startDate !== conflict.date && (
                      <div className="stat-item">
                        <span className="stat-label">Conflict started</span>
                        <span className="stat-value">{new Date(conflict.startDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                    {conflict.escalationDate && (
                      <div className="stat-item">
                        <span className="stat-label">Escalation</span>
                        <span className="stat-value">{new Date(conflict.escalationDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="content-section">
                  <h3 className="section-title">
                    <Users size={16} />
                    Impact
                  </h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Total casualties</span>
                      <span className="stat-value">{conflict.casualties.toLocaleString('en-GB')}</span>
                    </div>
                    {conflict.displacedPersons && (
                      <div className="stat-item">
                        <span className="stat-label">Displaced persons</span>
                        <span className="stat-value">{conflict.displacedPersons.toLocaleString('en-GB')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Ukraine API Legend - Only show for Russia-Ukraine conflict */}
                {conflict.id === 'russia-ukraine-war' && (
                  <div className="content-section">
                    <h3 className="section-title">
                      <Shield size={16} />
                      Real-time Map Data
                    </h3>
                    <div className="section-content">
                      <p>Live Ukraine frontline data</p>
                      <p>
                        <strong>Source:</strong>{' '}
                        <a 
                          href="https://deepstatemap.live" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="footer-sources"
                        >
                          DeepStateMap
                        </a>
                      </p>
                      
                      {/* Map Legend */}
                      <div className="map-legend">
                        <h4 className="legend-title">Map Legend</h4>
                        <div className="legend-items">
                          <div className="legend-item">
                            <div className="legend-color red"></div>
                            <p className="legend-text">Red: Russian-controlled territories</p>
                          </div>
                          <div className="legend-item">
                            <div className="legend-color blue"></div>
                            <p className="legend-text">Blue: Points of interest</p>
                          </div>
                          <div className="legend-item">
                            <div className="legend-color gray"></div>
                            <p className="legend-text">Lines: Battle fronts</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'factions' && (
              <div className="factions-section">
                <ConflictFactions conflict={conflict} />
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="timeline-section">
                <ConflictTimeline conflict={conflict} />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="content-section">
                <h3 className="section-title">
                  <Link size={16} />
                  Detailed Statistics
                </h3>
                <ConflictStats conflict={conflict} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConflictDetailCard; 