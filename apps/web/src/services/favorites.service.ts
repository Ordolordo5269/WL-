// Use relative URLs in development (Vite proxy) or absolute URLs from env
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

export interface Favorite {
  id: string;
  userId: string;
  countryIso3: string;
  createdAt: string;
}

class FavoritesService {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  }

  async getFavorites(): Promise<{ favorites: Favorite[] }> {
    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get favorites');
    }

    return await response.json();
  }

  async addFavorite(countryIso3: string): Promise<{ favorite: Favorite }> {
    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ countryIso3 })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add favorite');
    }

    return await response.json();
  }

  async removeFavorite(countryIso3: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/favorites/${countryIso3}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove favorite');
    }
  }
}

export const favoritesService = new FavoritesService();


