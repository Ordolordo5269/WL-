import { describe, it, expect } from 'vitest';
import { mergeAndNormalize } from '../src/services/normalizer';
import { FeatureCollectionSchema } from '../src/schemas/event';

describe('normalizer', () => {
  it('merges point and range events and validates GeoJSON', () => {
    const pointRows: any[] = [
      {
        event: { type: 'uri', value: 'http://www.wikidata.org/entity/Q12345' },
        eventLabel: { type: 'literal', value: 'Sample protest' },
        coord: { type: 'literal', value: 'Point(-3.7038 40.4168)' },
        when: { type: 'literal', value: '2025-09-01T00:00:00Z' },
        countryLabel: { type: 'literal', value: 'Spain' },
        wpEN: { type: 'uri', value: 'https://en.wikipedia.org/wiki/Sample' }
      }
    ];
    const rangeRows: any[] = [
      {
        event: { type: 'uri', value: 'http://www.wikidata.org/entity/Q12345' },
        eventLabel: { type: 'literal', value: 'Sample protest' },
        coord: { type: 'literal', value: 'Point(-3.7038 40.4168)' },
        start: { type: 'literal', value: '2025-08-30T00:00:00Z' },
        end: { type: 'literal', value: '2025-09-02T00:00:00Z' },
        countryLabel: { type: 'literal', value: 'Spain' }
      }
    ];

    const fc = mergeAndNormalize(pointRows as any, rangeRows as any);
    const parsed = FeatureCollectionSchema.safeParse(fc);
    expect(parsed.success).toBe(true);
    expect(fc.features.length).toBe(1);
    const props = fc.features[0].properties;
    expect(props.id).toBe('Q12345');
    expect(props.country).toBe('Spain');
    expect(props.source).toBe('wikidata');
    expect(props.range).toBeTruthy();
  });
});

