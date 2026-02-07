import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { favoritesService } from '../services/favorites.service';

export interface Country {
  iso3: string;
  name: string;
  flagUrl?: string;
  isFavorite?: boolean;
}

interface CountrySelectorProps {
  countries: Country[];
  onSelectCountry: (iso3: string) => void;
  loading?: boolean;
  placeholder?: string;
  scrollTargetId?: string;
}

const POPULAR_COUNTRIES = [
  'United States', 'China', 'Japan', 'Germany', 'India', 'United Kingdom',
  'France', 'Italy', 'Brazil', 'Canada', 'South Korea', 'Spain',
  'Australia', 'Mexico', 'Indonesia', 'Netherlands', 'Saudi Arabia', 'Turkey',
  'Switzerland', 'Poland', 'Belgium', 'Argentina', 'Sweden', 'Thailand'
];

export default function CountrySelector({
  countries,
  onSelectCountry,
  loading = false,
  placeholder = 'Search countries by name or ISO3 code...',
  scrollTargetId
}: CountrySelectorProps) {
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavorites(new Set());
      return;
    }

    const loadFavorites = async () => {
      setLoadingFavorites(true);
      try {
        const response = await favoritesService.getFavorites();
        const favoriteIso3Set = new Set(response.favorites.map(f => f.countryIso3));
        setFavorites(favoriteIso3Set);
      } catch (error) {
        console.error('Failed to load favorites:', error);
        setFavorites(new Set());
      } finally {
        setLoadingFavorites(false);
      }
    };

    loadFavorites();
  }, [isAuthenticated]);

  const enrichedCountries = useMemo(() => {
    return countries.map(country => ({
      ...country,
      isFavorite: favorites.has(country.iso3)
    }));
  }, [countries, favorites]);

  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();
    
    // Enhanced search: match by name, ISO3, and prioritize exact/exact-start matches
    const results = enrichedCountries
      .map(country => {
        const nameLower = country.name.toLowerCase();
        const iso3Lower = country.iso3.toLowerCase();
        
        // Calculate match score for sorting
        let score = 0;
        let matches = false;
        
        // Exact match gets highest priority
        if (nameLower === term || iso3Lower === term) {
          score = 1000;
          matches = true;
        }
        // Starts with gets high priority
        else if (nameLower.startsWith(term) || iso3Lower.startsWith(term)) {
          score = 500;
          matches = true;
        }
        // Contains gets lower priority
        else if (nameLower.includes(term) || iso3Lower.includes(term)) {
          score = 100;
          matches = true;
        }
        
        // Boost score if ISO3 matches exactly
        if (iso3Lower === term) {
          score += 200;
        }
        
        return { country, score, matches };
      })
      .filter(item => item.matches)
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .map(item => item.country);
    
    // Return all results (no limit) - the dropdown will handle scrolling
    return results;
  }, [searchTerm, enrichedCountries]);

  const popularCountries = useMemo(() => {
    return POPULAR_COUNTRIES
      .map(name => {
        const country = enrichedCountries.find(c =>
          c.name.toLowerCase() === name.toLowerCase() ||
          c.name.toLowerCase().includes(name.toLowerCase())
        );
        return country;
      })
      .filter((c): c is Country => c !== undefined);
      // Show all popular countries, not just 24
  }, [enrichedCountries]);

  const favoriteCountries = useMemo(() => {
    return enrichedCountries
      .filter(country => country.isFavorite);
      // Show all favorites, not just 24
  }, [enrichedCountries]);

  const handleSelectCountry = useCallback((iso3: string) => {
    onSelectCountry(iso3);
    setSearchTerm('');
    setIsOpen(false);
    setFocusedIndex(-1);

    if (scrollTargetId) {
      setTimeout(() => {
        const targetElement = document.getElementById(scrollTargetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [onSelectCountry, scrollTargetId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
    }

    // Combine favorites and popular when showing both
    const allCountries = showBothSections 
      ? [...favoriteCountries, ...popularCountries]
      : (searchTerm.trim() 
          ? filteredCountries 
          : (isAuthenticated && favoriteCountries.length > 0 
              ? favoriteCountries 
              : popularCountries));
    const results = allCountries;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < results.length) {
      e.preventDefault();
      handleSelectCountry(results[focusedIndex].iso3);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
    }
  }, [isOpen, searchTerm, filteredCountries, favoriteCountries, popularCountries, isAuthenticated, focusedIndex, handleSelectCountry]);

  useEffect(() => {
    if (focusedIndex >= 0 && resultsRef.current) {
      const focusedElement = resultsRef.current.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const hasSearchResults = searchTerm.trim().length > 0;
  const showFavorites = isAuthenticated && favoriteCountries.length > 0 && !hasSearchResults;
  const showPopular = !hasSearchResults;
  // When showing favorites, also show popular countries below
  const showBothSections = showFavorites && popularCountries.length > 0;

  return (
    <div className="country-selector-wrapper" ref={containerRef}>
      {/* Search Input */}
      <div className="country-selector-input-wrapper">
        <Search className="country-selector-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="country-selector-input"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
              setFocusedIndex(-1);
              inputRef.current?.focus();
            }}
            className="country-selector-clear"
            aria-label="Clear search"
          >
            <X className="w-full h-full" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="country-selector-dropdown"
          >
            {loading || loadingFavorites ? (
              <div className="country-selector-loading">
                <div className="country-selector-loading-spinner" />
                <p>Loading...</p>
              </div>
            ) : hasSearchResults ? (
              <div className="country-selector-results" ref={resultsRef}>
                {filteredCountries.length > 0 ? (
                  <div style={{ padding: '4px' }}>
                    {filteredCountries.map((country, index) => (
                      <motion.button
                        key={`${country.iso3}-${index}`}
                        data-index={index}
                        onClick={() => handleSelectCountry(country.iso3)}
                        onMouseEnter={() => setFocusedIndex(index)}
                        className={`country-selector-item ${focusedIndex === index ? 'focused' : ''}`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="country-selector-flag">
                          {country.flagUrl ? (
                            <img
                              src={country.flagUrl}
                              alt={country.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                              <Globe style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
                            </div>
                          )}
                        </div>
                        <div className="country-selector-info">
                          <div className="country-selector-name">
                            {country.name}
                            {country.isFavorite && (
                              <Star className="country-selector-favorite-icon" />
                            )}
                          </div>
                          <div className="country-selector-iso">{country.iso3}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="country-selector-empty">
                    <AlertCircle className="country-selector-empty-icon" />
                    <p className="country-selector-empty-title">No countries found</p>
                    <p className="country-selector-empty-text">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : showFavorites || showBothSections ? (
              <div className="country-selector-results" ref={resultsRef}>
                <div style={{ padding: '4px' }}>
                  {/* Favorites Section */}
                  {favoriteCountries.length > 0 && (
                    <>
                      {favoriteCountries.map((country, index) => (
                        <motion.button
                          key={`favorite-${country.iso3}-${index}`}
                          data-index={index}
                          onClick={() => handleSelectCountry(country.iso3)}
                          onMouseEnter={() => setFocusedIndex(index)}
                          className={`country-selector-item ${focusedIndex === index ? 'focused' : ''}`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="country-selector-flag">
                            {country.flagUrl ? (
                              <img
                                src={country.flagUrl}
                                alt={country.name}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                                <Globe style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
                              </div>
                            )}
                          </div>
                          <div className="country-selector-info">
                            <div className="country-selector-name">
                              {country.name}
                              <Star className="country-selector-favorite-icon" />
                            </div>
                            <div className="country-selector-iso">{country.iso3}</div>
                          </div>
                        </motion.button>
                      ))}
                      {/* Subtle separator between favorites and other countries */}
                      {showBothSections && popularCountries.length > 0 && (
                        <div style={{ 
                          height: '1px', 
                          background: 'rgba(71, 85, 105, 0.2)', 
                          margin: '8px 0',
                          width: '100%'
                        }} />
                      )}
                    </>
                  )}
                  
                  {/* Popular Countries - shown below favorites without header */}
                  {showBothSections && popularCountries.map((country, index) => {
                    // Calculate the correct index for keyboard navigation (favorites count + current index)
                    const globalIndex = favoriteCountries.length + index;
                    return (
                      <motion.button
                        key={`popular-${country.iso3}-${index}`}
                        data-index={globalIndex}
                        onClick={() => handleSelectCountry(country.iso3)}
                        onMouseEnter={() => setFocusedIndex(globalIndex)}
                        className={`country-selector-item ${focusedIndex === globalIndex ? 'focused' : ''}`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="country-selector-flag">
                          {country.flagUrl ? (
                            <img
                              src={country.flagUrl}
                              alt={country.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                              <Globe style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
                            </div>
                          )}
                        </div>
                        <div className="country-selector-info">
                          <div className="country-selector-name">
                            {country.name}
                            {country.isFavorite && (
                              <Star className="country-selector-favorite-icon" />
                            )}
                          </div>
                          <div className="country-selector-iso">{country.iso3}</div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ) : showPopular ? (
              <div className="country-selector-results" ref={resultsRef}>
                <div style={{ padding: '4px' }}>
                  {popularCountries.map((country, index) => (
                    <motion.button
                      key={`popular-${country.iso3}-${index}`}
                      data-index={index}
                      onClick={() => handleSelectCountry(country.iso3)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`country-selector-item ${focusedIndex === index ? 'focused' : ''}`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="country-selector-flag">
                        {country.flagUrl ? (
                          <img
                            src={country.flagUrl}
                            alt={country.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                            <Globe style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
                          </div>
                        )}
                      </div>
                      <div className="country-selector-info">
                        <div className="country-selector-name">
                          {country.name}
                          {country.isFavorite && (
                            <Star className="country-selector-favorite-icon" />
                          )}
                        </div>
                        <div className="country-selector-iso">{country.iso3}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
