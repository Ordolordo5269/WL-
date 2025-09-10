import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Mock wikidata client to avoid network during tests
vi.mock('../src/services/wikidata', () => ({
  queryRecentPointEvents: vi.fn(async () => [
    {
      event: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1' },
      eventLabel: { type: 'literal', value: 'Test protest' },
      coord: { type: 'literal', value: 'Point(0 0)' },
      when: { type: 'literal', value: '2025-09-05T00:00:00Z' },
      countryLabel: { type: 'literal', value: 'Nowhere' },
      types: { type: 'uri', value: 'http://www.wikidata.org/entity/Q123471' }
    }
  ]),
  queryRecentRangeEvents: vi.fn(async () => [])
}));

describe('GET /api/events/wikidata', () => {
  it('returns valid GeoJSON', async () => {
    const res = await request(app).get('/api/events/wikidata?days=7&types=protest');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/geo\+json/);
    expect(res.body.type).toBe('FeatureCollection');
    expect(Array.isArray(res.body.features)).toBe(true);
  });
});

