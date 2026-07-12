import { supabase } from '../lib/supabaseClient';

// localStorage keys holding guest data (see useProjectsState / usePomodoroSessionsState /
// useFinancialTransactionsState / useGoalsStreaksState for the shapes they write).
export const GUEST_KEYS = {
  projects: 'localProjects',
  sessions: 'pomodoroSessions',
  incomes: 'incomes',
  spendings: 'spendings',
  goals: 'userGoals'
};

// Progress marker so an interrupted migration resumes without duplicating projects.
const PROJECT_MAP_KEY = 'guestImportProjectMap';

const readJSON = (key, fallback) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

// Only ids created on this device map to server ids; anything else (deleted or
// unknown project references) becomes null rather than risking an FK violation.
const mapProjectId = (projectId, idMap) =>
  projectId != null && idMap[projectId] ? idMap[projectId] : null;

// --- Pure builders (exported for tests) ---

// The only modes the app writes (and the DB mode check accepts); anything else
// would fail the whole insert batch.
const VALID_MODES = new Set(['focus', 'shortBreak', 'longBreak']);

export const flattenLocalSessions = (grouped) => {
  const flat = [];
  Object.keys(grouped || {}).forEach(date => {
    (grouped[date]?.sessions || []).forEach(session => {
      if (!session || !session.timestamp || !session.duration || !VALID_MODES.has(session.mode)) return;
      flat.push({ ...session, sessionDate: date });
    });
  });
  return flat;
};

export const buildSessionRows = (flatSessions, userId, idMap) =>
  flatSessions.map(s => {
    const startedAt = new Date(s.timestamp);
    return {
      source: { date: s.sessionDate, timestamp: s.timestamp },
      row: {
        user_id: userId,
        project_id: mapProjectId(s.projectId, idMap),
        mode: s.mode,
        started_at: startedAt.toISOString(),
        ended_at: new Date(startedAt.getTime() + s.duration * 60 * 1000).toISOString(),
        duration_minutes: s.duration,
        was_successful: s.wasSuccessful !== false,
        description: s.description || '',
        tags: s.tags || []
      }
    };
  });

// Locally-materialized recurring occurrences (parentId set) are skipped: their
// anchors migrate with is_recurring intact and server-side materialization
// regenerates the occurrences with proper parent uuids.
export const buildTransactionRows = (incomes, spendings, userId, idMap) => {
  const convert = (items, type) =>
    (items || [])
      .filter(item => item && !item.parentId && item.amount != null && item.date)
      .map(item => ({
        source: { type, id: item.id },
        row: {
          user_id: userId,
          type,
          amount: parseFloat(item.amount),
          currency: 'USD',
          description: item.description || '',
          category: type === 'spending' ? (item.category || 'Other') : null,
          occurred_at: item.date,
          project_id: mapProjectId(item.projectId, idMap),
          is_recurring: !!item.isRecurring,
          recurring_type: item.isRecurring ? (item.recurringType || 'monthly') : null
        }
      }));

  return [...convert(incomes, 'income'), ...convert(spendings, 'spending')];
};

// --- Detection ---

export const countGuestData = () => {
  const projects = readJSON(GUEST_KEYS.projects, []);
  const sessions = flattenLocalSessions(readJSON(GUEST_KEYS.sessions, {}));
  const incomes = readJSON(GUEST_KEYS.incomes, []);
  const spendings = readJSON(GUEST_KEYS.spendings, []);
  const transactions =
    incomes.filter(i => i && !i.parentId).length +
    spendings.filter(s => s && !s.parentId).length;

  const counts = {
    projects: Array.isArray(projects) ? projects.length : 0,
    sessions: sessions.length,
    transactions
  };
  return { ...counts, hasData: counts.projects + counts.sessions + counts.transactions > 0 };
};

// --- Migration ---

