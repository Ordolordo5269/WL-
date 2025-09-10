import { Router } from 'express';
import { QueryParamsSchema, FeatureCollectionSchema, isWithinBbox, EventType } from '../schemas/event';
import { cache } from '../store/cache';
import { mergeAndNormalize } from '../services/normalizer';
import { queryRecentPointEvents, queryRecentRangeEvents } from '../services/wikidata';

const router = Router();

router.get('/wikidata', async (req, res) => {
  try {
    const parsed = QueryParamsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters', issues: parsed.error.issues });
    }
    const { days, types, bbox } = parsed.data;

    const key = JSON.stringify({ days, types: types?.sort(), bbox });
    const namespace = 'wikidata-events';

    const cached = cache.get(namespace, key);
    if (cached) {
      res.setHeader('Content-Type', 'application/geo+json');
      return res.status(200).json(cached);
    }

    const [points, ranges] = await Promise.all([
      queryRecentPointEvents(days),
      queryRecentRangeEvents(days)
    ]);

    let collection = mergeAndNormalize(points, ranges);

    // Server-side filters
    if (types && (types as EventType[]).length > 0) {
      const allow = new Set<EventType>(types as EventType[]);
      collection = {
        ...collection,
        features: collection.features.filter((f: any) => allow.has(f.properties.type))
      };
    }
    if (bbox) {
      collection = {
        ...collection,
        features: collection.features.filter((f: any) => isWithinBbox(f.geometry.coordinates as [number, number], bbox))
      };
    }

    // Validate
    const validated = FeatureCollectionSchema.parse(collection);

    const ttl = Number(process.env.CACHE_TTL_SECONDS || '600');
    cache.set(namespace, key, validated, ttl);

    res.setHeader('Content-Type', 'application/geo+json');
    return res.status(200).json(validated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch wikidata events', message: err?.message });
  }
});

export default router;

