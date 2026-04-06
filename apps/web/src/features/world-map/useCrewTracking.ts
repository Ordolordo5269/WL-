import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface CrewMember {
  id: number;
  name: string;
  nationality: string;
  countryCode: string;
  agency: string;
  agencyAbbrev: string;
  photo: string | null;
  spacecraft: string;
  role: string;
  launchDate: string | null;
  daysInSpace: number;
}

export function useCrewTracking() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCrew = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_URL}/api/satellite/crew`, { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: CrewMember[] = await resp.json();
      setCrew(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[crew] Failed to fetch:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Group crew by spacecraft
  const crewBySpacecraft = crew.reduce<Record<string, CrewMember[]>>((acc, member) => {
    const key = member.spacecraft || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(member);
    return acc;
  }, {});

  return {
    crew,
    crewBySpacecraft,
    loading,
    error,
    fetchCrew,
    totalInSpace: crew.length,
  };
}
