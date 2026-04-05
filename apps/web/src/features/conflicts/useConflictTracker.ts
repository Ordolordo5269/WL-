import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchConflicts, fetchConflict, fetchFactionProfile } from './api';
import type { Conflict, FactionProfile, ConflictViewState } from './types';

export function useConflictTracker() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
  const [factionProfile, setFactionProfile] = useState<FactionProfile | null>(null);
  const [viewState, setViewState] = useState<ConflictViewState>('global');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const detailCache = useRef<Map<string, Conflict>>(new Map());
  const factionCache = useRef<Map<string, FactionProfile>>(new Map());

  // Prefetch all conflicts when enabled
  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    fetchConflicts('ACTIVE')
      .then(setConflicts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [enabled]);

  // Select a conflict — use cache if available
  const selectConflict = useCallback(async (id: string) => {
    const cached = detailCache.current.get(id);
    if (cached) {
      setSelectedConflict(cached);
      setSelectedFactionId(null);
      setFactionProfile(null);
      setViewState('conflict');
      return;
    }

    setLoading(true);
    try {
      const detail = await fetchConflict(id);
      detailCache.current.set(id, detail);
      setSelectedConflict(detail);
      setSelectedFactionId(null);
      setFactionProfile(null);
      setViewState('conflict');
    } catch (err) {
      console.error('Failed to load conflict detail:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFaction = useCallback((factionId: string) => {
    setSelectedFactionId(factionId);
    setViewState('relationship');
  }, []);

  // Open faction profile — shows all conflicts & support links for this actor
  const openFactionProfile = useCallback(async (factionId: string) => {
    const cached = factionCache.current.get(factionId);
    if (cached) {
      setFactionProfile(cached);
      setViewState('faction');
      return;
    }

    setLoading(true);
    try {
      const profile = await fetchFactionProfile(factionId);
      factionCache.current.set(factionId, profile);
      setFactionProfile(profile);
      setViewState('faction');
    } catch (err) {
      console.error('Failed to load faction profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const goBack = useCallback(() => {
    if (viewState === 'relationship') {
      setSelectedFactionId(null);
      setViewState('conflict');
    } else if (viewState === 'conflict') {
      setSelectedConflict(null);
      setViewState('global');
    } else if (viewState === 'faction') {
      // If we came from a conflict, go back to it; otherwise go global
      if (selectedConflict) {
        setFactionProfile(null);
        setViewState('conflict');
      } else {
        setFactionProfile(null);
        setViewState('global');
      }
    }
  }, [viewState, selectedConflict]);

  const toggle = useCallback((v: boolean) => {
    setEnabled(v);
    if (!v) {
      setSelectedConflict(null);
      setSelectedFactionId(null);
      setFactionProfile(null);
      setViewState('global');
    }
  }, []);

  return {
    enabled, toggle, conflicts, selectedConflict, selectedFactionId,
    factionProfile, viewState, loading,
    selectConflict, selectFaction, openFactionProfile, goBack,
  };
}
