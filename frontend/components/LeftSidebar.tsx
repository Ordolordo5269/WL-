import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Home, Search, Settings, Info, Globe, Users, BarChart3, Map } from 'lucide-react';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onOpenConflictTracker?: () => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export default function LeftSidebar({ isOpen, onClose, onCenterMap, onOpenConflictTracker }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState<string>('home');

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

  const handleItemClick = useCallback((item: MenuItem, index: number) => {
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
              <div className="left-sidebar-header">
                <div className="mb-6 text-center">
                  <h2 className="left-sidebar-title">
                    WorldLore
                  </h2>
                </div>
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
                        handleItemClick(item, index);
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