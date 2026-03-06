/**
 * Migration script to import conflicts from frontend static data to database
 * 
 * Usage: npx ts-node backend/src/scripts/migrate-conflicts-to-db.ts
 */

import { prisma } from '../db/client';
import { ConflictStatus } from '@prisma/client';

// Import the static conflicts data
// Note: We'll need to copy the data structure here or import it differently
// For now, we'll define it inline to avoid cross-package imports

interface StaticConflict {
  id: string;
  country: string;
  region: string;
  conflictType: string;
  description: string;
  date: string;
  casualties: number;
  status: 'War' | 'Warm' | 'Improving';
  coordinates: { lat: number; lng: number };
  involvedISO?: string[];
  startDate?: string;
  escalationDate?: string;
  casualtiesDetailed?: {
    military?: { [key: string]: number };
    civilian?: { total: number };
  };
  displacedPersons?: number;
  factions?: {
    [factionName: string]: {
      allies?: string[];
      militarySupport?: {
        weapons?: string[];
        aidValue?: string;
        strategicAssets?: string[];
      };
      goals?: string[];
    };
  };
  internationalResponse?: {
    sanctions?: {
      imposedBy?: string[];
      targets?: string[];
    };
    peaceEfforts?: string[];
  };
  notableEvents?: Array<{
    title: string;
    date: string;
  }>;
  alliesByFaction?: {
    [faction: string]: {
      isoCodes: string[];
      color: string;
    };
  };
  sources?: string[];
}

