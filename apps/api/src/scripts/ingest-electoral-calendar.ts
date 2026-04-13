/**
 * Ingest Electoral Calendar — Elections worldwide
 *
 * Two data sources:
 * 1. IDEA Voter Turnout Database — historical turnout data
 * 2. Upcoming elections — curated from Wikipedia "List of next general elections"
 *
 * Stores both completed elections (with turnout) and scheduled future elections.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

interface ElectionEntry {
  countryIso3: string;
  countryName: string;
  electionType: string;
  year: number;
  electionDate?: string;
  status: string;
  turnoutPercent?: number;
  description?: string;
}

function getData(): ElectionEntry[] {
  return [
    // === UPCOMING / SCHEDULED (2025-2027) ===
    // 2025
    { countryIso3: 'DEU', countryName: 'Germany', electionType: 'parliamentary', year: 2025, electionDate: '2025-02-23', status: 'completed', turnoutPercent: 82.5, description: 'Federal election (Bundestag)' },
    { countryIso3: 'CAN', countryName: 'Canada', electionType: 'parliamentary', year: 2025, electionDate: '2025-04-28', status: 'completed', turnoutPercent: 66.2, description: 'Federal election' },
    { countryIso3: 'AUS', countryName: 'Australia', electionType: 'parliamentary', year: 2025, electionDate: '2025-05-03', status: 'completed', turnoutPercent: 89.8, description: 'Federal election' },
    { countryIso3: 'PHL', countryName: 'Philippines', electionType: 'legislative', year: 2025, electionDate: '2025-05-12', status: 'completed', turnoutPercent: 73.5, description: 'Midterm elections' },
    { countryIso3: 'POL', countryName: 'Poland', electionType: 'presidential', year: 2025, electionDate: '2025-05-18', status: 'completed', description: 'Presidential election' },
    { countryIso3: 'KOR', countryName: 'South Korea', electionType: 'presidential', year: 2025, electionDate: '2025-06-03', status: 'scheduled', description: 'Snap presidential election' },
    { countryIso3: 'NOR', countryName: 'Norway', electionType: 'parliamentary', year: 2025, electionDate: '2025-09-08', status: 'scheduled', description: 'Parliamentary election (Storting)' },
    { countryIso3: 'CHL', countryName: 'Chile', electionType: 'presidential', year: 2025, electionDate: '2025-11-16', status: 'scheduled', description: 'Presidential + parliamentary' },
    { countryIso3: 'SGP', countryName: 'Singapore', electionType: 'parliamentary', year: 2025, status: 'scheduled', description: 'General election (by Nov 2025)' },
    { countryIso3: 'IRQ', countryName: 'Iraq', electionType: 'parliamentary', year: 2025, status: 'scheduled', description: 'Parliamentary election' },

    // 2026
    { countryIso3: 'BRA', countryName: 'Brazil', electionType: 'legislative', year: 2026, electionDate: '2026-10-04', status: 'scheduled', description: 'Presidential + congressional' },
    { countryIso3: 'COL', countryName: 'Colombia', electionType: 'legislative', year: 2026, status: 'scheduled', description: 'Congressional elections' },
    { countryIso3: 'MEX', countryName: 'Mexico', electionType: 'legislative', year: 2026, status: 'scheduled', description: 'Midterm elections' },
    { countryIso3: 'JPN', countryName: 'Japan', electionType: 'parliamentary', year: 2026, status: 'scheduled', description: 'House of Councillors election' },
    { countryIso3: 'CZE', countryName: 'Czechia', electionType: 'parliamentary', year: 2025, status: 'scheduled', description: 'Chamber of Deputies election' },
    { countryIso3: 'FRA', countryName: 'France', electionType: 'presidential', year: 2027, status: 'scheduled', description: 'Presidential election' },
    { countryIso3: 'GBR', countryName: 'United Kingdom', electionType: 'parliamentary', year: 2029, status: 'scheduled', description: 'General election (by Jan 2030)' },
    { countryIso3: 'USA', countryName: 'United States', electionType: 'legislative', year: 2026, electionDate: '2026-11-03', status: 'scheduled', description: 'Midterm elections (House + 1/3 Senate)' },
    { countryIso3: 'IND', countryName: 'India', electionType: 'parliamentary', year: 2029, status: 'scheduled', description: 'General election (Lok Sabha)' },
    { countryIso3: 'IDN', countryName: 'Indonesia', electionType: 'presidential', year: 2029, status: 'scheduled', description: 'Presidential + legislative' },

    // === RECENT COMPLETED (2024) with turnout ===
    { countryIso3: 'USA', countryName: 'United States', electionType: 'presidential', year: 2024, electionDate: '2024-11-05', status: 'completed', turnoutPercent: 65.7, description: 'Presidential election' },
    { countryIso3: 'GBR', countryName: 'United Kingdom', electionType: 'parliamentary', year: 2024, electionDate: '2024-07-04', status: 'completed', turnoutPercent: 59.7, description: 'General election' },
    { countryIso3: 'IND', countryName: 'India', electionType: 'parliamentary', year: 2024, electionDate: '2024-04-19', status: 'completed', turnoutPercent: 65.8, description: 'General election (Lok Sabha)' },
    { countryIso3: 'IDN', countryName: 'Indonesia', electionType: 'presidential', year: 2024, electionDate: '2024-02-14', status: 'completed', turnoutPercent: 81.8, description: 'Presidential election' },
    { countryIso3: 'MEX', countryName: 'Mexico', electionType: 'presidential', year: 2024, electionDate: '2024-06-02', status: 'completed', turnoutPercent: 61.0, description: 'Presidential + congressional' },
    { countryIso3: 'ZAF', countryName: 'South Africa', electionType: 'parliamentary', year: 2024, electionDate: '2024-05-29', status: 'completed', turnoutPercent: 58.6, description: 'National + provincial' },
    { countryIso3: 'TWN', countryName: 'Taiwan', electionType: 'presidential', year: 2024, electionDate: '2024-01-13', status: 'completed', turnoutPercent: 71.9, description: 'Presidential + legislative' },
    { countryIso3: 'RUS', countryName: 'Russia', electionType: 'presidential', year: 2024, electionDate: '2024-03-17', status: 'completed', turnoutPercent: 77.4, description: 'Presidential election' },
    { countryIso3: 'PAK', countryName: 'Pakistan', electionType: 'parliamentary', year: 2024, electionDate: '2024-02-08', status: 'completed', turnoutPercent: 47.6, description: 'National Assembly election' },
    { countryIso3: 'VEN', countryName: 'Venezuela', electionType: 'presidential', year: 2024, electionDate: '2024-07-28', status: 'completed', turnoutPercent: 59.0, description: 'Presidential election (disputed)' },
    { countryIso3: 'BGD', countryName: 'Bangladesh', electionType: 'parliamentary', year: 2024, electionDate: '2024-01-07', status: 'completed', turnoutPercent: 41.8, description: 'Parliamentary election (boycotted by opposition)' },
    { countryIso3: 'FRA', countryName: 'France', electionType: 'legislative', year: 2024, electionDate: '2024-06-30', status: 'completed', turnoutPercent: 66.7, description: 'Snap parliamentary election' },
    { countryIso3: 'JPN', countryName: 'Japan', electionType: 'parliamentary', year: 2024, electionDate: '2024-10-27', status: 'completed', turnoutPercent: 53.9, description: 'House of Representatives' },
    { countryIso3: 'AUT', countryName: 'Austria', electionType: 'parliamentary', year: 2024, electionDate: '2024-09-29', status: 'completed', turnoutPercent: 77.7, description: 'National Council election' },
    { countryIso3: 'URY', countryName: 'Uruguay', electionType: 'presidential', year: 2024, electionDate: '2024-10-27', status: 'completed', turnoutPercent: 89.5, description: 'Presidential + parliamentary' },
    { countryIso3: 'GHA', countryName: 'Ghana', electionType: 'presidential', year: 2024, electionDate: '2024-12-07', status: 'completed', turnoutPercent: 60.8, description: 'Presidential + parliamentary' },

    // === HISTORICAL TURNOUT (IDEA data) — key elections ===
    { countryIso3: 'USA', countryName: 'United States', electionType: 'presidential', year: 2020, electionDate: '2020-11-03', status: 'completed', turnoutPercent: 66.8 },
    { countryIso3: 'USA', countryName: 'United States', electionType: 'presidential', year: 2016, electionDate: '2016-11-08', status: 'completed', turnoutPercent: 59.2 },
    { countryIso3: 'FRA', countryName: 'France', electionType: 'presidential', year: 2022, electionDate: '2022-04-24', status: 'completed', turnoutPercent: 72.0 },
    { countryIso3: 'BRA', countryName: 'Brazil', electionType: 'presidential', year: 2022, electionDate: '2022-10-30', status: 'completed', turnoutPercent: 79.0 },
    { countryIso3: 'DEU', countryName: 'Germany', electionType: 'parliamentary', year: 2021, electionDate: '2021-09-26', status: 'completed', turnoutPercent: 76.6 },
    { countryIso3: 'KOR', countryName: 'South Korea', electionType: 'presidential', year: 2022, electionDate: '2022-03-09', status: 'completed', turnoutPercent: 77.1 },
    { countryIso3: 'TUR', countryName: 'Turkey', electionType: 'presidential', year: 2023, electionDate: '2023-05-28', status: 'completed', turnoutPercent: 84.2 },
    { countryIso3: 'ARG', countryName: 'Argentina', electionType: 'presidential', year: 2023, electionDate: '2023-11-19', status: 'completed', turnoutPercent: 76.4 },
    { countryIso3: 'NGA', countryName: 'Nigeria', electionType: 'presidential', year: 2023, electionDate: '2023-02-25', status: 'completed', turnoutPercent: 26.7 },
    { countryIso3: 'THA', countryName: 'Thailand', electionType: 'parliamentary', year: 2023, electionDate: '2023-05-14', status: 'completed', turnoutPercent: 75.2 },
    { countryIso3: 'ESP', countryName: 'Spain', electionType: 'parliamentary', year: 2023, electionDate: '2023-07-23', status: 'completed', turnoutPercent: 70.4 },
    { countryIso3: 'POL', countryName: 'Poland', electionType: 'parliamentary', year: 2023, electionDate: '2023-10-15', status: 'completed', turnoutPercent: 74.4 },
    { countryIso3: 'NZL', countryName: 'New Zealand', electionType: 'parliamentary', year: 2023, electionDate: '2023-10-14', status: 'completed', turnoutPercent: 78.2 },
  ];
}

async function main() {
  console.log('\n=== WorldLore: Electoral Calendar Ingestion ===\n');

  const data = getData();
  console.log(`  ${data.length} election entries to ingest`);

  let created = 0;
  let updated = 0;

  for (const entry of data) {
    try {
      const existing = await prisma.electionCalendar.findUnique({
        where: {
          countryIso3_electionType_year: {
            countryIso3: entry.countryIso3,
            electionType: entry.electionType,
            year: entry.year,
          },
        },
      });

      const record = {
        countryIso3: entry.countryIso3,
        countryName: entry.countryName,
        electionType: entry.electionType,
        year: entry.year,
        electionDate: entry.electionDate ? new Date(entry.electionDate) : null,
        status: entry.status,
        turnoutPercent: entry.turnoutPercent ?? null,
        description: entry.description ?? null,
        syncedAt: new Date(),
      };

      if (existing) {
        await prisma.electionCalendar.update({
          where: { id: existing.id },
          data: record,
        });
        updated++;
      } else {
        await prisma.electionCalendar.create({
          data: { id: randomUUID(), ...record },
        });
        created++;
      }
    } catch (err) {
      console.log(`  Error for ${entry.countryIso3} ${entry.electionType} ${entry.year}: ${(err as Error).message.substring(0, 60)}`);
    }
  }

  console.log(`  Created: ${created}, Updated: ${updated}`);

  // Summary
  const upcoming = await prisma.electionCalendar.count({ where: { status: 'scheduled' } });
  const completed = await prisma.electionCalendar.count({ where: { status: 'completed' } });
  console.log(`\n  Scheduled: ${upcoming}, Completed: ${completed}`);

  console.log('\n=== Electoral Calendar Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
