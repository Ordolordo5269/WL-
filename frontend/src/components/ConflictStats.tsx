import React from 'react';
import type { Conflict } from '../src/types';
import { Users, Home, Calendar, Link, Shield } from 'lucide-react';

interface ConflictStatsProps {
  conflict: Conflict;
}

const ConflictStats: React.FC<ConflictStatsProps> = ({ conflict }) => {
  if (!conflict.casualtiesDetailed && !conflict.displacedPersons) {
    return (
      <div className="section-content">
        <p>No detailed statistics available for this conflict.</p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-GB').format(num);
  };

  return (
    <div>
      {/* Military Casualties */}
      {conflict.casualtiesDetailed?.military && (
        <div className="content-section">
          <h4 className="section-title">
            <Shield size={14} />
            Military
          </h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">
                {formatNumber(Object.values(conflict.casualtiesDetailed.military).reduce((sum, val) => sum + val, 0))}
              </span>
            </div>
            {Object.entries(conflict.casualtiesDetailed.military).map(([key, value]) => (
              <div key={key} className="stat-item">
                <span className="stat-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <span className="stat-value">{formatNumber(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Civilian Casualties */}
      {conflict.casualtiesDetailed?.civilian && (
        <div className="content-section">
          <h4 className="section-title">
            <Users size={14} />
            Civilians
          </h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total deaths</span>
              <span className="stat-value">{formatNumber(conflict.casualtiesDetailed.civilian.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Displaced Persons */}
      {conflict.displacedPersons && (
        <div className="content-section">
          <h4 className="section-title">
            <Home size={14} />
            Displaced
          </h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{formatNumber(conflict.displacedPersons)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Key Dates */}
      {(conflict.startDate || conflict.escalationDate) && (
        <div className="content-section">
          <h4 className="section-title">
            <Calendar size={14} />
            Key Dates
          </h4>
          <div className="stats-grid">
            {conflict.startDate && (
              <div className="stat-item">
                <span className="stat-label">Start date</span>
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
      )}

      {/* Sources */}
      {conflict.sources && conflict.sources.length > 0 && (
        <div className="content-section">
          <h4 className="section-title">
            <Link size={14} />
            Sources
          </h4>
          <div className="section-content">
            <p>{conflict.sources.join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictStats; 