const CHUNK_SIZE = 200;

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const migrateProjects = async (userId, idMap) => {
  const localProjects = readJSON(GUEST_KEYS.projects, []);
  let migrated = 0;

  for (const p of localProjects) {
    if (idMap[p.id]) continue;
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: userId,
        name: p.name,
        description: p.description || '',
        color: p.color || '#e94560',
        total_time_minutes: p.timeTracked || 0,
        balance: p.balance || 0,
        hourly_rate: parseFloat(p.rate) || 0,
        pomodoros_count: p.pomodoros || 0,
        is_archived: false
      }])
      .select()
      .single();
    if (error) throw error;
    idMap[p.id] = data.id;
    // Persist progress after every insert so a rerun never duplicates projects.
    localStorage.setItem(PROJECT_MAP_KEY, JSON.stringify(idMap));
    migrated += 1;
  }
  return migrated;
};

const migrateSessions = async (userId, idMap) => {
  const entries = buildSessionRows(flattenLocalSessions(readJSON(GUEST_KEYS.sessions, {})), userId, idMap);
  let migrated = 0;

  for (const batch of chunk(entries, CHUNK_SIZE)) {
    const { error } = await supabase
      .from('pomodoro_sessions')
      .insert(batch.map(e => e.row));
    if (error) throw error;
    migrated += batch.length;

    // Drop the migrated sessions from storage so a failed later chunk can
    // rerun without re-inserting these.
    const stored = readJSON(GUEST_KEYS.sessions, {});
    batch.forEach(({ source }) => {
      const day = stored[source.date];
      if (!day) return;
      day.sessions = (day.sessions || []).filter(s => s.timestamp !== source.timestamp);
      if (day.sessions.length === 0) delete stored[source.date];
    });
    localStorage.setItem(GUEST_KEYS.sessions, JSON.stringify(stored));
  }

  localStorage.removeItem(GUEST_KEYS.sessions);
  return migrated;
};

const migrateTransactions = async (userId, idMap) => {
  const entries = buildTransactionRows(
    readJSON(GUEST_KEYS.incomes, []),
    readJSON(GUEST_KEYS.spendings, []),
    userId,
    idMap
  );
  let migrated = 0;

  for (const batch of chunk(entries, CHUNK_SIZE)) {
    const { error } = await supabase
      .from('financial_transactions')
      .insert(batch.map(e => e.row));
    if (error) throw error;
    migrated += batch.length;

    ['incomes', 'spendings'].forEach(key => {
      const type = key === 'incomes' ? 'income' : 'spending';
      const migratedIds = new Set(
        batch.filter(e => e.source.type === type).map(e => e.source.id)
      );
      if (migratedIds.size === 0) return;
      const kept = readJSON(GUEST_KEYS[key], []).filter(item => !migratedIds.has(item.id));
      localStorage.setItem(GUEST_KEYS[key], JSON.stringify(kept));
    });
  }

  localStorage.removeItem(GUEST_KEYS.incomes);
  localStorage.removeItem(GUEST_KEYS.spendings);
  return migrated;
};

const migrateGoals = async (userId) => {
  const goals = readJSON(GUEST_KEYS.goals, null);
  if (!goals) return false;

  const { error } = await supabase
    .from('user_goals')
    .upsert([{
      user_id: userId,
      daily_pomodoro_goal: goals.dailyPomodoroGoal || 8,
      weekly_pomodoro_goal: goals.weeklyPomodoroGoal || 40,
      updated_at: new Date().toISOString()
    }], { onConflict: 'user_id' });
  if (error) throw error;

  localStorage.removeItem(GUEST_KEYS.goals);
  return true;
};

// Imports all guest data into the signed-in account. Each dataset's local key
// is cleared only after its rows land, so a mid-way failure leaves the rest
// intact and a rerun picks up where it stopped.
export const migrateGuestData = async (userId) => {
  const idMap = readJSON(PROJECT_MAP_KEY, {});

  const projects = await migrateProjects(userId, idMap);
  const sessions = await migrateSessions(userId, idMap);
  const transactions = await migrateTransactions(userId, idMap);
  const goals = await migrateGoals(userId);

  localStorage.removeItem(GUEST_KEYS.projects);
  localStorage.removeItem(PROJECT_MAP_KEY);

  return { projects, sessions, transactions, goals };
};
