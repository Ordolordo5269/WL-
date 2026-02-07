import React from 'react';
import type { Conflict } from '../src/types';

interface ConflictFactionsProps {
  conflict: Conflict;
}

const ConflictFactions: React.FC<ConflictFactionsProps> = ({ conflict }) => {
  if (!conflict.factions) {
    return null;
  }

  const getFactionIconClass = (factionName: string) => {
    const iconClasses = {
      ukraine: 'faction-icon blue',
      russia: 'faction-icon red',
      default: 'faction-icon'
    };
    return iconClasses[factionName as keyof typeof iconClasses] || iconClasses.default;
  };

  const getAllyTagClass = (ally: string) => {
    const allyClasses: { [key: string]: string } = {
      'United States': 'faction-tag',
      'European Union': 'faction-tag',
      'United Kingdom': 'faction-tag',
      'NATO (support, not direct)': 'faction-tag',
      'Belarus': 'faction-tag red',
      'Iran (drone supply)': 'faction-tag green',
      'North Korea (ammunition)': 'faction-tag red',
      'China (diplomatic support)': 'faction-tag yellow'
    };
    return allyClasses[ally] || 'faction-tag';
  };

  return (
    <div>
      {Object.entries(conflict.factions).map(([factionName, faction]) => (
        <div key={factionName} className="faction-card">
          <div className="faction-header">
            <div className={getFactionIconClass(factionName)}>
              {factionName.charAt(0).toUpperCase()}
            </div>
            <h3 className="faction-name">
              {factionName.charAt(0).toUpperCase() + factionName.slice(1)}
            </h3>
          </div>

          {/* Allies */}
          {faction.allies && faction.allies.length > 0 && (
            <div className="faction-section">
              <h4 className="faction-section-title">Allies</h4>
              <div className="faction-tags">
                {faction.allies.map((ally) => (
                  <span key={ally} className={getAllyTagClass(ally)}>
                    {ally}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          {faction.goals && faction.goals.length > 0 && (
            <div className="faction-section">
              <h4 className="faction-section-title">Goals</h4>
              <ul className="faction-list">
                {faction.goals.map((goal, index) => (
                  <li key={index}>{goal}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Military Support */}
          {faction.militarySupport && (
            <div className="faction-section">
              <h4 className="faction-section-title">Military Support</h4>
              {faction.militarySupport.weapons && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Weapons:</span>
                  <div className="faction-tags" style={{ marginTop: 4 }}>
                    {faction.militarySupport.weapons.map((weapon) => (
                      <span key={weapon} className="faction-tag">
                        {weapon}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {faction.militarySupport.aidValue && (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '8px 0' }}>
                  <strong>Aid value:</strong> {faction.militarySupport.aidValue}
                </p>
              )}
              {faction.militarySupport.strategicAssets && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Strategic assets:</span>
                  <div className="faction-tags" style={{ marginTop: 4 }}>
                    {faction.militarySupport.strategicAssets.map((asset) => (
                      <span key={asset} className="faction-tag red">
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ConflictFactions; 