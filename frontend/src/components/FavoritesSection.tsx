import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { favoritesService, Favorite } from '../services/favorites.service';
import { Star, X, Globe } from 'lucide-react';

export default function FavoritesSection() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await favoritesService.getFavorites();
      setFavorites(response.favorites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (countryIso3: string) => {
    try {
      await favoritesService.removeFavorite(countryIso3);
      setFavorites(favorites.filter(f => f.countryIso3 !== countryIso3));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove favorite');
    }
  };

  if (isLoading) {
    return (
      <div className="favorites-section">
        <h2>My Favorites</h2>
        <p>Countries you've starred</p>
        <div className="favorites-loading">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading favorites...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="favorites-section">
        <h2>My Favorites</h2>
        <p>Countries you've starred</p>
        <div className="favorites-empty">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-section">
      <h2>My Favorites</h2>
      <p>Countries you've starred</p>

      {favorites.length === 0 ? (
        <div className="favorites-empty">
          <Globe className="favorites-empty-icon text-gray-500" />
          <p>No favorites yet</p>
          <p className="text-sm mt-2">Star countries from the map to see them here</p>
        </div>
      ) : (
        <div className="favorites-grid">
          <AnimatePresence>
            {favorites.map((favorite) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="favorite-card"
              >
                <div className="favorite-card-header">
                  <h3 className="favorite-card-name">{favorite.countryIso3}</h3>
                  <button
                    onClick={() => handleRemove(favorite.countryIso3)}
                    className="favorite-card-remove"
                    aria-label="Remove favorite"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="favorite-card-iso">ISO3: {favorite.countryIso3}</p>
                <div className="mt-2 flex items-center gap-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-xs">Favorited</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}


