import React from 'react';
import { Chrono } from 'react-chrono';
import type { Conflict } from '../src/types';

interface ConflictTimelineProps {
  conflict: Conflict;
}

const ConflictTimeline: React.FC<ConflictTimelineProps> = ({ conflict }) => {
  // Preparar los eventos notables para react-chrono
  const items = (conflict.notableEvents || []).map(event => ({
    title: event.title,
    cardTitle: event.title,
    cardSubtitle: event.date ? new Date(event.date).toLocaleDateString('es-ES') : '',
  }));

  return (
    <div className="conflict-timeline" style={{ maxHeight: 540, overflowY: 'auto' }}>
      {/* Timeline minimalista con react-chrono */}
      {items.length > 0 && (
        <div className="mb-6">
          <Chrono
            items={items}
            mode="VERTICAL_ALTERNATING"
            hideControls
            cardHeight={60}
            theme={{
              primary: '#2563eb',
              secondary: '#e5e7eb',
              cardBgColor: 'transparent',
              cardTitleColor: '#1e293b',
              titleColor: '#2563eb',
              cardSubtitleColor: '#64748b',
              detailsColor: '#64748b',
            }}
            disableToolbar
            borderLessCards
            cardLess
          />
        </div>
      )}
    </div>
  );
};

export default ConflictTimeline; 