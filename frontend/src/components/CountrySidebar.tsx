import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Banknote, Landmark, Shield, Users, Globe2, Cpu, Palette, X, Maximize2, Minimize2, TrendingUp, Star } from 'lucide-react';
import { useEconomyData } from '../hooks/useEconomyData';
import { useCountryBasicInfo } from '../hooks/useCountryBasicInfo.ts';
import EconomySection from './EconomySection';
import BasicInfoSection from './BasicInfoSection';
import { useSocietyData } from '../hooks/useSocietyData';
import SocietySection from './SocietySection';
import { usePoliticsData } from '../hooks/usePoliticsData';
import PoliticsSection from './PoliticsSection';
import { useDefenseData } from '../hooks/useDefenseData';
import DefenseSection from './DefenseSection';
import { useInternationalData } from '../hooks/useInternationalData';
import InternationalSection from './InternationalSection';
import { useTechnologyData } from '../hooks/useTechnologyData';
import TechnologySection from './TechnologySection';
import { useCultureData } from '../hooks/useCultureData';
import CultureSection from './CultureSection';
import HistoricalTrendsSection from './HistoricalTrendsSection';
import CountryHeaderSticky from './CountryHeaderSticky';
import CountryKPIs from './CountryKPIs';
import CountryStaticData from './CountryStaticData';
import { useAuth } from '../src/contexts/AuthContext';
import { favoritesService } from '../services/favorites.service';

interface CategoryGroupProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
  isOpen: boolean;
  onToggle: () => void;
  searchTerm: string;
}

