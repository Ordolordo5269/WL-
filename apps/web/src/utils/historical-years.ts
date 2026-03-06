// Centralized list of available AD years from the historical-basemaps dataset
// and helper to snap arbitrary years to the nearest available.

export const AVAILABLE_HISTORY_YEARS: number[] = [
  100, 200, 300, 400, 500, 600, 700, 800, 900,
  1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600, 1650,
  1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914, 1920, 1930, 1938,
  1945, 1960, 1994, 2000, 2010
];

export function snapToAvailableYear(year: number, years: number[] = AVAILABLE_HISTORY_YEARS): number {
  if (!Array.isArray(years) || years.length === 0) return year;
  let nearest = years[0];
  let best = Math.abs(year - nearest);
  for (let i = 1; i < years.length; i++) {
    const d = Math.abs(year - years[i]);
    if (d < best) {
      best = d;
      nearest = years[i];
    }
  }
  return nearest;
}


