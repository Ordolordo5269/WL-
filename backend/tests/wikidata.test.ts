import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildPointEventsQuery, buildRangeEventsQuery, queryRecentPointEvents } from '../src/services/wikidata';

describe('wikidata client', () => {
  it('builds queries with custom days', () => {
    const q1 = buildPointEventsQuery(5);
    expect(q1).toContain('P5D');
    const q2 = buildRangeEventsQuery(12);
    expect(q2).toContain('P12D');
  });
});

