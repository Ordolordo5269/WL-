// Conflict Tracker Database
// This file contains all the conflict data separated from the component logic

export interface Conflict {
  id: string;
  country: string;
  region: string;
  conflictType: string;
  description: string;
  date: string;
  casualties: number;
  status: 'War' | 'Warm' | 'Improving';
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  url: string;
  conflictId?: string;
}

// Mock conflict data based on real-world conflicts
export const conflictsDatabase: Conflict[] = [
  {
    id: 'ukr-001',
    country: 'Ukraine',
    region: 'Europe',
    conflictType: 'Interstate War',
    description: 'Ongoing conflict following Russian invasion',
    date: '2022-02-24',
    casualties: 500000,
    status: 'War',
    coordinates: { lat: 49.8397, lng: 24.0297 }
  },
  {
    id: 'syr-001',
    country: 'Syria',
    region: 'Middle East',
    conflictType: 'Civil War',
    description: 'Multi-sided civil war with international involvement',
    date: '2011-03-15',
    casualties: 350000,
    status: 'Warm',
    coordinates: { lat: 34.8021, lng: 38.9968 }
  },
  {
    id: 'eth-001',
    country: 'Ethiopia',
    region: 'Africa',
    conflictType: 'Internal Conflict',
    description: 'Tigray conflict and ethnic tensions',
    date: '2020-11-04',
    casualties: 600000,
    status: 'Improving',
    coordinates: { lat: 9.1450, lng: 40.4897 }
  },
  {
    id: 'mmr-001',
    country: 'Myanmar',
    region: 'Asia',
    conflictType: 'Civil Unrest',
    description: 'Military coup and civilian resistance',
    date: '2021-02-01',
    casualties: 4500,
    status: 'War',
    coordinates: { lat: 21.9162, lng: 95.9560 }
  },
  {
    id: 'afg-001',
    country: 'Afghanistan',
    region: 'Asia',
    conflictType: 'Political Violence',
    description: 'Taliban governance and resistance movements',
    date: '2021-08-15',
    casualties: 176000,
    status: 'Warm',
    coordinates: { lat: 33.9391, lng: 67.7100 }
  },
  {
    id: 'yem-001',
    country: 'Yemen',
    region: 'Middle East',
    conflictType: 'Civil War',
    description: 'Saudi-led coalition vs Houthi rebels',
    date: '2014-09-21',
    casualties: 377000,
    status: 'War',
    coordinates: { lat: 15.5527, lng: 48.5164 }
  },
  {
    id: 'som-001',
    country: 'Somalia',
    region: 'Africa',
    conflictType: 'Terrorism',
    description: 'Al-Shabaab insurgency and clan conflicts',
    date: '2006-12-20',
    casualties: 500000,
    status: 'Warm',
    coordinates: { lat: 5.1521, lng: 46.1996 }
  },
  {
    id: 'col-001',
    country: 'Colombia',
    region: 'Americas',
    conflictType: 'Post-Conflict Violence',
    description: 'FARC disarmament aftermath and new armed groups',
    date: '2016-11-24',
    casualties: 3000,
    status: 'Improving',
    coordinates: { lat: 4.5709, lng: -74.2973 }
  },
  {
    id: 'mli-001',
    country: 'Mali',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Jihadist groups and French intervention aftermath',
    date: '2012-01-16',
    casualties: 15000,
    status: 'Warm',
    coordinates: { lat: 17.5707, lng: -3.9962 }
  },
  {
    id: 'irq-001',
    country: 'Iraq',
    region: 'Middle East',
    conflictType: 'Post-ISIS Stabilization',
    description: 'Reconstruction and remaining ISIS cells',
    date: '2017-12-09',
    casualties: 7500,
    status: 'Improving',
    coordinates: { lat: 33.2232, lng: 43.6793 }
  }
];

// Mock news data related to conflicts
export const newsDatabase: NewsArticle[] = [
  {
    id: 'news-001',
    title: 'Ukraine Reports New Defensive Positions in Eastern Front',
    source: 'Reuters',
    date: '2024-01-15',
    url: 'https://reuters.com/ukraine-defense',
    conflictId: 'ukr-001'
  },
  {
    id: 'news-002',
    title: 'Syria Peace Talks Resume in Geneva',
    source: 'BBC News',
    date: '2024-01-14',
    url: 'https://bbc.com/syria-peace',
    conflictId: 'syr-001'
  },
  {
    id: 'news-003',
    title: 'Ethiopia Signs New Ceasefire Agreement',
    source: 'Al Jazeera',
    date: '2024-01-13',
    url: 'https://aljazeera.com/ethiopia-ceasefire',
    conflictId: 'eth-001'
  },
  {
    id: 'news-004',
    title: 'Myanmar Resistance Groups Form New Alliance',
    source: 'Associated Press',
    date: '2024-01-12',
    url: 'https://ap.com/myanmar-alliance',
    conflictId: 'mmr-001'
  },
  {
    id: 'news-005',
    title: 'Afghanistan Humanitarian Aid Reaches Remote Areas',
    source: 'CNN',
    date: '2024-01-11',
    url: 'https://cnn.com/afghanistan-aid',
    conflictId: 'afg-001'
  }
];

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