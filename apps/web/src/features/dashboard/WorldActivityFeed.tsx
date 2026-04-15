import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Zap, Flame, Wind, Mountain,
  Activity, Clock
} from 'lucide-react';
import { http } from '../../lib/http';

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: number[] };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface ActivityItem {
  id: string;
  type: 'earthquake' | 'fire' | 'storm' | 'volcano' | 'tsunami' | 'lightning' | 'air-traffic';
  title: string;
  detail: string;
  time: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const SEVERITY_COLORS = {
  critical: { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-500/30' },
  high: { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-500/30' },
  medium: { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-500/30' },
  low: { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/30' },
};

function parseEarthquakes(data: GeoJSONCollection): ActivityItem[] {
  return data.features
    .filter(f => {
      const mag = f.properties.mag as number;
      return mag >= 4.0; // Only significant earthquakes
    })
    .sort((a, b) => (b.properties.time as number) - (a.properties.time as number))
    .slice(0, 5)
    .map(f => {
      const mag = f.properties.mag as number;
      const place = f.properties.place as string;
      const time = f.properties.time as number;
      return {
        id: `eq-${time}-${mag}`,
        type: 'earthquake' as const,
        title: `M${mag.toFixed(1)} Earthquake`,
        detail: place || 'Unknown location',
        time: new Date(time).toISOString(),
        severity: mag >= 7 ? 'critical' as const : mag >= 5.5 ? 'high' as const : mag >= 4.5 ? 'medium' as const : 'low' as const,
        icon: Activity,
        color: '#ef4444',
      };
    });
}

function extractCleanName(raw: string, keyword: string): string {
  const re = new RegExp(`${keyword}\\s+(\\S+)`, 'i');
  const m = raw.match(re);
  if (m) return m[1].replace(/-\d+$/, '');
  // fallback: first sentence, max 40 chars
  return raw.split('.')[0].slice(0, 40);
}

function parseVolcanoes(data: GeoJSONCollection): ActivityItem[] {
  return data.features.slice(0, 3).map((f, i) => {
    const rawName = f.properties.name as string || 'Unknown volcano';
    const cleanName = extractCleanName(rawName, 'volcano');
    const alertLevel = f.properties.alert_level as string || 'Advisory';
    const country = f.properties.country as string || '';
    return {
      id: `vol-${i}-${cleanName}`,
      type: 'volcano' as const,
      title: `Volcano: ${cleanName}`,
      detail: country ? `${alertLevel} — ${country}` : `Alert: ${alertLevel}`,
      time: new Date().toISOString(),
      severity: alertLevel === 'Warning' ? 'critical' as const : alertLevel === 'Watch' ? 'high' as const : 'medium' as const,
      icon: Mountain,
      color: '#f97316',
    };
  });
}

function parseStorms(data: GeoJSONCollection): ActivityItem[] {
  return data.features.slice(0, 3).map((f, i) => {
    const rawName = f.properties.name as string || 'Tropical Cyclone';
    const cleanName = extractCleanName(rawName, 'cyclone');
    const severity = f.properties.severity as string || 'Moderate';
    const windMatch = rawName.match(/maximum wind speed of (\d+)/i);
    const windInfo = windMatch ? ` — ${windMatch[1]} km/h` : '';
    return {
      id: `storm-${i}-${cleanName}`,
      type: 'storm' as const,
      title: `Cyclone ${cleanName}`,
      detail: `${severity}${windInfo}`,
      time: new Date().toISOString(),
      severity: severity === 'Extreme' ? 'critical' as const : severity === 'Severe' ? 'high' as const : 'medium' as const,
      icon: Wind,
      color: '#06b6d4',
    };
  });
}

function parseFires(data: GeoJSONCollection): ActivityItem[] {
  const count = data.features.length;
  if (count === 0) return [];

  return [{
    id: `fires-summary`,
    type: 'fire' as const,
    title: `${count.toLocaleString()} Active Fire Hotspots`,
    detail: 'Detected via NASA FIRMS satellite',
    time: new Date().toISOString(),
    severity: count > 500 ? 'high' as const : count > 100 ? 'medium' as const : 'low' as const,
    icon: Flame,
    color: '#f59e0b',
  }];
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WorldActivityFeed() {
  const { data: earthquakes } = useQuery({
    queryKey: ['dashboard', 'activity', 'earthquakes'],
    queryFn: () => http.get<GeoJSONCollection>('/api/live-activity/earthquakes'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: fires } = useQuery({
    queryKey: ['dashboard', 'activity', 'fires'],
    queryFn: () => http.get<GeoJSONCollection>('/api/live-activity/fires'),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const { data: volcanoes } = useQuery({
    queryKey: ['dashboard', 'activity', 'volcanoes'],
    queryFn: () => http.get<GeoJSONCollection>('/api/live-activity/active-volcanoes'),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: storms } = useQuery({
    queryKey: ['dashboard', 'activity', 'storms'],
    queryFn: () => http.get<GeoJSONCollection>('/api/live-activity/storms'),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Merge and sort all activity items
  const items: ActivityItem[] = [
    ...(earthquakes ? parseEarthquakes(earthquakes) : []),
    ...(fires ? parseFires(fires) : []),
    ...(volcanoes ? parseVolcanoes(volcanoes) : []),
    ...(storms ? parseStorms(storms) : []),
  ].sort((a, b) => {
    // Sort by severity first, then by time
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sDiff !== 0) return sDiff;
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  }).slice(0, 10);

  const isLoading = !earthquakes && !fires && !volcanoes && !storms;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl"
      style={{
        background: 'rgba(2, 8, 23, 0.75)',
        border: '1px solid rgba(148, 163, 184, 0.55)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 1px rgba(148, 163, 184, 0.2) inset',
      }}
    >
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(100, 116, 139, 0.4)' }}>
        <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <Zap className="w-4 h-4 text-cyan-400" />
          Live World Activity
        </h3>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Real-time
        </span>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          No significant activity detected
        </div>
      ) : (
        <ul className="divide-y divide-slate-700/30">
          {items.map((item, i) => {
            const Icon = item.icon;
            const colors = SEVERITY_COLORS[item.severity];
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/20 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}
                >
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-slate-400 truncate">{item.detail}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${colors.text} ${colors.bg}`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">{timeAgo(item.time)}</span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
