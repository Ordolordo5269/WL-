import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding conflict tracker data...');

  // ── Clean existing data ──────────────────────────────
  await prisma.supportLink.deleteMany();
  await prisma.conflictFaction.deleteMany();
  await prisma.conflict.deleteMany();
  await prisma.faction.deleteMany();

  // ════════════════════════════════════════════════════════
  //  FACTIONS (shared across conflicts)
  // ════════════════════════════════════════════════════════

  // ── State actors ─────────────────────────────────────
  const ukraine = await prisma.faction.create({
    data: {
      id: 'ua-armed-forces',
      name: 'Ukraine Armed Forces',
      type: 'STATE',
      countryIso: 'UKR',
      flagUrl: 'https://flagcdn.com/w80/ua.png',
    },
  });

  const russia = await prisma.faction.create({
    data: {
      id: 'ru-armed-forces',
      name: 'Russian Armed Forces',
      type: 'STATE',
      countryIso: 'RUS',
      flagUrl: 'https://flagcdn.com/w80/ru.png',
    },
  });

  const usa = await prisma.faction.create({
    data: {
      id: 'usa-gov',
      name: 'United States',
      type: 'STATE',
      countryIso: 'USA',
      flagUrl: 'https://flagcdn.com/w80/us.png',
    },
  });

  const eu = await prisma.faction.create({
    data: {
      id: 'eu-bloc',
      name: 'European Union',
      type: 'OTHER',
      countryIso: null,
      flagUrl: 'https://flagcdn.com/w80/eu.png',
    },
  });

  const china = await prisma.faction.create({
    data: {
      id: 'china-gov',
      name: "People's Republic of China",
      type: 'STATE',
      countryIso: 'CHN',
      flagUrl: 'https://flagcdn.com/w80/cn.png',
    },
  });

  const iran = await prisma.faction.create({
    data: {
      id: 'iran-gov',
      name: 'Islamic Republic of Iran',
      type: 'STATE',
      countryIso: 'IRN',
      flagUrl: 'https://flagcdn.com/w80/ir.png',
    },
  });

  const uk = await prisma.faction.create({
    data: {
      id: 'uk-gov',
      name: 'United Kingdom',
      type: 'STATE',
      countryIso: 'GBR',
      flagUrl: 'https://flagcdn.com/w80/gb.png',
    },
  });

  const mali = await prisma.faction.create({
    data: {
      id: 'mali-fama',
      name: 'Malian Armed Forces (FAMA)',
      type: 'STATE',
      countryIso: 'MLI',
      flagUrl: 'https://flagcdn.com/w80/ml.png',
    },
  });

  const saf = await prisma.faction.create({
    data: {
      id: 'sudan-saf',
      name: 'Sudanese Armed Forces (SAF)',
      type: 'STATE',
      countryIso: 'SDN',
      flagUrl: 'https://flagcdn.com/w80/sd.png',
    },
  });

  const egypt = await prisma.faction.create({
    data: {
      id: 'egypt-gov',
      name: 'Arab Republic of Egypt',
      type: 'STATE',
      countryIso: 'EGY',
      flagUrl: 'https://flagcdn.com/w80/eg.png',
    },
  });

  const uae = await prisma.faction.create({
    data: {
      id: 'uae-gov',
      name: 'United Arab Emirates',
      type: 'STATE',
      countryIso: 'ARE',
      flagUrl: 'https://flagcdn.com/w80/ae.png',
    },
  });

  const france = await prisma.faction.create({
    data: {
      id: 'france-gov',
      name: 'French Republic',
      type: 'STATE',
      countryIso: 'FRA',
      flagUrl: 'https://flagcdn.com/w80/fr.png',
    },
  });

  // ── Militias & PMCs ──────────────────────────────────
  const wagner = await prisma.faction.create({
    data: {
      id: 'wagner-group',
      name: 'Wagner Group / Africa Corps',
      type: 'MILITIA',
      countryIso: 'RUS',
      flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/PMC_Wagner_Center_logo.svg/120px-PMC_Wagner_Center_logo.svg.png',
    },
  });

  const rsf = await prisma.faction.create({
    data: {
      id: 'sudan-rsf',
      name: 'Rapid Support Forces (RSF)',
      type: 'MILITIA',
      countryIso: 'SDN',
      flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Emblem_of_the_Rapid_Support_Forces.png/120px-Emblem_of_the_Rapid_Support_Forces.png',
    },
  });

  // ── Rebel groups ─────────────────────────────────────
  const tuareg = await prisma.faction.create({
    data: {
      id: 'mali-csp-dpa',
      name: 'CSP-DPA (Tuareg Rebels)',
      type: 'REBEL',
      countryIso: 'MLI',
      flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/MNLA_flag.svg/120px-MNLA_flag.svg.png',
    },
  });

  // ── Terrorist organizations ──────────────────────────
  const jnim = await prisma.faction.create({
    data: {
      id: 'jnim',
      name: 'JNIM (al-Qaeda Sahel)',
      type: 'TERRORIST',
      countryIso: 'MLI',
      flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Flag_of_Jihad.svg/120px-Flag_of_Jihad.svg.png',
    },
  });

  const isgs = await prisma.faction.create({
    data: {
      id: 'isgs',
      name: 'ISGS (ISIS Greater Sahara)',
      type: 'TERRORIST',
      countryIso: 'MLI',
      flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Islamic_State_flag.svg/120px-Islamic_State_flag.svg.png',
    },
  });

  // ════════════════════════════════════════════════════════
  //  CONFLICT 1: Russo-Ukrainian War
  // ════════════════════════════════════════════════════════

  const ukraineConflict = await prisma.conflict.create({
    data: {
      id: 'ukraine-russia-2022',
      name: 'Russo-Ukrainian War',
      countryIso: 'UKR',
      lat: 48.3794,
      lng: 31.1656,
      status: 'ACTIVE',
      type: 'INTERSTATE',
      description:
        'Full-scale invasion of Ukraine by Russia beginning February 2022. Largest conventional war in Europe since WWII. Wagner Group played a key role in the Battle of Bakhmut (2022-2023) before Prigozhin\'s failed mutiny in June 2023 and death in August 2023. After Prigozhin\'s demise, Wagner operations were absorbed by Russian military intelligence (GRU) and rebranded as "Africa Corps" for overseas operations.',
      startDate: new Date('2022-02-24'),
      casualtiesEstimate: 500000,
    },
  });

  // ════════════════════════════════════════════════════════
  //  CONFLICT 2: Mali Insurgency & Wagner Campaign
  // ════════════════════════════════════════════════════════

  const maliConflict = await prisma.conflict.create({
    data: {
      id: 'mali-insurgency-2022',
      name: 'Mali Insurgency (Wagner Campaign)',
      countryIso: 'MLI',
      lat: 16.77,
      lng: -3.0,
      status: 'ACTIVE',
      type: 'INSURGENCY',
      description:
        'After the 2021 military coup, Mali\'s junta expelled French forces and invited Wagner Group mercenaries. Wagner/Africa Corps deployed ~1,500 fighters alongside the Malian army (FAMA), conducting operations against jihadist groups (JNIM, ISGS) and Tuareg separatists. Key events include the Moura massacre (March 2022, ~500 civilians killed), the capture of Kidal (Nov 2023), and the devastating Battle of Tinzaouaten (July 2024) where Tuareg rebels and JNIM killed 50-80 Wagner mercenaries — Wagner\'s deadliest battle in Africa. Mali joined the Alliance of Sahel States (AES) with Burkina Faso and Niger, all pivoting toward Russia.',
      startDate: new Date('2022-01-01'),
      casualtiesEstimate: 15000,
    },
  });

  // ════════════════════════════════════════════════════════
  //  CONFLICT 3: Sudan Civil War
  // ════════════════════════════════════════════════════════

  const sudanConflict = await prisma.conflict.create({
    data: {
      id: 'sudan-civil-war-2023',
      name: 'Sudan Civil War',
      countryIso: 'SDN',
      lat: 15.5007,
      lng: 32.5599,
      status: 'ACTIVE',
      type: 'CIVIL_WAR',
      description:
        'On April 15, 2023, war erupted between the Sudanese Armed Forces (SAF) under Gen. al-Burhan and the Rapid Support Forces (RSF) under Gen. Hemedti. The RSF — evolved from the Janjaweed militias of the Darfur genocide — received weapons and SAMs from Wagner Group/Africa Corps via Libya. Wagner had operated gold mines in Sudan since 2017 through Hemedti\'s protection. The conflict has killed over 150,000 people (direct + indirect), displaced 10+ million, and triggered famine conditions. In Darfur, the RSF carried out ethnic cleansing against the Masalit people. It is the world\'s largest displacement crisis.',
      startDate: new Date('2023-04-15'),
      casualtiesEstimate: 150000,
    },
  });

  // ════════════════════════════════════════════════════════
  //  CONFLICT-FACTION LINKS (belligerents)
  // ════════════════════════════════════════════════════════

  await prisma.conflictFaction.createMany({
    data: [
      // ── Ukraine conflict ──
      { conflictId: ukraineConflict.id, factionId: ukraine.id, side: 'A', casualties: 80000 },
      { conflictId: ukraineConflict.id, factionId: russia.id, side: 'B', casualties: 120000 },
      { conflictId: ukraineConflict.id, factionId: wagner.id, side: 'B', casualties: 30000 },

      // ── Mali conflict ──
      // Side A: Malian govt + Wagner (pro-junta)
      { conflictId: maliConflict.id, factionId: mali.id, side: 'A', casualties: 3000 },
      { conflictId: maliConflict.id, factionId: wagner.id, side: 'A', casualties: 500 },
      // Side B: Jihadist insurgents
      { conflictId: maliConflict.id, factionId: jnim.id, side: 'B', casualties: 4000 },
      { conflictId: maliConflict.id, factionId: isgs.id, side: 'B', casualties: 2000 },
      // Side C: Tuareg separatists (fight both govt and jihadists, but mainly govt)
      { conflictId: maliConflict.id, factionId: tuareg.id, side: 'C', casualties: 1500 },

      // ── Sudan conflict ──
      // Side A: SAF (national army)
      { conflictId: sudanConflict.id, factionId: saf.id, side: 'A', casualties: 20000 },
      // Side B: RSF (paramilitary)
      { conflictId: sudanConflict.id, factionId: rsf.id, side: 'B', casualties: 25000 },
    ],
  });

  // ════════════════════════════════════════════════════════
  //  SUPPORT LINKS (external supporters)
  // ════════════════════════════════════════════════════════

  await prisma.supportLink.createMany({
    data: [
      // ── Ukraine conflict: Western support to Ukraine ──
      {
        conflictId: ukraineConflict.id,
        fromId: usa.id,
        toId: ukraine.id,
        type: 'MILITARY',
        intensity: 3,
        description: 'HIMARS, Patriot systems, Abrams tanks, $175B+ in aid',
        sourceUrl: 'https://www.state.gov/ukraine',
      },
      {
        conflictId: ukraineConflict.id,
        fromId: usa.id,
        toId: ukraine.id,
        type: 'ECONOMIC',
        intensity: 3,
        description: 'Direct budget support and economic stabilization packages',
      },
      {
        conflictId: ukraineConflict.id,
        fromId: uk.id,
        toId: ukraine.id,
        type: 'MILITARY',
        intensity: 3,
        description: 'Storm Shadow missiles, Challenger 2 tanks, training programs',
      },
      {
        conflictId: ukraineConflict.id,
        fromId: eu.id,
        toId: ukraine.id,
        type: 'ECONOMIC',
        intensity: 3,
        description: 'EU candidate status, macro-financial assistance, reconstruction funds',
      },
      {
        conflictId: ukraineConflict.id,
        fromId: eu.id,
        toId: ukraine.id,
        type: 'DIPLOMATIC',
        intensity: 2,
        description: 'Sanctions on Russia, EU candidate status for Ukraine',
      },

      // ── Ukraine conflict: Support to Russia ──
      {
        conflictId: ukraineConflict.id,
        fromId: china.id,
        toId: russia.id,
        type: 'DIPLOMATIC',
        intensity: 2,
        description: '"No limits" partnership, UN vote abstentions, peace plan proposals',
      },
      {
        conflictId: ukraineConflict.id,
        fromId: china.id,
        toId: russia.id,
        type: 'ECONOMIC',
        intensity: 2,
        description: 'Increased oil/gas purchases, yuan trade settlements',
      },
      {
        conflictId: ukraineConflict.id,
        fromId: iran.id,
        toId: russia.id,
        type: 'MILITARY',
        intensity: 2,
        description: 'Shahed-136 kamikaze drones, ballistic missile components',
        sourceUrl: 'https://www.iiss.org',
      },

      // ── Mali conflict: Russia supports junta/Wagner ──
      {
        conflictId: maliConflict.id,
        fromId: russia.id,
        toId: mali.id,
        type: 'MILITARY',
        intensity: 3,
        description: 'Deployed Wagner/Africa Corps mercenaries (~1,500), helicopters, armored vehicles, and military advisors',
      },
      {
        conflictId: maliConflict.id,
        fromId: russia.id,
        toId: mali.id,
        type: 'DIPLOMATIC',
        intensity: 2,
        description: 'UN Security Council vetoes, political backing for the military junta, blocked sanctions',
      },
      {
        conflictId: maliConflict.id,
        fromId: russia.id,
        toId: wagner.id,
        type: 'MILITARY',
        intensity: 3,
        description: 'GRU command structure after Prigozhin\'s death (Aug 2023), rebranded as Africa Corps under Russian MoD control',
      },
      // France historically supported Mali, withdrew after junta pivot to Russia
      {
        conflictId: maliConflict.id,
        fromId: france.id,
        toId: mali.id,
        type: 'MILITARY',
        intensity: 1,
        description: 'Operation Barkhane (2014–2022): ~5,000 troops, air support. Expelled by the junta in favor of Wagner',
        startedAt: new Date('2014-08-01'),
        endedAt: new Date('2022-08-15'),
      },

      // ── Sudan conflict: Wagner/Russia arm the RSF ──
      {
        conflictId: sudanConflict.id,
        fromId: wagner.id,
        toId: rsf.id,
        type: 'MILITARY',
        intensity: 2,
        description: 'Surface-to-air missiles (Strela/Igla), ammunition, and small arms shipped via Libya and CAR. Pre-existing relationship from gold mining since 2017',
      },
      {
        conflictId: sudanConflict.id,
        fromId: russia.id,
        toId: rsf.id,
        type: 'ECONOMIC',
        intensity: 2,
        description: 'Gold mining concessions via Meroe Gold/M Invest in Darfur and River Nile State. Hundreds of millions in gold extracted, helping Russia circumvent Western sanctions',
      },
      // UAE supports RSF
      {
        conflictId: sudanConflict.id,
        fromId: uae.id,
        toId: rsf.id,
        type: 'MILITARY',
        intensity: 3,
        description: 'Primary external backer: weapons, drones, funding channeled through Chad and Libya. Documented by UN Panel of Experts',
      },
      // Egypt supports SAF
      {
        conflictId: sudanConflict.id,
        fromId: egypt.id,
        toId: saf.id,
        type: 'MILITARY',
        intensity: 2,
        description: 'Military intelligence, border security cooperation. Strategic interest in Nile water politics and preventing instability on southern border',
      },
      {
        conflictId: sudanConflict.id,
        fromId: egypt.id,
        toId: saf.id,
        type: 'DIPLOMATIC',
        intensity: 2,
        description: 'Diplomatic support for al-Burhan government, hosting SAF leadership meetings in Cairo',
      },
    ],
  });

  // ── Summary ──────────────────────────────────────────
  const conflictCount = await prisma.conflict.count();
  const factionCount = await prisma.faction.count();
  const linkCount = await prisma.conflictFaction.count();
  const supportCount = await prisma.supportLink.count();

  console.log('Seed complete:');
  console.log(`  - ${conflictCount} conflicts`);
  console.log(`  - ${factionCount} factions`);
  console.log(`  - ${linkCount} belligerent links`);
  console.log(`  - ${supportCount} support links`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
