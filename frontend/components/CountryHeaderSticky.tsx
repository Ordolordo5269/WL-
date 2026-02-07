import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { favoritesService } from '../services/favorites.service';
import type { CountryBasicInfo } from '../services/country-basic-info.service';

interface CountryHeaderStickyProps {
  countryData: CountryBasicInfo | null;
  countryName: string | null;
}

export default function CountryHeaderSticky({ countryData, countryName }: CountryHeaderStickyProps) {
  const { isAuthenticated } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const iso3 = countryData?.cca3;

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
        // Silently fail - user might not be logged in
        setIsFavorited(false);
      }
    };

    checkFavorite();
  }, [isAuthenticated, iso3]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated || !iso3 || isLoading) return;

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <header className="country-header-sticky">
      <div className="country-header-content">
        {/* Left: Flag */}
        <div className="country-header-flag">
          {countryData?.flags?.png && (
            <img 
              src={countryData.flags.png} 
              alt={`Flag of ${countryName}`}
              className="country-flag-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Center: Name and Official Name */}
        <div className="country-header-info">
          <h1 className="country-header-title">
            {countryName || 'Country data'}
          </h1>
          {countryData?.name?.official && (
            <p className="country-header-official">
              {countryData.name.official}
            </p>
          )}
        </div>

        {/* Right: Region Badge and Star Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {countryData?.region && (
            <div className="country-header-region">
              {countryData.region}
            </div>
          )}
          {isAuthenticated && iso3 && (
            <motion.button
              onClick={handleToggleFavorite}
              disabled={isLoading}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="country-favorite-button"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: isLoading ? 'wait' : 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background 0.2s'
              }}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
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
    </header>
  );
}

