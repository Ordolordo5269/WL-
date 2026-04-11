import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { favoritesService } from '../../features/dashboard/favorites.service';

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
  variant?: 'default' | 'popup';
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
  scrollTargetId,
  variant = 'default'
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

  const isPopup = variant === 'popup';

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
    return enrichedCountries
      .filter(country =>
        country.name.toLowerCase().includes(term) ||
        country.iso3.toLowerCase().includes(term)
      )
      .slice(0, 50);
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
      .filter((c) => c !== undefined)
      .slice(0, 24) as Country[];
  }, [enrichedCountries]);

  const favoriteCountries = useMemo(() => {
    return enrichedCountries
      .filter(country => country.isFavorite)
      .slice(0, 24);
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

    const results = searchTerm.trim() ? filteredCountries : (isAuthenticated && favoriteCountries.length > 0 ? favoriteCountries : popularCountries);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < results.length) {
      e.preventDefault();
      handleSelectCountry(results[focusedIndex]?.iso3);
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
  const showPopular = !hasSearchResults && (!isAuthenticated || favoriteCountries.length === 0);

  // ── Popup variant: clean item renderer ──────────────────────────────────
  const renderPopupItem = (country: Country, index: number, keyPrefix: string) => (
    <button
      key={`${keyPrefix}-${country.iso3}-${index}`}
      data-index={index}
      onClick={() => handleSelectCountry(country.iso3)}
      className={`ccs-popup-item${focusedIndex === index ? ' ccs-popup-item--focused' : ''}`}
    >
      <div className="ccs-popup-flag">
        {country.flagUrl ? (
          <img
            src={country.flagUrl}
            alt={country.name}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Globe className="w-3 h-3 text-slate-500" />
        )}
      </div>
      <span className="ccs-popup-name">{country.name}</span>
      {country.isFavorite && <Star className="ccs-popup-star" />}
    </button>
  );

  // ── Default variant: original item renderer ──────────────────────────────
  const renderDefaultItem = (country: Country, index: number, keyPrefix: string) => (
    <button
      key={`${keyPrefix}-${country.iso3}-${index}`}
      data-index={index}
      onClick={() => handleSelectCountry(country.iso3)}
      onMouseEnter={() => setFocusedIndex(index)}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all text-left"
      style={{
        background: focusedIndex === index ? 'rgba(30, 44, 72, 0.7)' : 'transparent',
        border: '1px solid transparent',
        boxShadow: focusedIndex === index ? 'inset 2px 0 0 rgba(99, 155, 255, 0.45)' : 'none',
        color: focusedIndex === index ? '#e8eef8' : '#c8d3e8',
        fontSize: '12px',
      }}
    >
      <div className="rounded overflow-hidden flex-shrink-0" style={{ width: '28px', height: '20px', minWidth: '28px', background: 'rgba(30, 41, 59, 0.6)' }}>
        {country.flagUrl ? (
          <img src={country.flagUrl} alt={country.name} style={{ width: '28px', height: '20px', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div style={{ width: '28px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe className="w-3 h-3 text-slate-500" />
          </div>
        )}
      </div>
      <span className="flex-1 min-w-0 font-medium truncate">{country.name}</span>
      {country.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
      <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace', letterSpacing: '0.3px', fontWeight: 600, minWidth: '28px' }}>{country.iso3}</span>
    </button>
  );

  const renderItem = isPopup ? renderPopupItem : renderDefaultItem;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        {!isPopup && (
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        )}
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
          className={isPopup
            ? 'ccs-popup-input'
            : 'w-full pl-12 pr-12 py-3 rounded-lg text-white focus:outline-none transition-all text-[13px]'
          }
          style={!isPopup ? {
            background: 'rgba(10, 14, 28, 0.95)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            color: '#e2e8f0',
          } : undefined}
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
              setFocusedIndex(-1);
              inputRef.current?.focus();
            }}
            className={isPopup
              ? 'ccs-popup-clear'
              : 'absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1'
            }
            aria-label="Clear search"
          >
            <X className={isPopup ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className={isPopup
              ? 'ccs-popup-dropdown'
              : 'absolute z-30 w-full mt-2 rounded-xl max-h-[420px] overflow-hidden'
            }
            style={!isPopup ? {
              background: 'rgb(13, 17, 35)',
              border: '1px solid rgba(71, 85, 105, 0.22)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2), 0 14px 36px rgba(0,0,0,0.55)',
            } : undefined}
          >
            {loading || loadingFavorites ? (
              <div className={isPopup ? 'ccs-popup-loading' : 'p-8 text-center'}>
                <Loader2 className={isPopup ? 'w-4 h-4 animate-spin mx-auto text-blue-400' : 'w-6 h-6 animate-spin mx-auto mb-3 text-blue-400'} />
                {!isPopup && <p className="text-slate-400">Loading...</p>}
              </div>
            ) : hasSearchResults ? (
              <div className={isPopup ? 'ccs-popup-list' : 'overflow-y-auto max-h-[400px] custom-scrollbar'} ref={resultsRef}>
                {filteredCountries.length > 0 ? (
                  <div className={isPopup ? 'ccs-popup-items' : 'p-2'}>
                    {filteredCountries.map((country, index) => renderItem(country, index, 'search'))}
                  </div>
                ) : (
                  <div className={isPopup ? 'ccs-popup-empty' : 'p-8 text-center'}>
                    <AlertCircle className={isPopup ? 'w-5 h-5 text-slate-600 mx-auto mb-1' : 'w-12 h-12 text-slate-500 mx-auto mb-3'} />
                    <p className={isPopup ? 'text-xs text-slate-500' : 'text-slate-400 font-medium'}>No countries found</p>
                  </div>
                )}
              </div>
            ) : showFavorites ? (
              <div className={isPopup ? 'ccs-popup-list' : 'overflow-y-auto max-h-[400px] custom-scrollbar'} ref={resultsRef}>
                {!isPopup && (
                  <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.2)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: '#64748b' }} className="flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      Favorites
                    </span>
                  </div>
                )}
                <div className={isPopup ? 'ccs-popup-items' : 'p-2'}>
                  {favoriteCountries.map((country, index) => renderItem(country, index, 'favorite'))}
                </div>
              </div>
            ) : showPopular ? (
              <div className={isPopup ? 'ccs-popup-list' : 'overflow-y-auto max-h-[400px] custom-scrollbar'} ref={resultsRef}>
                {!isPopup && (
                  <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.2)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: '#64748b' }} className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-blue-400" />
                      Popular Countries
                    </span>
                  </div>
                )}
                <div className={isPopup ? 'ccs-popup-items' : 'p-2'}>
                  {popularCountries.map((country, index) => renderItem(country, index, 'popular'))}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