function CategoryGroup({ icon, title, items, isOpen, onToggle, searchTerm }: CategoryGroupProps) {
  // Filter items based on the search term
  const filteredItems = useMemo(() => 
    items.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    ), [items, searchTerm]
  );
  
  // Check if the category matches the search
  const categoryMatches = title.toLowerCase().includes(searchTerm.toLowerCase());
  
  // Show the category if it matches or if it has matching items
  const shouldShow = !searchTerm || categoryMatches || filteredItems.length > 0;
  
  // Highlight helper
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
        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
          isOpen ? 'category-open' : ''
        }`}
      >
        {icon}
        <span className="font-medium flex-1">
          {highlightText(title, searchTerm)}
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
  const [searchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<boolean>(false);
  
  // Debounce countryName to avoid rapid-fire requests when clicking countries quickly
  const [debouncedCountryName, setDebouncedCountryName] = useState<string | null>(countryName);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Star button state
  const { isAuthenticated } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedCountryName(countryName);
    }, 200); // 200ms debounce - fast enough for UX, slow enough to batch rapid clicks
    
    // Cleanup on unmount or when countryName changes
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [countryName]);
  
  // Reset categories when country actually changes (after debounce)
  useEffect(() => {
    setOpenCategories(new Set());
    setExpanded(false);
  }, [debouncedCountryName]);
  
  // Load basic info data for the selected country (always enabled - needed for ISO3)
  const { countryData, isLoading: isBasicInfoLoading, error: basicInfoError } = useCountryBasicInfo(debouncedCountryName);
  
  // Load society indicators via ISO3 once basic info is available
  const iso3 = countryData?.cca3 ?? null;

  // Check if country is favorited
  useEffect(() => {
    if (!isAuthenticated || !iso3) {
      setIsFavorited(false);
      return;
    }

    const checkFavorite = async () => {
      try {
        const response = await favoritesService.getFavorites();
        const favorited = response.favorites.some(f => f.countryIso3 === iso3);
        setIsFavorited(favorited);
      } catch (error) {
        setIsFavorited(false);
      }
    };

    checkFavorite();
  }, [isAuthenticated, iso3]);

  // Handle toggle favorite
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated || !iso3 || isLoadingFavorite) return;

    setIsLoadingFavorite(true);
    try {
      if (isFavorited) {
        await favoritesService.removeFavorite(iso3);
        setIsFavorited(false);
      } else {
        await favoritesService.addFavorite(iso3);
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoadingFavorite(false);
    }
  };
  
  // Determine which categories should load data (lazy loading optimization)
  // In expanded view, always load all data for Bento Grid
  // In sidebar view, only load when category is open
  const shouldLoadEconomy = expanded || openCategories.has('Economy');
  const shouldLoadSociety = expanded || openCategories.has('Society');
  const shouldLoadPolitics = expanded || openCategories.has('Politics');
  const shouldLoadDefense = expanded || openCategories.has('Defense');
  const shouldLoadInternational = expanded || openCategories.has('International');
  const shouldLoadTechnology = expanded || openCategories.has('Technology and National Assets');
  const shouldLoadCulture = expanded || openCategories.has('Culture');
  
  // Load data only when needed (lazy loading) - use debounced country name
  const { economyData, isLoading: isEconomyLoading, error: economyError } = useEconomyData(iso3, debouncedCountryName, shouldLoadEconomy);
  const { data: societyData, isLoading: isSocietyLoading, error: societyError, series: societySeries, fetchIndicatorSeries: fetchSocietyIndicatorSeries } = useSocietyData(iso3, shouldLoadSociety);
  const { data: politicsData, isLoading: isPoliticsLoading, error: politicsError } = usePoliticsData(debouncedCountryName, iso3, shouldLoadPolitics);
  const { data: defenseData, isLoading: isDefenseLoading, error: defenseError } = useDefenseData(iso3, debouncedCountryName, shouldLoadDefense);
  const { data: internationalData, isLoading: isInternationalLoading, error: internationalError } = useInternationalData(iso3, debouncedCountryName, shouldLoadInternational);
  const { data: technologyData, isLoading: isTechnologyLoading, error: technologyError } = useTechnologyData(iso3, debouncedCountryName, shouldLoadTechnology);
  const { data: cultureData, isLoading: isCultureLoading, error: cultureError } = useCultureData(iso3, debouncedCountryName, shouldLoadCulture);
  
  // Search removed per UX request; keep invariant empty term so lists show all items

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

  // Memoize categories array to prevent recreation on every render
  const categories = useMemo(() => [
    {
      icon: <Globe className="text-blue-400" />,
      title: 'General Information',
      items: [
        'Official name', 'Flag', 'Surface area', 'Languages', 'Currency',
        'ISO codes', 'Continent', 'Capital', 'Population', 'Government type'
      ]
    },
    {
      icon: <TrendingUp className="text-cyan-400" />,
      title: 'Historical Trends',
      items: [
        'GDP evolution', 'GDP per capita', 'Inflation trends', 'GINI index',
        'Exports/Imports', 'Unemployment rate', 'External debt'
      ]
    },
    {
      icon: <Banknote className="text-green-400" />,
      title: 'Economy',
      items: [
        'GDP (Gross Domestic Product)', 'GDP per capita', 'Inflation',
        'GINI index', 'GDP structure', 'Exports and imports',
        'Top trade partners', 'External debt', 'Unemployment rate'
      ]
    },
    {
      icon: <Users className="text-yellow-400" />,
      title: 'Society',
      items: [
        'Life expectancy', 'Literacy rate', 'Poverty indicators',
        'Access to health and education', 'Human Development Index (HDI)',
        'Demographics', 'Birth and mortality rates', 'Urban/rural population (%)', 'Population density'
      ]
    },
    {
      icon: <Landmark className="text-purple-400" />,
      title: 'Politics',
      items: ['Political parties', 'Political system', 'Head of State/Government', 'Political stability']
    },
    {
      icon: <Shield className="text-red-400" />,
      title: 'Defense',
      items: [
        'Military budget', 'Armed forces size', 'Active conflicts',
        'Peace operations', 'Military adversaries'
      ]
    },
    {
      icon: <Globe2 className="text-cyan-400" />,
      title: 'International',
      items: [
        'International organizations', 'Treaties', 'Regional cooperation',
        'Official development assistance (ODA)', 'Main recipients', 'Rival countries', 'Key allies'
      ]
    },
    {
      icon: <Cpu className="text-indigo-400" />,
      title: 'Technology and National Assets',
      items: [
        'R&D index', 'Tech exports', 'Major national companies',
        'State-owned enterprises', 'Strategic assets', 'Sovereign funds',
        'Strategic industries and specializations', 'Industrial policy', 'Critical minerals and global supply share'
      ]
    },
    {
      icon: <Palette className="text-pink-400" />,
      title: 'Culture',
      items: ['Religions', 'UNESCO World Heritage', 'Soft power metrics']
    }
  ], []);

  // Filter categories for the footer counter
  const visibleCategories = categories.filter(category => {
    if (!searchTerm) return true;
    const categoryMatches = category.title.toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatchingItems = category.items.some(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return categoryMatches || hasMatchingItems;
  });

  // Calculate panel style for expanded view
  const panelStyle = useMemo(() => {
    if (expanded) {
      return {
        width: '85vw',
        maxWidth: '1400px',
        height: '95vh',
        maxHeight: '100vh',
        position: 'fixed' as const,
        left: '50%',
        top: '50%',
        borderRadius: '16px',
        zIndex: 60
      };
    }
    return {};
  }, [expanded]);

  // Auto-expand all categories when entering expanded view
  React.useEffect(() => {
    if (expanded) {
      const allCategoryTitles = categories.map(cat => cat.title);
      setOpenCategories(new Set(allCategoryTitles));
    }
  }, [expanded, categories]);

  // Reset expanded state when sidebar closes
  React.useEffect(() => {
    if (!isOpen) {
      setExpanded(false);
    }
  }, [isOpen]);

  // Helper function to render category section
  const renderCategorySection = useCallback((categoryTitle: string, SectionComponent: React.ComponentType<any>, sectionProps: any, inBentoGrid: boolean = false) => {
    const isOpen = openCategories.has(categoryTitle);
    const category = categories.find(cat => cat.title === categoryTitle);
    if (!category) return null;

    // In Bento Grid, we don't need the wrapper card or header
    if (inBentoGrid && expanded) {
      return (
        <div key={categoryTitle} className="bento-section-content">
          <div className="expanded-category-header">
            {category.icon}
            <h3 className="expanded-category-title">{category.title}</h3>
          </div>
          <SectionComponent {...sectionProps} />
        </div>
      );
    }

    return (
      <div key={categoryTitle} className={expanded ? "expanded-category-card" : "mb-2"}>
        {!expanded && (
          <button
            onClick={() => toggleCategory(categoryTitle)}
            className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
              isOpen ? 'category-open' : ''
            }`}
          >
            {category.icon}
            <span className="font-medium flex-1">{category.title}</span>
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-300 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </button>
        )}
        {expanded && (
          <div className="expanded-category-header">
            {category.icon}
            <h3 className="expanded-category-title">{category.title}</h3>
          </div>
        )}
        {(isOpen || expanded) && (
          <motion.div
            initial={expanded ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={expanded ? "" : "ml-2 mt-2"}
          >
            <SectionComponent {...sectionProps} />
          </motion.div>
        )}
      </div>
    );
  }, [expanded, openCategories, categories, toggleCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for expanded view */}
          {expanded && (
            <motion.div
              className="country-info-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              onClick={() => setExpanded(false)}
            />
          )}
          
          <motion.div 
            className={expanded ? "expanded-country-view" : "country-sidebar"}
            style={panelStyle}
            initial={expanded ? { scale: 0.9, opacity: 0 } : { x: '100%', opacity: 0 }}
            animate={expanded ? { scale: 1, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={expanded ? { scale: 0.9, opacity: 0 } : { x: '100%', opacity: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 30,
              duration: 0.3
            }}
          >
            {/* Botón de expandir (solo en vista normal) */}
            {!expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="country-sidebar-expand-btn"
                aria-label="Expand country info"
                title="Expand to full view"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            
            {/* Botón de minimizar (solo en vista ampliada) */}
            {expanded && (
              <button
                onClick={() => setExpanded(false)}
                className="country-sidebar-minimize-btn"
                aria-label="Minimize country info"
                title="Return to sidebar view"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="conflict-tracker-close-btn"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>

          {/* New Bento Grid Layout for Expanded View */}
          {expanded ? (
            <>
              {/* Sticky Header */}
              <CountryHeaderSticky 
                countryData={countryData}
                countryName={debouncedCountryName || countryName}
              />

              {/* Scrollable Content with Bento Grid - Professional Layout */}
              <div className="expanded-country-content">
                <div className="bento-grid">
                  {/* Zone 1: KPIs (Full Width) */}
                  <div className="bento-zone-kpis">
                    <CountryKPIs 
                      countryData={countryData}
                      economyData={economyData}
                      isLoading={isEconomyLoading || isBasicInfoLoading}
                    />
                  </div>

                  {/* Zone 2: Identity (25%) + Zone 3: Historical Trends (75%) */}
                  <div className="bento-zone-static">
                    <CountryStaticData 
                      countryData={countryData}
                      isLoading={isBasicInfoLoading}
                    />
                  </div>

                  <div className="bento-zone-dynamic">
                    {renderCategorySection(
                      'Historical Trends',
                      HistoricalTrendsSection,
                      { iso3, countryName: debouncedCountryName || countryName, fetchSocietyIndicatorSeries: fetchSocietyIndicatorSeries },
                      true
                    )}
                  </div>

                  {/* Zone 4: Economy (50%) */}
                  <div className="bento-zone-economy">
                    {renderCategorySection(
                      'Economy',
                      EconomySection,
                      { economyData, isLoading: isEconomyLoading, error: economyError },
                      true
                    )}
                  </div>

                  {/* Zone 5: Society (50%) */}
                  <div className="bento-zone-society">
                    {renderCategorySection(
                      'Society',
                      SocietySection,
                      { data: societyData, isLoading: isSocietyLoading, error: societyError, series: societySeries, fetchIndicatorSeries: fetchSocietyIndicatorSeries, iso3 },
                      true
                    )}
                  </div>

                  {/* Zone 6-8: Politics, Defense, International (33% each) */}
                  <div className="bento-zone-politics">
                    {renderCategorySection(
                      'Politics',
                      PoliticsSection,
                      { data: politicsData, isLoading: isPoliticsLoading, error: politicsError },
                      true
                    )}
                  </div>

                  <div className="bento-zone-defense">
                    {renderCategorySection(
                      'Defense',
                      DefenseSection,
                      { data: defenseData, isLoading: isDefenseLoading, error: defenseError },
                      true
                    )}
                  </div>

                  <div className="bento-zone-international">
                    {renderCategorySection(
                      'International',
                      InternationalSection,
                      { data: internationalData, isLoading: isInternationalLoading, error: internationalError },
                      true
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Original Sidebar Layout for Non-Expanded View */}
              <div className="sidebar-header">
                {countryData?.flags && (countryData.flags.svg || countryData.flags.png) && (
                  <div
                    className="flag-bg"
                    style={{
                      backgroundImage: `url(${countryData.flags.svg || countryData.flags.png})`
                    }}
                  />
                )}
                <div className="header-top-row">
                  <div className="flag-container">
                    {countryData?.flags?.png && (
                      <img 
                        src={countryData.flags.png} 
                        alt={`Flag of ${countryName}`}
                        className="country-flag"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  
                  <div className="country-info-container">
                    <h2 className="country-title" title={debouncedCountryName || countryName || 'Country data'}>
                      {debouncedCountryName || countryName || 'Country data'}
                    </h2>
                    {countryData && (
                      <div className="country-details">
                        <div className="details-row">
                          {countryData.name?.official && (
                            <p className="official-name" title={countryData.name.official}>
                              {countryData.name.official}
                            </p>
                          )}
                          {countryData.region && (
                            <div className="country-region" title={countryData.region}>
                              {countryData.region}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Star Button - Right Column */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                    {isAuthenticated && iso3 && (
                      <motion.button
                        onClick={handleToggleFavorite}
                        disabled={isLoadingFavorite}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: isLoadingFavorite ? 'wait' : 'pointer',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          transition: 'background 0.2s'
                        }}
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star
                          className="w-5 h-5"
                          style={{
                            fill: isFavorited ? '#fbbf24' : 'none',
                            color: isFavorited ? '#fbbf24' : '#94a3b8',
                            transition: 'all 0.2s'
                          }}
                        />
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>

              {/* Categories List */}
              <div className="sidebar-content">
                <div className="p-1">
              {categories.map((category) => {
                // Special handling for General Information category
                if (category.title === 'General Information') {
                  return renderCategorySection(
                    'General Information',
                    BasicInfoSection,
                    { countryData, isLoading: isBasicInfoLoading, error: basicInfoError }
                  );
                }
                
                // Special handling for Economy category
                if (category.title === 'Economy') {
                  return renderCategorySection(
                    'Economy',
                    EconomySection,
                    { economyData, isLoading: isEconomyLoading, error: economyError }
                  );
                }
                
                // Special handling for Politics category
                if (category.title === 'Politics') {
                  return renderCategorySection(
                    'Politics',
                    PoliticsSection,
                    { data: politicsData, isLoading: isPoliticsLoading, error: politicsError }
                  );
                }

                // Special handling for Defense category
                if (category.title === 'Defense') {
                  return renderCategorySection(
                    'Defense',
                    DefenseSection,
                    { data: defenseData, isLoading: isDefenseLoading, error: defenseError }
                  );
                }

                // Special handling for Society category
                if (category.title === 'Society') {
                  return renderCategorySection(
                    'Society',
                    SocietySection,
                    { data: societyData, isLoading: isSocietyLoading, error: societyError, series: societySeries, fetchIndicatorSeries: fetchSocietyIndicatorSeries, iso3 }
                  );
                }

                // Special handling for International category
                if (category.title === 'International') {
                  return renderCategorySection(
                    'International',
                    InternationalSection,
                    { data: internationalData, isLoading: isInternationalLoading, error: internationalError }
                  );
                }

                // Special handling for Technology and National Assets
                if (category.title === 'Technology and National Assets') {
                  return renderCategorySection(
                    'Technology and National Assets',
                    TechnologySection,
                    { data: technologyData, isLoading: isTechnologyLoading, error: technologyError }
                  );
                }

                // Special handling for Culture category
                if (category.title === 'Culture') {
                  return renderCategorySection(
                    'Culture',
                    CultureSection,
                    { data: cultureData, isLoading: isCultureLoading, error: cultureError }
                  );
                }

                // Special handling for Historical Trends category (only show in expanded view)
                if (category.title === 'Historical Trends') {
                  if (!expanded) return null; // Don't show in sidebar view
                  return renderCategorySection(
                    'Historical Trends',
                    HistoricalTrendsSection,
                    { iso3, countryName: debouncedCountryName || countryName }
                  );
                }

                // Regular category handling for all other categories
                return (
                  <CategoryGroup
                    key={category.title}
                    icon={category.icon}
                    title={category.title}
                    items={category.items}
                    isOpen={openCategories.has(category.title)}
                    onToggle={() => toggleCategory(category.title)}
                    searchTerm={searchTerm}
                  />
                );
              })}
              
                  {searchTerm && visibleCategories.length === 0 && (
                    <div className="text-center text-slate-400 py-8">
                      <p>No results found for "{searchTerm}"</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Footer - Only show in normal view */}
          {!expanded && (
            <div className="sidebar-footer">
              <div className="sidebar-counter">
                {searchTerm ? 
                  `${visibleCategories.length} of ${categories.length} categories` : 
                  `${categories.length} categories available`
                }
              </div>
            </div>
          )}
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}