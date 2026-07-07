import { addInterval, getMissingOccurrences, MAX_OCCURRENCES } from './recurrence';

describe('addInterval', () => {
  it('adds weeks exactly', () => {
    expect(addInterval('2026-06-01T10:00:00Z', 'weekly', 1).toISOString()).toBe('2026-06-08T10:00:00.000Z');
    expect(addInterval('2026-06-01T10:00:00Z', 'weekly', 3).toISOString()).toBe('2026-06-22T10:00:00.000Z');
  });

  it('clamps month-end without drifting on later occurrences', () => {
    expect(addInterval('2026-01-31T10:00:00Z', 'monthly', 1).toISOString()).toBe('2026-02-28T10:00:00.000Z');
    expect(addInterval('2026-01-31T10:00:00Z', 'monthly', 2).toISOString()).toBe('2026-03-31T10:00:00.000Z');
    expect(addInterval('2026-01-31T10:00:00Z', 'monthly', 3).toISOString()).toBe('2026-04-30T10:00:00.000Z');
  });

  it('handles leap-day yearly anchors', () => {
    expect(addInterval('2024-02-29T10:00:00Z', 'yearly', 1).toISOString()).toBe('2025-02-28T10:00:00.000Z');
    expect(addInterval('2024-02-29T10:00:00Z', 'yearly', 4).toISOString()).toBe('2028-02-29T10:00:00.000Z');
  });

  it('preserves the anchor time of day', () => {
    expect(addInterval('2026-01-15T23:30:45Z', 'monthly', 1).toISOString()).toBe('2026-02-15T23:30:45.000Z');
  });
});

describe('getMissingOccurrences', () => {
  const anchor = { id: 'a1', date: '2026-01-15T09:00:00Z', recurring_type: 'monthly' };
  const now = Date.parse('2026-04-20T00:00:00Z');

  it('returns every due occurrence when none exist', () => {
    expect(getMissingOccurrences(anchor, new Set(), now)).toEqual([
      '2026-02-15T09:00:00.000Z',
      '2026-03-15T09:00:00.000Z',
      '2026-04-15T09:00:00.000Z'
    ]);
  });

  it('skips occurrences that already exist', () => {
    const existing = new Set(['a1|2026-03-15T09:00:00.000Z']);
    expect(getMissingOccurrences(anchor, existing, now)).toEqual([
      '2026-02-15T09:00:00.000Z',
      '2026-04-15T09:00:00.000Z'
    ]);
  });

  it('returns nothing when the next occurrence is in the future', () => {
    const early = Date.parse('2026-02-01T00:00:00Z');
    expect(getMissingOccurrences(anchor, new Set(), early)).toEqual([]);
  });

  it('caps generation for ancient anchors', () => {
    const ancient = { id: 'a2', date: '1990-01-01T00:00:00Z', recurring_type: 'weekly' };
    expect(getMissingOccurrences(ancient, new Set(), now)).toHaveLength(MAX_OCCURRENCES);
  });
});
