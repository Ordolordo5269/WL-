import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { ConflictEvent } from './types';

interface Props {
  events: ConflictEvent[];
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  battle: '#ef4444',
  ceasefire: '#22c55e',
  agreement: '#3b82f6',
  escalation: '#f97316',
  humanitarian: '#a855f7',
};

export default function ConflictTimeline({ events }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-slate-400 py-4">No events recorded yet.</div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6">
      {/* Vertical line */}
      <div className="absolute left-2.5 top-1 bottom-1 w-px bg-slate-700" />

      {sorted.map((event, i) => {
        const color = EVENT_TYPE_COLORS[event.eventType ?? ''] ?? '#6b7280';

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative"
          >
            {/* Dot */}
            <div
              className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-slate-900"
              style={{ backgroundColor: color }}
            />

            <div className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-400">
                  {new Date(event.date).toLocaleDateString()}
                </span>
                {event.eventType && (
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {event.eventType}
                  </span>
                )}
                {event.location && (
                  <span className="text-xs text-slate-500">{event.location}</span>
                )}
              </div>
              <p className="text-sm font-medium text-white">{event.title}</p>
              {event.description && (
                <p className="text-xs text-slate-400 mt-1">{event.description}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
