// Conflict Tracker Database
// This file contains all the conflict data separated from the component logic
import type { Conflict, NewsArticle } from '../src/types/index';

// Mock conflict data based on real-world conflicts
export const conflictsDatabase: Conflict[] = [
  {
    id: 'myanmar-civil-war',
    country: 'Myanmar',
    region: 'Asia',
    conflictType: 'Civil War',
    description: 'Long-running civil war in Myanmar involving ethnic armed groups (e.g. the Rohingya and Karen) since 1948.',
    date: '1948-01-04',
    casualties: 130000,
    status: 'War',
    coordinates: { lat: 16.8713, lng: 96.1994 },
    involvedISO: ['MMR']
  },
  {
    id: 'russia-ukraine-war',
    country: 'Ukraine',
    region: 'Europe',
    conflictType: 'Interstate War',
    description: 'A major interstate war initiated by Russia with the 2014 annexation of Crimea, followed by a full-scale invasion of Ukraine in February 2022. The conflict has resulted in massive military and civilian casualties, displacement, and global geopolitical consequences.',
    date: '2014-04-06',
    casualties: 170521,
    status: 'War',
    coordinates: { lat: 50.4500, lng: 30.5233 },
    startDate: '2014-04-06',
    escalationDate: '2022-02-24',
    casualtiesDetailed: {
      military: { ukraine: 30000, russia: 50000 },
      civilian: { total: 90000 }
    },
    displacedPersons: 6000000,
    factions: {
      ukraine: {
        allies: ['United States', 'European Union', 'United Kingdom', 'NATO (support, not direct)'],
        militarySupport: {
          weapons: ['Javelins', 'HIMARS', 'Drones'],
          aidValue: '>$100 billion USD'
        },
        goals: [
          'Restore territorial integrity',
          'Defend sovereignty',
          'Join NATO and EU (long-term strategic)'
        ]
      },
      russia: {
        allies: ['Belarus', 'Iran (drone supply)', 'North Korea (ammunition)', 'China (diplomatic support)'],
        militarySupport: {
          weapons: ['Tanks', 'Missiles', 'Drones'],
          strategicAssets: ['Wagner Group', 'Cyberwarfare units']
        },
        goals: [
          'Prevent NATO expansion',
          'Control of eastern Ukraine and Crimea',
          'Weaken Ukrainian statehood'
        ]
      }
    },
    internationalResponse: {
      sanctions: {
        imposedBy: ['EU', 'USA', 'UK', 'Canada', 'Japan'],
        targets: ['Russian banks', 'oligarchs', 'oil & gas sector']
      },
      peaceEfforts: [
        'Minsk Agreements (failed)',
        'UN Resolutions condemning the invasion',
        'Istanbul peace talks (March 2022)'
      ]
    },
    notableEvents: [
      { title: 'Annexation of Crimea', date: '2014-03-18' },
      { title: 'Full-scale invasion', date: '2022-02-24' },
      { title: 'Siege of Mariupol', date: '2022-02-24 to 2022-05-20' },
      { title: 'Battle of Kyiv', date: '2022-02-25 to 2022-04-02' },
      { title: 'Bucha massacre', date: '2022-03-27 to 2022-04-02' },
      { title: 'Sinking of the Moskva', date: '2022-04-14' },
      { title: 'Battle of Severodonetsk', date: '2022-05 to 2022-06' },
      { title: 'Explosion on Crimean Bridge', date: '2022-10-08' },
      { title: 'Battle of Bakhmut', date: '2022-10 to 2023-05' },
      { title: 'Ukrainian counteroffensives', date: '2022–2023' }
      
    ],
    sources: ['ACLED', 'GDELT', 'UNHCR', 'Amnesty International'],
    involvedISO: ['UKR', 'RUS'],
    alliesByFaction: {
      ukraine: {
        isoCodes: ['USA', 'GBR', 'DEU', 'FRA', 'POL'], // US, UK, Germany, France, Poland
        color: '#0000FF' // Blue
      },
      russia: {
        isoCodes: ['BLR', 'IRN', 'PRK', 'CHN'], // Belarus, Iran, North Korea, China
        color: '#008000' // Green
      }
    }
  },
  {
    id: 'syrian-civil-war',
    country: 'Syria',
    region: 'Middle East',
    conflictType: 'Civil War',
    description: 'Civil war between Bashar al-Assad\'s government and rebel groups (including jihadists) since 2011, resulting in hundreds of thousands of deaths.',
    date: '2011-03-15',
    casualties: 580000,
    status: 'War',
    coordinates: { lat: 33.5131, lng: 36.3094 },
    involvedISO: ['SYR']
  },
  {
    id: 'yemen-civil-war',
    country: 'Yemen',
    region: 'Middle East',
    conflictType: 'Civil War',
    description: 'Civil war between Houthi rebels and the internationally recognized government (backed by a Saudi-led coalition) since 2014.',
    date: '2014-03-26',
    casualties: 377000,
    status: 'War',
    coordinates: { lat: 15.3500, lng: 44.2000 },
    involvedISO: ['YEM']
  },
  {
    id: 'israel-hamas-war',
    country: 'Israel/Palestine',
    region: 'Middle East',
    conflictType: 'Interstate War',
    description: 'War began in October 2023 with Hamas attacks on Israel and a subsequent Israeli offensive in Gaza, resulting in tens of thousands of casualties.',
    date: '2023-10-07',
    casualties: 57000,
    status: 'War',
    coordinates: { lat: 31.5170, lng: 34.4500 },
    involvedISO: ['ISR', 'PSE'],
    alliesByFaction: {
      israel: {
        isoCodes: ['USA', 'GBR'], // Example
        color: '#0000FF'
      },
      hamas: {
        isoCodes: ['IRN'], // Example
        color: '#008000'
      }
    }
  },
  {
    id: 'libya-civil-war',
    country: 'Libya',
    region: 'Middle East',
    conflictType: 'Civil War',
    description: 'Second Libyan Civil War (2014–2020) between rival governments and militias for control of Libya.',
    date: '2014-07-13',
    casualties: 14882,
    status: 'Improving',
    coordinates: { lat: 32.8854, lng: 13.1802 },
    involvedISO: ['LBY']
  },
  {
    id: 'sudan-civil-war-2023',
    country: 'Sudan',
    region: 'Africa',
    conflictType: 'Civil War',
    description: 'A civil war in Sudan between the Sudanese Armed Forces and the paramilitary Rapid Support Forces (RSF) that began on 15 April 2023, resulting from a power struggle within the military council. The conflict has caused widespread violence, atrocities, famine, and one of the world\'s worst displacement crises.',
    date: '2023-04-15',
    casualties: 150000,
    status: 'War',
    coordinates: { lat: 15.500654, lng: 32.559898 },
    startDate: '2023-04-15',
    escalationDate: '2023-04-15',
    casualtiesDetailed: {
      military: { combined: 21200 },
      civilian: { total: 7500 }
    },
    displacedPersons: 14000000,
    factions: {
      saf: {
        allies: ['Egypt'],
        militarySupport: {
          weapons: ['Arms from China', 'Arms from Russia', 'Arms from Turkey'],
          strategicAssets: []
        },
        goals: [
          'Reassert military control of the country',
          'Regain and secure Khartoum and surrounding regions',
          'Maintain influence over Sudan\'s political institutions'
        ]
      },
      rsf: {
        allies: ['United Arab Emirates', 'Chad', 'Libyan National Army'],
        militarySupport: {
          weapons: ['UAE-provided arms', 'Sudanese paramilitary vehicles'],
          strategicAssets: ['Janjaweed militias', 'Wagner Group elements']
        },
        goals: [
          'Overthrow the current military council',
          'Expand territorial control, especially in Darfur',
          'Gain formal political power in a new governing structure'
        ]
      }
    },
    internationalResponse: {
      sanctions: {
        imposedBy: ['USA', 'EU', 'UK', 'Canada'],
        targets: ['SAF generals', 'RSF leadership', 'Paramilitary entities']
      },
      peaceEfforts: [
        'Jeddah Declaration talks (May 2023)',
        'AU Peace & Security Council mediation',
        'Geneva humanitarian access negotiations',
        'Omani‑facilitated secret meetings'
      ]
    },
    notableEvents: [
      { title: 'Outbreak of Civil War', date: '2023-04-15' },
      { title: 'Battle of Nyala', date: '2023-04-15 to 2023-10-26' },
      { title: 'Jeddah Declaration signed', date: '2023-05-12' },
      { title: 'Battle of Geneina', date: '2023-06' },
      { title: 'Famine declared in North Darfur', date: '2024-08' },
      { title: 'SAF recaptures Khartoum', date: '2025-03-26' },
      { title: 'Formation of Government of Peace and Unity', date: '2025-02-23' },
      { title: 'Salha massacre', date: '2025-04-27' }
    ],
    sources: ['ACLED', 'UN OCHA', 'UNHCR', 'AP News', 'Washington Post', 'ReliefWeb', 'The Guardian', 'NRC', 'Wikipedia'],
    involvedISO: ['SDN'],
    alliesByFaction: {
      saf: {
        isoCodes: ['EGY'],
        color: '#0000FF'
      },
      rsf: {
        isoCodes: ['ARE', 'TCD', 'LBY'],
        color: '#008000'
      }
    }
  },
  {
    id: 'somalia-insurgency',
    country: 'Somalia',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Ongoing Islamist insurgency by al-Shabaab against the Somali government and peacekeepers since the early 2000s.',
    date: '2006-12-28',
    casualties: 10000,
    status: 'War',
    coordinates: { lat: 2.0469, lng: 45.3182 },
    involvedISO: ['SOM']
  },
  {
    id: 'nigeria-insurgency',
    country: 'Nigeria',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Insurgency by Boko Haram/ISWAP in northeast Nigeria (since 2009) and violence by armed bandits elsewhere, causing tens of thousands of deaths.',
    date: '2009-07-01',
    casualties: 20000,
    status: 'War',
    coordinates: { lat: 11.8333, lng: 13.1500 },
    involvedISO: ['NGA']
  },
  {
    id: 'mozambique-insurgency',
    country: 'Mozambique',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Insurgent violence in Cabo Delgado (northern Mozambique) since 2017 involving IS-linked militant groups (locally known as al-Shabab), causing widespread displacement.',
    date: '2017-10-05',
    casualties: 3000,
    status: 'Improving',
    coordinates: { lat: -12.9732, lng: 40.5178 },
    involvedISO: ['MOZ']
  },
  {
    id: 'mexico-drug-war',
    country: 'Mexico',
    region: 'Americas',
    conflictType: 'Internal Conflict',
    description: 'Ongoing conflict between Mexican security forces and powerful drug cartels since 2006 (the "Drug War"), with tens of thousands killed.',
    date: '2006-12-11',
    casualties: 41034,
    status: 'War',
    coordinates: { lat: 19.4326, lng: -99.1332 },
    involvedISO: ['MEX']
  },
  {
    id: 'israel-iran-war',
    country: 'Israel/Iran',
    region: 'Middle East',
    conflictType: 'Interstate War',
    description: 'Guerra declarada el 13 de junio de 2025 tras ataques aéreos israelíes («Operation Rising Lion») contra instalaciones nucleares y militares en Irán, seguidos de intensos contraataques iraníes con misiles y drones («Operation True Promise III»).',
    date: '2025-06-13',
    casualties: 118, // Estimado de víctimas combinadas hasta el 15 de junio de 2025
    status: 'War',
    coordinates: { lat: 32.0000, lng: 35.0000 },
    involvedISO: ['ISR', 'IRN']
  },
  
  {
    id: 'haiti-gang-violence',
    country: 'Haiti',
    region: 'Americas',
    conflictType: 'Civil Unrest',
    description: 'Intense gang violence and political instability in Haiti (especially Port-au-Prince) since 2017, marked by kidnappings and deadly clashes.',
    date: '2017-02-07',
    casualties: 3000,
    status: 'War',
    coordinates: { lat: 18.5333, lng: -72.3333 },
    involvedISO: ['HTI']
  },
  
  {
    id: 'post-isis-stabilization-iraq',
    country: 'Iraq',
    region: 'Middle East',
    conflictType: 'Post-ISIS Stabilization',
    description: 'Low-level insurgent violence by Islamic State remnants after ISIS lost control of territory (officially declared defeated in 2017).',
    date: '2017-12-10',
    casualties: 16000,
    status: 'Improving',
    coordinates: { lat: 33.3153, lng: 44.3661 },
    involvedISO: ['IRQ']
  },
  {
    id: 'drc-ituri-conflict',
    country: 'Democratic Republic of the Congo',
    region: 'Africa',
    conflictType: 'Internal Conflict',
    description: 'Low‑intensity, ongoing conflict between ethnic Lendu and Hema militias in Ituri province, with periodic outbreaks of violence and high civilian displacement. Ha habido repuntes importantes desde 2017, aunque en niveles menores que en picos anteriores.',
    date: '2003-01-01',
    casualties: 13000, // ~527 entre 2007‑2017 y 3243 entre 2017‑2020, más violencia posterior hasta 2024
    status: 'Warm',
    coordinates: { lat: 1.5000, lng: 30.0000 },
    involvedISO: ['COD']
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