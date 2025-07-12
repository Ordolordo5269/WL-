import React from 'react';
import type { Conflict } from '../src/types';

interface ConflictFactionsProps {
  conflict: Conflict;
}

const ConflictFactions: React.FC<ConflictFactionsProps> = ({ conflict }) => {
  if (!conflict.factions) {
    return null;
  }

  const getFactionColor = (factionName: string) => {
    const colors = {
      ukraine: '#2563eb', // blue
      russia: '#dc2626', // red
      default: '#64748b'
    };
    return colors[factionName as keyof typeof colors] || colors.default;
  };

  const getAllyColor = (ally: string) => {
    const allyColors: { [key: string]: string } = {
      'United States': '#2563eb',
      'European Union': '#1e40af',
      'United Kingdom': '#2563eb',
      'NATO (support, not direct)': '#60a5fa',
      'Belarus': '#dc2626',
      'Iran (drone supply)': '#22c55e',
      'North Korea (ammunition)': '#f87171',
      'China (diplomatic support)': '#fbbf24'
    };
    return allyColors[ally] || '#64748b';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      {Object.entries(conflict.factions).map(([factionName, faction]) => (
        <div
          key={factionName}
          style={{
            background: 'rgba(30,41,59,0.85)',
            borderRadius: '12px',
            padding: '16px',
            border: `1.5px solid ${getFactionColor(factionName)}`,
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: getFactionColor(factionName),
                marginRight: 10
              }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.08rem', color: '#fff', letterSpacing: '0.02em' }}>
              {factionName.charAt(0).toUpperCase() + factionName.slice(1)}
            </span>
          </div>

          {/* Allies */}
          {faction.allies && faction.allies.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#60a5fa', fontWeight: 500, fontSize: '0.98rem', marginBottom: 2 }}>Allies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {faction.allies.map((ally) => (
                  <span
                    key={ally}
                    style={{
                      background: 'rgba(37,99,235,0.08)',
                      border: `1px solid ${getAllyColor(ally)}`,
                      color: getAllyColor(ally),
                      borderRadius: 8,
                      padding: '2px 10px',
                      fontSize: '0.97rem',
                      fontWeight: 500,
                      marginBottom: 2
                    }}
                  >
                    {ally}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          {faction.goals && faction.goals.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#60a5fa', fontWeight: 500, fontSize: '0.98rem', marginBottom: 2 }}>Goals</div>
              <ul style={{ color: '#e0e7ef', fontSize: '0.97rem', margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                {faction.goals.map((goal, index) => (
                  <li key={index} style={{ marginBottom: 2 }}>{goal}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Military Support */}
          {faction.militarySupport && (
            <div>
              <div style={{ color: '#60a5fa', fontWeight: 500, fontSize: '0.98rem', marginBottom: 2 }}>Military Support</div>
              {faction.militarySupport.weapons && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#a5b4fc', fontSize: '0.96rem', marginRight: 4 }}>Weapons:</span>
                  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                    {faction.militarySupport.weapons.map((weapon) => (
                      <span key={weapon} style={{ background: '#172554', color: '#e0e7ef', borderRadius: 6, padding: '2px 8px', fontSize: '0.95rem', marginRight: 2 }}>{weapon}</span>
                    ))}
                  </span>
                </div>
              )}
              {faction.militarySupport.aidValue && (
                <div style={{ color: '#a5b4fc', fontSize: '0.96rem', marginBottom: 2 }}>
                  <span style={{ fontWeight: 500 }}>Aid value:</span> {faction.militarySupport.aidValue}
                </div>
              )}
              {faction.militarySupport.strategicAssets && (
                <div style={{ marginTop: 2 }}>
                  <span style={{ color: '#a5b4fc', fontSize: '0.96rem', marginRight: 4 }}>Strategic assets:</span>
                  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                    {faction.militarySupport.strategicAssets.map((asset) => (
                      <span key={asset} style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 8px', fontSize: '0.95rem', marginRight: 2 }}>{asset}</span>
                    ))}
                  </span>
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