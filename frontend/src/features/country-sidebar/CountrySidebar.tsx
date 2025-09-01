import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Banknote, Landmark, Shield, Users, Globe2, Cpu, Palette, X } from 'lucide-react';
import { useEconomyData } from '../../../hooks/useEconomyData';
import { useCountryBasicInfo } from '../../../hooks/useCountryBasicInfo.ts';
import EconomySection from '../../../components/EconomySection';
import BasicInfoSection from '../../../components/BasicInfoSection';
import { useSocietyData } from '../../../hooks/useSocietyData';
import SocietySection from '../../../components/SocietySection';
import { usePoliticsData } from '../../../hooks/usePoliticsData';
import PoliticsSection from '../../../components/PoliticsSection';
import { useDefenseData } from '../../../hooks/useDefenseData';
import DefenseSection from '../../../components/DefenseSection';
import { useInternationalData } from '../../../hooks/useInternationalData';
import InternationalSection from '../../../components/InternationalSection';
import { useTechnologyData } from '../../../hooks/useTechnologyData';
import TechnologySection from '../../../components/TechnologySection';
import { useCultureData } from '../../../hooks/useCultureData';
import CultureSection from '../../../components/CultureSection';

interface CategoryGroupProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
  isOpen: boolean;
  onToggle: () => void;
  searchTerm: string;
}

function CategoryGroup({ icon, title, items, isOpen, onToggle, searchTerm }: CategoryGroupProps) {
  const filteredItems = useMemo(() => 
    items.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    ), [items, searchTerm]
  );
  const categoryMatches = title.toLowerCase().includes(searchTerm.toLowerCase());
  const shouldShow = !searchTerm || categoryMatches || filteredItems.length > 0;
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
  const { countryData, isLoading: isBasicInfoLoading, error: basicInfoError } = useCountryBasicInfo(countryName);
  const iso3 = countryData?.cca3 ?? null;
  const { economyData, isLoading: isEconomyLoading, error: economyError } = useEconomyData(iso3, countryName);
  const { data: societyData, isLoading: isSocietyLoading, error: societyError } = useSocietyData(iso3);
  const { data: politicsData, isLoading: isPoliticsLoading, error: politicsError } = usePoliticsData(countryName, iso3);
  const { data: defenseData, isLoading: isDefenseLoading, error: defenseError } = useDefenseData(iso3, countryName);
  const { data: internationalData, isLoading: isInternationalLoading, error: internationalError } = useInternationalData(iso3, countryName);
  const { data: technologyData, isLoading: isTechnologyLoading, error: technologyError } = useTechnologyData(iso3, countryName);
  const { data: cultureData, isLoading: isCultureLoading, error: cultureError } = useCultureData(iso3, countryName);

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
      title: 'General Information',
      items: [
        'Official name', 'Flag', 'Surface area', 'Languages', 'Currency',
        'ISO codes', 'Continent', 'Capital', 'Population', 'Government type'
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
  ];

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
          <div className="sidebar-header">
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
                <h2 className="country-title">
                  {countryName || 'Country data'}
                </h2>
                {countryData && (
                  <div className="country-details">
                    <div className="details-row">
                      {countryData.name?.official && (
                        <div className="official-name">
                          {countryData.name.official}
                        </div>
                      )}
                      {countryData.region && (
                        <div className="country-region">
                          {countryData.region}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="conflict-tracker-close-btn"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="sidebar-content">
            <div className="p-2">
              {categories.map((category) => {
                if (category.title === 'General Information') {
                  return (
                    <div key={category.title} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
                          openCategories.has(category.title) ? 'category-open' : ''
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium flex-1">{category.title}</span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openCategories.has(category.title) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {openCategories.has(category.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-2 mt-2"
                        >
                          <BasicInfoSection 
                            countryData={countryData}
                            isLoading={isBasicInfoLoading}
                            error={basicInfoError}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                }
                if (category.title === 'Economy') {
                  return (
                    <div key={category.title} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
                          openCategories.has(category.title) ? 'category-open' : ''
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium flex-1">{category.title}</span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openCategories.has(category.title) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {openCategories.has(category.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-2 mt-2"
                        >
                          <EconomySection 
                            economyData={economyData}
                            isLoading={isEconomyLoading}
                            error={economyError}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                }
                if (category.title === 'Politics') {
                  return (
                    <div key={category.title} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
                          openCategories.has(category.title) ? 'category-open' : ''
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium flex-1">{category.title}</span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openCategories.has(category.title) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {openCategories.has(category.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-2 mt-2"
                        >
                          <PoliticsSection 
                            data={politicsData}
                            isLoading={isPoliticsLoading}
                            error={politicsError}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                }
                if (category.title === 'Defense') {
                  return (
                    <div key={category.title} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
                          openCategories.has(category.title) ? 'category-open' : ''
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium flex-1">{category.title}</span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openCategories.has(category.title) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {openCategories.has(category.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-2 mt-2"
                        >
                          <DefenseSection 
                            data={defenseData}
                            isLoading={isDefenseLoading}
                            error={defenseError}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                }
                if (category.title === 'Society') {
                  return (
                    <div key={category.title} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
                          openCategories.has(category.title) ? 'category-open' : ''
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium flex-1">{category.title}</span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openCategories.has(category.title) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {openCategories.has(category.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-2 mt-2"
                        >
                          <SocietySection 
                            data={societyData}
                            isLoading={isSocietyLoading}
                            error={societyError}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                }
                if (category.title === 'International') {
                  return (
                    <div key={category.title} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
                          openCategories.has(category.title) ? 'category-open' : ''
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium flex-1">{category.title}</span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openCategories.has(category.title) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {openCategories.has(category.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-2 mt-2"
                        >
                          <InternationalSection 
                            data={internationalData}
                            isLoading={isInternationalLoading}
                            error={internationalError}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                }
                if (category.title === 'Technology and National Assets') {
                  return (
                    <div key={category.title} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
                          openCategories.has(category.title) ? 'category-open' : ''
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium flex-1">{category.title}</span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openCategories.has(category.title) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {openCategories.has(category.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-2 mt-2"
                        >
                          <TechnologySection 
                            data={technologyData}
                            isLoading={isTechnologyLoading}
                            error={technologyError}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                }
                if (category.title === 'Culture') {
                  return (
                    <div key={category.title} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={`category-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-300 ${
                          openCategories.has(category.title) ? 'category-open' : ''
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium flex-1">{category.title}</span>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openCategories.has(category.title) ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {openCategories.has(category.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-2 mt-2"
                        >
                          <CultureSection 
                            data={cultureData}
                            isLoading={isCultureLoading}
                            error={cultureError}
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                }
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
            </div>
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-counter">
              {searchTerm ? 
                `${visibleCategories.length} of ${categories.length} categories` : 
                `${categories.length} categories available`
              }
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



