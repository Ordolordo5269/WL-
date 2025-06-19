import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Banknote, Landmark, Shield, Users, Globe2, Cpu, Palette, X } from 'lucide-react';

interface CategoryGroupProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
  isOpen: boolean;
  onToggle: () => void;
  searchTerm: string;
}

function CategoryGroup({ icon, title, items, isOpen, onToggle, searchTerm }: CategoryGroupProps) {
  // Filtrar items basado en el término de búsqueda
  const filteredItems = useMemo(() => 
    items.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    ), [items, searchTerm]
  );
  
  // Verificar si la categoría coincide con la búsqueda
  const categoryMatches = title.toLowerCase().includes(searchTerm.toLowerCase());
  
  // Mostrar la categoría si coincide o si tiene items que coinciden
  const shouldShow = !searchTerm || categoryMatches || filteredItems.length > 0;
  
  // Función para resaltar texto
  const highlightText = useCallback((text: string, highlight: string) => {
    if (!highlight) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={index} className="search-highlight">{part}</span> : part
    );
  }, []);
  
  if (!shouldShow) return null;
  
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-3 hover:bg-slate-800 rounded-lg p-3 text-left transition-all duration-300 ${
          isOpen ? 'category-open' : ''
        }`}
        data-count={searchTerm ? filteredItems.length : items.length}
      >
        {icon}
        <span className="font-medium flex-1">
          {highlightText(title, searchTerm)}
        </span>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
          {searchTerm ? filteredItems.length : items.length}
        </span>
        <ChevronDown 
          className={`h-4 w-4 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="ml-6 mt-2"
        >
          {(searchTerm ? filteredItems : items).map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="block py-2 px-3 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-all duration-200"
            >
              {highlightText(item, searchTerm)}
            </a>
          ))}
        </motion.div>
      )}
    </div>
  );
}

interface CountrySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  countryName: string | null;
}

export default function CountrySidebar({ isOpen, onClose, countryName }: CountrySidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const toggleCategory = useCallback((title: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  }, []);

  const categories = [
    {
      icon: <Globe className="text-blue-400" />,
      title: "General Information",
      items: [
        "Official Name", "Flag", "Surface Area", "Languages", "Currency",
        "ISO Code", "Continent", "Capital City", "Population", "Government Type"
      ]
    },
    {
      icon: <Banknote className="text-green-400" />,
      title: "Economy",
      items: [
        "GDP (Gross Domestic Product)", "GDP per Capita", "Inflation Rate",
        "GINI Index", "GDP Sector Breakdown", "Exports & Imports",
        "Main Trade Partners", "External Debt", "Unemployment Rate"
      ]
    },
    {
      icon: <Landmark className="text-purple-400" />,
      title: "Politics",
      items: ["Political Parties", "Political System", "Head of State / Government", "Political Stability"]
    },
    {
      icon: <Shield className="text-red-400" />,
      title: "Defense",
      items: [
        "Military Budget", "Armed Forces Size", "Active Conflicts",
        "Peace Operations", "Main Military Adversaries"
      ]
    },
    {
      icon: <Users className="text-yellow-400" />,
      title: "Social",
      items: [
        "Life Expectancy", "Literacy Rate", "Poverty Indicators",
        "Health & Education Access", "Human Development Index (HDI)",
        "Demographics", "Birth / Death Rates", "Urban / Rural Population (%)", "Population Density"
      ]
    },
    {
      icon: <Globe2 className="text-cyan-400" />,
      title: "International",
      items: [
        "International Organizations Membership", "Treaties", "Regional Cooperation",
        "Official Development Assistance (ODA)", "Top Recipients", "Rival Countries", "Key Allies"
      ]
    },
    {
      icon: <Cpu className="text-indigo-400" />,
      title: "Technology & National Assets",
      items: [
        "R&D Index", "Tech Exports", "Top National Companies",
        "State-Owned Enterprises (SOEs)", "Strategic Holdings", "Sovereign Wealth Funds",
        "Strategic Industries & Specializations", "Industrial Policy", "Critical Minerals & Share of Global Supply"
      ]
    },
    {
      icon: <Palette className="text-pink-400" />,
      title: "Culture",
      items: ["Religions", "UNESCO World Heritage Sites", "Soft Power Metrics"]
    }
  ];

  // Filtrar categorías para el contador
  const visibleCategories = categories.filter(category => {
    if (!searchTerm) return true;
    const categoryMatches = category.title.toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatchingItems = category.items.some(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return categoryMatches || hasMatchingItems;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="country-sidebar"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.3
          }}
        >
          {/* Header */}
          <div className="sidebar-header">
            <div className="flex items-center justify-between mb-4">
              <h2 className="sidebar-title">
                {countryName || 'Country Data'}
              </h2>
              <button
                onClick={onClose}
                className="group relative p-2 hover:bg-red-500/20 rounded-xl transition-all duration-300 border border-transparent hover:border-red-400/30 backdrop-blur-sm"
                aria-label="Close sidebar"
              >
                <X className="h-6 w-6 text-slate-400 group-hover:text-red-400 group-hover:rotate-90 transition-all duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
            
            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search country data..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Categories List */}
          <div className="sidebar-content">
            <div className="p-2">
              {categories.map((category) => (
                <CategoryGroup
                  key={category.title}
                  icon={category.icon}
                  title={category.title}
                  items={category.items}
                  isOpen={openCategories.has(category.title)}
                  onToggle={() => toggleCategory(category.title)}
                  searchTerm={searchTerm}
                />
              ))}
              
              {searchTerm && visibleCategories.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  <p>No se encontraron resultados para "{searchTerm}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="sidebar-counter">
              {searchTerm ? 
                `${visibleCategories.length} de ${categories.length} categorías` : 
                `${categories.length} categories available`
              }
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}