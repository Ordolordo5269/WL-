import React from 'react';
import type { Conflict } from '../src/types';

interface ConflictTimelineProps {
  conflict: Conflict;
}

const ConflictTimeline: React.FC<ConflictTimelineProps> = ({ conflict }) => {
  const events = conflict.notableEvents || [];

  if (events.length === 0) {
    return (
      <div className="section-content">
        <p>No timeline events available for this conflict.</p>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-line"></div>
      {events.map((event, index) => (
        <div key={index} className="timeline-item">
          <div className={`timeline-marker${index === 0 ? ' active' : ''}`}></div>
          <div className="timeline-content">
            <p className="timeline-date">
              {event.date ? new Date(event.date).toLocaleDateString('en-GB') : 'Date unknown'}
            </p>
            <h4 className="timeline-title">{event.title}</h4>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConflictTimeline; 