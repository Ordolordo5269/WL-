import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Search, Settings, Info, Globe, Users, BarChart3, Map } from 'lucide-react';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onOpenConflictTracker?: () => void;
  onOpenGdeltTracker?: () => void;
  onSetBaseMapStyle?: (next: 'night' | 'light' | 'outdoors' | 'physical') => void;
  onSetPlanetPreset?: (preset: 'default' | 'nebula' | 'sunset' | 'dawn') => void;
  onSetTerrain?: (v: boolean) => void;
  onSetMinimalMode?: (v: boolean) => void;
  onSetAutoRotate?: (v: boolean) => void;
  onSetRotateSpeed?: (degPerSec: number) => void;
  onToggleGdpLayer?: (enabled: boolean) => void;
  gdpEnabled?: boolean;
  gdpLegend?: Array<{ color: string; min?: number; max?: number }>;
  onToggleInflationLayer?: (enabled: boolean) => void;
  inflationEnabled?: boolean;
  inflationLegend?: Array<{ color: string; min?: number; max?: number }>;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export default function LeftSidebar({ isOpen, onClose: _onClose, onOpenConflictTracker, onOpenGdeltTracker, onSetBaseMapStyle, onSetPlanetPreset, onSetTerrain, onSetMinimalMode, onSetAutoRotate, onSetRotateSpeed, onToggleGdpLayer, gdpEnabled = false, gdpLegend = [], onToggleInflationLayer, inflationEnabled = false, inflationLegend = [] }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState<string>('home');
  const [rotateSpeed, setRotateSpeed] = useState<number>(3);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: <Crosshair className="h-5 w-5" />,
      label: 'Conflict Tracker',
      href: '#home'
    },
    {
      icon: <Globe className="h-5 w-5" />,
      label: 'Explore Countries',
      href: '#explore'
    },
    {
      icon: <Map className="h-5 w-5" />,
      label: 'World Map',
      href: '#map'
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Statistics',
      href: '#stats'
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'Compare Countries',
      href: '#compare'
    },
    {
      icon: <Search className="h-5 w-5" />,
      label: 'Advanced Search',
      href: '#search'
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
  ], []);

  const handleItemClick = useCallback((item: MenuItem) => {
    setActiveItem(item.label.toLowerCase());
    
    if (item.label === 'Conflict Tracker' && onOpenConflictTracker) {
      onOpenConflictTracker();
      return;
    }
    if (item.label === 'World Map' && onOpenGdeltTracker) {
      onOpenGdeltTracker();
      return;
    }
    
    if (item.onClick) {
      item.onClick();
    }
  }, [onOpenConflictTracker]);

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
                        </div>
                      )}

                      {item.label === 'Settings' && activeItem === 'settings' && (
                        <div className="mt-3 ml-12 mr-3 settings-panel" aria-label="Map settings">
                          <div className="settings-title">Map settings</div>
                          <div className="settings-subtitle">Base map</div>
                          <div className="settings-row">
                            <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('night')}>Night</button>
                            <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('light')}>Light</button>
                            <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('outdoors')}>Outdoors</button>
                            <button className="settings-chip" onClick={() => onSetBaseMapStyle?.('physical')}>Physical</button>
                          </div>
                          <div className="settings-subtitle" style={{ marginTop: 10 }}>Planet preset</div>
                          <div className="settings-row">
                            {['default','nebula','sunset','dawn'].map(preset => (
                              <button
                                key={preset}
                                className="settings-chip"
                                onClick={() => onSetPlanetPreset?.(preset as any)}
                              >{preset[0].toUpperCase() + preset.slice(1)}</button>
                            ))}
                          </div>
                          <div className="settings-subtitle" style={{ marginTop: 10 }}>Terrain</div>
                          <div className="settings-row">
                            <button className="settings-chip" onClick={() => onSetTerrain?.(true)}>On</button>
                            <button className="settings-chip" onClick={() => onSetTerrain?.(false)}>Off</button>
                          </div>
                          <div className="settings-subtitle" style={{ marginTop: 10 }}>Hide labels, roads and borders</div>
                          <div className="settings-row">
                            <button className="settings-chip" onClick={() => onSetMinimalMode?.(true)}>Hide</button>
                            <button className="settings-chip" onClick={() => onSetMinimalMode?.(false)}>Show</button>
                          </div>
                          <div className="settings-subtitle" style={{ marginTop: 10 }}>Globe rotation</div>
                          <div className="settings-row">
                            <button
                              className="settings-chip"
                              onClick={() => { setAutoRotate(true); onSetAutoRotate?.(true); }}
                              aria-pressed={autoRotate}
                            >On</button>
                            <button
                              className="settings-chip"
                              onClick={() => { setAutoRotate(false); onSetAutoRotate?.(false); }}
                              aria-pressed={!autoRotate}
                            >Off</button>
                          </div>
                          <div className="settings-subtitle" style={{ marginTop: 10 }}>Rotation speed</div>
                          <div className="settings-row" style={{ alignItems: 'center' }}>
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
                            <span className="settings-slider-value">{rotateSpeed.toFixed(1)}°/s</span>
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