// Static conflicts data (copied from frontend/data/conflicts-data.ts)
const staticConflicts: StaticConflict[] = [
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
    sources: ['ACLED', 'UNHCR', 'Amnesty International'],
    involvedISO: ['UKR', 'RUS'],
    alliesByFaction: {
      ukraine: {
        isoCodes: ['USA', 'GBR', 'DEU', 'FRA', 'POL'],
        color: '#0000FF'
      },
      russia: {
        isoCodes: ['BLR', 'IRN', 'PRK', 'CHN'],
        color: '#008000'
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
        isoCodes: ['USA', 'GBR'],
        color: '#0000FF'
      },
      hamas: {
        isoCodes: ['IRN'],
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
    casualties: 118,
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
    casualties: 13000,
    status: 'Warm',
    coordinates: { lat: 1.5000, lng: 30.0000 },
    involvedISO: ['COD']
  },
  {
    id: 'afghanistan-taliban-conflict',
    country: 'Afghanistan',
    region: 'Asia',
    conflictType: 'Insurgency',
    description: 'Ongoing insurgency and conflict involving Taliban, IS-K, and other militant groups against the Taliban government since 2021. Periodic attacks and counter-insurgency operations.',
    date: '2021-08-15',
    casualties: 5000,
    status: 'Warm',
    coordinates: { lat: 34.5553, lng: 69.2075 },
    involvedISO: ['AFG']
  },
  {
    id: 'ethiopia-tigray-conflict',
    country: 'Ethiopia',
    region: 'Africa',
    conflictType: 'Civil War',
    description: 'Civil war in Tigray region (2020-2022) between Ethiopian government and Tigray People\'s Liberation Front. Peace agreement signed in 2022, but tensions remain.',
    date: '2020-11-03',
    casualties: 600000,
    status: 'Improving',
    coordinates: { lat: 14.0324, lng: 38.3166 },
    involvedISO: ['ETH']
  },
  {
    id: 'congo-m23-conflict',
    country: 'Democratic Republic of the Congo',
    region: 'Africa',
    conflictType: 'Internal Conflict',
    description: 'Ongoing conflict in eastern DRC involving M23 rebels, government forces, and various armed groups. High civilian displacement and violence.',
    date: '2012-04-04',
    casualties: 6000,
    status: 'War',
    coordinates: { lat: -1.9403, lng: 29.8739 },
    involvedISO: ['COD']
  },
  {
    id: 'cameroon-anglophone-conflict',
    country: 'Cameroon',
    region: 'Africa',
    conflictType: 'Civil War',
    description: 'Ongoing conflict in Anglophone regions of Cameroon between separatist groups and government forces since 2017.',
    date: '2017-10-01',
    casualties: 6000,
    status: 'Warm',
    coordinates: { lat: 4.0511, lng: 9.7679 },
    involvedISO: ['CMR']
  },
  {
    id: 'mali-insurgency',
    country: 'Mali',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Ongoing insurgency in northern and central Mali involving Islamist groups, Tuareg rebels, and government forces with international support.',
    date: '2012-01-17',
    casualties: 15000,
    status: 'War',
    coordinates: { lat: 16.2700, lng: -3.0000 },
    involvedISO: ['MLI']
  },
  {
    id: 'burkina-faso-insurgency',
    country: 'Burkina Faso',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Ongoing Islamist insurgency in northern and eastern Burkina Faso involving various militant groups and government forces.',
    date: '2015-04-15',
    casualties: 20000,
    status: 'War',
    coordinates: { lat: 12.2383, lng: -1.5616 },
    involvedISO: ['BFA']
  },
  {
    id: 'niger-insurgency',
    country: 'Niger',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Ongoing insurgency in western Niger involving Islamist militant groups and government forces.',
    date: '2017-10-04',
    casualties: 3000,
    status: 'Warm',
    coordinates: { lat: 13.5127, lng: 2.1124 },
    involvedISO: ['NER']
  },
  {
    id: 'central-african-republic-conflict',
    country: 'Central African Republic',
    region: 'Africa',
    conflictType: 'Civil War',
    description: 'Ongoing civil war between government forces, rebel groups, and various militias since 2012.',
    date: '2012-12-10',
    casualties: 14000,
    status: 'Warm',
    coordinates: { lat: 4.3947, lng: 18.5582 },
    involvedISO: ['CAF']
  },
  {
    id: 'south-sudan-civil-war',
    country: 'South Sudan',
    region: 'Africa',
    conflictType: 'Civil War',
    description: 'Civil war (2013-2020) between government and opposition forces. Peace agreement signed but sporadic violence continues.',
    date: '2013-12-15',
    casualties: 400000,
    status: 'Improving',
    coordinates: { lat: 4.8594, lng: 31.5713 },
    involvedISO: ['SSD']
  },
  {
    id: 'pakistan-balochistan-conflict',
    country: 'Pakistan',
    region: 'Asia',
    conflictType: 'Insurgency',
    description: 'Ongoing insurgency in Balochistan province involving separatist groups and government forces.',
    date: '2004-01-01',
    casualties: 8000,
    status: 'Warm',
    coordinates: { lat: 30.1798, lng: 66.9750 },
    involvedISO: ['PAK']
  },
  {
    id: 'philippines-mindanao-conflict',
    country: 'Philippines',
    region: 'Asia',
    conflictType: 'Insurgency',
    description: 'Ongoing insurgency in Mindanao involving various Islamist groups, communist rebels, and government forces.',
    date: '1969-03-29',
    casualties: 120000,
    status: 'Warm',
    coordinates: { lat: 7.5000, lng: 125.0000 },
    involvedISO: ['PHL']
  },
  {
    id: 'thailand-southern-insurgency',
    country: 'Thailand',
    region: 'Asia',
    conflictType: 'Insurgency',
    description: 'Ongoing insurgency in southern Thailand involving separatist groups and government forces.',
    date: '2004-01-04',
    casualties: 7000,
    status: 'Warm',
    coordinates: { lat: 6.6131, lng: 101.2813 },
    involvedISO: ['THA']
  },
  {
    id: 'india-kashmir-conflict',
    country: 'India',
    region: 'Asia',
    conflictType: 'Insurgency',
    description: 'Ongoing insurgency in Jammu and Kashmir involving separatist groups and government forces.',
    date: '1989-01-01',
    casualties: 47000,
    status: 'Warm',
    coordinates: { lat: 34.0837, lng: 74.7973 },
    involvedISO: ['IND']
  },
  {
    id: 'colombia-farc-conflict',
    country: 'Colombia',
    region: 'Americas',
    conflictType: 'Internal Conflict',
    description: 'Ongoing conflict involving remaining FARC dissidents, ELN, and other armed groups after the 2016 peace agreement.',
    date: '1964-05-27',
    casualties: 220000,
    status: 'Improving',
    coordinates: { lat: 4.7110, lng: -74.0721 },
    involvedISO: ['COL']
  },
  {
    id: 'venezuela-crisis',
    country: 'Venezuela',
    region: 'Americas',
    conflictType: 'Political Crisis',
    description: 'Ongoing political and economic crisis with periodic violence, protests, and border tensions.',
    date: '2014-02-12',
    casualties: 10000,
    status: 'Warm',
    coordinates: { lat: 10.4806, lng: -66.9036 },
    involvedISO: ['VEN']
  },
  {
    id: 'saudi-arabia-yemen-border',
    country: 'Saudi Arabia',
    region: 'Middle East',
    conflictType: 'Border Conflict',
    description: 'Border conflict with Houthi rebels from Yemen, including missile and drone attacks.',
    date: '2015-03-26',
    casualties: 500,
    status: 'Warm',
    coordinates: { lat: 24.7136, lng: 46.6753 },
    involvedISO: ['SAU', 'YEM']
  },
  {
    id: 'turkey-kurdish-conflict',
    country: 'Turkey',
    region: 'Middle East',
    conflictType: 'Insurgency',
    description: 'Ongoing conflict with PKK and other Kurdish groups in southeastern Turkey and northern Iraq.',
    date: '1984-08-15',
    casualties: 40000,
    status: 'Warm',
    coordinates: { lat: 37.0662, lng: 37.3833 },
    involvedISO: ['TUR']
  },
  {
    id: 'azerbaijan-armenia-nagorno-karabakh',
    country: 'Azerbaijan/Armenia',
    region: 'Europe',
    conflictType: 'Territorial Dispute',
    description: 'Territorial conflict over Nagorno-Karabakh. Major war in 2020, brief conflict in 2023. Currently in post-conflict phase.',
    date: '1988-02-20',
    casualties: 30000,
    status: 'Improving',
    coordinates: { lat: 39.8200, lng: 46.7500 },
    involvedISO: ['AZE', 'ARM']
  },
  {
    id: 'myanmar-kachin-conflict',
    country: 'Myanmar',
    region: 'Asia',
    conflictType: 'Internal Conflict',
    description: 'Ongoing conflict in Kachin State between ethnic armed groups and Myanmar military.',
    date: '2011-06-09',
    casualties: 5000,
    status: 'War',
    coordinates: { lat: 25.9800, lng: 97.3900 },
    involvedISO: ['MMR']
  },
  {
    id: 'chad-lake-chad-conflict',
    country: 'Chad',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Ongoing conflict in Lake Chad region involving Boko Haram and government forces.',
    date: '2015-01-01',
    casualties: 2000,
    status: 'Warm',
    coordinates: { lat: 13.8292, lng: 14.1000 },
    involvedISO: ['TCD']
  },
  {
    id: 'kenya-al-shabaab',
    country: 'Kenya',
    region: 'Africa',
    conflictType: 'Insurgency',
    description: 'Ongoing attacks by al-Shabaab in northeastern Kenya and along the border with Somalia.',
    date: '2011-10-16',
    casualties: 500,
    status: 'Warm',
    coordinates: { lat: -1.2921, lng: 36.8219 },
    involvedISO: ['KEN']
  },
  {
    id: 'egypt-sinai-insurgency',
    country: 'Egypt',
    region: 'Middle East',
    conflictType: 'Insurgency',
    description: 'Ongoing insurgency in Sinai Peninsula involving IS-affiliated groups and Egyptian security forces.',
    date: '2011-01-25',
    casualties: 5000,
    status: 'Warm',
    coordinates: { lat: 30.0444, lng: 31.2357 },
    involvedISO: ['EGY']
  },
  {
    id: 'iraq-islamic-state-remnants',
    country: 'Iraq',
    region: 'Middle East',
    conflictType: 'Insurgency',
    description: 'Low-level insurgency by Islamic State remnants after territorial defeat in 2017.',
    date: '2017-12-10',
    casualties: 5000,
    status: 'Warm',
    coordinates: { lat: 33.3153, lng: 44.3661 },
    involvedISO: ['IRQ']
  },
  {
    id: 'libya-post-gaddafi',
    country: 'Libya',
    region: 'Middle East',
    conflictType: 'Civil War',
    description: 'Ongoing political and military conflict between rival governments and militias since 2014.',
    date: '2014-05-16',
    casualties: 5000,
    status: 'Warm',
    coordinates: { lat: 32.8854, lng: 13.1802 },
    involvedISO: ['LBY']
  }
];

function mapStatus(status: 'War' | 'Warm' | 'Improving'): ConflictStatus {
  switch (status) {
    case 'War':
      return ConflictStatus.WAR;
    case 'Warm':
      return ConflictStatus.WARM;
    case 'Improving':
      return ConflictStatus.IMPROVING;
    default:
      return ConflictStatus.WAR;
  }
}

function parseDate(dateStr: string): Date {
  // Handle date ranges like "2022-02-24 to 2022-05-20" - take first date
  const firstDate = dateStr.split(' to ')[0].trim();
  return new Date(firstDate);
}

async function migrateConflicts() {
  console.log('Starting conflict migration...');
  console.log(`Found ${staticConflicts.length} conflicts to migrate`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const staticConflict of staticConflicts) {
    try {
      // Check if conflict already exists
      const existing = await prisma.conflict.findUnique({
        where: { slug: staticConflict.id }
      });

      // Use upsert to update existing or create new
      const conflict = await prisma.conflict.upsert({
        where: { slug: staticConflict.id },
        update: {
          name: staticConflict.country,
          country: staticConflict.country,
          region: staticConflict.region,
          conflictType: staticConflict.conflictType,
          description: staticConflict.description,
          status: mapStatus(staticConflict.status),
          startDate: parseDate(staticConflict.startDate || staticConflict.date),
          escalationDate: staticConflict.escalationDate ? parseDate(staticConflict.escalationDate) : null,
          coordinates: staticConflict.coordinates,
          involvedISO: staticConflict.involvedISO || [],
          sources: staticConflict.sources || []
        },
        create: {
          slug: staticConflict.id,
          name: staticConflict.country,
          country: staticConflict.country,
          region: staticConflict.region,
          conflictType: staticConflict.conflictType,
          description: staticConflict.description,
          status: mapStatus(staticConflict.status),
          startDate: parseDate(staticConflict.startDate || staticConflict.date),
          escalationDate: staticConflict.escalationDate ? parseDate(staticConflict.escalationDate) : null,
          coordinates: staticConflict.coordinates,
          involvedISO: staticConflict.involvedISO || [],
          sources: staticConflict.sources || []
        }
      });

      if (existing) {
        console.log(`🔄 Updated conflict: ${staticConflict.id}`);
      } else {
        console.log(`✅ Created conflict: ${staticConflict.id}`);
      }

      // Create initial casualty record if casualties > 0
      if (staticConflict.casualties > 0) {
        await prisma.conflictCasualty.create({
          data: {
            conflictId: conflict.id,
            date: parseDate(staticConflict.startDate || staticConflict.date),
            total: staticConflict.casualties,
            military: staticConflict.casualtiesDetailed?.military
              ? Object.values(staticConflict.casualtiesDetailed.military).reduce((a, b) => a + b, 0)
              : null,
            civilian: staticConflict.casualtiesDetailed?.civilian?.total || null,
            source: staticConflict.sources?.[0] || null
          }
        });
      }

      // Create factions
      if (staticConflict.factions && staticConflict.alliesByFaction) {
        for (const [factionName, factionData] of Object.entries(staticConflict.factions)) {
          const alliesData = staticConflict.alliesByFaction[factionName];
          
          const faction = await prisma.conflictFaction.create({
            data: {
              conflictId: conflict.id,
              name: factionName,
              color: alliesData?.color || null,
              goals: factionData.goals || [],
              allies: factionData.allies || []
            }
          });

          // Create faction support records
          if (alliesData?.isoCodes && factionData.militarySupport) {
            for (const isoCode of alliesData.isoCodes) {
              await prisma.conflictFactionSupport.create({
                data: {
                  factionId: faction.id,
                  supporterISO: isoCode,
                  supportType: 'military',
                  weapons: factionData.militarySupport.weapons || [],
                  aidValue: factionData.militarySupport.aidValue || null,
                  strategicAssets: factionData.militarySupport.strategicAssets || []
                }
              });
            }
          }
        }
      }

      // Create events
      if (staticConflict.notableEvents) {
        for (const event of staticConflict.notableEvents) {
          try {
            await prisma.conflictEvent.create({
              data: {
                conflictId: conflict.id,
                title: event.title,
                date: parseDate(event.date),
                eventType: 'battle' // Default, could be improved with better parsing
              }
            });
          } catch (e) {
            console.warn(`⚠️  Failed to create event "${event.title}" for ${staticConflict.id}:`, (e as Error).message);
          }
        }
      }

      created++;
    } catch (error) {
      console.error(`❌ Error migrating ${staticConflict.id}:`, (error as Error).message);
      errors++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${staticConflicts.length}`);
}

// Run migration
migrateConflicts()
  .then(() => {
    console.log('\n✅ Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

