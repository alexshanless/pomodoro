import { getProjectRate, getProjectSessionsInRange, calcInvoiceTotals } from './exportUtils';
import { calcProjectBalance } from './financialUtils';

describe('getProjectRate', () => {
  it('reads rate as produced by useProjects', () => {
    expect(getProjectRate({ rate: 85 })).toBe(85);
  });

  it('falls back to legacy hourlyRate', () => {
    expect(getProjectRate({ hourlyRate: 60 })).toBe(60);
  });

  it('prefers rate over hourlyRate and parses strings', () => {
    expect(getProjectRate({ rate: '95.5', hourlyRate: 10 })).toBe(95.5);
  });

  it('returns 0 for missing or invalid rates', () => {
    expect(getProjectRate({})).toBe(0);
    expect(getProjectRate(undefined)).toBe(0);
    expect(getProjectRate({ rate: 'abc' })).toBe(0);
  });
});

describe('getProjectSessionsInRange', () => {
  const sessions = {
    '2026-07-01': {
      sessions: [
        { projectId: 'p1', timestamp: '2026-07-01T09:00:00Z', duration: 25, mode: 'focus', description: 'API work', tags: ['dev'] },
        { projectId: 'p2', timestamp: '2026-07-01T10:00:00Z', duration: 25, mode: 'focus' }
      ]
    },
    '2026-07-03': {
      sessions: [
        { projectId: 'p1', timestamp: '2026-07-03T14:00:00Z', duration: 50, mode: 'focus' }
      ]
    },
    '2026-06-15': {
      sessions: [
        { projectId: 'p1', timestamp: '2026-06-15T08:00:00Z', duration: 25, mode: 'focus' }
      ]
    }
  };

  it('collects only the given project, oldest first', () => {
    const result = getProjectSessionsInRange(sessions, 'p1');
    expect(result).toHaveLength(3);
    expect(result.map(s => s.duration)).toEqual([25, 25, 50]);
    expect(result[1].description).toBe('API work');
  });

  it('applies the date range inclusively of interior days', () => {
    const result = getProjectSessionsInRange(sessions, 'p1', {
      startDate: new Date('2026-07-01T00:00:00Z'),
      endDate: new Date('2026-07-31T23:59:59Z')
    });
    expect(result).toHaveLength(2);
    expect(result.reduce((sum, s) => sum + s.duration, 0)).toBe(75);
  });

  it('returns empty for a project with no sessions', () => {
    expect(getProjectSessionsInRange(sessions, 'nope')).toEqual([]);
  });

  it('tolerates day buckets without a sessions array', () => {
    expect(getProjectSessionsInRange({ '2026-07-01': {} }, 'p1')).toEqual([]);
  });
});

describe('calcInvoiceTotals', () => {
  it('computes billable totals from durations and the project rate', () => {
    const totals = calcInvoiceTotals(
      { rate: 80 },
      [{ duration: 25 }, { duration: 50 }, { duration: 45 }]
    );
    expect(totals.totalMinutes).toBe(120);
    expect(totals.totalHours).toBe(2);
    expect(totals.hourlyRate).toBe(80);
    expect(totals.totalAmount).toBe(160);
  });

  it('bills zero when the project has no rate', () => {
    const totals = calcInvoiceTotals({}, [{ duration: 60 }]);
    expect(totals.totalAmount).toBe(0);
  });

  it('handles an empty session list', () => {
    const totals = calcInvoiceTotals({ rate: 100 }, []);
    expect(totals.totalMinutes).toBe(0);
    expect(totals.totalAmount).toBe(0);
  });
});

describe('calcProjectBalance', () => {
  it('sums income minus spending for the project only', () => {
    const incomes = [
      { project_id: 'p1', amount: '500' },
      { project_id: 'p2', amount: 999 }
    ];
    const spendings = [
      { project_id: 'p1', amount: 120.5 },
      { project_id: 'p1', amount: '29.5' }
    ];
    expect(calcProjectBalance('p1', incomes, spendings)).toBe(350);
  });

  it('treats missing amounts as zero', () => {
    expect(calcProjectBalance('p1', [{ project_id: 'p1' }], [])).toBe(0);
  });
});
