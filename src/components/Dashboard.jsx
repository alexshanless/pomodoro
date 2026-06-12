import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoTrendingUp, IoTimerOutline, IoTimeOutline, IoWalletOutline, IoChevronUp, IoChevronDown,
  IoBriefcaseOutline, IoAdd, IoTrophyOutline, IoFlameOutline, IoCreateOutline,
  IoDownloadOutline, IoPlay, IoPricetagOutline,
} from 'react-icons/io5';
import { useFinancialTransactions } from '../hooks/useFinancialTransactions';
import { useProjects } from '../hooks/useProjects';
import { usePomodoroSessions } from '../hooks/usePomodoroSessions';
import { useGoalsStreaks } from '../hooks/useGoalsStreaks';
import { useFocusTrap } from '../utils/accessibility';
import { exportSessionsToCSV } from '../utils/exportUtils';
import { formatMinutes, formatCurrency, formatDate as formatShortDate } from '../utils/format';
import { parseLocalDate, formatRelativeDate, getDateRangeForFilter, isDateInRange } from '../utils/dateUtils';
import { calcProjectBalance } from '../utils/financialUtils';
import '../styles/DashboardRedesign.css';

const TIME_FILTERS = [
  { value: 'today', label: 'Today', mobileLabel: 'Today' },
  { value: '7d', label: '7d', mobileLabel: 'Last 7 days' },
  { value: '30d', label: '30d', mobileLabel: 'Last 30 days' },
  { value: '90d', label: '90d', mobileLabel: 'Last 90 days' },
  { value: '1y', label: '1y', mobileLabel: 'Last year' },
];

