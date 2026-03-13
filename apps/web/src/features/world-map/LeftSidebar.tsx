import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import InternationalOrganizationsPanel from './InternationalOrganizationsPanel';
import { AVAILABLE_HISTORY_YEARS, snapToAvailableYear } from '../../utils/historical-years';
import { Crosshair, Settings, Info, Globe, Users, BarChart3, Map, User, GitCompare, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LANDING_ABOUT_URL = `${import.meta.env.VITE_LANDING_URL ?? (import.meta.env.DEV ? 'http://localhost:5174' : '')}/about`;

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onOpenConflictTracker?: () => void;
  onSetBaseMapStyle?: (next: 'night' | 'light' | 'outdoors' | 'dark' | 'satellite' | 'satellite-streets') => void;
  onSetPlanetPreset?: (preset: 'default' | 'nebula' | 'sunset' | 'dawn' | 'arctic' | 'volcanic' | 'emerald' | 'midnight' | 'aurora' | 'sahara' | 'storm' | 'crimson' | 'rose' | 'void' | 'coral' | 'violet') => void;
  onSetStarIntensity?: (v: number) => void;
  onSetSpacePreset?: (preset: 'void' | 'deep' | 'nebula' | 'galaxy' | 'crimson') => void;
  // Terrain removido
  onSetTerrain?: (v: boolean) => void;
  onSetTerrainExaggeration?: (n: number) => void;
  onSetBuildings3D?: (v: boolean) => void;
  onSetMinimalMode?: (v: boolean) => void;
  onSetAutoRotate?: (v: boolean) => void;
  onSetRotateSpeed?: (degPerSec: number) => void;
  onSetLedHalo?: (v: boolean) => void;
  onSetLedHaloSpeed?: (ms: number) => void;
  onToggleGdpLayer?: (enabled: boolean) => void;
  gdpEnabled?: boolean;
  gdpLegend?: Array<{ color: string; min?: number; max?: number }>;
  onToggleGdpPerCapitaLayer?: (enabled: boolean) => void;
  gdpPerCapitaEnabled?: boolean;
  gdpPerCapitaLegend?: Array<{ color: string; min?: number; max?: number }>;
  onToggleInflationLayer?: (enabled: boolean) => void;
  inflationEnabled?: boolean;
  inflationLegend?: Array<{ color: string; min?: number; max?: number }>;
  onToggleGiniLayer?: (enabled: boolean) => void;
  giniEnabled?: boolean;
  giniLegend?: Array<{ color: string; min?: number; max?: number }>;
  onToggleExportsLayer?: (enabled: boolean) => void;
  exportsEnabled?: boolean;
  exportsLegend?: Array<{ color: string; min?: number; max?: number }>;
  // New indicators
  onToggleLifeExpectancyLayer?: (enabled: boolean) => void;
  lifeExpectancyEnabled?: boolean;
  lifeExpectancyLegend?: Array<{ color: string; min?: number; max?: number }>;
  onToggleMilitaryExpenditureLayer?: (enabled: boolean) => void;
  militaryExpenditureEnabled?: boolean;
  militaryExpenditureLegend?: Array<{ color: string; min?: number; max?: number }>;
  onToggleDemocracyIndexLayer?: (enabled: boolean) => void;
  democracyIndexEnabled?: boolean;
  democracyIndexLegend?: Array<{ color: string; min?: number; max?: number }>;
  onToggleTradeGdpLayer?: (enabled: boolean) => void;
  tradeGdpEnabled?: boolean;
  tradeGdpLegend?: Array<{ color: string; min?: number; max?: number }>;
  // History Mode controls
  onToggleHistoryMode?: (enabled: boolean) => void;
  onSetHistoryYear?: (year: number) => void;
  historyEnabled?: boolean;
  historyYear?: number;
  // International Organizations highlight callback
  onSetOrganizationIsoFilter?: (iso3: string[], colorHex?: string) => void;
  // Natural layers
  onToggleRiversLayer?: (enabled: boolean) => void;
  riversEnabled?: boolean;
  onToggleMountainRangesLayer?: (enabled: boolean) => void;
  mountainRangesEnabled?: boolean;
  onTogglePeaksLayer?: (enabled: boolean) => void;
  peaksEnabled?: boolean;
  onToggleLakesLayer?: (enabled: boolean) => void;
  lakesEnabled?: boolean;
  onToggleVolcanoesLayer?: (enabled: boolean) => void;
  volcanoesEnabled?: boolean;
  onToggleFaultLinesLayer?: (enabled: boolean) => void;
  faultLinesEnabled?: boolean;
  onToggleDesertsLayer?: (enabled: boolean) => void;
  desertsEnabled?: boolean;
  naturalLod?: 'auto' | 'low' | 'med' | 'high';
  onSetNaturalLod?: (lod: 'auto' | 'low' | 'med' | 'high') => void;
  countries?: Array<{ iso3: string; name: string; flagUrl?: string }>;
  countriesLoading?: boolean;
  onOpenCompareCountries?: () => void;
  // Live Activity layers
  onToggleEarthquakes?: (enabled: boolean) => void;
  earthquakesEnabled?: boolean;
  onToggleFires?: (enabled: boolean) => void;
  firesEnabled?: boolean;
  onToggleRadar?: (enabled: boolean) => void;
  radarEnabled?: boolean;
  onToggleAirTraffic?: (enabled: boolean) => void;
  airTrafficEnabled?: boolean;
  onToggleMarineTraffic?: (enabled: boolean) => void;
  marineTrafficEnabled?: boolean;
  onToggleSatellites?: (enabled: boolean) => void;
  satellitesEnabled?: boolean;
  onToggleWeather?: (enabled: boolean) => void;
  weatherEnabled?: boolean;
  weatherLayers?: string[];
  onToggleWeatherLayer?: (layer: string) => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  iconBg?: string;
}

