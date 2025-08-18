import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Settings, Info, Globe, Users, BarChart3, Map } from 'lucide-react';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onOpenConflictTracker?: () => void;
  onToggleAlignmentOverlay?: (enabled: boolean) => void;
  onPreviewAlignmentColor?: (hex: string) => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export default function LeftSidebar({ isOpen, onOpenConflictTracker, onToggleAlignmentOverlay, onPreviewAlignmentColor }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState<string>('home');
  const [alignmentEnabled, setAlignmentEnabled] = useState<boolean>(false);
  const [coefSlider, setCoefSlider] = useState<number>(0); // -100..100
  const [coefHex, setCoefHex] = useState<string>('#f7f7f7');

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: <Home className="h-5 w-5" />,
      label: 'Conflict Tracker',
      href: '#home'
    },
    {
      icon: <Globe className="h-5 w-5" />,
      label: 'Explorar Países',
      href: '#explore'
    },
    {
      icon: <Map className="h-5 w-5" />,
      label: 'Mapa Mundial',
      href: '#map'
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Estadísticas',
      href: '#stats'
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'Comparar Países',
      href: '#compare'
    },
    {
      icon: <Search className="h-5 w-5" />,
      label: 'Búsqueda Avanzada',
      href: '#search'
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: 'Configuración',
      href: '#settings'
    },
    {
      icon: <Info className="h-5 w-5" />,
      label: 'Acerca de',
      href: '#about'
    }
  ], []);

  const handleItemClick = useCallback((item: MenuItem) => {
    setActiveItem(item.label.toLowerCase());
    
    // Handle Conflict Tracker specifically
    if (item.label === 'Conflict Tracker' && onOpenConflictTracker) {
      onOpenConflictTracker();
      return;
    }
    
    if (item.onClick) {
      item.onClick();
    }
    // Opcional: cerrar sidebar en móvil después de hacer clic
    // onClose();
  }, [onOpenConflictTracker]);

  // Fetch color preview from backend when slider changes
  React.useEffect(() => {
    const c = (coefSlider / 100).toFixed(2);
    const controller = new AbortController();
    fetch(`http://localhost:3000/api/alignment/color?c=${c}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (d && typeof d.color === 'string') setCoefHex(d.color);
        if (d && typeof d.color === 'string' && onPreviewAlignmentColor) onPreviewAlignmentColor(d.color);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [coefSlider, onPreviewAlignmentColor]);

  const handleToggleAlignment = useCallback(() => {
    const next = !alignmentEnabled;
    setAlignmentEnabled(next);
    if (onToggleAlignmentOverlay) onToggleAlignmentOverlay(next);
  }, [alignmentEnabled, onToggleAlignmentOverlay]);


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
              {/* Header */}
              <div className="left-sidebar-header flex items-center justify-center mb-6" style={{ minHeight: '80px' }}>
                <h1 className="left-sidebar-title">
                  WorldLore
                </h1>
              </div>

              {/* Menu Items */}
              <div className="left-sidebar-content">
                <nav className="space-y-2">
                  {menuItems.map((item, index) => (
                    <motion.a
                      key={item.label}
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
                  ))}
                  {/* Alignment controls under World Map section */}
                  <div className="mt-3 px-3 py-3 rounded-xl bg-slate-800/40 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-200 text-sm">World Map: Alignment Overlay</span>
                      <button
                        onClick={handleToggleAlignment}
                        className={`px-2 py-1 text-xs rounded-md ${alignmentEnabled ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                      >
                        {alignmentEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={coefSlider}
                        onChange={(e) => setCoefSlider(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="w-6 h-6 rounded-full border border-slate-600" style={{ backgroundColor: coefHex }} />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Preview color for coef: {(coefSlider/100).toFixed(2)}</div>
                  </div>
                </nav>
              </div>

              {/* Footer */}
              <div className="left-sidebar-footer">
                <div className="text-xs text-slate-400 text-center">
                  World Explorer v1.0
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    );
  }