// Days in each range window — drives the previous-period delta comparison.
const RANGE_DAYS = { today: 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

// Period wording for the summary sub-rows.
const PERIOD_WORDS = {
  today: { earned: 'today', vs: 'vs yesterday' },
  '7d': { earned: 'this week', vs: 'vs prev week' },
  '30d': { earned: 'this month', vs: 'vs prev month' },
  '90d': { earned: 'this quarter', vs: 'vs prev quarter' },
  '1y': { earned: 'this year', vs: 'vs prev year' },
};

// Spectrum palette cycled for tag rows (deep-work violet, writing cyan, etc.).
const TAG_COLORS = ['var(--pd-c2)', 'var(--pd-c1)', 'var(--pd-c3)', 'var(--pd-muted)'];

const MAX_RECENT = 5;
const MAX_TAGS = 6;

const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Build a normalized polyline (78x30 viewBox) from a numeric series.
const sparkPolyline = (values) => {
  if (!values || values.length === 0) return '0,15 78,15';
  const pts = values.length === 1 ? [values[0], values[0]] : values;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const span = max - min || 1;
  const stepX = 78 / (pts.length - 1);
  return pts
    .map((v, i) => {
      const x = +(i * stepX).toFixed(1);
      const y = +(26 - ((v - min) / span) * 22).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');
};

// Reduce a long daily series to at most `buckets` averaged points for a sparkline.
const bucketSeries = (values, buckets = 12) => {
  if (values.length <= buckets) return values;
  const size = Math.ceil(values.length / buckets);
  const out = [];
  for (let i = 0; i < values.length; i += size) {
    const slice = values.slice(i, i + size);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
};

function Dashboard() {
  const navigate = useNavigate();
  const { incomes, spendings } = useFinancialTransactions();
  const { projects: projectsData } = useProjects();
  const { sessions: pomodoroData } = usePomodoroSessions();
  const { goals, streaks, streakCalculated, updateStreak, getDailyProgress, getWeeklyProgress } = useGoalsStreaks();
  const [range, setRange] = useState('7d');
  const [showExportModal, setShowExportModal] = useState(false);

  const { trapRef } = useFocusTrap(showExportModal);

  useEffect(() => {
    if (Object.keys(pomodoroData).length > 0) {
      updateStreak(pomodoroData);
    }
  }, [pomodoroData, updateStreak]);

  // Sum pomodoros, focus minutes and money within an arbitrary [start, end] window.
  const aggregate = useCallback((startDate, endDate) => {
    let pomodoros = 0;
    let minutes = 0;
    Object.keys(pomodoroData)
      .filter((date) => isDateInRange(date, startDate, endDate))
      .forEach((date) => {
        const day = pomodoroData[date];
        pomodoros += day.completed || 0;
        minutes += day.totalMinutes || 0;
      });
    const income = incomes
      .filter((t) => isDateInRange(t.date, startDate, endDate))
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const spending = spendings
      .filter((t) => isDateInRange(t.date, startDate, endDate))
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    return { pomodoros, minutes, income, spending, balance: income - spending };
  }, [pomodoroData, incomes, spendings]);

  const summary = useMemo(() => {
    const { startDate, endDate } = getDateRangeForFilter(range);
    const current = aggregate(startDate, endDate);

    const prevEnd = new Date(startDate);
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - RANGE_DAYS[range]);
    const previous = aggregate(prevStart, prevEnd);

    const pctDelta = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

    // Per-day series across the window for the sparklines.
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(0, 0, 0, 0);
    const pomoSeries = [];
    const minSeries = [];
    const balSeries = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = getLocalDateString(d);
      const day = pomodoroData[key];
      pomoSeries.push(day?.completed || 0);
      minSeries.push(day?.totalMinutes || 0);
      const dayInc = incomes.filter((t) => t.date && t.date.split('T')[0] === key)
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const daySpend = spendings.filter((t) => t.date && t.date.split('T')[0] === key)
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      balSeries.push(dayInc - daySpend);
    }

    return {
      current,
      deltaPomodoros: pctDelta(current.pomodoros, previous.pomodoros),
      deltaMinutes: pctDelta(current.minutes, previous.minutes),
      sparks: {
        pomo: sparkPolyline(bucketSeries(pomoSeries)),
        min: sparkPolyline(bucketSeries(minSeries)),
        bal: sparkPolyline(bucketSeries(balSeries)),
      },
    };
  }, [range, aggregate, pomodoroData, incomes, spendings]);

  const projects = useMemo(() => {
    const withBalance = projectsData.map((project) => ({
      ...project,
      computedBalance: calcProjectBalance(project.id, incomes, spendings),
    }));
    const maxTime = Math.max(1, ...withBalance.map((p) => p.timeTracked || 0));
    return withBalance.map((p) => ({ ...p, timePct: Math.round(((p.timeTracked || 0) / maxTime) * 100) }));
  }, [projectsData, incomes, spendings]);

  const recentSessions = useMemo(() => {
    const items = [];
    Object.values(pomodoroData).forEach((day) => {
      (day.sessions || []).forEach((session) => {
        if (session.mode === 'focus') items.push(session);
      });
    });
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return items.slice(0, MAX_RECENT).map((session) => {
      const project = projectsData.find((p) => p.id === session.projectId);
      return {
        id: session.id ?? session.timestamp,
        task: session.description?.trim() || 'Focus session',
        projectName: project?.name || null,
        projectColor: project?.color || 'var(--pd-muted)',
        timestamp: session.timestamp,
        duration: session.duration,
      };
    });
  }, [pomodoroData, projectsData]);

  const recentTransactions = useMemo(() => {
    return [
      ...incomes.map((t) => ({ ...t, type: 'income' })),
      ...spendings.map((t) => ({ ...t, type: 'spending' })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, MAX_RECENT);
  }, [incomes, spendings]);

  const tagStats = useMemo(() => {
    const minutesByTag = {};
    const countByTag = {};
    Object.values(pomodoroData).forEach((day) => {
      (day.sessions || []).forEach((session) => {
        if (session.mode !== 'focus' || !Array.isArray(session.tags)) return;
        session.tags.forEach((tag) => {
          const key = tag.toLowerCase().trim();
          if (!key) return;
          minutesByTag[key] = (minutesByTag[key] || 0) + (session.duration || 0);
          countByTag[key] = (countByTag[key] || 0) + 1;
        });
      });
    });
    const rows = Object.keys(minutesByTag)
      .map((tag) => ({ tag, minutes: minutesByTag[tag], count: countByTag[tag] }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, MAX_TAGS);
    const maxMinutes = Math.max(1, ...rows.map((r) => r.minutes));
    return rows.map((r, i) => ({
      ...r,
      color: TAG_COLORS[i % TAG_COLORS.length],
      pct: Math.max(4, Math.round((r.minutes / maxMinutes) * 100)),
    }));
  }, [pomodoroData]);

  const dailyProgress = useMemo(() => getDailyProgress(pomodoroData), [getDailyProgress, pomodoroData]);
  const weeklyProgress = useMemo(() => getWeeklyProgress(pomodoroData), [getWeeklyProgress, pomodoroData]);

  const handleEditGoals = useCallback(() => {
    localStorage.setItem('settingsActiveTab', 'goals');
    navigate('/settings');
  }, [navigate]);

  const handleExportSessions = useCallback(() => {
    const { startDate, endDate } = getDateRangeForFilter(range);
    exportSessionsToCSV(pomodoroData, { startDate, endDate, projects: projectsData });
    setShowExportModal(false);
  }, [range, pomodoroData, projectsData]);

  const periodWords = PERIOD_WORDS[range];
  const focusHours = Math.floor(summary.current.minutes / 60);
  const focusMins = summary.current.minutes % 60;
  const balanceParts = formatCurrency(summary.current.balance).split('.');

  const formatSessionDateTime = (timestamp) => {
    const time = new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${formatRelativeDate(timestamp)}, ${time}`;
  };

  const initials = (transaction) => {
    const project = projectsData.find((p) => p.id === transaction.project_id);
    const source = (project?.name || transaction.description || '').trim();
    if (!source) return '–';
    return source.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  };

  return (
    <div className='pompay-dash'>
      <div className='pd-wrap'>

        {/* Summary */}
        <section className='pd-panel'>
          <div className='pd-phead'>
            <span className='pd-ic'><IoTrendingUp aria-hidden='true' /></span>
            <h2>Summary</h2>
            <div className='pd-spacer' />
            <div className='pd-tabs' role='group' aria-label='Time range'>
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`pd-tab ${range === f.value ? 'on' : ''}`}
                  onClick={() => setRange(f.value)}
                  aria-pressed={range === f.value}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              className='pd-range-select'
              value={range}
              onChange={(e) => setRange(e.target.value)}
              aria-label='Time range'
            >
              {TIME_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.mobileLabel}</option>
              ))}
            </select>
          </div>

          <div className='pd-stats'>
            <div className='pd-stat'>
              <div className='pd-top'>
                <span className='pd-badge pd-b-pomo'><IoTimerOutline aria-hidden='true' /></span>
                <span className='pd-lab'>Pomodoros</span>
              </div>
              <div className='pd-num'>{summary.current.pomodoros.toLocaleString('en-US')}</div>
              <div className='pd-sub'>
                {summary.deltaPomodoros !== null && (
                  <span className={`pd-delta ${summary.deltaPomodoros < 0 ? 'neg' : ''}`}>
                    {summary.deltaPomodoros < 0 ? <IoChevronDown aria-hidden='true' /> : <IoChevronUp aria-hidden='true' />}
                    {Math.abs(summary.deltaPomodoros)}%
                  </span>
                )}
                {periodWords.vs}
              </div>
              <svg className='pd-spark' viewBox='0 0 78 30' fill='none' preserveAspectRatio='none' aria-hidden='true'>
                <polyline points={summary.sparks.pomo} stroke='var(--pd-c3)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>

            <div className='pd-stat'>
              <div className='pd-top'>
                <span className='pd-badge pd-b-min'><IoTimeOutline aria-hidden='true' /></span>
                <span className='pd-lab'>Focus time</span>
              </div>
              <div className='pd-num'>
                {focusHours > 0 ? (
                  <>{focusHours}<span className='pd-unit'>h</span> {String(focusMins).padStart(2, '0')}<span className='pd-unit'>m</span></>
                ) : (
                  <>{focusMins}<span className='pd-unit'>m</span></>
                )}
              </div>
              <div className='pd-sub'>
                {summary.deltaMinutes !== null && (
                  <span className={`pd-delta ${summary.deltaMinutes < 0 ? 'neg' : ''}`}>
                    {summary.deltaMinutes < 0 ? <IoChevronDown aria-hidden='true' /> : <IoChevronUp aria-hidden='true' />}
                    {Math.abs(summary.deltaMinutes)}%
                  </span>
                )}
                {summary.current.minutes.toLocaleString('en-US')} minutes
              </div>
              <svg className='pd-spark' viewBox='0 0 78 30' fill='none' preserveAspectRatio='none' aria-hidden='true'>
                <polyline points={summary.sparks.min} stroke='var(--pd-c1)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>

            <div className='pd-stat'>
              <div className='pd-top'>
                <span className='pd-badge pd-b-bal'><IoWalletOutline aria-hidden='true' /></span>
                <span className='pd-lab'>Balance</span>
              </div>
              <div className='pd-num'>{balanceParts[0]}<span className='pd-unit'>.{balanceParts[1]}</span></div>
              <div className='pd-sub'>
                <span className='pd-delta'>{formatCurrency(summary.current.income)}</span>
                earned {periodWords.earned}
              </div>
              <svg className='pd-spark' viewBox='0 0 78 30' fill='none' preserveAspectRatio='none' aria-hidden='true'>
                <polyline points={summary.sparks.bal} stroke='var(--pd-pos)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section className='pd-panel'>
          <div className='pd-phead'>
            <span className='pd-ic'><IoBriefcaseOutline aria-hidden='true' /></span>
            <h2>Projects</h2>
            <div className='pd-spacer' />
            <button className='pd-btn pd-btn-ghost' onClick={() => navigate('/projects')}>
              <IoAdd aria-hidden='true' /> New project
            </button>
          </div>

          {projects.length > 0 ? (
            <div className='pd-table-scroll'>
              <table className='pd-ptable'>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Project</th>
                    <th>Created</th>
                    <th>Time tracked</th>
                    <th className='r'>Balance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const balance = project.computedBalance;
                    const moneyClass = balance > 0 ? 'pos' : balance < 0 ? 'neg' : 'zero';
                    const idLabel = String(project.projectNumber ?? '').padStart(2, '0');
                    return (
                      <tr key={project.id}>
                        <td className='pd-cell-id' data-label='ID'><span className='pd-pid'>{idLabel}</span></td>
                        <td className='pd-cell-name'>
                          <span className='pd-pname'>
                            <span className='pd-pdot' style={{ background: project.color }} />
                            {project.name}
                          </span>
                        </td>
                        <td data-label='Created'><span className='pd-pdate'>{formatShortDate(parseLocalDate(project.createdDate || project.createdAt))}</span></td>
                        <td data-label='Time tracked'>
                          <span className='pd-ttime'>
                            <span className='pd-bar'><i style={{ width: `${project.timePct}%` }} /></span>
                            {formatMinutes(project.timeTracked || 0)}
                          </span>
                        </td>
                        <td className='r' data-label='Balance'><span className={`pd-money ${moneyClass}`}>{formatCurrency(balance)}</span></td>
                        <td className='r pd-cell-action'>
                          <button className='pd-btn pd-btn-ghost' onClick={() => navigate(`/projects/${project.id}`)}>View</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='pd-empty'>No projects yet. Create your first project to start tracking time and finances.</p>
          )}
        </section>

        {/* Goals + Recent pomodoros */}
        <div className='pd-grid2 pd-grid2-aside'>
          <section className='pd-panel'>
            <div className='pd-phead'>
              <span className='pd-ic'><IoTrophyOutline aria-hidden='true' /></span>
              <h2>Goals &amp; Streaks</h2>
              <div className='pd-spacer' />
              <button className='pd-icon-btn' onClick={handleEditGoals} aria-label='Edit goals'>
                <IoCreateOutline aria-hidden='true' />
              </button>
            </div>

            <div className='pd-streak'>
              <span className='pd-flame'><IoFlameOutline aria-hidden='true' /></span>
              <div>
                <div className='pd-big'>{streakCalculated ? streaks.currentStreak : '…'}</div>
                <div className='pd-streak-cap'>Day streak</div>
              </div>
              <span className='pd-best'>
                <IoTrophyOutline aria-hidden='true' />Best {streakCalculated ? streaks.longestStreak : '…'}
              </span>
            </div>

            <div className='pd-goal'>
              <div className='pd-gtop'>
                <span className='pd-gname'>Daily goal</span>
                <span className='pd-gval'>{dailyProgress.completed} / {goals.dailyPomodoroGoal}</span>
              </div>
              <div className='pd-gtrack'><i style={{ width: `${dailyProgress.percentage}%` }} /></div>
            </div>
            <div className='pd-goal'>
              <div className='pd-gtop'>
                <span className='pd-gname'>Weekly goal</span>
                <span className='pd-gval'>{weeklyProgress.completed} / {goals.weeklyPomodoroGoal}</span>
              </div>
              <div className='pd-gtrack alt'><i style={{ width: `${weeklyProgress.percentage}%` }} /></div>
            </div>
          </section>

          <section className='pd-panel'>
            <div className='pd-phead'>
              <span className='pd-ic'><IoTimeOutline aria-hidden='true' /></span>
              <h2>Recent Pomodoros</h2>
              <div className='pd-spacer' />
              <button className='pd-btn pd-btn-ghost' onClick={() => setShowExportModal(true)}>
                <IoDownloadOutline aria-hidden='true' /> Export
              </button>
              <button className='pd-btn pd-btn-primary' style={{ marginLeft: 8 }} onClick={() => navigate('/')}>
                <IoPlay aria-hidden='true' /> Start
              </button>
            </div>

            {recentSessions.length > 0 ? (
              <div className='pd-rlist'>
                {recentSessions.map((session) => (
                  <div key={session.id} className='pd-ritem'>
                    <span className='pd-rring'><IoTimeOutline aria-hidden='true' /></span>
                    <div className='pd-rmain'>
                      <span className='pd-rtask'>{session.task}</span>
                      <span className='pd-rmeta'>
                        {session.projectName && <span className='pd-mdot' style={{ background: session.projectColor }} />}
                        {session.projectName ? `${session.projectName} · ` : ''}{formatSessionDateTime(session.timestamp)}
                      </span>
                    </div>
                    <span className='pd-rdur'>{session.duration} min</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className='pd-empty'>No pomodoros yet. Start your first one!</p>
            )}
          </section>
        </div>

        {/* Financial + Tags */}
        <div className='pd-grid2'>
          <section className='pd-panel'>
            <div className='pd-phead'>
              <span className='pd-ic'><IoWalletOutline aria-hidden='true' /></span>
              <h2>Recent Financial Activity</h2>
              <div className='pd-spacer' />
              <button className='pd-btn pd-btn-ghost' onClick={() => navigate('/financial')}>View all</button>
            </div>

            {recentTransactions.length > 0 ? (
              <div className='pd-flist'>
                {recentTransactions.map((transaction) => {
                  const project = projectsData.find((p) => p.id === transaction.project_id);
                  const amount = parseFloat(transaction.amount || 0);
                  const isIncome = transaction.type === 'income';
                  return (
                    <div key={`${transaction.type}-${transaction.id}`} className='pd-fitem'>
                      <span className={`pd-favatar ${isIncome ? 'income' : 'expense'}`}>{initials(transaction)}</span>
                      <div className='pd-fmain'>
                        <span className='pd-fname'>{transaction.description}</span>
                        <span className='pd-fdate'>{project ? `${project.name} · ` : ''}{formatRelativeDate(transaction.date)}</span>
                      </div>
                      <span className={`pd-famt ${isIncome ? 'pos' : 'neg'}`}>
                        {isIncome ? '+' : '\u2212'}{formatCurrency(amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className='pd-empty'>No financial activity yet. Add income or spending to get started!</p>
            )}
          </section>

          <section className='pd-panel'>
            <div className='pd-phead'>
              <span className='pd-ic'><IoPricetagOutline aria-hidden='true' /></span>
              <h2>Tag Statistics</h2>
              <div className='pd-spacer' />
              <span className='pd-cap'>by focus time</span>
            </div>

            {tagStats.length > 0 ? (
              <div className='pd-taglist'>
                {tagStats.map((row) => (
                  <div key={row.tag} className='pd-tagrow'>
                    <div className='pd-ttop'>
                      <span className='pd-tname'><span className='pd-sq' style={{ background: row.color }} />{row.tag}</span>
                      <span className='pd-tcount'>{formatMinutes(row.minutes)} · {row.count} session{row.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className='pd-ttrack'><i style={{ width: `${row.pct}%`, background: row.color }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='pd-empty'>No tags found. Start adding tags to your sessions!</p>
            )}
          </section>
        </div>

      </div>

      {showExportModal && (
        <div className='form-modal' onClick={() => setShowExportModal(false)}>
          <div
            className='form-modal-content'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='export-modal-title'
            ref={trapRef}
          >
            <h3 id='export-modal-title'>Export Pomodoro Sessions</h3>
            <div className='export-options'>
              <p className='export-modal-description'>
                Export your pomodoro sessions to CSV format. Current time filter ({range}) will be applied.
              </p>
              <div className='form-actions'>
                <button onClick={handleExportSessions} className='export-modal-cta'>
                  <IoDownloadOutline size={18} className='export-modal-cta-icon' aria-hidden='true' />
                  Export to CSV
                </button>
                <button type='button' onClick={() => setShowExportModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
