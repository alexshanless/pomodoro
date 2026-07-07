import { enqueueSync, getPendingSync, removeSynced, isPendingSyncId } from './syncQueue';

describe('syncQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists enqueued items and filters by type', () => {
    const a = enqueueSync('session.save', { row: { duration_minutes: 25 } });
    enqueueSync('other.op', { x: 1 });

    const pending = getPendingSync('session.save');
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(a.id);
    expect(pending[0].payload.row.duration_minutes).toBe(25);
    expect(getPendingSync('other.op')).toHaveLength(1);
  });

  it('survives a reload (reads back from localStorage)', () => {
    enqueueSync('session.save', { row: { duration_minutes: 50 } });
    const raw = JSON.parse(localStorage.getItem('pompaySyncQueue'));
    expect(raw).toHaveLength(1);
    expect(raw[0].payload.row.duration_minutes).toBe(50);
  });

  it('removes only the given ids', () => {
    const a = enqueueSync('session.save', {});
    const b = enqueueSync('session.save', {});
    removeSynced([a.id]);
    const pending = getPendingSync('session.save');
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(b.id);
  });

  it('recovers from corrupted storage', () => {
    localStorage.setItem('pompaySyncQueue', '{not json');
    expect(getPendingSync('session.save')).toEqual([]);
    const item = enqueueSync('session.save', {});
    expect(getPendingSync('session.save')).toHaveLength(1);
    expect(isPendingSyncId(item.id)).toBe(true);
  });

  it('identifies pending sync ids', () => {
    expect(isPendingSyncId('sync-123-abc')).toBe(true);
    expect(isPendingSyncId('b7f3c2d1-uuid')).toBe(false);
    expect(isPendingSyncId(undefined)).toBe(false);
  });
});
