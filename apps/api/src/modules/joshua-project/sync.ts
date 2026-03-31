import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger.js';
import { fetchLanguages, fetchCountries, fetchPeopleGroups } from './client.js';
import { mapLanguages, mapReligionStats, buildFipsToIso3 } from './mapper.js';

const prisma = new PrismaClient();
const BATCH_SIZE = 500;

export interface JPSyncResult {
  languagesUpserted: number;
  religionStatsUpserted: number;
  errors: string[];
}

export async function syncJoshuaProject(): Promise<JPSyncResult> {
  const result: JPSyncResult = { languagesUpserted: 0, religionStatsUpserted: 0, errors: [] };

  try {
    // Phase 1: Fetch all data in parallel
    logger.info('Starting Joshua Project sync — fetching data...');
    const [rawLangs, rawCountries, rawPG] = await Promise.all([
      fetchLanguages(),
      fetchCountries(),
      fetchPeopleGroups(),
    ]);
    logger.info({ languages: rawLangs.length, countries: rawCountries.length, peopleGroups: rawPG.length }, 'JP data fetched');

    // Build helper maps
    const fipsToIso3 = buildFipsToIso3(rawCountries);
    const officialLangByCountry = new Map<string, string>();
    for (const c of rawCountries) {
      if (c.ISO3 && c.ROL3OfficialLanguage) {
        officialLangByCountry.set(c.ISO3, c.ROL3OfficialLanguage);
      }
    }

    // Get valid country ISO3 codes from our DB
    const dbCountries = await prisma.entity.findMany({
      where: { type: 'COUNTRY', iso3: { not: null } },
      select: { iso3: true },
    });
    const validIso3 = new Set(dbCountries.map(c => c.iso3!));

    // Phase 2: Map data
    const mappedLangs = mapLanguages(rawLangs, rawPG, fipsToIso3, officialLangByCountry);
    const mappedReligion = mapReligionStats(rawCountries);
    logger.info({ mappedLangs: mappedLangs.length, mappedReligion: mappedReligion.length }, 'JP data mapped');

    // Phase 3a: Upsert Languages in batches
    for (let i = 0; i < mappedLangs.length; i += BATCH_SIZE) {
      const batch = mappedLangs.slice(i, i + BATCH_SIZE);
      const operations = batch.map(l =>
        prisma.language.upsert({
          where: { iso639_3: l.iso639_3 },
          create: {
            iso639_3: l.iso639_3,
            name: l.name,
            hubCountry: l.hubCountry,
            nbrCountries: l.nbrCountries,
            speakers: l.speakers,
            status: l.status,
            family: l.family,
            officialIn: l.officialIn,
            lat: l.lat,
            lng: l.lng,
            syncedAt: new Date(),
          },
          update: {
            name: l.name,
            hubCountry: l.hubCountry,
            nbrCountries: l.nbrCountries,
            speakers: l.speakers,
            status: l.status,
            family: l.family,
            officialIn: l.officialIn,
            lat: l.lat,
            lng: l.lng,
            syncedAt: new Date(),
          },
        })
      );

      try {
        await prisma.$transaction(operations);
        result.languagesUpserted += batch.length;
      } catch (err) {
        const msg = `Language batch ${i}-${i + batch.length} failed: ${err}`;
        logger.error(msg);
        result.errors.push(msg);
      }

      if (i % 2000 === 0 && i > 0) {
        logger.info({ progress: i, total: mappedLangs.length }, 'Languages upsert progress');
      }
    }

    // Phase 3b: Upsert Religion Stats in batches
    for (let i = 0; i < mappedReligion.length; i += BATCH_SIZE) {
      const batch = mappedReligion.slice(i, i + BATCH_SIZE);
      const operations = batch
        .filter(r => validIso3.has(r.countryIso3))
        .map(r =>
          prisma.religionStat.upsert({
            where: { countryIso3: r.countryIso3 },
            create: {
              countryIso3: r.countryIso3,
              countryName: r.countryName,
              population: r.population,
              pctChristianity: r.pctChristianity,
              pctIslam: r.pctIslam,
              pctBuddhism: r.pctBuddhism,
              pctHinduism: r.pctHinduism,
              pctEthnicReligions: r.pctEthnicReligions,
              pctNonReligious: r.pctNonReligious,
              pctOther: r.pctOther,
              pctUnknown: r.pctUnknown,
              primaryReligion: r.primaryReligion,
              syncedAt: new Date(),
            },
            update: {
              countryName: r.countryName,
              population: r.population,
              pctChristianity: r.pctChristianity,
              pctIslam: r.pctIslam,
              pctBuddhism: r.pctBuddhism,
              pctHinduism: r.pctHinduism,
              pctEthnicReligions: r.pctEthnicReligions,
              pctNonReligious: r.pctNonReligious,
              pctOther: r.pctOther,
              pctUnknown: r.pctUnknown,
              primaryReligion: r.primaryReligion,
              syncedAt: new Date(),
            },
          })
        );

      try {
        await prisma.$transaction(operations);
        result.religionStatsUpserted += batch.length;
      } catch (err) {
        const msg = `Religion batch ${i}-${i + batch.length} failed: ${err}`;
        logger.error(msg);
        result.errors.push(msg);
      }
    }

    logger.info(result, 'Joshua Project sync complete');
  } catch (err) {
    const msg = `JP sync top-level error: ${err}`;
    logger.error(msg);
    result.errors.push(msg);
  }

  return result;
}
