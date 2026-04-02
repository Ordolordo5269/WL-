// Conflict Tracker Database
// This file contains all the conflict data separated from the component logic
import type { Conflict, NewsArticle } from '../types/index';
export type { Conflict };

// Conflict data is now sourced exclusively from the database via the API
export const conflictsDatabase: Conflict[] = [];

// News data is now sourced exclusively from the database via the API
export const newsDatabase: NewsArticle[] = [];

// Utility functions for data access
export const getConflictsByRegion = (region: string): Conflict[] => {
  return conflictsDatabase.filter(conflict => conflict.region === region);
};

export const getConflictsByStatus = (status: 'War' | 'Warm' | 'Improving'): Conflict[] => {
  return conflictsDatabase.filter(conflict => conflict.status === status);
};

export const getNewsForConflict = (conflictId: string): NewsArticle[] => {
  return newsDatabase.filter(news => news.conflictId === conflictId);
};

export const getAllRegions = (): string[] => {
  return [...new Set(conflictsDatabase.map(conflict => conflict.region))];
};

export const getConflictById = (id: string): Conflict | undefined => {
  return conflictsDatabase.find(conflict => conflict.id === id);
};