import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ORGANIZATIONS, findOrgByQuery } from '../services/orgs-config';
import { buildOrgHighlight } from '../services/orgs-service';
import InternationalOrganizationsPanel from './InternationalOrganizationsPanel';
import { AVAILABLE_HISTORY_YEARS, snapToAvailableYear } from '../src/utils/historical-years';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Search, Settings, Info, Globe, Users, BarChart3, Map, User, GitCompare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import type { Country } from './CountrySelector';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onOpenConflictTracker?: () => void;
  onSetBaseMapStyle?: (next: 'night' | 'light' | 'outdoors') => void;
  onSetPlanetPreset?: (preset: 'default' | 'nebula' | 'sunset' | 'dawn') => void;
  // Terrain removido
  onSetTerrain?: (v: boolean) => void;
  onSetTerrainExaggeration?: (n: number) => void;
  onSetBuildings3D?: (v: boolean) => void;
  onSetMinimalMode?: (v: boolean) => void;
  onSetAutoRotate?: (v: boolean) => void;
  onSetRotateSpeed?: (degPerSec: number) => void;
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
  naturalLod?: 'auto' | 'low' | 'med' | 'high';
  onSetNaturalLod?: (lod: 'auto' | 'low' | 'med' | 'high') => void;
  // Compare Countries
  onOpenCompareCountries?: () => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export default function LeftSidebar({ isOpen, onClose: _onClose, onOpenConflictTracker, onSetBaseMapStyle, onSetPlanetPreset, onSetTerrain, onSetTerrainExaggeration, onSetBuildings3D, onSetMinimalMode, onSetAutoRotate, onSetRotateSpeed, onToggleGdpLayer, gdpEnabled = false, gdpLegend = [], onToggleGdpPerCapitaLayer, gdpPerCapitaEnabled = false, gdpPerCapitaLegend = [], onToggleInflationLayer, inflationEnabled = false, inflationLegend = [], onToggleGiniLayer, giniEnabled = false, giniLegend = [], onToggleExportsLayer, exportsEnabled = false, exportsLegend = [], onToggleLifeExpectancyLayer, lifeExpectancyEnabled = false, lifeExpectancyLegend = [], onToggleMilitaryExpenditureLayer, militaryExpenditureEnabled = false, militaryExpenditureLegend = [], onToggleDemocracyIndexLayer, democracyIndexEnabled = false, democracyIndexLegend = [], onToggleTradeGdpLayer, tradeGdpEnabled = false, tradeGdpLegend = [], onToggleHistoryMode, onSetHistoryYear, historyEnabled: _historyEnabled = false, historyYear = 1880, onSetOrganizationIsoFilter, onToggleRiversLayer, riversEnabled = false, onToggleMountainRangesLayer, mountainRangesEnabled = false, onTogglePeaksLayer, peaksEnabled = false, naturalLod = 'auto', onSetNaturalLod, countries = [], countriesLoading = false, onOpenCompareCountries }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState<string>('home');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [rotateSpeed, setRotateSpeed] = useState<number>(3);
  const [terrainEnabled, setTerrainEnabled] = useState<boolean>(false);
  const [terrainEx, setTerrainEx] = useState<number>(1);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const yearScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const [orgQuery, setOrgQuery] = useState<string>('');
  const [orgLoading, setOrgLoading] = useState<boolean>(false);
  const [orgSelectedKey, setOrgSelectedKey] = useState<string | null>(null);
  const [activeIsoToColor, setActiveIsoToColor] = useState<Record<string,string>>({});

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
      icon: <Crosshair className="h-5 w-5" />,
      label: 'Conflict Tracker',
      href: '#home'
    },
    {
      icon: <Globe className="h-5 w-5" />,
      label: 'History Mode',
      href: '#history'
    },
    {
      icon: <Map className="h-5 w-5" />,
      label: 'Physical Layers',
      href: '#physical'
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Statistics',
      href: '#stats'
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'International Organizations',
      href: '#orgs'
    },
    {
      icon: <GitCompare className="h-5 w-5" />,
      label: 'Compare Countries',
      href: '#compare'
    },
    {
      icon: <User className="h-5 w-5" />,
      label: 'Dashboard',
      href: '/dashboard',
      onClick: () => {
        if (isAuthenticated) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: 'Settings',
      href: '#settings'
    },
    {
      icon: <Info className="h-5 w-5" />,
      label: 'About',
      href: '#about'
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
    <AnimatePresence mode="wait">
      {isOpen && (
            <motion.div 
              className="left-sidebar"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 400,
                damping: 25,
                mass: 0.8
              }}
            >
              <div className="left-sidebar-header mb-4" style={{ minHeight: '64px' }}>
                <h1 className="left-sidebar-title">WorldLore</h1>
              </div>

              <div className="left-sidebar-content">
                <nav className="space-y-2">
                  {menuItems.map((item, index) => (
                    <div key={item.label}>
                      <motion.a
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleItemClick(item);
                        }}
                        className={`left-sidebar-item ${
                          activeItem === item.label.toLowerCase() ? 'active' : ''
                        }`}
                        whileHover={{ 
                          x: 8,
                          transition: { type: 'spring', stiffness: 500, damping: 20 }
                        }}
                        whileTap={{ 
                          scale: 0.98,
                          transition: { duration: 0.1 }
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="left-sidebar-item-icon">
                          {item.icon}
                        </div>
                        <span className="left-sidebar-item-label">
                          {item.label}
                        </span>
                        {activeItem === item.label.toLowerCase() && (
                          <motion.div
                            className="left-sidebar-item-indicator"
                            layoutId="activeIndicator"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                      </motion.a>

                      {item.label === 'Physical Layers' && activeItem === 'physical layers' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Physical Layers">
                          <div className="section-header" style={{ marginBottom: 8 }}>
                            <h3>Physical Layers</h3>
                          </div>
                          <div className="settings-subtitle" style={{ marginBottom: 12 }}>
                            Toggle natural features layers and choose the detail level.
                          </div>
                          {/* Layers grid */}
                          <div className="settings-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                            {/* Rivers card */}
                            <div className="section-card" style={{ marginBottom: 0 }}>
                              <div className="stats-header" style={{ marginBottom: 6 }}>
                                <div className="stats-title">Rivers</div>
                                <div className="chip-group">
                                  <button
                                    className={`chip ${riversEnabled ? 'active' : ''}`}
                                    onClick={() => onToggleRiversLayer?.(true)}
                                    aria-pressed={riversEnabled}
                                    aria-label="Show rivers"
                                  >Show</button>
                                  <button
                                    className={`chip ${!riversEnabled ? 'active' : ''}`}
                                    onClick={() => onToggleRiversLayer?.(false)}
                                    aria-pressed={!riversEnabled}
                                    aria-label="Hide rivers"
                                  >Hide</button>
                                </div>
                              </div>
                              <div className="stats-subtitle">Global rivers and lake centerlines.</div>
                            </div>
                            {/* Mountain Ranges card */}
                            <div className="section-card" style={{ marginBottom: 0 }}>
                              <div className="stats-header" style={{ marginBottom: 6 }}>
                                <div className="stats-title">Mountain Ranges</div>
                                <div className="chip-group">
                                  <button
                                    className={`chip ${mountainRangesEnabled ? 'active' : ''}`}
                                    onClick={() => onToggleMountainRangesLayer?.(true)}
                                    aria-pressed={mountainRangesEnabled}
                                    aria-label="Show mountain ranges"
                                  >Show</button>
                                  <button
                                    className={`chip ${!mountainRangesEnabled ? 'active' : ''}`}
                                    onClick={() => onToggleMountainRangesLayer?.(false)}
                                    aria-pressed={!mountainRangesEnabled}
                                    aria-label="Hide mountain ranges"
                                  >Hide</button>
                                </div>
                              </div>
                              <div className="stats-subtitle">Range polygons with outline for visibility.</div>
                            </div>
                            {/* Peaks card */}
                            <div className="section-card" style={{ marginBottom: 0 }}>
                              <div className="stats-header" style={{ marginBottom: 6 }}>
                                <div className="stats-title">Peaks</div>
                                <div className="chip-group">
                                  <button
                                    className={`chip ${peaksEnabled ? 'active' : ''}`}
                                    onClick={() => onTogglePeaksLayer?.(true)}
                                    aria-pressed={peaksEnabled}
                                    aria-label="Show peaks"
                                  >Show</button>
                                  <button
                                    className={`chip ${!peaksEnabled ? 'active' : ''}`}
                                    onClick={() => onTogglePeaksLayer?.(false)}
                                    aria-pressed={!peaksEnabled}
                                    aria-label="Hide peaks"
                                  >Hide</button>
                                </div>
                              </div>
                              <div className="stats-subtitle">Major elevation points with modern markers.</div>
                            </div>
                          </div>
                          {/* Divider */}
                          <div style={{ height: 1, background: 'rgba(71,85,105,0.35)', margin: '12px 0' }} />
                          {/* LOD controls */}
                          <div className="settings-title" style={{ marginBottom: 6 }}>Detail level (LOD)</div>
                          <div className="settings-row settings-row-2col">
                            {(['auto','low','med','high'] as const).map(l => (
                              <button
                                key={l}
                                className={`settings-chip ${naturalLod === l ? 'active' : ''}`}
                                onClick={() => onSetNaturalLod?.(l)}
                                aria-pressed={naturalLod === l}
                                aria-label={`Set detail level ${l}`}
                              >{l.toUpperCase()}</button>
                            ))}
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
                              {AVAILABLE_HISTORY_YEARS.map((y) => {
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
                              {['default','nebula','sunset','dawn'].map(preset => (
                                <button
                                  key={preset}
                                  className="settings-chip"
                                  onClick={() => onSetPlanetPreset?.(preset as any)}
                                >{preset[0].toUpperCase() + preset.slice(1)}</button>
                              ))}
                            </div>
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
            </motion.div>
        )}
      </AnimatePresence>
    );
  }