import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, X, Radio } from 'lucide-react';
import type { LaunchEvent } from '../features/world-map/useMissionTracking';
import { countryCodeToFlag } from '../features/world-map/useMissionTracking';
import { useEffect } from 'react';
import '../styles/missions.css';

interface LaunchAlertProps {
  events: LaunchEvent[];
  onDismiss: (eventId: string) => void;
  onClickMission: (mission: LaunchEvent['mission']) => void;
}

const EVENT_CONFIG = {
  launch: {
    label: 'LAUNCH DETECTED',
    icon: Rocket,
    color: '#00ff88',
    glowColor: 'rgba(0,255,136,0.15)',
    borderColor: 'rgba(0,255,136,0.3)',
  },
  webcast: {
    label: 'LIVE WEBCAST',
    icon: Radio,
    color: '#ff4444',
    glowColor: 'rgba(255,68,68,0.15)',
    borderColor: 'rgba(255,68,68,0.3)',
  },
  't-zero': {
    label: 'LAUNCH WINDOW OPEN',
    icon: Rocket,
    color: '#ffaa22',
    glowColor: 'rgba(255,170,34,0.15)',
    borderColor: 'rgba(255,170,34,0.3)',
  },
};

export default function LaunchAlert({ events, onDismiss, onClickMission }: LaunchAlertProps) {
  useEffect(() => {
    if (events.length === 0) return;
    const timers = events.map(e => setTimeout(() => onDismiss(e.id), 15_000));
    return () => timers.forEach(clearTimeout);
  }, [events, onDismiss]);

  return (
    <div className="launch-alert-container">
      <AnimatePresence>
        {events.map(event => {
          const config = EVENT_CONFIG[event.type];
          const Icon = config.icon;
          const mission = event.mission;
          const flag = mission.agencyCountryCode ? countryCodeToFlag(mission.agencyCountryCode) : '';

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="launch-alert-card"
              style={{
                border: `1px solid ${config.borderColor}`,
                boxShadow: `0 0 20px ${config.glowColor}, 0 8px 32px rgba(0,0,0,0.5)`,
              }}
              onClick={() => onClickMission(mission)}
            >
              <div className="launch-alert-header">
                <div className="launch-alert-header-left">
                  <Icon style={{ width: 14, height: 14, color: config.color }} />
                  <span className="launch-alert-label" style={{ color: config.color }}>{config.label}</span>
                </div>
                <button className="launch-alert-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss(event.id); }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>

              <div className="launch-alert-name">{mission.name}</div>

              <div className="launch-alert-details">
                <span className="launch-alert-details-text">
                  {flag} {mission.agency}{mission.vehicle ? ` · ${mission.vehicle}` : ''}
                  {mission.launchPad ? ` · ${mission.launchPad.name}` : ''}
                </span>
                {event.type === 'webcast' && mission.vidUrls.length > 0 && (
                  <a
                    href={mission.vidUrls[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="launch-alert-watch"
                  >
                    <span className="launch-alert-watch-dot" />
                    WATCH
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
