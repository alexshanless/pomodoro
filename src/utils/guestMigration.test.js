import {
  flattenLocalSessions,
  buildSessionRows,
  buildTransactionRows,
  countGuestData,
  GUEST_KEYS
} from './guestMigration';

afterEach(() => {
  localStorage.clear();
});

describe('flattenLocalSessions', () => {
  it('flattens the grouped-by-date shape and tags each session with its date', () => {
    const grouped = {
      '2026-07-01': {
        completed: 1,
        totalMinutes: 25,
        sessions: [
          { timestamp: '2026-07-01T09:00:00.000Z', duration: 25, mode: 'focus' },
          { timestamp: '2026-07-01T09:30:00.000Z', duration: 5, mode: 'shortBreak' }
        ]
      },
      '2026-07-02': {
        completed: 1,
        totalMinutes: 25,
        sessions: [{ timestamp: '2026-07-02T10:00:00.000Z', duration: 25, mode: 'focus' }]
      }
    };

    const flat = flattenLocalSessions(grouped);
    expect(flat).toHaveLength(3);
    expect(flat[0].sessionDate).toBe('2026-07-01');
    expect(flat[2].sessionDate).toBe('2026-07-02');
  });

  it('skips malformed entries and tolerates empty/missing input', () => {
    const grouped = {
      '2026-07-01': {
        sessions: [
          { timestamp: '2026-07-01T09:00:00.000Z', duration: 25, mode: 'focus' },
          { duration: 25, mode: 'focus' },
          { timestamp: '2026-07-01T10:00:00.000Z', mode: 'focus' },
          { timestamp: '2026-07-01T11:00:00.000Z', duration: 5, mode: 'legacy-break' },
          null
        ]
      },
      '2026-07-02': {}
    };
    expect(flattenLocalSessions(grouped)).toHaveLength(1);
    expect(flattenLocalSessions(null)).toEqual([]);
    expect(flattenLocalSessions(undefined)).toEqual([]);
  });
});

describe('buildSessionRows', () => {
  it('builds Supabase rows with computed end times and remapped project ids', () => {
    const flat = [{
      sessionDate: '2026-07-01',
      timestamp: '2026-07-01T09:00:00.000Z',
      duration: 25,
      mode: 'focus',
      projectId: 'local-123',
      description: 'Deep work',
      tags: ['client']
    }];
    const idMap = { 'local-123': 'uuid-abc' };

    const [entry] = buildSessionRows(flat, 'user-1', idMap);
    expect(entry.row).toEqual({
      user_id: 'user-1',
      project_id: 'uuid-abc',
      mode: 'focus',
      started_at: '2026-07-01T09:00:00.000Z',
      ended_at: '2026-07-01T09:25:00.000Z',
      duration_minutes: 25,
      was_successful: true,
      description: 'Deep work',
      tags: ['client']
    });
    expect(entry.source).toEqual({ date: '2026-07-01', timestamp: '2026-07-01T09:00:00.000Z' });
  });

  it('nulls unmapped project references instead of risking FK violations', () => {
    const flat = [{
      sessionDate: '2026-07-01',
      timestamp: '2026-07-01T09:00:00.000Z',
      duration: 25,
      mode: 'focus',
      projectId: 'local-deleted'
    }];
    const [entry] = buildSessionRows(flat, 'user-1', {});
    expect(entry.row.project_id).toBeNull();
    expect(entry.row.description).toBe('');
    expect(entry.row.tags).toEqual([]);
  });

  it('preserves an explicit wasSuccessful false', () => {
    const flat = [{
      sessionDate: '2026-07-01',
      timestamp: '2026-07-01T09:00:00.000Z',
      duration: 10,
      mode: 'focus',
      wasSuccessful: false
    }];
    expect(buildSessionRows(flat, 'user-1', {})[0].row.was_successful).toBe(false);
  });
});

describe('buildTransactionRows', () => {
  const idMap = { 'local-1': 'uuid-p1' };

  it('converts incomes and spendings with category rules per type', () => {
    const incomes = [{ id: 1, amount: '500', description: 'Retainer', date: '2026-07-01T00:00:00.000Z', projectId: 'local-1' }];
    const spendings = [{ id: 2, amount: 40, description: 'Hosting', date: '2026-07-02T00:00:00.000Z' }];

    const rows = buildTransactionRows(incomes, spendings, 'user-1', idMap);
    expect(rows).toHaveLength(2);

    expect(rows[0].row).toMatchObject({
      type: 'income',
      amount: 500,
      category: null,
      project_id: 'uuid-p1',
      occurred_at: '2026-07-01T00:00:00.000Z',
      is_recurring: false,
      recurring_type: null
    });
    expect(rows[1].row).toMatchObject({
      type: 'spending',
      amount: 40,
      category: 'Other',
      project_id: null
    });
    expect(rows[0].source).toEqual({ type: 'income', id: 1 });
  });

  it('carries recurring anchors but skips locally-materialized children', () => {
    const incomes = [
      { id: 10, amount: 100, description: 'Sub', date: '2026-05-01T00:00:00.000Z', isRecurring: true, recurringType: 'monthly' },
      { id: '10-r-2026-06-01T00:00:00.000Z', amount: 100, description: 'Sub', date: '2026-06-01T00:00:00.000Z', parentId: 10 }
    ];

    const rows = buildTransactionRows(incomes, [], 'user-1', {});
    expect(rows).toHaveLength(1);
    expect(rows[0].row.is_recurring).toBe(true);
    expect(rows[0].row.recurring_type).toBe('monthly');
  });

  it('drops rows missing an amount or date', () => {
    const incomes = [
      { id: 1, description: 'No amount', date: '2026-07-01T00:00:00.000Z' },
      { id: 2, amount: 10, description: 'No date' },
      null
    ];
    expect(buildTransactionRows(incomes, [], 'user-1', {})).toHaveLength(0);
  });
});

describe('countGuestData', () => {
  it('reports no data on a clean device', () => {
    expect(countGuestData()).toEqual({ projects: 0, sessions: 0, transactions: 0, hasData: false });
  });

  it('counts projects, sessions, and non-child transactions', () => {
    localStorage.setItem(GUEST_KEYS.projects, JSON.stringify([{ id: 'local-1', name: 'A' }]));
    localStorage.setItem(GUEST_KEYS.sessions, JSON.stringify({
      '2026-07-01': { sessions: [{ timestamp: '2026-07-01T09:00:00.000Z', duration: 25, mode: 'focus' }] }
    }));
    localStorage.setItem(GUEST_KEYS.incomes, JSON.stringify([
      { id: 1, amount: 100, date: '2026-07-01' },
      { id: '1-r-x', amount: 100, date: '2026-08-01', parentId: 1 }
    ]));
    localStorage.setItem(GUEST_KEYS.spendings, JSON.stringify([{ id: 2, amount: 5, date: '2026-07-01' }]));

    expect(countGuestData()).toEqual({ projects: 1, sessions: 1, transactions: 2, hasData: true });
  });

  it('survives corrupt storage', () => {
    localStorage.setItem(GUEST_KEYS.projects, 'not-json');
    localStorage.setItem(GUEST_KEYS.sessions, '{broken');
    expect(countGuestData().hasData).toBe(false);
  });
});
