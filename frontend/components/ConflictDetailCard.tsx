import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
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

  const getStatusBadge = (status: string) => {
    let badgeClass = 'detail-badge';
    if (status === 'War') badgeClass += ' status-war';
    if (status === 'Warm') badgeClass += ' status-warm';
    if (status === 'Improving') badgeClass += ' status-improving';
    return <span className={badgeClass}>{status}</span>;
  };

  return (
    <div className="detail-card conflict-detail-view">
      {/* Header */}
      <div className="detail-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' }}>
        <h2 className="detail-title" style={{ marginBottom: 0, textAlign: 'center' }}>{conflict.country}</h2>
        {onBack && (
          <button
            onClick={onBack}
            title="Back to conflicts"
            style={{
              background: 'transparent',
              border: '1.5px solid #2563eb',
              color: '#2563eb',
              borderRadius: '6px',
              padding: '4px 7px',
              cursor: 'pointer',
              transition: 'background 0.18s, color 0.18s, border 0.18s',
              position: 'absolute',
              right: 0,
              display: 'flex',
              alignItems: 'center',
              fontSize: '1.1rem',
              opacity: 0.85
            }}
            onMouseOver={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#2563eb22';
              (e.currentTarget as HTMLButtonElement).style.color = '#60a5fa';
              (e.currentTarget as HTMLButtonElement).style.border = '1.5px solid #60a5fa';
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#2563eb';
              (e.currentTarget as HTMLButtonElement).style.border = '1.5px solid #2563eb';
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{ width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="detail-block">
                <div className="detail-block-title">Description</div>
                <div className="detail-block-content">{conflict.description}</div>
                <div className="detail-block-title mt-4">Basic Information</div>
                <div className="detail-block-content">
                  <div className="flex justify-between mb-1">
                    <span>Start date:</span>
                    <span>{new Date(conflict.date).toLocaleDateString('en-GB')}</span>
                  </div>
                  {conflict.startDate && conflict.startDate !== conflict.date && (
                    <div className="flex justify-between mb-1">
                      <span>Conflict started:</span>
                      <span>{new Date(conflict.startDate).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                  {conflict.escalationDate && (
                    <div className="flex justify-between mb-1">
                      <span>Escalation:</span>
                      <span>{new Date(conflict.escalationDate).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </div>
                <div className="detail-block-title mt-4">Impact</div>
                <div className="detail-block-content">
                  <div className="flex justify-between mb-1">
                    <span>Total casualties:</span>
                    <span>{conflict.casualties.toLocaleString('en-GB')}</span>
                  </div>
                  {conflict.displacedPersons && (
                    <div className="flex justify-between mb-1">
                      <span>Displaced persons:</span>
                      <span>{conflict.displacedPersons.toLocaleString('en-GB')}</span>
                    </div>
                  )}
                </div>
                
                {/* Ukraine API Legend - Only show for Russia-Ukraine conflict */}
                {conflict.id === 'russia-ukraine-war' && (
                  <>
                    <div className="detail-block-title mt-4">Real-time Map Data</div>
                    <div className="detail-block-content">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-green-400">Live Ukraine frontline data</span>
                      </div>
                      <div className="text-sm text-slate-300 mb-3">
                        <span className="font-medium">Source:</span>{' '}
                        <a 
                          href="https://deepstatemap.live" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          DeepStateMap
                        </a>
                      </div>
                      
                      {/* Map Legend */}
                      <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="text-sm font-medium text-slate-200 mb-2">Map Legend:</div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-slate-300">Red: Russian-controlled territories</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-slate-300">Blue: Points of interest</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span className="text-slate-300">Lines: Battle fronts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {activeTab === 'factions' && (
              <div className="detail-block">
                <div className="detail-block-title">Factions & Allies</div>
                <ConflictFactions conflict={conflict} />
              </div>
            )}
            {activeTab === 'timeline' && (
              <div className="detail-block">
                <div className="detail-block-title">Timeline & International Response</div>
                <ConflictTimeline conflict={conflict} />
              </div>
            )}
            {activeTab === 'stats' && (
              <div className="detail-block">
                <div className="detail-block-title">Detailed Statistics</div>
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