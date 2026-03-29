import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const profiles = [
  // ── Navigation ──
  {
    pattern: 'GPS B', matchType: 'pattern', program: 'GPS Block IIF/III',
    operator: 'US Space Force / 2nd SOPS', purpose: 'Navigation & precision timing',
    coverage: 'Global (MEO constellation)', orbitType: 'MEO circular, ~20,200 km, 55° inclination',
    description: 'US Space Force navigation constellation. 31 operational satellites in 6 orbital planes at 20,200 km MEO, broadcasting L1/L2/L5 signals. Block III satellites carry the M-code military signal with 100x improved anti-jam capability over legacy blocks. Backbone of US/NATO precision-guided munitions, troop positioning, and global timing infrastructure.',
    imageUrl: '/satellites/gps.jpg', sortOrder: 1,
  },
  {
    pattern: 'GLONASS|COSMOS\\s*\\(7\\d{2}\\)', matchType: 'pattern', program: 'GLONASS',
    operator: 'Russian Aerospace Forces / Roscosmos', purpose: 'Navigation & precision timing',
    coverage: 'Global (MEO constellation)', orbitType: 'MEO circular, ~19,130 km, 64.8° inclination',
    description: "Russian Aerospace Forces navigation constellation. 24 satellites in 3 orbital planes at 19,130 km MEO, broadcasting L1/L2/L3 signals. Optimized for high-latitude coverage above 60°N where GPS geometry degrades. Critical for Russian military precision strike, GLONASS-K2 generation adds CDMA signals and inter-satellite links.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 2,
  },
  {
    pattern: 'BEIDOU', matchType: 'pattern', program: 'BeiDou-3',
    operator: 'PLA Strategic Support Force', purpose: 'Navigation, timing & short message communication',
    coverage: 'Global (MEO/GEO/IGSO constellation)', orbitType: 'MEO circular, ~21,500 km, 55° inclination',
    description: "PLA Strategic Support Force navigation constellation. 44+ satellites across MEO/GEO/IGSO orbits, fully operational since 2020. Unique hybrid architecture with short message communication capability — enables PLA units to transmit position reports via satellite without separate comms equipment. Sub-meter accuracy in Asia-Pacific theater, China's independent alternative to GPS dependency.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 3,
  },
  {
    pattern: 'GALILEO|GSAT0', matchType: 'pattern', program: 'Galileo',
    operator: 'European GNSS Agency (EUSPA)', purpose: 'Navigation & precision timing',
    coverage: 'Global (MEO constellation)', orbitType: 'MEO circular, ~23,222 km, 56° inclination',
    description: "EU civilian-controlled navigation constellation. 28 satellites at 23,222 km MEO in 3 orbital planes. Only GNSS with a guaranteed service level agreement and authenticated signal (OSNMA) for spoofing protection. Public Regulated Service (PRS) provides encrypted, jam-resistant positioning for EU government and military users. SAR return-link confirms distress beacon receipt within minutes.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 4,
  },
  {
    pattern: 'IRNSS', matchType: 'pattern', program: 'NavIC (IRNSS)',
    operator: 'Indian Space Research Organisation (ISRO)', purpose: 'Regional navigation & timing',
    coverage: 'India + 1,500 km extended region', orbitType: 'GEO/GSO, ~36,000 km, 29° inclination',
    description: "ISRO regional navigation system. 7 satellites in GEO/GSO orbits covering India plus 1,500 km extended region. Dual-frequency L5/S-band signals deliver 5m accuracy over Indian subcontinent. Operated independently of GPS for Indian Armed Forces strategic autonomy. Primary use: precision strike, fleet tracking, and civilian positioning in the Indian Ocean theater.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 5,
  },
  {
    pattern: 'QZSS|MICHIBIKI', matchType: 'pattern', program: 'QZSS (Quasi-Zenith)',
    operator: 'Japan Cabinet Office', purpose: 'Regional navigation augmentation',
    coverage: 'Japan & Asia-Oceania', orbitType: 'QZO/GEO, ~32,000-42,000 km, 43° inclination',
    description: "Japan Cabinet Office GPS augmentation system. 4 satellites in quasi-zenith orbit trace a figure-eight ground track over Japan, ensuring at least one satellite is always near-zenith. Centimeter-level accuracy via CLAS correction service. Serves Japan Self-Defense Forces with hardened, independent positioning capability over Japanese territory and surrounding maritime zones.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 6,
  },

  // ── US Military / Intelligence ──
  {
    pattern: 'SBIRS', matchType: 'pattern', program: 'SBIRS',
    operator: 'US Space Force / SBIRS Wing', purpose: 'Missile warning & defense',
    coverage: 'Global (GEO + HEO)', orbitType: 'GEO, ~35,786 km / HEO Molniya-type',
    description: "US missile defense early warning constellation. GEO satellites carry scanning and staring infrared sensors detecting ballistic missile launches within seconds of ignition from 36,000 km. Each satellite monitors an entire hemisphere continuously. Alert data feeds directly to NORAD and the National Command Authority. HEO components extend coverage to polar launch corridors.",
    imageUrl: '/satellites/programs/sbirs.jpg', sortOrder: 10,
  },
  {
    pattern: 'AEHF', matchType: 'pattern', program: 'AEHF',
    operator: 'US Space Force / Lockheed Martin', purpose: 'Protected strategic communications',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "US nuclear command and control communications constellation. EHF/SHF jam-resistant, LPI/LPD protected links for the President, SecDef, and STRATCOM. Each satellite delivers 10x the throughput of the Milstar system it replaced. Hardened against nuclear EMP and designed to maintain strategic communications during full-scale nuclear conflict. 6 satellites in GEO provide global coverage.",
    imageUrl: '/satellites/programs/aehf.jpg', sortOrder: 11,
  },
  {
    pattern: 'WGS', matchType: 'pattern', program: 'Wideband Global SATCOM',
    operator: 'US Space Force / 4th SATCOM Squadron', purpose: 'Military wideband communications',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "Primary wideband communications backbone for US and NATO forces. 10 GEO satellites with X-band and Ka-band transponders. Each satellite delivers 11+ Gbps — more than the entire DSCS constellation it replaced. Supports real-time UAV video feeds, secure C2 links, and tactical battlefield communications across every theater. Shared capacity with allied nations including Australia, Canada, and Denmark.",
    imageUrl: '/satellites/programs/wgs.jpg', sortOrder: 11,
  },
  {
    pattern: 'MUOS', matchType: 'pattern', program: 'MUOS',
    operator: 'US Navy / SPAWAR', purpose: 'Military narrowband communications',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "US Navy UHF narrowband constellation. 5 GEO satellites using adapted 3G WCDMA technology — each acts as a cell tower in space. Connects dismounted troops, vehicles, ships, submarines, and aircraft with simultaneous voice, video, and data. Penetrates jungle canopy, urban canyons, and mountainous terrain where legacy UHF fails. IP-based routing enables beyond-line-of-sight tactical communications.",
    imageUrl: '/satellites/programs/muos.jpg', sortOrder: 12,
  },
  {
    pattern: 'GSSAP', matchType: 'pattern', program: 'GSSAP',
    operator: 'US Space Force / Space Delta 2', purpose: 'Space domain awareness',
    coverage: 'GEO belt surveillance', orbitType: 'Near-GEO, ~35,786 km, near-equatorial',
    description: "US Space Force orbital inspection program. 6 satellites perform close-approach rendezvous maneuvers to characterize foreign GEO assets at ranges under 100 km. Collects imagery, signals, and behavioral intelligence on adversary satellites. Operated by Space Delta 2, Peterson SFB. Key targets include Russian Luch/Olymp inspectors and Chinese SJ-17/SJ-21 experimental platforms.",
    imageUrl: '/satellites/programs/sbirs.jpg', sortOrder: 13,
  },
  {
    pattern: 'NOSS', matchType: 'pattern', program: 'NOSS',
    operator: 'US Navy / NRO', purpose: 'Naval ocean surveillance',
    coverage: 'Global maritime', orbitType: 'LEO, ~1,000-1,200 km, 63° inclination',
    description: "US Navy/NRO signals intelligence constellation. Satellite clusters fly in close formation at ~1,100 km to triangulate RF emissions from surface vessels. Provides real-time maritime order-of-battle — tracking warship movements, identifying radar types, and cueing targeting for anti-ship operations. Classified program, orbits tracked by amateur observers.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 14,
  },
  {
    pattern: 'DMSP', matchType: 'pattern', program: 'DMSP',
    operator: 'US Space Force (legacy DoD weather)', purpose: 'Military meteorology',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~830 km, 98.7° inclination',
    description: "Longest-running military satellite program, operational since 1966. Polar-orbiting weather constellation at 830 km SSO. Visible/infrared imagers and microwave sensors deliver tactical weather intelligence — cloud cover for airstrike planning, wind data for parachute operations, sea state for amphibious landings. Thermal sensors detect troop/vehicle concentrations and map Arctic ice for submarine operations.",
    imageUrl: '/satellites/programs/dmsp.jpg', sortOrder: 15,
  },
  {
    pattern: 'TDRS', matchType: 'pattern', program: 'TDRSS',
    operator: 'NASA / Goddard Space Flight Center', purpose: 'Data relay & tracking',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "NASA data relay constellation. 9 GEO satellites provide near-continuous S/Ku/Ka-band links between ground stations and LEO assets — ISS, Hubble, scientific missions, and classified DoD payloads. Eliminates ground station gaps, enabling uninterrupted data downlink. Also supports Space Shuttle heritage and launch/reentry telemetry.",
    imageUrl: '/satellites/tdrs.jpg', sortOrder: 16,
  },
  {
    pattern: 'SAPPHIRE', matchType: 'pattern', program: 'Sapphire',
    operator: 'Canadian Armed Forces / DND', purpose: 'Space surveillance & tracking',
    coverage: 'Deep space (GEO belt)', orbitType: 'LEO, ~800 km, 98° inclination',
    description: "Canadian Armed Forces space surveillance satellite. Electro-optical sensor at 800 km LEO tracks objects in deep space above 6,000 km altitude — range where ground-based radars lose effectiveness. Key contributor to the US-Canadian Space Surveillance Network (SSN). Monitors foreign military GEO assets and provides collision avoidance data. Canada's only dedicated military space asset.",
    imageUrl: '/satellites/programs/sapphire.jpg', sortOrder: 17,
  },
  {
    pattern: 'PRAETORIAN|SDA.*TRANCHE', matchType: 'pattern', program: 'SDA Transport/Tracking Layer',
    operator: 'US Space Development Agency', purpose: 'Missile tracking & data transport',
    coverage: 'Global (LEO mesh constellation)', orbitType: 'LEO, ~950-1,200 km, various inclinations',
    description: "US Space Development Agency LEO mesh constellation. Tracking Layer satellites detect and track hypersonic missiles too low and fast for GEO-based SBIRS. Transport Layer routes military data via laser inter-satellite links — resilient mesh continues operating even if individual nodes are destroyed. Tranche 0: 28 satellites (2024). Tranche 1: 100+ satellites expanding the kill chain.",
    imageUrl: '/satellites/programs/sda.jpg', sortOrder: 18,
  },
  {
    pattern: 'USA[-\\s]', matchType: 'pattern', program: 'Classified US Payload',
    operator: 'NRO / US DoD', purpose: 'Classified national security mission',
    coverage: 'Varies by mission', orbitType: 'Varies (classified orbital parameters)',
    description: "NRO/DoD classified payload. Mission type unknown — likely imagery intelligence (KH-11 CRYSTAL series, ~10cm resolution), signals intelligence (SIGINT/ELINT intercept), or experimental technology demonstration. Specific capabilities, orbital parameters, and even program existence are officially unacknowledged. Orbits reconstructed by amateur observers using optical telescopes.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 19,
  },

  // ── Russia Military ──
  {
    pattern: 'COSMOS', matchType: 'pattern', program: 'COSMOS (Russian Military)',
    operator: 'Russian Aerospace Forces / Roscosmos', purpose: 'Multiple military missions',
    coverage: 'Varies by mission', orbitType: 'Varies (LEO, MEO, GEO, HEO)',
    description: "Generic designation for Russian military satellites — used to obscure true mission type. Includes: EKS/Tundra (missile early warning, HEO), Lotos-S/Pion-NKS (SIGINT — intercepts naval and military communications), Bars-M (optical reconnaissance, sub-meter resolution), and Rodnik (naval communications relay). Russia classifies nearly all military launches under COSMOS designator.",
    imageUrl: '/satellites/programs/cosmos.jpg', sortOrder: 9,
  },
  {
    pattern: 'LUCH', matchType: 'pattern', program: 'Luch',
    operator: 'Roscosmos / Russian MoD', purpose: 'Data relay & orbital inspection',
    coverage: 'Global (GEO)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "Russian GEO data relay and orbital inspection platform. Luch-5A/5B relay signals between LEO spacecraft and ground stations. Luch-5X (Olymp-K) repeatedly maneuvers to park near foreign military and commercial GEO satellites — conducting suspected SIGINT collection and orbital inspection for Russian intelligence (GRU/SVR). Targets have included Intelsat, SES, and French-Italian military assets.",
    imageUrl: '/satellites/programs/luch.jpg', sortOrder: 9,
  },

  // ── China Military ──
  {
    pattern: 'GAOFEN', matchType: 'pattern', program: 'Gaofen',
    operator: 'CNSA / PLA Strategic Support Force', purpose: 'High-resolution Earth observation (dual-use)',
    coverage: 'Global (LEO) + Asia-Pacific (GEO)', orbitType: 'SSO ~500-650 km / GEO ~35,786 km',
    description: "CNSA/PLA dual-use Earth observation system. Multi-sensor constellation: optical (sub-meter), SAR, hyperspectral, and GEO persistent surveillance. GAOFEN-11 achieves estimated 10cm ground resolution — comparable to US NRO KH-11 class. Officially civilian, operational tasking heavily supports PLA intelligence requirements. 20+ satellites across LEO and GEO orbits.",
    imageUrl: '/satellites/programs/gaofen.jpg', sortOrder: 8,
  },
  {
    pattern: 'YAOGAN', matchType: 'pattern', program: 'Yaogan',
    operator: 'PLA Strategic Support Force', purpose: 'Military reconnaissance & ocean surveillance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~500-1,200 km, various inclinations',
    description: "PLA dedicated military reconnaissance constellation. Three modes: optical imagery, SAR radar, and ELINT (electronic intelligence). Triple-satellite formations triangulate RF emissions from surface vessels — China's equivalent of US NOSS ocean surveillance. 140+ satellites launched since 2006. Primary tasking: Taiwan Strait, South China Sea, and Indian Ocean theater maritime surveillance.",
    imageUrl: '/satellites/programs/yaogan.jpg', sortOrder: 8,
  },
  {
    pattern: 'SHIJIAN', matchType: 'pattern', program: 'Shijian',
    operator: 'PLA / CNSA', purpose: 'Experimental military technology',
    coverage: 'Varies (LEO + GEO)', orbitType: 'Varies by mission',
    description: "PLA/CNSA experimental military technology platforms. SJ-21 captured and towed a defunct BeiDou satellite — widely assessed as anti-satellite (ASAT) capability demonstration. SJ-17 conducted proximity operations and close inspection of foreign GEO assets. SJ-25 tested on-orbit refueling with robotic arms. Recent SJ-28/29 missions remain undisclosed. Dual-use cover for advanced space warfare technology development.",
    imageUrl: '/satellites/programs/shijian.jpg', sortOrder: 8,
  },

  // ── UK Military ──
  {
    pattern: 'SKYNET', matchType: 'pattern', program: 'Skynet 5',
    operator: 'UK MoD / Airbus Defence and Space', purpose: 'Military communications',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "UK MoD military communications constellation operated via PFI contract by Airbus Defence and Space. Skynet 5A/5B/5C deliver UHF and X-band secure comms to British forces and NATO allies globally. Anti-jam capability and onboard processing for priority traffic management. Skynet 6 successor under development for launch post-2026.",
    imageUrl: '/satellites/programs/skynet.jpg', sortOrder: 8,
  },

  // ── France Military ──
  {
    pattern: 'SYRACUSE', matchType: 'pattern', program: 'Syracuse',
    operator: 'DGA / French Armed Forces', purpose: 'Military communications',
    coverage: 'Global (GEO constellation)', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "French Armed Forces military communications constellation. Syracuse 4 (2021/2024) features anti-jamming Ka/X-band transponders and onboard threat detection sensors — first European milcom satellite capable of detecting proximity approaches and jamming attempts. Provides strategic and tactical secure comms for French nuclear deterrent, deployed forces, and intelligence services.",
    imageUrl: '/satellites/programs/syracuse.jpg', sortOrder: 8,
  },

  // ── Germany Military ──
  {
    pattern: 'COMSATBW', matchType: 'pattern', program: 'COMSATBw',
    operator: 'Bundeswehr / German Armed Forces', purpose: 'Military communications',
    coverage: 'Europe, Africa & Middle East', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "Bundeswehr military communications system. 2 GEO satellites (COMSATBw-1/2) provide secure UHF/SHF links for German forces deployed in NATO, EU, and UN operations. Supports encrypted voice, data, and VTC for command structures in Afghanistan, Mali, and other theaters. Operated under a BOT (Build-Operate-Transfer) model by Airbus Defence and Space.",
    imageUrl: '/satellites/programs/comsatbw.jpg', sortOrder: 8,
  },

  // ── Additional Military / Allied ──
  {
    pattern: 'MERIDIAN', matchType: 'pattern', program: 'Meridian',
    operator: 'Russian Aerospace Forces', purpose: 'Military HEO communications',
    coverage: 'Russia & high-latitude regions', orbitType: 'HEO Molniya-type, ~500 x 40,000 km, 63.4° inclination',
    description: "Russian Aerospace Forces HEO communications constellation. Replacement for legacy Molniya series. Highly elliptical Molniya-type orbit (~500 x 40,000 km, 63.4°) provides secure military comms to Arctic bases, Northern Fleet, and strategic nuclear submarine force. Each satellite dwells over Russian territory for ~8 hours per 12-hour orbit, covering latitudes where GEO satellites fail.",
    imageUrl: '/satellites/programs/meridian.jpg', sortOrder: 20,
  },
  {
    pattern: 'XTAR', matchType: 'pattern', program: 'XTAR',
    operator: 'HISDESAT (Spain) / XTAR LLC (USA)', purpose: 'NATO military X-band communications',
    coverage: 'Europe, Middle East & Africa', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "Joint Spanish-US military X-band communications satellite. XTAR-EUR at GEO provides high-throughput tactical comms for NATO forces across Europe, Middle East, and Africa. X-band penetrates rain and atmospheric interference better than Ku/Ka — optimized for deployed ground forces. Primary customers: US DoD, Spanish MoD, and NATO allied nations.",
    imageUrl: '/satellites/programs/xtar.jpg', sortOrder: 21,
  },
  {
    pattern: 'ARIRANG', matchType: 'pattern', program: 'ARIRANG',
    operator: 'Korea Aerospace Research Institute (KARI)', purpose: 'Reconnaissance & Earth observation',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~500-700 km, 97-98° inclination',
    description: "KARI multi-purpose reconnaissance constellation (Korean designation). ARIRANG-3: 0.7m panchromatic/2.8m multispectral optical imagery from 685 km SSO. ARIRANG-5: X-band SAR radar, 1m resolution, all-weather day/night capability from 550 km. Primary tasking: Korean Peninsula surveillance, North Korean military activity monitoring, and maritime domain awareness.",
    imageUrl: '/satellites/programs/arirang.jpg', sortOrder: 22,
  },
  {
    pattern: 'KOMPSAT', matchType: 'pattern', program: 'KOMPSAT',
    operator: 'Korea Aerospace Research Institute (KARI)', purpose: 'Reconnaissance & Earth observation',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~500-700 km, 97-98° inclination',
    description: "KARI next-generation electro-optical reconnaissance satellite. 0.55m panchromatic resolution with SWIR infrared sensor for day/night imaging from 528 km SSO. Advanced agility: ±45° body-pointing for rapid retargeting. Feeds South Korean military intelligence with sub-meter imagery of North Korean WMD sites, troop deployments, and border fortifications.",
    imageUrl: '/satellites/programs/kompsat.jpg', sortOrder: 22,
  },

  // ── Israel ──
  {
    pattern: 'EROS', matchType: 'pattern', program: 'EROS',
    operator: 'ImageSat International (Israel)', purpose: 'High-resolution reconnaissance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~530 km, 97.4° inclination',
    description: "ImageSat International (IAI subsidiary) commercial reconnaissance constellation. EROS-C3: 30cm panchromatic / 60cm multispectral from 510 km retrograde orbit. Elbit Systems advanced camera with CCD/TDI sensors. Officially commercial, primary customers include Israeli defense establishment (IDF, Mossad, Shin Bet) and allied intelligence services. Among the highest-resolution commercial satellites operational.",
    imageUrl: '/satellites/programs/eros.jpg', sortOrder: 24,
  },

  // ── Turkey ──
  {
    pattern: 'GOKTURK', matchType: 'pattern', program: 'GOKTURK',
    operator: 'Turkish Armed Forces / TAI', purpose: 'Military reconnaissance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~680-700 km, 98° inclination',
    description: "Turkish Armed Forces electro-optical reconnaissance constellation. GOKTURK-2: 2.5m panchromatic from 685 km SSO (TAI-built). GOKTURK-1A: sub-meter resolution via Airbus/Thales HiRI optical payload from 689 km SSO. Primary theater coverage: eastern Mediterranean, Middle East, Central Asia, and Black Sea region. Turkey's sovereign high-resolution ISR capability.",
    imageUrl: '/satellites/programs/gokturk.jpg', sortOrder: 25,
  },

  // ── Russia additional ──
  {
    pattern: 'KONDOR', matchType: 'pattern', program: 'Kondor-FKA',
    operator: 'Russian Aerospace Forces / NPO Mashinostroyeniya', purpose: 'Military SAR radar reconnaissance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~500 km, 97.4° inclination',
    description: "Russian military SAR radar reconnaissance satellite. X-band synthetic aperture radar at ~500 km SSO delivers 1m resolution all-weather, day/night imagery. Built by NPO Mashinostroyeniya. Penetrates cloud cover for target detection in any conditions. Kondor-FKA No.1 launched 2023, expanding Russian radar ISR capacity alongside optical Bars-M systems.",
    imageUrl: '/satellites/programs/kondor.jpg', sortOrder: 26,
  },

  // ── India military ──
  {
    pattern: 'GSAT-7|CMS-03', matchType: 'pattern', program: 'GSAT-7 (Rukmini)',
    operator: 'Indian Armed Forces / ISRO', purpose: 'Dedicated military communications',
    coverage: 'Indian Ocean region', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "Indian Armed Forces dedicated military communications constellation. GSAT-7 (Rukmini): UHF/S/C/Ku-band for Indian Navy fleet operations across the Indian Ocean. GSAT-7A: Ku-band linking IAF radar stations, airbases, and AWACS aircraft. CMS-03 (GSAT-7R): 4,400 kg latest-gen multi-band satellite with advanced encryption and anti-jamming, India's heaviest milcom asset.",
    imageUrl: '/satellites/programs/gsat7.jpg', sortOrder: 27,
  },

  // ── UAE ──
  {
    pattern: 'FALCON EYE', matchType: 'pattern', program: 'FalconEye',
    operator: 'UAE Armed Forces / Airbus Defence', purpose: 'High-resolution military reconnaissance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~611 km, 97.8° inclination',
    description: "UAE Armed Forces electro-optical reconnaissance satellite. Built by Airbus Defence and Space on Pleiades-derived platform. 70cm panchromatic / 2.8m multispectral from 611 km SSO. Supports UAE military intelligence operations across the Arabian Peninsula, Horn of Africa, and wider Middle East. FalconEye 1 lost during Vega launch failure (2019); FalconEye 2 operational.",
    imageUrl: '/satellites/programs/falconeye.jpg', sortOrder: 29,
  },

  // ── Spain ──
  {
    pattern: '^PAZ$', matchType: 'pattern', program: 'PAZ',
    operator: 'HISDESAT / Spanish Armed Forces', purpose: 'Military SAR radar reconnaissance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~514 km, 97.4° inclination',
    description: "Spanish MoD SAR radar reconnaissance satellite. X-band synthetic aperture radar on Airbus TerraSAR-X platform at 514 km SSO. 1m resolution spotlight mode, 3m stripmap. All-weather, day/night imagery for Spanish Armed Forces intelligence and NATO commitments. Dual-use: also supports civil maritime surveillance and border security missions.",
    imageUrl: '/satellites/programs/paz.jpg', sortOrder: 30,
  },

  // ── Italy military ──
  {
    pattern: 'COSMO.SKYMED', matchType: 'pattern', program: 'COSMO-SkyMed (1st Gen)',
    operator: 'Italian Space Agency (ASI) / Italian MoD', purpose: 'Military SAR radar constellation',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~620 km, 97.9° inclination',
    description: "Italian MoD/ASI first-generation SAR constellation. 4x X-band radar satellites at 620 km SSO, launched 2007–2010. Sub-meter resolution spotlight mode for all-weather day/night reconnaissance. Built by Thales Alenia Space on PRIMA bus. Serves Italian Armed Forces, NATO allies, and civil protection agencies. Dual-use architecture with military priority tasking.",
    imageUrl: '/satellites/programs/cosmo-skymed.jpg', sortOrder: 31,
  },
  {
    pattern: 'CSG', matchType: 'pattern', program: 'CSG (COSMO-SkyMed 2nd Gen)',
    operator: 'Italian Space Agency (ASI) / Italian MoD', purpose: 'Advanced SAR radar constellation',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~620 km, 97.9° inclination',
    description: "Italian MoD/ASI second-generation SAR constellation replacing COSMO-SkyMed. 3 satellites (CSG-1: 2019, CSG-2: 2022, CSG-3: 2026) at 620 km SSO. Enhanced X-band SAR with improved agility, faster revisit time, and sub-meter resolution. Built by Thales Alenia Space. Interoperable with French CSO optical constellation for multi-sensor intelligence fusion.",
    imageUrl: '/satellites/programs/csg.jpg', sortOrder: 31,
  },

  // ── India reconnaissance ──
  {
    pattern: 'RISAT', matchType: 'pattern', program: 'RISAT',
    operator: 'ISRO / Indian Armed Forces', purpose: 'Military SAR radar reconnaissance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~530-556 km, 37-97° inclination',
    description: "ISRO military SAR radar constellation. X-band synthetic aperture radar with 0.35m ultra-high resolution mode. RISAT-2B series operates in 37° low-inclination orbits — optimized for maximum revisit rate over Indian subcontinent and Pakistan border regions. 3.6m deployable mesh antenna. All-weather, day/night ISR capability for Indian Armed Forces.",
    imageUrl: '/satellites/programs/risat.jpg', sortOrder: 32,
  },
  {
    pattern: 'CARTOSAT', matchType: 'pattern', program: 'CARTOSAT',
    operator: 'ISRO / Indian Armed Forces', purpose: 'High-resolution optical reconnaissance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~505-509 km, 97.5° inclination',
    description: "ISRO electro-optical reconnaissance series. CARTOSAT-3: 25cm panchromatic resolution from 509 km SSO — among the world's highest-resolution operational satellites. Agile platform with ±45° steering for rapid retargeting and stereo imaging. Hyperspectral mode at 12m for terrain classification. Feeds Indian defence mapping, surveillance, and precision targeting requirements.",
    imageUrl: '/satellites/programs/cartosat.jpg', sortOrder: 33,
  },

  // ── Egypt ──
  {
    pattern: 'EGYPTSAT|MISRSAT', matchType: 'pattern', program: 'EgyptSat',
    operator: 'Egyptian Space Agency / Egyptian Armed Forces', purpose: 'Military Earth observation',
    coverage: 'Regional (North Africa / Middle East)', orbitType: 'SSO, ~668 km, 98.0° inclination',
    description: "Egyptian military reconnaissance satellite built by RSC Energia (Russia) on 559GK bus. 1m panchromatic / 4m multispectral from 668 km SSO. Peleng/Belarus-developed optical payload. Replacement for EgyptSat-2 which failed after one year in orbit (2015). Primary users: Egyptian Armed Forces, military intelligence, and national security agencies. Cost: ~$100M.",
    imageUrl: '/satellites/programs/egyptsat.jpg', sortOrder: 34,
  },

  // ── France reconnaissance ──
  {
    pattern: 'PLEIADES NEO', matchType: 'pattern', program: 'Pleiades Neo',
    operator: 'Airbus Defence and Space / French MoD', purpose: 'Very high-resolution optical reconnaissance',
    coverage: 'Global (polar-orbiting)', orbitType: 'SSO, ~620 km, 97.9° inclination',
    description: "Airbus Defence and Space very high-resolution optical constellation. 30cm panchromatic / 1.2m multispectral from 620 km SSO. 2 satellites phased 180° apart for sub-daily revisit. Silicon carbide imager with 14km swath. French MoD (DGA) is anchor customer for intelligence and reconnaissance. Tasking shared with commercial and allied military users worldwide.",
    imageUrl: '/satellites/programs/pleiades-neo.jpg', sortOrder: 35,
  },

  // ── France/Italy ──
  {
    pattern: 'ATHENA.FIDUS', matchType: 'pattern', program: 'ATHENA-FIDUS',
    operator: 'DGA (France) / Italian MoD', purpose: 'Military broadband communications',
    coverage: 'Europe, North Africa & Middle East', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "Franco-Italian military broadband communications satellite. Ka-band high-throughput payload at GEO for deployed operations — UAV video feeds, C2 data links, and tactical broadband for French (DGA) and Italian (MoD) armed forces. Supports operations in Africa (Sahel), Middle East, and European theater. Built by Thales Alenia Space.",
    imageUrl: '/satellites/programs/athena-fidus.jpg', sortOrder: 28,
  },

  // ── Classified / Analyst ──
  {
    pattern: '^UNKNOWN$', matchType: 'pattern', program: 'Classified Object',
    operator: 'Unknown (tracked by amateur astronomers)', purpose: 'Classified national security mission',
    coverage: 'Varies by mission', orbitType: 'Varies (orbital elements from amateur tracking)',
    description: "Unacknowledged military satellite absent from official public catalogs. Orbit maintained by amateur astronomers using optical telescopes. Likely mission types: IMINT (reconnaissance — GSSAP, NROL), SIGINT (signals intelligence), or experimental (co-orbital inspection). Known classified programs include: US NROL missions, French CSO, Israeli OFEK, German SARAH, Japanese IGS. Multiple nations operate assets in this category.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 23,
  },

  // ── Weather / Meteorological ──
  {
    pattern: 'GOES', matchType: 'pattern', program: 'GOES',
    operator: 'NOAA / NASA', purpose: 'Geostationary weather observation',
    coverage: 'Western hemisphere', orbitType: 'GEO, ~35,786 km, near-equatorial',
    description: "NOAA/NASA geostationary weather constellation over the Americas. GOES-R series carries the Advanced Baseline Imager (ABI): 16 spectral bands, full-disk scan every 10 minutes, mesoscale sector every 30 seconds. GLM lightning mapper detects intra-cloud and cloud-to-ground strikes in real time. Critical for hurricane tracking, severe storm warnings, and aviation weather.",
    imageUrl: '/satellites/goes.jpg', sortOrder: 30,
  },
  {
    pattern: 'NOAA|JPSS|SUOMI', matchType: 'pattern', program: 'JPSS / NOAA Polar',
    operator: 'NOAA / NASA', purpose: 'Polar-orbiting weather observation',
    coverage: 'Global (pole-to-pole)', orbitType: 'SSO, ~824 km, 98.7° inclination',
    description: "NOAA/NASA polar-orbiting weather constellation at 824 km SSO. 5 core instruments: VIIRS (visible/infrared imaging), CrIS (infrared sounder), ATMS (microwave sounder), OMPS (ozone), and CERES (radiation budget). Provides foundational data for numerical weather prediction models worldwide. Each orbit captures a full pole-to-pole atmospheric profile.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 31,
  },
  {
    pattern: 'METEOSAT|METOP', matchType: 'pattern', program: 'EUMETSAT',
    operator: 'EUMETSAT', purpose: 'European weather observation',
    coverage: 'Europe, Africa & Indian Ocean (GEO) / Global (polar)', orbitType: 'GEO ~35,786 km / SSO ~817 km',
    description: "European meteorological satellite operator. Meteosat Third Generation (GEO): lightning imager + infrared sounder covering Europe/Africa/Indian Ocean. MetOp (SSO polar): IASI infrared sounder, ASCAT scatterometer for ocean winds. Data feeds all European national weather services and WMO global forecast models. Operational 24/7 since 1977.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 32,
  },
  {
    pattern: 'FENGYUN|FY-', matchType: 'pattern', program: 'Fengyun',
    operator: 'China Meteorological Administration (CMA)', purpose: 'Weather observation & climate monitoring',
    coverage: 'Asia-Pacific (GEO) / Global (polar)', orbitType: 'GEO ~35,786 km / SSO ~836 km',
    description: "CMA meteorological constellation. FY-4 (GEO): 14-band imager with 250m visible resolution, rapid-scan every 1 minute over Asia-Pacific. FY-3 (SSO polar): global atmospheric profiling with 10+ instruments. Data shared under WMO agreements. China's primary weather forecasting and typhoon tracking infrastructure, also supports PLA operational weather intelligence.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 33,
  },
  {
    pattern: 'HIMAWARI', matchType: 'pattern', program: 'Himawari',
    operator: 'Japan Meteorological Agency (JMA)', purpose: 'Geostationary weather observation',
    coverage: 'East Asia & Western Pacific', orbitType: 'GEO, ~35,786 km, 140.7°E',
    description: "JMA geostationary weather satellite at 140.7°E. Himawari-8/9 carry AHI (Advanced Himawari Imager): 16 bands, full-disk every 10 minutes, Japan sector every 2.5 minutes. 500m visible / 2km infrared resolution. Critical for Western Pacific typhoon tracking, volcanic ash detection, and aviation weather. Data shared with BoM Australia and regional partners.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 34,
  },
  {
    pattern: 'METEOR-M', matchType: 'pattern', program: 'Meteor-M',
    operator: 'Roshydromet / Roscosmos', purpose: 'Polar-orbiting weather observation',
    coverage: 'Global (pole-to-pole)', orbitType: 'SSO, ~830 km, 98.8° inclination',
    description: "Roshydromet polar-orbiting weather constellation at 830 km SSO. MSU-MR multispectral imager (6 bands, 1km resolution), MTVZA-GY microwave sounder, and SEVERYANIN-M SAR for Arctic ice monitoring. Provides weather data for Russian Federation territory and contributes to WMO global observation network. Also carries COSPAS-SARSAT search and rescue relay.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 35,
  },
  {
    pattern: 'ELEKTRO', matchType: 'pattern', program: 'Elektro-L',
    operator: 'Roshydromet / Roscosmos', purpose: 'Geostationary weather observation',
    coverage: 'Russia & Indian Ocean region', orbitType: 'GEO, ~35,786 km, 76°E',
    description: "Roshydromet geostationary weather satellite at 76°E. MSU-GS multispectral imager: 10 bands, 1km visible / 4km infrared resolution. Covers Russia, Central Asia, Indian Ocean, and eastern Africa. Full-disk scan every 30 minutes. Elektro-L No.3 (2023) replaced aging No.1. Feeds Russian Federation weather services and supports WMO regional coverage.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 36,
  },
  {
    pattern: 'INSAT-3D', matchType: 'pattern', program: 'INSAT-3D',
    operator: 'ISRO / India Meteorological Department', purpose: 'Weather observation & data relay',
    coverage: 'Indian subcontinent & Indian Ocean', orbitType: 'GEO, ~35,786 km, 82°E',
    description: "ISRO/IMD meteorological satellite at 82°E GEO. 6-channel imager (1km visible / 4km infrared) and 19-channel atmospheric sounder. Primary mission: Indian cyclone warning system and monsoon prediction. Scans Indian Ocean basin for tropical cyclone genesis. Data feeds India Meteorological Department numerical weather models and disaster management agencies.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 37,
  },

  // ── Space Stations & Crewed ──
  {
    pattern: '^ISS\\b|ZARYA|NAUKA', matchType: 'pattern', program: 'International Space Station',
    operator: 'NASA / Roscosmos / ESA / JAXA / CSA', purpose: 'Crewed orbital laboratory',
    coverage: 'N/A (microgravity research platform)', orbitType: 'LEO, ~420 km, 51.6° inclination',
    description: "Largest habitable structure in orbit. 420 km LEO, 51.6° inclination. 109m truss span, 420,000 kg mass. Continuously crewed since November 2000 by rotating international crews. 5-agency partnership: NASA, Roscosmos, ESA, JAXA, CSA. Supports 300+ experiments in microgravity biology, physics, materials science, and Earth observation. Planned deorbit ~2030.",
    imageUrl: '/satellites/iss.jpg', sortOrder: 50,
  },
  {
    pattern: 'CSS|TIANHE|WENTIAN|MENGTIAN', matchType: 'pattern', program: 'Tiangong Space Station',
    operator: 'China Manned Space Agency (CMSA)', purpose: 'Crewed orbital laboratory',
    coverage: 'N/A (microgravity research platform)', orbitType: 'LEO, ~390 km, 41.5° inclination',
    description: "Chinese permanently crewed orbital laboratory at 390 km LEO, 41.5° inclination. Three-module T-shape: Tianhe core (2021), Wentian (2022), Mengtian (2022). 110 tons total mass. Supports 3-person crews on 6-month rotations. Conducts microgravity research, space biology, and Earth observation. China's independent alternative to ISS partnership exclusion.",
    imageUrl: '/satellites/stations.jpg', sortOrder: 51,
  },
  {
    pattern: 'SHENZHOU', matchType: 'pattern', program: 'Shenzhou',
    operator: 'China Manned Space Agency (CMSA)', purpose: 'Crewed transport to Tiangong',
    coverage: 'N/A (crew rotation vehicle)', orbitType: 'LEO, ~390 km, 41.5° inclination',
    description: "CMSA crewed transport vehicle for Tiangong space station. 3-person capacity, derived from Russian Soyuz design but significantly larger (8.1 tons). Orbital module, reentry capsule, and service module. Launches on Long March 2F from Jiuquan. Active since 2003 (Shenzhou-5, first Chinese crewed flight). 6-month crew rotation missions.",
    imageUrl: '/satellites/stations.jpg', sortOrder: 52,
  },
  {
    pattern: 'SOYUZ', matchType: 'pattern', program: 'Soyuz',
    operator: 'Roscosmos', purpose: 'Crewed transport to ISS',
    coverage: 'N/A (crew rotation vehicle)', orbitType: 'LEO, ~420 km, 51.6° inclination',
    description: "World's longest-serving crewed spacecraft, operational since 1967. Soyuz MS variant: 3-person crew to ISS, 7.2 tons, launched from Baikonur on Soyuz-2.1a. Orbital, descent, and service modules. Serves as ISS crew lifeboat when docked. Over 150 crewed flights completed. Remains Russia's sole crewed launch capability.",
    imageUrl: '/satellites/soyuz.jpg', sortOrder: 53,
  },
  {
    pattern: 'CREW\\s*DRAGON', matchType: 'pattern', program: 'Crew Dragon',
    operator: 'SpaceX / NASA', purpose: 'Crewed transport to ISS',
    coverage: 'N/A (crew rotation vehicle)', orbitType: 'LEO, ~420 km, 51.6° inclination',
    description: "SpaceX reusable crewed spacecraft certified by NASA for ISS crew rotation. 4-person capacity, 12.5 tons. Autonomous docking, launch escape system, touchscreen cockpit. Restored US crewed launch capability in 2020 after 9-year gap. Also flies private Axiom and Polaris missions. Capsules reused up to 5+ times.",
    imageUrl: '/satellites/crew-dragon.jpg', sortOrder: 54,
  },

  // ── Geodetic / Calibration ──
  {
    pattern: 'ETALON', matchType: 'pattern', program: 'ETALON',
    operator: 'Roscosmos (launched by Soviet Union)', purpose: 'Geodetic laser ranging & calibration',
    coverage: 'Global (passive reflector)', orbitType: 'MEO, ~19,100 km, 65° inclination',
    description: "Soviet-era passive geodetic laser retroreflector satellites launched 1989. Two 1.3m diameter spheres with 2,142 corner-cube reflectors at 19,100 km MEO. No active systems — reflects laser pulses from ground stations for satellite laser ranging (SLR). Contributes to Earth geodesy, gravity field mapping, tectonic plate motion, and precise orbit determination for other satellites.",
    imageUrl: '/satellites/stations.jpg', sortOrder: 55,
  },

  // ── Communications & Broadband ──
  {
    pattern: 'STARLINK', matchType: 'pattern', program: 'Starlink',
    operator: 'SpaceX', purpose: 'LEO broadband internet',
    coverage: 'Global (densest 53° latitudes)', orbitType: 'LEO, ~550 km, 53°/70°/97° shells',
    description: "SpaceX LEO mega-constellation. 6,000+ satellites at 550 km in multiple orbital shells (53°/70°/97°). Inter-satellite laser links enable global mesh routing. 150+ Mbps download, 20-40ms latency. Serves residential, maritime, aviation, and US DoD/Ukrainian military customers. Starshield variant carries classified government payloads. Largest satellite constellation in history.",
    imageUrl: '/satellites/starlink.jpg', sortOrder: 60,
  },
  {
    pattern: 'MOLNIYA', matchType: 'pattern', program: 'Molniya',
    operator: 'Russian Ministry of Defence (legacy)', purpose: 'High-latitude communications',
    coverage: 'Russia & high-latitude regions', orbitType: 'HEO Molniya, ~500 x 40,000 km, 63.4° inclination',
    description: "Soviet-era military communications constellation that pioneered the highly elliptical orbit bearing its name. 12-hour period, 63.4° inclination, ~500 x 40,000 km. Each satellite dwells over Russian territory for ~8 hours per orbit. Legacy system largely replaced by Meridian, but remaining units still tracked. Fundamental to understanding Russian military orbital architecture.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 61,
  },

  // ── Search & Rescue ──
  {
    pattern: 'SARSAT|COSPAS', matchType: 'pattern', program: 'COSPAS-SARSAT',
    operator: 'International (USA/Russia/France/Canada)', purpose: 'Search and rescue beacon detection',
    coverage: 'Global', orbitType: 'LEO ~850 km / MEO / GEO (multi-orbit)',
    description: "International satellite-aided search and rescue system. Detects 406 MHz distress beacons (ELTs, EPIRBs, PLBs) from aircraft, ships, and individuals. Multi-orbit architecture: LEO (LEOSAR), MEO (MEOSAR via GPS/Galileo/GLONASS), GEO (GEOSAR). Locates distress signals within 100m and alerts rescue authorities within minutes. Has contributed to saving 60,000+ lives since 1982.",
    imageUrl: '/satellites/weather.jpg', sortOrder: 62,
  },

  // ── Country fallbacks ──
  {
    pattern: 'US', matchType: 'country', program: 'US Government Satellite',
    operator: 'United States (various agencies)', purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "US government satellite. Operating agency and mission type unresolved from name alone. Possible operators: NRO, US Space Force, NASA, NOAA, or DoD experimental programs. May be imagery, SIGINT, communications, weather, or scientific mission.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 100,
  },
  {
    pattern: 'CIS', matchType: 'country', program: 'Russian Government Satellite',
    operator: 'Russian Federation (various agencies)', purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "Russian Federation government satellite. Possible mission types: military communications (Meridian/Raduga), ISR (Bars-M/Kondor), early warning (EKS), SIGINT (Lotos-S/Pion), or scientific research. Most Russian military satellites operate under generic COSMOS designation.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 101,
  },
  {
    pattern: 'PRC', matchType: 'country', program: 'Chinese Government Satellite',
    operator: "People's Republic of China (various agencies)", purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "Chinese government satellite. Possible operators: CNSA (civilian space), CMSA (crewed program), or PLA Strategic Support Force (military). May be ISR (Yaogan/Gaofen), navigation (BeiDou), communications, experimental (Shijian), or Earth observation mission.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 102,
  },
  {
    pattern: 'FR', matchType: 'country', program: 'French Government Satellite',
    operator: 'France (CNES / DGA)', purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "French government satellite. France operates: CSO (optical reconnaissance, 20cm resolution), Syracuse (military comms), CERES (SIGINT constellation), and Pleiades (dual-use optical). DGA (Direction Générale de l'Armement) is primary military space customer. CNES provides technical oversight.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 103,
  },
  {
    pattern: 'IND', matchType: 'country', program: 'Indian Government Satellite',
    operator: 'India (ISRO / Indian Armed Forces)', purpose: 'Government/military operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "Indian government satellite. ISRO operates: GSAT-7 series (military comms), RISAT (SAR radar), CARTOSAT (optical ISR), NavIC (navigation), and INSAT (weather/comms). Indian Armed Forces are primary military customers. ISRO maintains one of the largest national satellite fleets in operation.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 104,
  },
  {
    pattern: 'CA', matchType: 'country', program: 'Canadian Government Satellite',
    operator: 'Canada (CSA / DND)', purpose: 'Government operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "Canadian government satellite. Canada operates: Sapphire (space surveillance), RADARSAT (C-band SAR for Arctic monitoring and maritime surveillance), and communications assets. MDA Space is primary contractor. Canadian Armed Forces and DND are military users. Strong cooperation with US through NORAD and Five Eyes.",
    imageUrl: '/satellites/programs/classified.jpg', sortOrder: 105,
  },
  {
    pattern: 'ESA', matchType: 'country', program: 'ESA Mission',
    operator: 'European Space Agency', purpose: 'Scientific/operational mission',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "European Space Agency mission. ESA operates: Copernicus Sentinel series (Earth observation), Galileo (navigation), science missions (Mars Express, JWST contribution), and telecom pathfinders. 22 member states contribute funding. ESA satellites are typically civilian/scientific but Copernicus data supports EU defense applications.",
    imageUrl: '/satellites/navigation.jpg', sortOrder: 106,
  },
  {
    pattern: 'JPN', matchType: 'country', program: 'Japanese Government Satellite',
    operator: 'Japan (JAXA / MoD)', purpose: 'Government operations',
    coverage: 'Varies by mission', orbitType: 'Varies',
    description: "Japanese government satellite. Japan operates: IGS (classified optical/radar reconnaissance), QZSS Michibiki (GPS augmentation), Himawari (weather), and JAXA science missions. Japan Self-Defense Forces rely on IGS constellation for North Korean missile monitoring. MHI and Mitsubishi Electric are primary contractors.",
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
