import { useEffect, useMemo, useState } from 'react';
import { gdeltService, Timespan } from '../services/gdelt-service';

export interface GdeltHeadline {
  title: string;
  url: string;
  source?: string;
  date?: string;
}

export interface GdeltTheme { name: string; count: number }
export interface GdeltPlace { name: string; count: number }
export interface GdeltSource { name: string; count: number }
export interface GdeltLanguage { code: string; count: number }

export interface GdeltKpis {
  volume24h: number | null;
  changeVs7d: number | null; // fraction, e.g. 0.12
  toneAvg: number | null;
}

export interface GdeltInsightsData {
  kpis: GdeltKpis;
  headlines: GdeltHeadline[];
  timeline: Array<{ date: string; value: number }>;
  timelineNorm: Array<{ date: string; value: number }>;
  themes: GdeltTheme[];
  places: GdeltPlace[];
  persons: Array<{ name: string; count: number }>;
  organizations: Array<{ name: string; count: number }>;
  sources: GdeltSource[];
  languages: GdeltLanguage[];
  spikes: Array<{ date: string; value: number }>;
}

function computeChangeVs7d(timeline: Array<{ date: string; value: number }>): number | null {
  if (!timeline || timeline.length === 0) return null;
  const last = timeline[timeline.length - 1]?.value ?? null;
  if (last === null || last === undefined) return null;
  const values = timeline.map(p => p.value).filter(v => Number.isFinite(v)) as number[];
  if (values.length < 2) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return null;
  return (last / avg) - 1;
}

function extractHeadlines(docJson: any): GdeltHeadline[] {
  const arts = docJson?.articles ?? [];
  return (Array.isArray(arts) ? arts : []).slice(0, 5).map((a: any) => ({
    title: a.title ?? a.seendescription ?? 'Untitled',
    url: a.url ?? a.seenurl ?? '#',
    source: a.sourceCommonName ?? a.source ?? undefined,
    date: a.date ?? a.seendate ?? undefined
  }));
}

function extractTimeline(timelineJson: any): Array<{ date: string; value: number }> {
  const series = timelineJson?.timeline?.[0]?.data ?? timelineJson?.timeline ?? [];
  if (!Array.isArray(series)) return [];
  return series.map((p: any) => ({ date: String(p.date), value: Number(p.value) || 0 }));
}

function extractThemes(gkgJson: any): GdeltTheme[] {
  const rows = Array.isArray(gkgJson?.gkg) ? gkgJson.gkg : [];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const themesStr: string = r?.themes ?? '';
    if (!themesStr) continue;
    const parts = themesStr.split(';').map((s: string) => s.trim()).filter(Boolean);
    for (const t of parts) counts.set(t, (counts.get(t) || 0) + 1);
  }
  const themes = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  themes.sort((a, b) => b.count - a.count);
  return themes.slice(0, 8);
}

function extractToneAvg(gkgJson: any): number | null {
  const rows = Array.isArray(gkgJson?.gkg) ? gkgJson.gkg : [];
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    const tone = Number(r?.tone);
    if (Number.isFinite(tone)) { sum += tone; n++; }
  }
  if (n === 0) return null;
  return sum / n;
}

function extractPlaces(geoJson: any): GdeltPlace[] {
  const feats = Array.isArray(geoJson?.features) ? geoJson.features : [];
  const counts = new Map<string, number>();
  for (const f of feats) {
    const name = f?.properties?.name || f?.properties?.adm1name || f?.properties?.adm0name;
    if (!name) continue;
    const key = String(name).trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const places = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  places.sort((a, b) => b.count - a.count);
  return places.slice(0, 5);
}

function splitCounts(listStr: string | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  if (!listStr) return counts;
  const parts = String(listStr)
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  for (const p of parts) counts.set(p, (counts.get(p) || 0) + 1);
  return counts;
}

function extractPersons(gkgJson: any): Array<{ name: string; count: number }> {
  const rows = Array.isArray(gkgJson?.gkg) ? gkgJson.gkg : [];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const map = splitCounts(r?.persons);
    for (const [k, v] of map) counts.set(k, (counts.get(k) || 0) + v);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count).slice(0, 15);
}

function extractOrganizations(gkgJson: any): Array<{ name: string; count: number }> {
  const rows = Array.isArray(gkgJson?.gkg) ? gkgJson.gkg : [];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const map = splitCounts(r?.organizations);
    for (const [k, v] of map) counts.set(k, (counts.get(k) || 0) + v);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count).slice(0, 15);
}

function extractSourcesFromDocs(docJson: any): GdeltSource[] {
  const arts = Array.isArray(docJson?.articles) ? docJson.articles : [];
  const counts = new Map<string, number>();
  for (const a of arts) {
    const src = a.sourceCommonName || a.source || a.domain || 'Unknown';
    const key = String(src).trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count).slice(0, 15);
}

function extractLanguagesFromDocs(docJson: any): GdeltLanguage[] {
  const arts = Array.isArray(docJson?.articles) ? docJson.articles : [];
  const counts = new Map<string, number>();
  for (const a of arts) {
    const code = a.language || a.lang || 'unk';
    const key = String(code).trim().toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([code, count]) => ({ code, count })).sort((a,b)=>b.count-a.count).slice(0, 10);
}

export function useGdeltInsights(query: string, timespan: Timespan = '7d') {
  const [data, setData] = useState<GdeltInsightsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!query || query.trim().length === 0) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [doc, timeline, timelineNorm, gkg, geo] = await Promise.all([
          gdeltService.fetchDocs(query, timespan, 50),
          gdeltService.fetchTimeline(query, timespan, 'timelinevol'),
          gdeltService.fetchTimeline(query, timespan, 'timelinevolnorm'),
          gdeltService.fetchGkg(query, timespan),
          gdeltService.fetchGeo(query, timespan)
        ]);

        const headlines = extractHeadlines(doc);
        const tl = extractTimeline(timeline);
        const tlNorm = extractTimeline(timelineNorm);
        const themes = extractThemes(gkg);
        const toneAvg = extractToneAvg(gkg);
        const places = extractPlaces(geo);
        const persons = extractPersons(gkg);
        const organizations = extractOrganizations(gkg);
        const sources = extractSourcesFromDocs(doc);
        const languages = extractLanguagesFromDocs(doc);
        const changeVs7d = computeChangeVs7d(tl);
        const volume24h = tl.length > 0 ? tl[tl.length - 1].value : (Array.isArray(doc?.articles) ? Number(doc.articles.length) : null);

        // spike detection: z-score > 2
        const values = tl.map(p => p.value);
        const mean = values.reduce((a,b)=>a+b,0) / (values.length || 1);
        const sd = Math.sqrt(values.reduce((a,b)=>a + Math.pow(b-mean,2),0) / (values.length || 1)) || 0;
        const spikes = tl.filter(p => sd > 0 && (p.value - mean) / sd >= 2);

        const result: GdeltInsightsData = {
          kpis: { volume24h, changeVs7d, toneAvg },
          headlines,
          timeline: tl,
          timelineNorm: tlNorm,
          themes,
          places,
          persons,
          organizations,
          sources,
          languages,
          spikes
        };
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load GDELT Insights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query, timespan]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}


