import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const profiles = [
  // ── Navigation ──
  {
    pattern: 'GPS B', matchType: 'pattern', program: 'GPS Block IIF/III',
    operator: 'US Space Force / 2nd SOPS', purpose: 'Navigation & precision timing',
    coverage: 'Global (MEO constellation)', orbitType: 'MEO circular, ~20,200 km, 55° inclination',
    description: 'The Global Positioning System provides satellite-based navigation, positioning, and timing services worldwide. Block IIF and III satellites represent the latest generations, offering improved accuracy, signal strength, and anti-jamming capabilities for both civilian and military users.',
    imageUrl: '/satellites/gps.jpg', sortOrder: 1,
  },
  {
    pattern: 'GLONASS|COSMOS\\s*\\(7\\d{2}\\)', matchType: 'pattern', program: 'GLONASS',
    operator: 'Russian Aerospace Forces / Roscosmos', purpose: 'Navigation & precision timing',
    coverage: 'Global (MEO constellation)', orbitType: 'MEO circular, ~19,130 km, 64.8° inclination',
    description: "GLONASS is Russia's global navigation satellite system, providing real-time positioning and velocity determination. The constellation operates in three orbital planes with eight satellites each, optimized for high-latitude coverage.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 2,
  },
  {
    pattern: 'BEIDOU', matchType: 'pattern', program: 'BeiDou-3',
    operator: 'PLA Strategic Support Force', purpose: 'Navigation, timing & short message communication',
    coverage: 'Global (MEO/GEO/IGSO constellation)', orbitType: 'MEO circular, ~21,500 km, 55° inclination',
    description: "BeiDou is China's global navigation satellite system, fully operational since 2020. The third-generation constellation includes MEO, GEO, and IGSO satellites, providing global positioning with enhanced accuracy in the Asia-Pacific region and unique short message communication capability.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 3,
  },
  {
    pattern: 'GALILEO|GSAT0', matchType: 'pattern', program: 'Galileo',
    operator: 'European GNSS Agency (EUSPA)', purpose: 'Navigation & precision timing',
    coverage: 'Global (MEO constellation)', orbitType: 'MEO circular, ~23,222 km, 56° inclination',
    description: "Galileo is the European Union's global navigation satellite system, designed for civilian use with high accuracy. It provides the only GNSS with a guaranteed service level and includes a Search and Rescue return-link capability.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 4,
  },
  {
    pattern: 'IRNSS', matchType: 'pattern', program: 'NavIC (IRNSS)',
    operator: 'Indian Space Research Organisation (ISRO)', purpose: 'Regional navigation & timing',
    coverage: 'India + 1,500 km extended region', orbitType: 'GEO/GSO, ~36,000 km, 29° inclination',
    description: "The Navigation with Indian Constellation (NavIC) is India's regional satellite navigation system, providing accurate positioning services over India and surrounding areas using a combination of geostationary and geosynchronous orbit satellites.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 5,
  },
  {
    pattern: 'QZSS|MICHIBIKI', matchType: 'pattern', program: 'QZSS (Quasi-Zenith)',
    operator: 'Japan Cabinet Office', purpose: 'Regional navigation augmentation',
    coverage: 'Japan & Asia-Oceania', orbitType: 'QZO/GEO, ~32,000-42,000 km, 43° inclination',
    description: 'The Quasi-Zenith Satellite System augments GPS coverage over Japan, where urban canyons and mountainous terrain limit signal reception. Michibiki satellites follow a figure-eight ground track ensuring at least one satellite is always near-zenith over Japan.',
    imageUrl: '/satellites/navigation.jpg', sortOrder: 6,
  },

  // ── US Military / Intelligence ──
  {
    pattern: 'SBIRS', matchType: 'pattern', program: 'SBIRS',
    operator: 'US Space Force / SBIRS Wing', purpose: 'Missile warning & defense',
    coverage: 'Global (GEO + HEO)', orbitType: 'GEO, ~35,786 km / HEO Molniya-type',
    description: 'The Space-Based Infrared System detects missile launches, space launches, and nuclear detonations using scanning and staring infrared sensors. SBIRS provides critical early warning data to combatant commanders and national leadership.',
    imageUrl: '/satellites/military.jpg', sortOrder: 10,
  },
  {
    pattern: 'WGS', matchType: 'pattern', program: 'Wideband Global SATCOM',
    operator: 'US Space Force / 4th SATCOM Squadron', purpose: 'Military wideband communications',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: 'The Wideband Global SATCOM system provides high-capacity communications for US and allied forces worldwide. Each WGS satellite delivers more bandwidth than the entire legacy DSCS constellation it replaced.',
    imageUrl: '/satellites/military.jpg', sortOrder: 11,
  },
  {
    pattern: 'MUOS', matchType: 'pattern', program: 'MUOS',
    operator: 'US Navy / SPAWAR', purpose: 'Military narrowband communications',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: 'The Mobile User Objective System provides narrowband communications to US forces on the move. MUOS extends 3G cellular technology to military satellite communications, enabling simultaneous voice, video, and data.',
    imageUrl: '/satellites/military.jpg', sortOrder: 12,
  },
  {
    pattern: 'GSSAP', matchType: 'pattern', program: 'GSSAP',
    operator: 'US Space Force / Space Delta 2', purpose: 'Space domain awareness',
    coverage: 'GEO belt surveillance', orbitType: 'Near-GEO, ~35,786 km, near-equatorial',
    description: 'The Geosynchronous Space Situational Awareness Program satellites perform close-approach maneuvers to characterize objects in the geosynchronous belt, providing detailed intelligence on foreign GEO satellites and debris.',
    imageUrl: '/satellites/military.jpg', sortOrder: 13,
  },
  {
    pattern: 'NOSS', matchType: 'pattern', program: 'NOSS',
    operator: 'US Navy / NRO', purpose: 'Naval ocean surveillance',
    coverage: 'Global maritime', orbitType: 'LEO, ~1,000-1,200 km, 63° inclination',
    description: 'The Naval Ocean Surveillance System uses clusters of satellites flying in close formation to detect and locate radio-frequency emissions from ships at sea, providing real-time maritime situational awareness.',
    imageUrl: '/satellites/military.jpg', sortOrder: 14,
  },
  {
    pattern: 'DMSP', matchType: 'pattern', program: 'DMSP',
    operator: 'US Space Force (legacy DoD weather)', purpose: 'Military meteorology',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~830 km, 98.7° inclination',
    description: 'The Defense Meteorological Satellite Program has provided weather data to US military forces since 1966. DMSP satellites carry visible, infrared, and microwave sensors for cloud imagery and atmospheric profiling.',
    imageUrl: '/satellites/weather.jpg', sortOrder: 15,
  },
  {
    pattern: 'TDRS', matchType: 'pattern', program: 'TDRSS',
    operator: 'NASA / Goddard Space Flight Center', purpose: 'Data relay & tracking',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: 'The Tracking and Data Relay Satellite System provides near-continuous communication links between ground stations and LEO spacecraft including the ISS, Hubble, and scientific missions.',
    imageUrl: '/satellites/tdrs.jpg', sortOrder: 16,
  },
  {
    pattern: 'SAPPHIRE', matchType: 'pattern', program: 'Sapphire',
    operator: 'Canadian Armed Forces / DND', purpose: 'Space surveillance & tracking',
    coverage: 'Deep space (GEO belt)', orbitType: 'LEO, ~800 km, 98° inclination',
    description: "Sapphire is Canada's contribution to space surveillance, an electro-optical satellite that tracks objects in deep space. It is a key sensor in the US-Canadian space surveillance network.",
    imageUrl: '/satellites/military.jpg', sortOrder: 17,
  },
  {
    pattern: 'PRAETORIAN|SDA.*TRANCHE', matchType: 'pattern', program: 'SDA Transport/Tracking Layer',
    operator: 'US Space Development Agency', purpose: 'Missile tracking & data transport',
    coverage: 'Global (LEO mesh constellation)', orbitType: 'LEO, ~950-1,200 km, various inclinations',
    description: "The Space Development Agency's proliferated LEO constellation provides persistent missile tracking and resilient military data transport via optical inter-satellite links.",
    imageUrl: '/satellites/military.jpg', sortOrder: 18,
  },
  {
    pattern: 'USA-', matchType: 'pattern', program: 'Classified US Payload',
    operator: 'NRO / US DoD', purpose: 'Classified national security mission',
    coverage: 'Varies by mission', orbitType: 'Varies (classified orbital parameters)',
    description: 'This satellite operates under a classified designation for the US National Reconnaissance Office or Department of Defense. Its specific mission, capabilities, and orbital details are not publicly disclosed.',
    imageUrl: '/satellites/military.jpg', sortOrder: 19,
  },

  // ── Weather / Meteorological ──
  {
    pattern: 'GOES', matchType: 'pattern', program: 'GOES',
    operator: 'NOAA / NASA', purpose: 'Geostationary weather observation',
    coverage: 'Western hemisphere', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: 'The Geostationary Operational Environmental Satellite system provides continuous weather monitoring over the Americas. GOES-R series satellites carry the Advanced Baseline Imager with 16 spectral bands, delivering imagery every 30 seconds.',
    imageUrl: '/satellites/goes.jpg', sortOrder: 20,
  },
  {
    pattern: 'NOAA|JPSS|SUOMI', matchType: 'pattern', program: 'JPSS / NOAA Polar',
    operator: 'NOAA / NASA', purpose: 'Polar-orbiting weather observation',
    coverage: 'Global (pole-to-pole)', orbitType: 'SSO, ~824 km, 98.7° inclination',
    description: 'The Joint Polar Satellite System provides global atmospheric, oceanic, and land surface data for weather forecasting and climate monitoring with five core instruments including VIIRS, CrIS, and ATMS.',
    imageUrl: '/satellites/weather.jpg', sortOrder: 21,
  },
  {
    pattern: 'METEOSAT|METOP', matchType: 'pattern', program: 'EUMETSAT',
    operator: 'EUMETSAT', purpose: 'European weather observation',
    coverage: 'Europe, Africa & Indian Ocean (GEO) / Global (polar)', orbitType: 'GEO ~35,786 km / SSO ~817 km',
    description: 'EUMETSAT operates both geostationary Meteosat and polar-orbiting MetOp satellites for European weather services, providing continuous observation from the Atlantic to the Indian Ocean.',
    imageUrl: '/satellites/weather.jpg', sortOrder: 22,
  },
  {
    pattern: 'FENGYUN|FY-', matchType: 'pattern', program: 'Fengyun',
    operator: 'China Meteorological Administration (CMA)', purpose: 'Weather observation & climate monitoring',
    coverage: 'Asia-Pacific (GEO) / Global (polar)', orbitType: 'GEO ~35,786 km / SSO ~836 km',
    description: "The Fengyun satellite series is China's meteorological observation system. FY-4 series provides rapid-scan imagery over Asia-Pacific, while FY-3 polar orbiters contribute to global weather prediction under WMO agreements.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 23,
  },
  {
    pattern: 'HIMAWARI', matchType: 'pattern', program: 'Himawari',
    operator: 'Japan Meteorological Agency (JMA)', purpose: 'Geostationary weather observation',
    coverage: 'East Asia & Western Pacific', orbitType: 'GEO, ~35,786 km, 140.7°E',
    description: "Himawari is Japan's geostationary weather satellite providing high-resolution imagery over the Western Pacific. Himawari-8/9 deliver full-disk imagery every 10 minutes and Japan-area scans every 2.5 minutes.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 24,
  },
  {
    pattern: 'METEOR-M', matchType: 'pattern', program: 'Meteor-M',
    operator: 'Roshydromet / Roscosmos', purpose: 'Polar-orbiting weather observation',
    coverage: 'Global (pole-to-pole)', orbitType: 'SSO, ~830 km, 98.8° inclination',
    description: "Meteor-M is Russia's polar-orbiting meteorological satellite series, providing multispectral imagery, atmospheric sounding, and sea surface temperature data for Russian weather forecasting services.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 25,
  },
  {
    pattern: 'ELEKTRO', matchType: 'pattern', program: 'Elektro-L',
    operator: 'Roshydromet / Roscosmos', purpose: 'Geostationary weather observation',
    coverage: 'Russia & Indian Ocean region', orbitType: 'GEO, ~35,786 km, 76°E',
    description: "Elektro-L is Russia's geostationary meteorological satellite, positioned to observe weather systems over Russia, Central Asia, and the Indian Ocean.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 26,
  },
  {
    pattern: 'INSAT-3D', matchType: 'pattern', program: 'INSAT-3D',
    operator: 'ISRO / India Meteorological Department', purpose: 'Weather observation & data relay',
    coverage: 'Indian subcontinent & Indian Ocean', orbitType: 'GEO, ~35,786 km, 82°E',
    description: "INSAT-3D is India's dedicated meteorological satellite with a six-channel imager and nineteen-channel sounder, supporting India's cyclone warning system and monsoon prediction capabilities.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 27,
  },

  // ── Space Stations & Crewed ──
  {
    pattern: '^ISS\\b|ZARYA|NAUKA', matchType: 'pattern', program: 'International Space Station',
    operator: 'NASA / Roscosmos / ESA / JAXA / CSA', purpose: 'Crewed orbital laboratory',
    coverage: 'N/A (microgravity research platform)', orbitType: 'LEO, ~420 km, 51.6° inclination',
    description: 'The International Space Station is the largest habitable structure in orbit, continuously crewed since November 2000. The ISS supports hundreds of experiments in biology, physics, and materials science.',
    imageUrl: '/satellites/iss.jpg', sortOrder: 30,
  },
  {
    pattern: 'CSS|TIANHE|WENTIAN|MENGTIAN', matchType: 'pattern', program: 'Tiangong Space Station',
    operator: 'China Manned Space Agency (CMSA)', purpose: 'Crewed orbital laboratory',
    coverage: 'N/A (microgravity research platform)', orbitType: 'LEO, ~390 km, 41.5° inclination',
    description: "The Tiangong space station is China's permanently crewed orbital laboratory, consisting of the Tianhe core module and Wentian/Mengtian experiment modules supporting a three-person crew.",
    imageUrl: '/satellites/stations.jpg', sortOrder: 31,
  },
  {
    pattern: 'SHENZHOU', matchType: 'pattern', program: 'Shenzhou',
    operator: 'China Manned Space Agency (CMSA)', purpose: 'Crewed transport to Tiangong',
    coverage: 'N/A (crew rotation vehicle)', orbitType: 'LEO, ~390 km, 41.5° inclination',
    description: "Shenzhou is China's crewed spacecraft that transports crews of three taikonauts to and from the Tiangong space station.",
    imageUrl: '/satellites/stations.jpg', sortOrder: 32,
  },
  {
    pattern: 'SOYUZ', matchType: 'pattern', program: 'Soyuz',
    operator: 'Roscosmos', purpose: 'Crewed transport to ISS',
    coverage: 'N/A (crew rotation vehicle)', orbitType: 'LEO, ~420 km, 51.6° inclination',
    description: "Soyuz is the world's longest-serving crewed spacecraft, in continuous operation since 1967. The current Soyuz MS variant transports crews to the International Space Station.",
    imageUrl: '/satellites/soyuz.jpg', sortOrder: 33,
  },
  {
    pattern: 'CREW\\s*DRAGON', matchType: 'pattern', program: 'Crew Dragon',
    operator: 'SpaceX / NASA', purpose: 'Crewed transport to ISS',
    coverage: 'N/A (crew rotation vehicle)', orbitType: 'LEO, ~420 km, 51.6° inclination',
    description: "Crew Dragon is SpaceX's reusable crewed spacecraft, certified by NASA for operational missions to the International Space Station, restoring US crew launch capability.",
    imageUrl: '/satellites/crew-dragon.jpg', sortOrder: 34,
  },

  // ── Communications & Broadband ──
  {
    pattern: 'STARLINK', matchType: 'pattern', program: 'Starlink',
    operator: 'SpaceX', purpose: 'LEO broadband internet',
    coverage: 'Global (densest 53° latitudes)', orbitType: 'LEO, ~550 km, 53°/70°/97° shells',
    description: "Starlink is SpaceX's mega-constellation providing low-latency broadband internet worldwide. With thousands of satellites using inter-satellite laser links, the network serves residential, maritime, aviation, and government customers.",
    imageUrl: '/satellites/starlink.jpg', sortOrder: 40,
  },
  {
    pattern: 'MOLNIYA', matchType: 'pattern', program: 'Molniya',
    operator: 'Russian Ministry of Defence (legacy)', purpose: 'High-latitude communications',
    coverage: 'Russia & high-latitude regions', orbitType: 'HEO Molniya, ~500 x 40,000 km, 63.4° inclination',
    description: 'Molniya satellites pioneered the highly elliptical orbit that bears their name, providing communications coverage to high-latitude regions. The 12-hour orbit allows each satellite to dwell over Russia for approximately 8 hours per pass.',
    imageUrl: '/satellites/military.jpg', sortOrder: 41,
  },

  // ── Search & Rescue ──
  {
    pattern: 'SARSAT|COSPAS', matchType: 'pattern', program: 'COSPAS-SARSAT',
    operator: 'International (USA/Russia/France/Canada)', purpose: 'Search and rescue beacon detection',
    coverage: 'Global', orbitType: 'LEO ~850 km / MEO / GEO (multi-orbit)',
    description: 'COSPAS-SARSAT is the international satellite-aided search and rescue system that detects and locates emergency beacons from aircraft, ships, and individuals in distress.',
    imageUrl: '/satellites/weather.jpg', sortOrder: 42,
  },

  // ── Country fallbacks ──
  {
    pattern: 'US', matchType: 'country', program: 'US Government Satellite',
    operator: 'United States (various agencies)', purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: 'A United States government satellite. Specific mission details depend on the operating agency.',
    imageUrl: '/satellites/military.jpg', sortOrder: 100,
  },
  {
    pattern: 'CIS', matchType: 'country', program: 'Russian Government Satellite',
    operator: 'Russian Federation (various agencies)', purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: 'A Russian Federation government satellite supporting military communications, reconnaissance, early warning, or scientific research.',
    imageUrl: '/satellites/military.jpg', sortOrder: 101,
  },
  {
    pattern: 'PRC', matchType: 'country', program: 'Chinese Government Satellite',
    operator: "People's Republic of China (various agencies)", purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: 'A Chinese government satellite operated by CNSA, CMSA, or PLA Strategic Support Force.',
    imageUrl: '/satellites/military.jpg', sortOrder: 102,
  },
  {
    pattern: 'FR', matchType: 'country', program: 'French Government Satellite',
    operator: 'France (CNES / DGA)', purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: 'A French government satellite. France operates military reconnaissance, communications, and signals intelligence satellites.',
    imageUrl: '/satellites/military.jpg', sortOrder: 103,
  },
  {
    pattern: 'IND', matchType: 'country', program: 'Indian Government Satellite',
    operator: 'India (ISRO / Indian Armed Forces)', purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: 'An Indian government satellite operated by ISRO or supporting Indian defence forces.',
    imageUrl: '/satellites/navigation.jpg', sortOrder: 104,
  },
  {
    pattern: 'CA', matchType: 'country', program: 'Canadian Government Satellite',
    operator: 'Canada (CSA / DND)', purpose: 'Government operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: 'A Canadian government satellite for communications, Earth observation (RADARSAT), or space surveillance.',
    imageUrl: '/satellites/military.jpg', sortOrder: 105,
  },
  {
    pattern: 'ESA', matchType: 'country', program: 'ESA Mission',
    operator: 'European Space Agency', purpose: 'Scientific/operational mission',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: 'A European Space Agency satellite supporting scientific research, Earth observation, telecommunications, or navigation.',
    imageUrl: '/satellites/navigation.jpg', sortOrder: 106,
  },
  {
    pattern: 'JPN', matchType: 'country', program: 'Japanese Government Satellite',
    operator: 'Japan (JAXA / MoD)', purpose: 'Government operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "A Japanese government satellite operated by JAXA or supporting Japan's defense forces.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 107,
  },
];

async function main() {
  await prisma.satelliteProfile.deleteMany();
  await prisma.satelliteProfile.createMany({ data: profiles });
  const count = await prisma.satelliteProfile.count();
  console.log(`Seeded ${count} satellite profiles`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
