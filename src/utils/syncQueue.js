// Persistent queue for writes that failed to reach Supabase (offline or
// server error). Items are plain serializable objects — never functions,
// which JSON.stringify would silently drop (the failure mode of the old
// useOfflineQueue). Providers drain their own item types on reconnect.

const QUEUE_KEY = 'pompaySyncQueue';

const readQueue = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (items) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
};

export const enqueueSync = (type, payload) => {
  const item = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    queuedAt: new Date().toISOString()
  };
  writeQueue([...readQueue(), item]);
  return item;
};

export const getPendingSync = (type) =>
  readQueue().filter((item) => item.type === type);

export const removeSynced = (ids) => {
  const idSet = new Set(ids);
  writeQueue(readQueue().filter((item) => !idSet.has(item.id)));
};

export const isPendingSyncId = (id) => typeof id === 'string' && id.startsWith('sync-');
