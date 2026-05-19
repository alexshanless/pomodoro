import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoTimer, IoWallet, IoTrendingUp, IoPlay, IoEye, IoBriefcase, IoTrophy, IoFlame, IoCheckmarkCircle, IoDownloadOutline } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useFinancialTransactions } from '../hooks/useFinancialTransactions';
import { useProjects } from '../hooks/useProjects';
import { usePomodoroSessions } from '../hooks/usePomodoroSessions';
import { useGoalsStreaks } from '../hooks/useGoalsStreaks';
import { useFocusTrap } from '../utils/accessibility';
import TagStats from './TagStats';
import { exportSessionsToCSV } from '../utils/exportUtils';
import { formatMinutesCompact, formatCurrencySigned, formatDate as formatShortDate } from '../utils/format';
import { parseLocalDate, formatRelativeDate, getDateRangeForFilter, isDateInRange } from '../utils/dateUtils';
import { calcProjectBalance } from '../utils/financialUtils';

const TIME_FILTERS = [
  { value: 'today', label: 'Today', mobileLabel: 'Today' },
  { value: '7d', label: '7d', mobileLabel: 'Last 7 Days' },
  { value: '30d', label: '30d', mobileLabel: 'Last 30 Days' },
  { value: '90d', label: '90d', mobileLabel: 'Last 90 Days' },
  { value: '1y', label: '1y', mobileLabel: 'Last Year' },
];

const MAX_RECENT = 5;
const MAX_TOMATO_ICONS = 10;