export default function LeftSidebar({ isOpen, onClose: _onClose, onOpenConflictTracker, onOpenCompareCountries, onSetBaseMapStyle, onSetPlanetPreset, onSetStarIntensity, onSetSpacePreset, onSetTerrain, onSetTerrainExaggeration, onSetBuildings3D, onSetMinimalMode, onSetAutoRotate, onSetRotateSpeed, onToggleGdpLayer, gdpEnabled = false, gdpLegend = [], onToggleGdpPerCapitaLayer, gdpPerCapitaEnabled = false, gdpPerCapitaLegend = [], onToggleInflationLayer, inflationEnabled = false, inflationLegend = [], onToggleGiniLayer, giniEnabled = false, giniLegend = [], onToggleExportsLayer, exportsEnabled = false, exportsLegend = [], onToggleLifeExpectancyLayer, lifeExpectancyEnabled = false, lifeExpectancyLegend = [], onToggleMilitaryExpenditureLayer, militaryExpenditureEnabled = false, militaryExpenditureLegend = [], onToggleDemocracyIndexLayer, democracyIndexEnabled = false, democracyIndexLegend = [], onToggleTradeGdpLayer, tradeGdpEnabled = false, tradeGdpLegend = [], onToggleHistoryMode, onSetHistoryYear, historyEnabled: _historyEnabled = false, historyYear = 1880, onSetOrganizationIsoFilter, onToggleRiversLayer, riversEnabled = false, onToggleMountainRangesLayer, mountainRangesEnabled = false, onTogglePeaksLayer, peaksEnabled = false, onToggleLakesLayer, lakesEnabled = false, onToggleVolcanoesLayer, volcanoesEnabled = false, onToggleFaultLinesLayer, faultLinesEnabled = false, onToggleDesertsLayer, desertsEnabled = false, naturalLod = 'auto', onSetNaturalLod, onSetLedHalo, onSetLedHaloSpeed, onToggleEarthquakes, earthquakesEnabled = false, onToggleFires, firesEnabled = false, onToggleRadar, radarEnabled = false, onToggleAirTraffic, airTrafficEnabled = false, onToggleMarineTraffic, marineTrafficEnabled = false, onToggleSatellites, satellitesEnabled = false, onToggleWeather, weatherEnabled = false, weatherLayers = [], onToggleWeatherLayer }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState<string>('home');
  const [physicalSections, setPhysicalSections] = useState({ geo: true, climate: true, terrain: true });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [rotateSpeed, setRotateSpeed] = useState<number>(3);
  const [terrainEnabled, setTerrainEnabled] = useState<boolean>(false);
  const [terrainEx, setTerrainEx] = useState<number>(1);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [ledHaloEnabled, setLedHaloEnabled] = useState<boolean>(false);
  const [ledHaloSpeed, setLedHaloSpeed] = useState<number>(50);
  const [starIntensity, setStarIntensityLocal] = useState<number>(0.6);
  const yearScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const [_orgQuery, _setOrgQuery] = useState<string>('');
  const [_orgLoading, _setOrgLoading] = useState<boolean>(false);
  const [_orgSelectedKey, _setOrgSelectedKey] = useState<string | null>(null);
  const [_activeIsoToColor, _setActiveIsoToColor] = useState<Record<string,string>>({});

  // Snap the active year into view when it changes
  useEffect(() => {
    const container = yearScrollRef.current;
    if (!container) return;
    const activeYear = snapToAvailableYear(historyYear);
    const btn = container.querySelector(`[data-year="${activeYear}"]`) as HTMLButtonElement | null;
    if (!btn) return;
    try {
      // @ts-ignore newer browsers support inline:center
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } catch {
      // Fallback: manual centering
      const rect = btn.getBoundingClientRect();
      const crect = container.getBoundingClientRect();
      const offset = (rect.left + rect.right) / 2 - (crect.left + crect.right) / 2;
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, [historyYear]);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: <Crosshair className="h-5 w-5 text-red-400" />,
      label: 'Conflict Tracker',
      href: '#home',
      iconBg: 'rgba(239, 68, 68, 0.12)'
    },
    {
      icon: <Globe className="h-5 w-5 text-cyan-400" />,
      label: 'History Mode',
      href: '#history',
      iconBg: 'rgba(6, 182, 212, 0.12)'
    },
    {
      icon: <Radio className="h-5 w-5 text-orange-400" />,
      label: 'Live Activity',
      href: '#live',
      iconBg: 'rgba(251, 146, 60, 0.12)'
    },
    {
      icon: <Map className="h-5 w-5 text-green-400" />,
      label: 'Physical Layers',
      href: '#physical',
      iconBg: 'rgba(16, 185, 129, 0.12)'
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-blue-400" />,
      label: 'Statistics',
      href: '#stats',
      iconBg: 'rgba(59, 130, 246, 0.12)'
    },
    {
      icon: <Users className="h-5 w-5 text-yellow-400" />,
      label: 'International Organizations',
      href: '#orgs',
      iconBg: 'rgba(234, 179, 8, 0.12)'
    },
    {
      icon: <GitCompare className="h-5 w-5 text-purple-400" />,
      label: 'Compare Countries',
      href: '#compare',
      iconBg: 'rgba(147, 51, 234, 0.12)'
    },
    {
      icon: <User className="h-5 w-5 text-indigo-400" />,
      label: 'Dashboard',
      href: '/dashboard',
      iconBg: 'rgba(99, 102, 241, 0.12)',
      onClick: () => {
        if (isAuthenticated) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }
    },
    {
      icon: <Settings className="h-5 w-5 text-slate-400" />,
      label: 'Settings',
      href: '#settings',
      iconBg: 'rgba(148, 163, 184, 0.12)'
    },
    {
      icon: <Info className="h-5 w-5 text-pink-400" />,
      label: 'About',
      href: LANDING_ABOUT_URL,
      iconBg: 'rgba(236, 72, 153, 0.12)'
    }
  ], [navigate, isAuthenticated]);

  const handleItemClick = useCallback((item: MenuItem) => {
    // Handle Dashboard navigation
    if (item.label === 'Dashboard') {
      if (item.onClick) {
        item.onClick();
      }
      return;
    }

    const itemKey = item.label.toLowerCase();
    
    // Toggle: if clicking the same item, close it
    if (activeItem === itemKey) {
      setActiveItem('');
      return;
    }
    
    setActiveItem(itemKey);
    
    if (item.label === 'Conflict Tracker' && onOpenConflictTracker) {
      onOpenConflictTracker();
      return;
    }

    if (item.label === 'Compare Countries' && onOpenCompareCountries) {
      onOpenCompareCountries();
      return;
    }
    
    
    if (item.onClick) {
      item.onClick();
    }
  }, [activeItem, onOpenConflictTracker, onOpenCompareCountries]);

  return (
    <>
      {isOpen && (
            <div className="left-sidebar">

              <div className="left-sidebar-header mb-4" style={{ minHeight: '64px' }}>
                <h1 className="left-sidebar-title">WorldLore</h1>
              </div>

              <div className="left-sidebar-content">
                <nav className="space-y-2">
                  {menuItems.map((item, _index) => (
                    <div key={item.label}>
                      <a
                        href={item.href}
                        onClick={(e) => {
                          if (item.label === 'About') return;
                          e.preventDefault();
                          handleItemClick(item);
                        }}
                        className={`left-sidebar-item ${
                          activeItem === item.label.toLowerCase() ? 'active' : ''
                        }`}
                      >
                        <div className="left-sidebar-item-icon" style={{ background: item.iconBg }}>
                          {item.icon}
                        </div>
                        <span className="left-sidebar-item-label">
                          {item.label}
                        </span>
                        {activeItem === item.label.toLowerCase() && (
                          <div className="left-sidebar-item-indicator" />
                        )}
                      </a>

                      {item.label === 'Live Activity' && activeItem === 'live activity' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Live Activity">
                          <div className="settings-subtitle" style={{ marginBottom: 8 }}>
                            Real-time tracking of moving objects.
                          </div>
                          <div className="layer-row">
                            <span className={`layer-row-dot ${radarEnabled ? 'on' : ''}`} />
                            <span className="layer-row-name">Weather Radar</span>
                            <button className={`toggle-switch ${radarEnabled ? 'on' : ''}`} onClick={() => onToggleRadar?.(!radarEnabled)} aria-label="Toggle radar" />
                          </div>
                          <div className="layer-row">
                            <span className={`layer-row-dot ${airTrafficEnabled ? 'on' : ''}`} />
                            <span className="layer-row-name">Air Traffic</span>
                            <button className={`toggle-switch ${airTrafficEnabled ? 'on' : ''}`} onClick={() => onToggleAirTraffic?.(!airTrafficEnabled)} aria-label="Toggle air traffic" />
                          </div>
                          <div className="layer-row">
                            <span className={`layer-row-dot ${marineTrafficEnabled ? 'on' : ''}`} />
                            <span className="layer-row-name">Marine Traffic</span>
                            <button className={`toggle-switch ${marineTrafficEnabled ? 'on' : ''}`} onClick={() => onToggleMarineTraffic?.(!marineTrafficEnabled)} aria-label="Toggle marine traffic" />
                          </div>
                          <div className="layer-row">
                            <span className={`layer-row-dot ${satellitesEnabled ? 'on' : ''}`} />
                            <span className="layer-row-name">Satellites</span>
                            <button className={`toggle-switch ${satellitesEnabled ? 'on' : ''}`} onClick={() => onToggleSatellites?.(!satellitesEnabled)} aria-label="Toggle satellites" />
                          </div>
                        </div>
                      )}

                      {item.label === 'Physical Layers' && activeItem === 'physical layers' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Physical Layers">
                          {/* ── GEOPHYSICAL ── */}
                          <div className="layer-section">
                            <div className="layer-section-header" onClick={() => setPhysicalSections(p => ({ ...p, geo: !p.geo }))}>
                              <span className="layer-section-dot" style={{ background: '#ef4444', color: '#ef4444' }} />
                              <span className="layer-section-label">Geophysical</span>
                              <svg className={`layer-section-chevron ${physicalSections.geo ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </div>
                            {physicalSections.geo && (<>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${earthquakesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Earthquakes</span>
                                <button className={`toggle-switch ${earthquakesEnabled ? 'on' : ''}`} onClick={() => onToggleEarthquakes?.(!earthquakesEnabled)} aria-label="Toggle earthquakes" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${volcanoesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Volcanoes</span>
                                <button className={`toggle-switch ${volcanoesEnabled ? 'on' : ''}`} onClick={() => onToggleVolcanoesLayer?.(!volcanoesEnabled)} aria-label="Toggle volcanoes" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${faultLinesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Fault Lines</span>
                                <button className={`toggle-switch ${faultLinesEnabled ? 'on' : ''}`} onClick={() => onToggleFaultLinesLayer?.(!faultLinesEnabled)} aria-label="Toggle fault lines" />
                              </div>
                            </>)}
                          </div>

                          {/* ── CLIMATE & WEATHER ── */}
                          <div className="layer-section">
                            <div className="layer-section-header" onClick={() => setPhysicalSections(p => ({ ...p, climate: !p.climate }))}>
                              <span className="layer-section-dot" style={{ background: '#f59e0b', color: '#f59e0b' }} />
                              <span className="layer-section-label">Climate & Weather</span>
                              <svg className={`layer-section-chevron ${physicalSections.climate ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </div>
                            {physicalSections.climate && (<>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${weatherEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Weather Overlay</span>
                                <button className={`toggle-switch ${weatherEnabled ? 'on' : ''}`} onClick={() => onToggleWeather?.(!weatherEnabled)} aria-label="Toggle weather" />
                              </div>
                              {weatherEnabled && (
                                <div className="layer-sub-chips">
                                  {([['temp_new','Temp'],['clouds_new','Clouds'],['precipitation_new','Rain'],['wind_new','Wind'],['pressure_new','Pressure']] as [string,string][]).map(([id,label]) => (
                                    <button key={id} className={`layer-sub-chip ${weatherLayers.includes(id) ? 'active' : ''}`} onClick={() => onToggleWeatherLayer?.(id)}>{label}</button>
                                  ))}
                                </div>
                              )}
                              <div className="layer-row">
                                <span className={`layer-row-dot ${firesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Active Fires</span>
                                <button className={`toggle-switch ${firesEnabled ? 'on' : ''}`} onClick={() => onToggleFires?.(!firesEnabled)} aria-label="Toggle fires" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${desertsEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Deserts</span>
                                <button className={`toggle-switch ${desertsEnabled ? 'on' : ''}`} onClick={() => onToggleDesertsLayer?.(!desertsEnabled)} aria-label="Toggle deserts" />
                              </div>
                            </>)}
                          </div>

                          {/* ── TERRAIN & WATER ── */}
                          <div className="layer-section">
                            <div className="layer-section-header" onClick={() => setPhysicalSections(p => ({ ...p, terrain: !p.terrain }))}>
                              <span className="layer-section-dot" style={{ background: '#10b981', color: '#10b981' }} />
                              <span className="layer-section-label">Terrain & Water</span>
                              <svg className={`layer-section-chevron ${physicalSections.terrain ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </div>
                            {physicalSections.terrain && (<>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${riversEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Rivers</span>
                                <button className={`toggle-switch ${riversEnabled ? 'on' : ''}`} onClick={() => onToggleRiversLayer?.(!riversEnabled)} aria-label="Toggle rivers" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${lakesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Lakes</span>
                                <button className={`toggle-switch ${lakesEnabled ? 'on' : ''}`} onClick={() => onToggleLakesLayer?.(!lakesEnabled)} aria-label="Toggle lakes" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${mountainRangesEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Mountain Ranges</span>
                                <button className={`toggle-switch ${mountainRangesEnabled ? 'on' : ''}`} onClick={() => onToggleMountainRangesLayer?.(!mountainRangesEnabled)} aria-label="Toggle mountain ranges" />
                              </div>
                              <div className="layer-row">
                                <span className={`layer-row-dot ${peaksEnabled ? 'on' : ''}`} />
                                <span className="layer-row-name">Peaks</span>
                                <button className={`toggle-switch ${peaksEnabled ? 'on' : ''}`} onClick={() => onTogglePeaksLayer?.(!peaksEnabled)} aria-label="Toggle peaks" />
                              </div>
                            </>)}
                          </div>

                          {/* ── LOD Slider ── */}
                          <div style={{ height: 1, background: 'rgba(71,85,105,0.25)', margin: '6px 0 8px' }} />
                          <div className="lod-slider-block">
                            <div className="lod-slider-header">
                              <span className="lod-slider-label">Detail Level</span>
                              <span className="lod-slider-value">{naturalLod}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={3}
                              step={1}
                              value={['auto','low','med','high'].indexOf(naturalLod)}
                              onChange={(e) => {
                                const lods = ['auto','low','med','high'] as const;
                                onSetNaturalLod?.(lods[Number(e.target.value)]);
                              }}
                              className="lod-slider"
                              aria-label="Detail level"
                            />
                            <div className="lod-ticks">
                              <span className="lod-tick">Auto</span>
                              <span className="lod-tick">Low</span>
                              <span className="lod-tick">Med</span>
                              <span className="lod-tick">High</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {item.label === 'Statistics' && activeItem === 'statistics' && (
                        <div className="mt-3 ml-12 mr-3 stats-card" aria-label="Statistics">
                          <div className="stats-header">
                            <div className="stats-title">GDP (nominal)</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${gdpEnabled ? 'active' : ''}`}
                                onClick={() => onToggleGdpLayer?.(true)}
                                aria-pressed={gdpEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!gdpEnabled ? 'active' : ''}`}
                                onClick={() => onToggleGdpLayer?.(false)}
                                aria-pressed={!gdpEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">Current US$, latest available year · log scale</div>
                          {gdpEnabled && gdpLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {gdpLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (NY.GDP.MKTP.CD)</div>
                            </div>
                          )}
                          <div className="stats-header" style={{ marginTop: 12 }}>
                            <div className="stats-title">GDP per Capita</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${gdpPerCapitaEnabled ? 'active' : ''}`}
                                onClick={() => onToggleGdpPerCapitaLayer?.(true)}
                                aria-pressed={gdpPerCapitaEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!gdpPerCapitaEnabled ? 'active' : ''}`}
                                onClick={() => onToggleGdpPerCapitaLayer?.(false)}
                                aria-pressed={!gdpPerCapitaEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">Current US$, latest available year · log scale</div>
                          {gdpPerCapitaEnabled && gdpPerCapitaLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {gdpPerCapitaLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (NY.GDP.PCAP.CD)</div>
                            </div>
                          )}
                          <div className="stats-header" style={{ marginTop: 12 }}>
                            <div className="stats-title">Inflation (annual %)</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${inflationEnabled ? 'active' : ''}`}
                                onClick={() => onToggleInflationLayer?.(true)}
                                aria-pressed={inflationEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!inflationEnabled ? 'active' : ''}`}
                                onClick={() => onToggleInflationLayer?.(false)}
                                aria-pressed={!inflationEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">Consumer prices (annual %), latest available year</div>
                          {inflationEnabled && inflationLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {inflationLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (FP.CPI.TOTL.ZG)</div>
                            </div>
                          )}
                          {/* GINI */}
                          <div className="stats-header" style={{ marginTop: 12 }}>
                            <div className="stats-title">GINI Index</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${giniEnabled ? 'active' : ''}`}
                                onClick={() => onToggleGiniLayer?.(true)}
                                aria-pressed={giniEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!giniEnabled ? 'active' : ''}`}
                                onClick={() => onToggleGiniLayer?.(false)}
                                aria-pressed={!giniEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">Latest available value (0–100) · quantiles</div>
                          {giniEnabled && giniLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {giniLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (SI.POV.GINI)</div>
                            </div>
                          )}
                          {/* Exports */}
                          <div className="stats-header" style={{ marginTop: 12 }}>
                            <div className="stats-title">Exports (US$)</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${exportsEnabled ? 'active' : ''}`}
                                onClick={() => onToggleExportsLayer?.(true)}
                                aria-pressed={exportsEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!exportsEnabled ? 'active' : ''}`}
                                onClick={() => onToggleExportsLayer?.(false)}
                                aria-pressed={!exportsEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">Current US$, latest available year · log scale</div>
                          {exportsEnabled && exportsLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {exportsLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (NE.EXP.GNFS.CD)</div>
                            </div>
                          )}

                          {/* Life Expectancy */}
                          <div className="stats-header" style={{ marginTop: 12 }}>
                            <div className="stats-title">Life Expectancy</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${lifeExpectancyEnabled ? 'active' : ''}`}
                                onClick={() => onToggleLifeExpectancyLayer?.(true)}
                                aria-pressed={lifeExpectancyEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!lifeExpectancyEnabled ? 'active' : ''}`}
                                onClick={() => onToggleLifeExpectancyLayer?.(false)}
                                aria-pressed={!lifeExpectancyEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">Years, latest available</div>
                          {lifeExpectancyEnabled && lifeExpectancyLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {lifeExpectancyLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (SP.DYN.LE00.IN)</div>
                            </div>
                          )}

                          {/* Military Expenditure */}
                          <div className="stats-header" style={{ marginTop: 12 }}>
                            <div className="stats-title">Military Expenditure (% GDP)</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${militaryExpenditureEnabled ? 'active' : ''}`}
                                onClick={() => onToggleMilitaryExpenditureLayer?.(true)}
                                aria-pressed={militaryExpenditureEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!militaryExpenditureEnabled ? 'active' : ''}`}
                                onClick={() => onToggleMilitaryExpenditureLayer?.(false)}
                                aria-pressed={!militaryExpenditureEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">% of GDP, latest available</div>
                          {militaryExpenditureEnabled && militaryExpenditureLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {militaryExpenditureLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (MS.MIL.XPND.GD.ZS)</div>
                            </div>
                          )}

                          {/* Democracy Index */}
                          <div className="stats-header" style={{ marginTop: 12 }}>
                            <div className="stats-title">Democracy Index</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${democracyIndexEnabled ? 'active' : ''}`}
                                onClick={() => onToggleDemocracyIndexLayer?.(true)}
                                aria-pressed={democracyIndexEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!democracyIndexEnabled ? 'active' : ''}`}
                                onClick={() => onToggleDemocracyIndexLayer?.(false)}
                                aria-pressed={!democracyIndexEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">WGI Voice & Accountability (0-10 scale)</div>
                          {democracyIndexEnabled && democracyIndexLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {democracyIndexLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (VA.EST)</div>
                            </div>
                          )}

                          {/* Trade % GDP */}
                          <div className="stats-header" style={{ marginTop: 12 }}>
                            <div className="stats-title">Trade (% of GDP)</div>
                            <div className="chip-group">
                              <button
                                className={`chip ${tradeGdpEnabled ? 'active' : ''}`}
                                onClick={() => onToggleTradeGdpLayer?.(true)}
                                aria-pressed={tradeGdpEnabled}
                              >Show</button>
                              <button
                                className={`chip ${!tradeGdpEnabled ? 'active' : ''}`}
                                onClick={() => onToggleTradeGdpLayer?.(false)}
                                aria-pressed={!tradeGdpEnabled}
                              >Hide</button>
                            </div>
                          </div>
                          <div className="stats-subtitle">Trade openness, latest available</div>
                          {tradeGdpEnabled && tradeGdpLegend.length > 0 && (
                            <div className="legend-card">
                              <div className="legend-label">Legend</div>
                              <div className="choropleth-legend-bar">
                                {tradeGdpLegend.map((b, i) => (
                                  <span key={i} className="choropleth-legend-swatch" style={{ backgroundColor: b.color }} />
                                ))}
                              </div>
                              <div className="choropleth-legend-scale">
                                <span>low</span>
                                <span>high</span>
                              </div>
                              <div className="legend-source">Source: World Bank (NE.TRD.GNFS.ZS)</div>
                            </div>
                          )}
                        </div>
                      )}

                      {item.label === 'International Organizations' && activeItem === 'international organizations' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="International Organizations">
                          <InternationalOrganizationsPanel onSetOrganizationIsoFilter={onSetOrganizationIsoFilter} />
                        </div>
                      )}

                      {item.label === 'History Mode' && activeItem === 'history mode' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="History Mode">
                          <div className="settings-subtitle" style={{ marginTop: 10 }}>Year</div>
                          <div className="settings-row" style={{ alignItems: 'center', gap: 8 }}>
                            <div
                              ref={yearScrollRef}
                              style={{
                                display: 'grid',
                                gridAutoFlow: 'column',
                                gridAutoColumns: 'minmax(54px,auto)',
                                gap: 10,
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                WebkitOverflowScrolling: 'touch',
                                scrollBehavior: 'smooth',
                                scrollSnapType: 'x mandatory',
                                scrollPadding: '8px',
                                overscrollBehavior: 'contain',
                                overscrollBehaviorX: 'contain',
                                overscrollBehaviorY: 'contain',
                                padding: '6px 8px',
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, rgba(30,41,59,0.45), rgba(51,65,85,0.35))',
                                border: '1px solid rgba(71,85,105,0.35)',
                                pointerEvents: 'auto'
                              }}
                              className="hide-scrollbar"
                              onWheel={(e) => {
                                const el = yearScrollRef.current;
                                if (!el) return;
                                const dx = Math.abs(e.deltaX);
                                const dy = Math.abs(e.deltaY);
                                // Prefer vertical wheel for horizontal scroll
                                const left = dy >= dx ? e.deltaY : e.deltaX;
                                e.stopPropagation();
                                if (wheelRafRef.current === null) {
                                  wheelRafRef.current = requestAnimationFrame(() => {
                                    el.scrollBy({ left, behavior: 'smooth' });
                                    if (wheelRafRef.current !== null) cancelAnimationFrame(wheelRafRef.current);
                                    wheelRafRef.current = null;
                                  });
                                }
                              }}
                              aria-label="Available historical years"
                            >
                              {AVAILABLE_HISTORY_YEARS.map((y: number) => {
                                const isActive = snapToAvailableYear(historyYear) === y;
                                return (
                                  <button
                                    key={y}
                                    className={`settings-chip ${isActive ? 'active' : ''}`}
                                    onClick={() => { onToggleHistoryMode?.(true); onSetHistoryYear?.(y); }}
                                    aria-pressed={isActive}
                                    title={`Year ${y}`}
                                    data-year={y}
                                    style={{ minWidth: 54, boxShadow: isActive ? '0 6px 14px rgba(59,130,246,0.25)' : 'none', borderColor: isActive ? 'rgba(59,130,246,0.6)' : 'rgba(71, 85, 105, 0.55)', scrollSnapAlign: 'center' }}
                                  >
                                    {y}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="settings-row" style={{ marginTop: 8 }}>
                            <button
                              className="settings-chip"
                              onClick={() => onToggleHistoryMode?.(false)}
                              aria-label="Close history mode"
                            >Close History</button>
                          </div>
                        </div>
                      )}

                      {item.label === 'Settings' && activeItem === 'settings' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Map settings">
                          <div className="settings-title">Map settings</div>
                          
                          {/* Base map */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Base map</div>
                              <div className="settings-group-meta">Style presets</div>
                            </div>
                            <div className="settings-group-description">Choose the primary cartographic style.</div>
                            <div className="settings-row settings-row-2col">
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('night')}>Night</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('light')}>Light</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('outdoors')}>Outdoors</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('dark')}>Dark</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('satellite')}>Satellite</button>
                              <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('satellite-streets')}>Sat+Streets</button>
                            </div>
                          </div>
                          
                          {/* Planet preset */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Planet preset</div>
                              <div className="settings-group-meta">Atmosphere</div>
                            </div>
                            <div className="settings-group-description">Atmospheric and lighting mood for the globe.</div>
                            <div className="settings-row settings-row-2col">
                              {['default','nebula','sunset','dawn','arctic','volcanic','emerald','midnight','aurora','sahara','storm','crimson','rose','void','coral','violet'].map(preset => (
                                <button
                                  key={preset}
                                  className="settings-chip"
                                  onClick={() => onSetPlanetPreset?.(preset as any)}
                                >{preset[0].toUpperCase() + preset.slice(1)}</button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Space */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Space</div>
                              <div className="settings-group-meta">Background</div>
                            </div>
                            <div className="settings-group-description">Space background color and star brightness.</div>
                            <div className="settings-row settings-row-2col">
                              {(['void','deep','nebula','galaxy','crimson'] as const).map(preset => (
                                <button
                                  key={preset}
                                  className="settings-chip"
                                  onClick={() => onSetSpacePreset?.(preset)}
                                >{preset[0].toUpperCase() + preset.slice(1)}</button>
                              ))}
                            </div>
                            <div className="settings-slider-block">
                              <div className="settings-slider-header">
                                <span>Star intensity</span>
                                <span className="settings-slider-value">{starIntensity.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={starIntensity}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setStarIntensityLocal(v);
                                  onSetStarIntensity?.(v);
                                }}
                                className="settings-slider"
                                aria-label="Star intensity"
                              />
                            </div>
                          </div>

                          {/* LED Halo */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">LED Halo</div>
                              <div className="settings-group-meta">Glow</div>
                            </div>
                            <div className="settings-group-description">Cycle the globe atmosphere through rainbow colors like LED lights.</div>
                            <div className="settings-row segmented">
                              <button
                                className={`settings-chip ${ledHaloEnabled ? 'active' : ''}`}
                                onClick={() => { setLedHaloEnabled(true); onSetLedHalo?.(true); }}
                                aria-pressed={ledHaloEnabled}
                              >On</button>
                              <button
                                className={`settings-chip ${!ledHaloEnabled ? 'active' : ''}`}
                                onClick={() => { setLedHaloEnabled(false); onSetLedHalo?.(false); }}
                                aria-pressed={!ledHaloEnabled}
                              >Off</button>
                            </div>
                            {ledHaloEnabled && (
                              <div className="settings-slider-block">
                                <div className="settings-slider-header">
                                  <span>Speed</span>
                                  <span className="settings-slider-value">{ledHaloSpeed}ms</span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={200}
                                  step={5}
                                  value={ledHaloSpeed}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setLedHaloSpeed(v);
                                    onSetLedHaloSpeed?.(v);
                                  }}
                                  className="settings-slider"
                                  aria-label="LED halo speed"
                                />
                              </div>
                            )}
                          </div>

                          {/* Terrain */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Terrain</div>
                              <div className="settings-group-meta">Relief</div>
                            </div>
                            <div className="settings-group-description">Enable elevation shading and adjust vertical exaggeration.</div>
                            <div className="settings-row segmented">
                              <button
                                className={`settings-chip ${terrainEnabled ? 'active' : ''}`}
                                onClick={() => { setTerrainEnabled(true); onSetTerrain?.(true); }}
                                aria-pressed={terrainEnabled}
                              >On</button>
                              <button
                                className={`settings-chip ${!terrainEnabled ? 'active' : ''}`}
                                onClick={() => { setTerrainEnabled(false); onSetTerrain?.(false); }}
                                aria-pressed={!terrainEnabled}
                              >Off</button>
                            </div>
                            <div className="settings-slider-block">
                              <div className="settings-slider-header">
                                <span>Terrain exaggeration</span>
                                <span className="settings-slider-value">{terrainEx.toFixed(1)}×</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={5}
                                step={0.1}
                                value={terrainEx}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setTerrainEx(v);
                                  onSetTerrainExaggeration?.(v);
                                }}
                                className="settings-slider"
                                aria-label="Terrain exaggeration (x)"
                              />
                            </div>
                          </div>
                          
                          {/* 3D Buildings */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">3D Buildings</div>
                              <div className="settings-group-meta">Urban</div>
                            </div>
                            <div className="settings-group-description">Extrude buildings where available for city context.</div>
                            <div className="settings-row segmented">
                              <button className="settings-chip" onClick={() => onSetBuildings3D?.(true)}>On</button>
                              <button className="settings-chip" onClick={() => onSetBuildings3D?.(false)}>Off</button>
                            </div>
                          </div>
                          
                          {/* Labels */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Labels</div>
                              <div className="settings-group-meta">Guides</div>
                            </div>
                            <div className="settings-group-description">Toggle map labels, roads and borders for a cleaner view.</div>
                            <div className="settings-row segmented">
                              <button className="settings-chip" onClick={() => onSetMinimalMode?.(false)}>Show</button>
                              <button className="settings-chip" onClick={() => onSetMinimalMode?.(true)}>Hide</button>
                            </div>
                          </div>
                          
                          {/* Rotation */}
                          <div className="settings-group">
                            <div className="settings-group-header">
                              <div className="settings-group-title">Rotation</div>
                              <div className="settings-group-meta">Globe</div>
                            </div>
                            <div className="settings-group-description">Enable auto-rotation and set the angular speed.</div>
                            <div className="settings-row segmented">
                              <button
                                className={`settings-chip ${autoRotate ? 'active' : ''}`}
                                onClick={() => { setAutoRotate(true); onSetAutoRotate?.(true); }}
                                aria-pressed={autoRotate}
                              >On</button>
                              <button
                                className={`settings-chip ${!autoRotate ? 'active' : ''}`}
                                onClick={() => { setAutoRotate(false); onSetAutoRotate?.(false); }}
                                aria-pressed={!autoRotate}
                              >Off</button>
                            </div>
                            <div className="settings-slider-block">
                              <div className="settings-slider-header">
                                <span>Rotation speed</span>
                                <span className="settings-slider-value">{rotateSpeed.toFixed(1)}°/s</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={10}
                                step={0.5}
                                value={rotateSpeed}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setRotateSpeed(v);
                                  onSetRotateSpeed?.(v);
                                }}
                                className="settings-slider"
                                aria-label="Rotation speed (deg/sec)"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="left-sidebar-footer" />
            </div>
        )}
      </>
    );
  }