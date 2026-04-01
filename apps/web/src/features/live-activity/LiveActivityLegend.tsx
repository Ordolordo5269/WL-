import type { ReactNode } from 'react';

interface LegendItem {
  id: string;
  label: string;
  color: string;
  shape?: 'circle' | 'gradient';
  gradientColors?: string[];
  gradientLabels?: string[];
}

const LAYER_LEGENDS: LegendItem[] = [
  {
    id: 'earthquakes',
    label: 'Earthquakes',
    color: '',
    shape: 'gradient',
    gradientColors: ['#ffcc00', '#ff6600', '#cc0000'],
    gradientLabels: ['Shallow', 'Mid', 'Deep'],
  },
  { id: 'fires', label: 'Active Fires', color: '#ff4500', shape: 'circle' },
  { id: 'air-traffic', label: 'Air Traffic', color: '#00bfff', shape: 'circle' },
  { id: 'marine-traffic', label: 'Marine Traffic', color: '#00cc66', shape: 'circle' },
  { id: 'satellites', label: 'Satellites', color: '#ffd700', shape: 'circle' },
  { id: 'radar', label: 'Weather Radar', color: '#8080ff', shape: 'circle' },
];

const WEATHER_SUBLAYER_LABELS: Record<string, string> = {
  temp_new: 'Temperature',
  clouds_new: 'Clouds',
  precipitation_new: 'Precipitation',
  wind_new: 'Wind',
  pressure_new: 'Pressure',
};

interface Props {
  earthquakesEnabled: boolean;
  firesEnabled: boolean;
  radarEnabled: boolean;
  airTrafficEnabled: boolean;
  marineTrafficEnabled: boolean;
  satellitesEnabled: boolean;
  weatherEnabled: boolean;
  weatherLayers: string[];
}

export default function LiveActivityLegend(props: Props) {
  const enabledMap: Record<string, boolean> = {
    earthquakes: props.earthquakesEnabled,
    fires: props.firesEnabled,
    radar: props.radarEnabled,
    'air-traffic': props.airTrafficEnabled,
    'marine-traffic': props.marineTrafficEnabled,
    satellites: props.satellitesEnabled,
  };

  const activeLayers = LAYER_LEGENDS.filter(l => enabledMap[l.id]);
  const hasWeatherSubs = props.weatherEnabled && props.weatherLayers.length > 0;

  if (activeLayers.length === 0 && !hasWeatherSubs) return null;

  return (
    <div className="live-activity-legend">
      <div className="live-legend-title">Live Activity</div>
      {activeLayers.map(item => (
        <div key={item.id} className="live-legend-row">
          {item.shape === 'gradient' ? (
            <GradientSwatch colors={item.gradientColors!} />
          ) : (
            <span className="live-legend-dot" style={{ backgroundColor: item.color }} />
          )}
          <span className="live-legend-label">{item.label}</span>
          {item.shape === 'gradient' && item.gradientLabels && (
            <span className="live-legend-range">
              {item.gradientLabels[0]} — {item.gradientLabels[item.gradientLabels.length - 1]}
            </span>
          )}
        </div>
      ))}
      {hasWeatherSubs && (
        <>
          <div className="live-legend-row">
            <span className="live-legend-dot" style={{ backgroundColor: '#a0a0ff', opacity: 0.7 }} />
            <span className="live-legend-label">Weather</span>
          </div>
          <div className="live-legend-weather-subs">
            {props.weatherLayers.map(sub => (
              <span key={sub} className="live-legend-weather-chip">
                {WEATHER_SUBLAYER_LABELS[sub] ?? sub}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GradientSwatch({ colors }: { colors: string[] }): ReactNode {
  return (
    <span
      className="live-legend-gradient"
      style={{ background: `linear-gradient(90deg, ${colors.join(', ')})` }}
    />
  );
}