function Dashboard() {
  const navigate = useNavigate();
  const { incomes, spendings } = useFinancialTransactions();
  const { projects: projectsData } = useProjects();
  const { sessions: pomodoroData } = usePomodoroSessions();
  const { goals, streaks, streakCalculated, updateStreak, getDailyProgress, getWeeklyProgress } = useGoalsStreaks();
  const [timeFilter, setTimeFilter] = useState('today');
  const [selectedTagFilter, setSelectedTagFilter] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const { trapRef } = useFocusTrap(showExportModal);

  useEffect(() => {
    if (Object.keys(pomodoroData).length > 0) {
      updateStreak(pomodoroData);
    }
  }, [pomodoroData, updateStreak]);

  const dateRange = useMemo(() => getDateRangeForFilter(timeFilter), [timeFilter]);

  const todayStats = useMemo(() => {
    const { startDate, endDate } = dateRange;
    let pomodoros = 0;
    let minutes = 0;
    Object.keys(pomodoroData)
      .filter((date) => isDateInRange(date, startDate, endDate))
      .forEach((date) => {
        const dayData = pomodoroData[date];
        pomodoros += dayData.completed || 0;
        minutes += dayData.totalMinutes || 0;
      });

    const income = incomes
      .filter((item) => isDateInRange(item.date, startDate, endDate))
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const spending = spendings
      .filter((item) => isDateInRange(item.date, startDate, endDate))
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return { pomodoros, minutes, income, spending };
  }, [dateRange, pomodoroData, incomes, spendings]);

  const recentSessions = useMemo(() => {
    return Object.keys(pomodoroData)
      .sort()
      .reverse()
      .slice(0, MAX_RECENT)
      .map((date) => ({ date, data: pomodoroData[date] }));
  }, [pomodoroData]);

  const recentTransactions = useMemo(() => {
    return [
      ...incomes.map((item) => ({ ...item, type: 'income' })),
      ...spendings.map((item) => ({ ...item, type: 'spending' })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, MAX_RECENT);
  }, [incomes, spendings]);

  const projects = useMemo(() => {
    return projectsData.map((project) => ({
      ...project,
      balance: calcProjectBalance(project.id, incomes, spendings),
    }));
  }, [projectsData, incomes, spendings]);

  const dailyProgress = useMemo(() => getDailyProgress(pomodoroData), [getDailyProgress, pomodoroData]);
  const weeklyProgress = useMemo(() => getWeeklyProgress(pomodoroData), [getWeeklyProgress, pomodoroData]);

  const balance = todayStats.income - todayStats.spending;

  const handleStartPomodoro = () => navigate('/');
  const handleViewFinancial = () => navigate('/financial');
  const handleViewProject = (projectId) => navigate(`/projects/${projectId}`);

  const handleEditGoals = useCallback(() => {
    localStorage.setItem('settingsActiveTab', 'goals');
    navigate('/settings');
  }, [navigate]);

  const handleExportSessions = useCallback(() => {
    const { startDate, endDate } = getDateRangeForFilter(timeFilter);
    exportSessionsToCSV(pomodoroData, {
      startDate,
      endDate,
      projects: projectsData,
    });
    setShowExportModal(false);
  }, [timeFilter, pomodoroData, projectsData]);

  const formatProjectDate = (dateString) => formatShortDate(parseLocalDate(dateString));

  return (
    <div className='dashboard-container'>
      <div className='bento-grid-dashboard'>
        {/* Summary Card */}
        <div className='bento-card summary-card-horizontal'>
          <div className='card-header'>
            <div className='card-header-left'>
              <IoTrendingUp size={24} className='card-header-icon' />
              <h3>Summary</h3>
            </div>

            <div className='time-filter-buttons' role='group' aria-label='Time range'>
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`time-filter-btn ${timeFilter === f.value ? 'active' : ''}`}
                  onClick={() => setTimeFilter(f.value)}
                  aria-pressed={timeFilter === f.value}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className='time-filter-dropdown-mobile'>
              <select
                className='time-filter-select-mobile'
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                {TIME_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.mobileLabel}</option>
                ))}
              </select>
            </div>
          </div>
          <div className='summary-stats-horizontal'>
            <div className='summary-stat-item-horizontal'>
              <div className='stat-icon'>
                <GiTomato size={24} className='tomato-icon' />
              </div>
              <div className='stat-details'>
                <span className='stat-label'>Pomodoros</span>
                <span className='stat-value'>{todayStats.pomodoros}</span>
              </div>
            </div>
            <div className='summary-stat-item-horizontal'>
              <div className='stat-icon'>
                <IoTimer size={24} />
              </div>
              <div className='stat-details'>
                <span className='stat-label'>Minutes</span>
                <span className='stat-value'>{todayStats.minutes}</span>
              </div>
            </div>
            <div className='summary-stat-item-horizontal'>
              <div className='stat-icon'>
                <IoWallet size={24} />
              </div>
              <div className='stat-details'>
                <span className='stat-label'>Balance</span>
                <span className='stat-value'>${balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className='projects-section bento-card'>
          <div className='card-header'>
            <div className='card-header-left'>
              <IoBriefcase size={24} className='card-header-icon' />
              <h3>Projects</h3>
            </div>
          </div>

          <div className='projects-table-container table-scroll-wrapper'>
          {projects.length > 0 ? (
            <table className='projects-table'>
              <thead>
                <tr>
                  <th className='col-id'>ID</th>
                  <th className='col-name'>PROJECT NAME</th>
                  <th className='col-date'>CREATED DATE</th>
                  <th className='col-time'>TIME TRACKED</th>
                  <th className='col-balance'>BALANCE</th>
                  <th className='col-action'></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const projectBalance = project.balance || 0;
                  const projectNumber = project.projectNumber || project.id;
                  const timePillClass = project.timeTracked > project.timeEstimate
                    ? 'time-over'
                    : project.timeTracked > project.timeEstimate * 0.8
                      ? 'time-warning'
                      : 'time-good';
                  return (
                    <tr key={project.id} className='table-row'>
                      <td className='col-id'>{projectNumber}</td>
                      <td className='col-name'>
                        <div className='project-name-with-color'>
                          <div className='project-color-dot' style={{ backgroundColor: project.color }}></div>
                          {project.name}
                        </div>
                      </td>
                      <td className='col-date'>{formatProjectDate(project.createdDate || project.createdAt)}</td>
                      <td className='col-time'>
                        <span className={`time-pill ${timePillClass}`}>
                          {formatMinutesCompact(project.timeTracked)}
                        </span>
                      </td>
                      <td className={`col-balance ${projectBalance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                        {formatCurrencySigned(projectBalance)}
                      </td>
                      <td className='col-action'>
                        <button className='view-btn-table' onClick={() => handleViewProject(project.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className='empty-state-table'>
              <p>No projects yet. Create your first project to start tracking time and finances!</p>
            </div>
          )}
          </div>
        </div>

        {/* Goals & Streaks Card */}
        <div className='bento-card goals-streaks-card'>
          <div className='card-header'>
            <div className='card-header-left'>
              <IoTrophy size={24} className='card-header-icon' />
              <h3>Goals & Streaks</h3>
            </div>
            <button
              className='card-action-btn view-btn-bw'
              onClick={handleEditGoals}
            >
              <IoEye size={14} aria-hidden='true' />
              Edit
            </button>
          </div>
          <div className='card-content'>
            <div className='streak-display'>
              <div className='streak-icon-wrapper'>
                <IoFlame size={48} style={{ color: streakCalculated && streaks.currentStreak > 0 ? '#ffffff' : '#6b7280' }} />
              </div>
              <div className='streak-info'>
                <div className='streak-number'>
                  {streakCalculated ? streaks.currentStreak : '...'}
                </div>
                <div className='streak-label'>Day Streak</div>
              </div>
              <div className='longest-streak-badge'>
                <IoTrophy size={16} />
                <span>Best: {streakCalculated ? streaks.longestStreak : '...'}</span>
              </div>
            </div>

            <div className='goal-progress-item'>
              <div className='goal-header'>
                <div className='goal-title'>
                  <GiTomato size={18} className='tomato-icon' />
                  <span>Daily Goal</span>
                </div>
                <div className='goal-stats'>
                  <span className='goal-count'>{dailyProgress.completed}/{goals.dailyPomodoroGoal}</span>
                  {dailyProgress.isAchieved && (
                    <IoCheckmarkCircle size={18} className='goal-achieved-icon' aria-label='Goal achieved' />
                  )}
                </div>
              </div>
              <div className='progress-bar'>
                <div
                  className='progress-fill'
                  style={{
                    width: `${dailyProgress.percentage}%`,
                    backgroundColor: dailyProgress.isAchieved ? '#4CAF50' : '#000000',
                  }}
                />
              </div>
            </div>

            <div className='goal-progress-item'>
              <div className='goal-header'>
                <div className='goal-title'>
                  <GiTomato size={18} className='tomato-icon' />
                  <span>Weekly Goal</span>
                </div>
                <div className='goal-stats'>
                  <span className='goal-count'>{weeklyProgress.completed}/{goals.weeklyPomodoroGoal}</span>
                  {weeklyProgress.isAchieved && (
                    <IoCheckmarkCircle size={18} className='goal-achieved-icon' aria-label='Goal achieved' />
                  )}
                </div>
              </div>
              <div className='progress-bar'>
                <div
                  className='progress-fill'
                  style={{
                    width: `${weeklyProgress.percentage}%`,
                    backgroundColor: weeklyProgress.isAchieved ? '#4CAF50' : '#000000',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Pomodoros Card */}
        <div className='bento-card recent-pomodoros-card-dashboard'>
          <div className='card-header'>
            <div className='card-header-left'>
              <IoTimer size={24} className='card-header-icon' />
              <h3>Recent Pomodoros</h3>
            </div>
            <div className='card-header-actions'>
              <button className='card-action-btn view-btn-bw' onClick={() => setShowExportModal(true)} title='Export sessions'>
                <IoDownloadOutline size={14} aria-hidden='true' />
                Export
              </button>
              <button className='card-action-btn start-btn-bw' onClick={handleStartPomodoro}>
                <IoPlay size={14} aria-hidden='true' />
                Start
              </button>
            </div>
          </div>
          <div className='card-content'>
            {recentSessions.length > 0 ? (
              <div className='daily-pomodoros-list'>
                {recentSessions.map((sessionDay) => (
                  <div key={sessionDay.date} className='daily-pomodoro-item'>
                    <div className='daily-pomodoro-header'>
                      <span className='daily-date-label'>{formatRelativeDate(sessionDay.date)}</span>
                      <span className='daily-minutes'>{sessionDay.data.totalMinutes} min</span>
                    </div>
                    <div className='pomodoro-icons-row'>
                      {[...Array(Math.min(sessionDay.data.completed, MAX_TOMATO_ICONS))].map((_, i) => (
                        <GiTomato key={i} size={18} className='pomodoro-icon-bw' />
                      ))}
                      {sessionDay.data.completed > MAX_TOMATO_ICONS && (
                        <span className='pomodoro-count-extra'>+{sessionDay.data.completed - MAX_TOMATO_ICONS}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='empty-state'>
                <p>No pomodoros yet. Start your first one!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Financial Activity Card */}
        <div className='bento-card recent-financial-card-dashboard'>
          <div className='card-header'>
            <div className='card-header-left'>
              <IoWallet size={24} className='card-header-icon' />
              <h3>Recent Financial Activity</h3>
            </div>
            <button className='card-action-btn view-btn-bw' onClick={handleViewFinancial}>
              <IoEye size={14} aria-hidden='true' />
              View
            </button>
          </div>
          <div className='card-content'>
            {recentTransactions.length > 0 ? (
              <div className='transactions-list-dashboard'>
                {recentTransactions.map((transaction) => {
                  const project = projectsData.find((p) => p.id === transaction.project_id);
                  return (
                    <div key={transaction.id} className='transaction-item-dashboard'>
                      <div className='transaction-info-dashboard'>
                        <span className='transaction-desc'>
                          {transaction.description}
                          {project && <span className='transaction-project-name'> • {project.name}</span>}
                        </span>
                        <span className='transaction-date-small'>{formatRelativeDate(transaction.date)}</span>
                      </div>
                      <span className={`transaction-amount-dashboard ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='empty-state'>
                <p>No financial activity yet. Add income or spending to get started!</p>
              </div>
            )}
          </div>
        </div>

        <div className='bento-card tag-stats-card'>
          <TagStats
            sessions={pomodoroData}
            onTagFilter={setSelectedTagFilter}
            selectedTag={selectedTagFilter}
          />
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
                Export your pomodoro sessions to CSV format.
                Current time filter ({timeFilter}) will be applied.
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
