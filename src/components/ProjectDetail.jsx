import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoArrowBack, IoEllipsisVertical, IoTime, IoWallet, IoTrashOutline, IoCreate, IoDownloadOutline, IoDocumentTextOutline, IoShareSocialOutline, IoCalendarOutline, IoSearchOutline, IoFunnelOutline } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useProjects } from '../hooks/useProjects';
import { usePomodoroSessions } from '../hooks/usePomodoroSessions';
import { useFinancialTransactions } from '../hooks/useFinancialTransactions';
import { exportProjectSummaryToCSV, generatePDFInvoice } from '../utils/exportUtils';
import ShareProjectModal from './ShareProjectModal';
import '../App.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, loading, updateProject, deleteProject: deleteProjectHook } = useProjects();
  const { sessions: allSessions } = usePomodoroSessions();
  const { transactions: allTransactions, deleteTransaction: deleteTransactionHook } = useFinancialTransactions();
  const [project, setProject] = useState(null);
  const [pomodoros, setPomodoros] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editColor, setEditColor] = useState('');

  // Filtering and view options
  const [dateFilter, setDateFilter] = useState('all'); // 'all', '7days', '30days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to compare IDs (handles both integer and string UUIDs)
  const matchesId = (projectId, targetId) => {
    if (!projectId || !targetId) return false;
    return projectId === targetId || projectId === parseInt(targetId) || projectId.toString() === targetId;
  };

  useEffect(() => {
    loadProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, projects, loading, allSessions, allTransactions]);

  const loadProjectData = () => {
    // Don't redirect while still loading projects
    if (loading) {
      return;
    }

    // Handle both integer IDs (localStorage) and string IDs (Supabase UUIDs)
    const foundProject = projects.find(p => matchesId(p.id, id));

    if (!foundProject) {
      navigate('/projects');
      return;
    }

    setProject(foundProject);
    setEditName(foundProject.name);
    setEditRate((foundProject.rate || 0).toString());
    setEditColor(foundProject.color);

    // Load pomodoros for this project from hook data
    const projectPomodoros = [];

    Object.entries(allSessions).forEach(([date, dayData]) => {
      if (dayData.sessions) {
        dayData.sessions.forEach(session => {
          // Only include focus sessions with valid duration and matching project
          if (matchesId(session.projectId, id) &&
              session.mode === 'focus' &&
              session.duration > 0) {
            projectPomodoros.push({
              ...session,
              date
            });
          }
        });
      }
    });

    setPomodoros(projectPomodoros.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));

    // Load financial transactions for this project from hook data
    const projectTransactions = allTransactions
      .filter(transaction => matchesId(transaction.project_id, id))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    setTransactions(projectTransactions);
  };

  const handleDeleteProject = async () => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This will not delete associated pomodoros or transactions.`)) {
      await deleteProjectHook(id);
      navigate('/projects');
    }
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    const result = await updateProject(id, {
      name: editName,
      rate: parseFloat(editRate) || 0,
      color: editColor
    });

    if (!result.error) {
      setProject({ ...project, name: editName, rate: parseFloat(editRate) || 0, color: editColor });
      setShowEditModal(false);
      setShowActionsMenu(false);
    }
  };

  const deletePomodoro = (pomodoroTimestamp, pomodoroDate) => {
    if (!window.confirm('Are you sure you want to delete this pomodoro?')) return;

    const allSessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');

    if (allSessions[pomodoroDate] && allSessions[pomodoroDate].sessions) {
      allSessions[pomodoroDate].sessions = allSessions[pomodoroDate].sessions.filter(
        s => s.timestamp !== pomodoroTimestamp
      );

      // Update totals
      allSessions[pomodoroDate].completed = allSessions[pomodoroDate].sessions.length;
      allSessions[pomodoroDate].totalMinutes = allSessions[pomodoroDate].sessions.reduce(
        (sum, s) => sum + s.duration, 0
      );

      // Remove date entry if no sessions left
      if (allSessions[pomodoroDate].sessions.length === 0) {
        delete allSessions[pomodoroDate];
      }

      localStorage.setItem('pomodoroSessions', JSON.stringify(allSessions));
      loadProjectData();
    }
  };

  const deleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    await deleteTransactionHook(transactionId);
    // Data will refresh automatically via the hook's state update
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTotalTime = () => {
    return pomodoros.reduce((sum, pomo) => sum + pomo.duration, 0);
  };

  const getTotalEarnings = () => {
    const hours = getTotalTime() / 60;
    return hours * (project?.rate || 0);
  };

  const getTotalIncome = () => {
    return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalSpending = () => {
    return transactions.filter(t => t.type === 'spending').reduce((sum, t) => sum + t.amount, 0);
  };

  // Helper to parse YYYY-MM-DD as local date instead of UTC
  const parseLocalDate = (dateString) => {
    // Extract just the date part if it's a timestamp
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = parseLocalDate(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Filter pomodoros based on date range, search, and tags
  const getFilteredPomodoros = () => {
    let filtered = [...pomodoros];

    // Date filter
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    if (dateFilter === '7days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => new Date(p.timestamp) >= sevenDaysAgo);
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => new Date(p.timestamp) >= thirtyDaysAgo);
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => {
        const ts = new Date(p.timestamp);
        return ts >= start && ts <= end;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p =>
        p.tags && p.tags.some(tag => selectedTags.includes(tag))
      );
    }

    return filtered;
  };

  // Get all unique tags from pomodoros
  const getAllTags = () => {
    const tagSet = new Set();
    pomodoros.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  };

  // Group pomodoros by date
  const groupPomodorosByDate = () => {
    const filtered = getFilteredPomodoros();
    const grouped = {};
    filtered.forEach(pomo => {
      if (!grouped[pomo.date]) {
        grouped[pomo.date] = [];
      }
      grouped[pomo.date].push(pomo);
    });
    // Return dates sorted newest first
    return Object.keys(grouped).sort().reverse().map(date => ({
      date,
      sessions: grouped[date]
    }));
  };

  // Group by week
  const groupPomodorosByWeek = () => {
    const filtered = getFilteredPomodoros();
    const grouped = {};

    filtered.forEach(pomo => {
      const date = new Date(pomo.timestamp);
      // Get Monday of the week
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const weekKey = monday.toISOString().split('T')[0];

      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(pomo);
    });

    return Object.keys(grouped).sort().reverse().map(weekStart => {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      return {
        weekStart,
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        sessions: grouped[weekStart]
      };
    });
  };

  // Group by month
  const groupPomodorosByMonth = () => {
    const filtered = getFilteredPomodoros();
    const grouped = {};

    filtered.forEach(pomo => {
      const date = new Date(pomo.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(pomo);
    });

    return Object.keys(grouped).sort().reverse().map(monthKey => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);

      return {
        monthKey,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        sessions: grouped[monthKey]
      };
    });
  };

  // Get totals for filtered data
  const getFilteredTotalTime = () => {
    return getFilteredPomodoros().reduce((sum, pomo) => sum + pomo.duration, 0);
  };

  const getFilteredTotalEarnings = () => {
    const hours = getFilteredTotalTime() / 60;
    return hours * (project?.rate || 0);
  };

  const colors = [
    '#e94560', '#4caf50', '#2196f3', '#ff9800',
    '#9c27b0', '#00bcd4', '#ffc107', '#795548'
  ];

  const handleExportProjectSummary = () => {
    const incomes = transactions.filter(t => t.type === 'income');
    const spendings = transactions.filter(t => t.type === 'spending');

    exportProjectSummaryToCSV(project, allSessions, incomes, spendings);
    setShowActionsMenu(false);
  };

  const handleGenerateInvoice = () => {
    generatePDFInvoice(project, allSessions, {
      invoiceNumber: `INV-${project.projectNumber || project.id}-${Date.now()}`,
      clientName: '',
      yourName: '',
      notes: 'Thank you for your business!'
    });
    setShowActionsMenu(false);
  };

  if (!project) {
    return <div className='project-detail-loading'>Loading...</div>;
  }

  return (
    <div className='project-detail-container'>
      {/* Header */}
      <div className='project-detail-header'>
        <button className='back-btn' onClick={() => navigate('/projects')}>
          <IoArrowBack size={20} />
          Back to Projects
        </button>

        <div className='project-detail-title-section'>
          <div className='project-title-left-group'>
            <div className='project-color-square' style={{ backgroundColor: project.color }}></div>
            <div className='project-title-and-rate'>
              <h1>{project.name}</h1>
              {project.rate > 0 && (
                <p className='project-rate-display'>${project.rate}/hr</p>
              )}
            </div>
          </div>
          <div className='project-actions-menu'>
            <button
              className='three-dot-menu-btn'
              onClick={() => setShowActionsMenu(!showActionsMenu)}
            >
              <IoEllipsisVertical size={24} />
            </button>

            {showActionsMenu && (
              <div className='actions-dropdown'>
                <button onClick={() => { setShowEditModal(true); setShowActionsMenu(false); }}>
                  <IoCreate size={18} />
                  Edit Project
                </button>
                <button onClick={() => { setShowShareModal(true); setShowActionsMenu(false); }}>
                  <IoShareSocialOutline size={18} />
                  Share Project
                </button>
                <button onClick={handleExportProjectSummary}>
                  <IoDownloadOutline size={18} />
                  Export Summary (CSV)
                </button>
                <button onClick={handleGenerateInvoice}>
                  <IoDocumentTextOutline size={18} />
                  Generate PDF Invoice
                </button>
                <button onClick={handleDeleteProject} className='delete-action'>
                  <IoTrashOutline size={18} />
                  Delete Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className='project-summary-stats'>
        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <GiTomato size={28} style={{ color: '#e94560' }} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>{dateFilter === 'all' ? 'Total' : 'Filtered'} Pomodoros</span>
            <span className='stat-value'>{getFilteredPomodoros().length}</span>
            {dateFilter !== 'all' && pomodoros.length !== getFilteredPomodoros().length && (
              <span className='stat-sublabel'>of {pomodoros.length} total</span>
            )}
          </div>
        </div>

        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <IoTime size={28} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>Time Tracked</span>
            <span className='stat-value'>{formatTime(getFilteredTotalTime())}</span>
            {dateFilter !== 'all' && getTotalTime() !== getFilteredTotalTime() && (
              <span className='stat-sublabel'>of {formatTime(getTotalTime())} total</span>
            )}
          </div>
        </div>

        {project.rate > 0 && (
          <div className='summary-stat-card'>
            <div className='stat-icon'>
              <IoWallet size={28} />
            </div>
            <div className='stat-content'>
              <span className='stat-label'>Estimated Earnings</span>
              <span className='stat-value earnings'>${getFilteredTotalEarnings().toFixed(2)}</span>
              {dateFilter !== 'all' && getTotalEarnings() !== getFilteredTotalEarnings() && (
                <span className='stat-sublabel'>of ${getTotalEarnings().toFixed(2)} total</span>
              )}
            </div>
          </div>
        )}

        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <IoWallet size={28} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>Income</span>
            <span className='stat-value income-text'>${getTotalIncome().toFixed(2)}</span>
          </div>
        </div>

        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <IoWallet size={28} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>Spending</span>
            <span className='stat-value spending-text'>${getTotalSpending().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Filters and View Controls */}
      {pomodoros.length > 0 && (
        <div className='project-filters-section'>
          <div className='filters-header'>
            <button
              className='filters-toggle-btn'
              onClick={() => setShowFilters(!showFilters)}
            >
              <IoFunnelOutline size={18} />
              Filters {(dateFilter !== 'all' || searchQuery || selectedTags.length > 0) && <span className='filter-badge'>Active</span>}
            </button>

            <div className='view-mode-tabs'>
              <button
                className={`view-tab ${viewMode === 'daily' ? 'active' : ''}`}
                onClick={() => setViewMode('daily')}
              >
                Daily
              </button>
              <button
                className={`view-tab ${viewMode === 'weekly' ? 'active' : ''}`}
                onClick={() => setViewMode('weekly')}
              >
                Weekly
              </button>
              <button
                className={`view-tab ${viewMode === 'monthly' ? 'active' : ''}`}
                onClick={() => setViewMode('monthly')}
              >
                Monthly
              </button>
            </div>
          </div>

          {showFilters && (
            <div className='filters-panel'>
              <div className='filter-row'>
                <div className='filter-group'>
                  <label><IoCalendarOutline size={16} /> Date Range</label>
                  <div className='date-filter-buttons'>
                    <button
                      className={`filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setDateFilter('all')}
                    >
                      All Time
                    </button>
                    <button
                      className={`filter-btn ${dateFilter === '7days' ? 'active' : ''}`}
                      onClick={() => setDateFilter('7days')}
                    >
                      Last 7 Days
                    </button>
                    <button
                      className={`filter-btn ${dateFilter === '30days' ? 'active' : ''}`}
                      onClick={() => setDateFilter('30days')}
                    >
                      Last 30 Days
                    </button>
                    <button
                      className={`filter-btn ${dateFilter === 'custom' ? 'active' : ''}`}
                      onClick={() => setDateFilter('custom')}
                    >
                      Custom Range
                    </button>
                  </div>

                  {dateFilter === 'custom' && (
                    <div className='custom-date-range'>
                      <input
                        type='date'
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        placeholder='Start date'
                      />
                      <span>to</span>
                      <input
                        type='date'
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        placeholder='End date'
                      />
                    </div>
                  )}
                </div>

                <div className='filter-group'>
                  <label><IoSearchOutline size={16} /> Search</label>
                  <input
                    type='text'
                    className='search-input'
                    placeholder='Search descriptions...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {getAllTags().length > 0 && (
                <div className='filter-group'>
                  <label>Filter by Tags</label>
                  <div className='tag-filter-list'>
                    {getAllTags().map(tag => (
                      <button
                        key={tag}
                        className={`tag-filter-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(dateFilter !== 'all' || searchQuery || selectedTags.length > 0) && (
                <button
                  className='clear-filters-btn'
                  onClick={() => {
                    setDateFilter('all');
                    setSearchQuery('');
                    setSelectedTags([]);
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activity Log */}
      <div className='project-activity-section'>
        <h2>Activity Log</h2>

        {pomodoros.length === 0 && transactions.length === 0 ? (
          <div className='empty-activity'>
            <p>No activity yet for this project</p>
          </div>
        ) : getFilteredPomodoros().length === 0 && transactions.length === 0 ? (
          <div className='empty-activity'>
            <p>No activity matches the current filters</p>
          </div>
        ) : (
          <div className='activity-list'>
            {/* Pomodoros Section */}
            {getFilteredPomodoros().length > 0 && (
              <div className='activity-group'>
                <h3 className='activity-group-title'>
                  <GiTomato size={20} style={{ color: '#e94560' }} />
                  Pomodoros ({getFilteredPomodoros().length})
                </h3>
                {/* Daily View */}
                {viewMode === 'daily' && groupPomodorosByDate().map((dayGroup) => (
                  <div key={dayGroup.date} className='daily-session-group'>
                    <div className='daily-session-header'>
                      <span className='daily-session-date'>{formatDate(dayGroup.date)}</span>
                      <span className='daily-session-count'>{dayGroup.sessions.length} sessions • {dayGroup.sessions.reduce((sum, s) => sum + s.duration, 0)} min</span>
                    </div>
                    {dayGroup.sessions.map((pomo) => (
                      <div key={`${pomo.date}-${pomo.timestamp}`} className='activity-item'>
                        <div className='activity-item-content'>
                          <div className='activity-item-icon pomodoro-icon'>
                            <GiTomato size={18} style={{ color: '#ffffff' }} />
                          </div>
                          <div className='activity-item-details'>
                            <span className='activity-item-title'>
                              {pomo.description || `Completed pomodoro - ${pomo.duration} minutes`}
                              {pomo.description && <span className='activity-duration'> • {pomo.duration} min</span>}
                            </span>
                            <span className='activity-item-date'>
                              {new Date(pomo.timestamp).toLocaleString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <button
                          className='activity-delete-btn'
                          onClick={() => deletePomodoro(pomo.timestamp, pomo.date)}
                          title='Delete pomodoro'
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Weekly View */}
                {viewMode === 'weekly' && groupPomodorosByWeek().map((weekGroup) => (
                  <div key={weekGroup.weekStart} className='daily-session-group'>
                    <div className='daily-session-header'>
                      <span className='daily-session-date'>{weekGroup.label}</span>
                      <span className='daily-session-count'>{weekGroup.sessions.length} sessions • {weekGroup.sessions.reduce((sum, s) => sum + s.duration, 0)} min</span>
                    </div>
                    {weekGroup.sessions.map((pomo) => (
                      <div key={`${pomo.date}-${pomo.timestamp}`} className='activity-item'>
                        <div className='activity-item-content'>
                          <div className='activity-item-icon pomodoro-icon'>
                            <GiTomato size={18} style={{ color: '#ffffff' }} />
                          </div>
                          <div className='activity-item-details'>
                            <span className='activity-item-title'>
                              {pomo.description || `Completed pomodoro - ${pomo.duration} minutes`}
                              {pomo.description && <span className='activity-duration'> • {pomo.duration} min</span>}
                            </span>
                            <span className='activity-item-date'>
                              {new Date(pomo.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <button
                          className='activity-delete-btn'
                          onClick={() => deletePomodoro(pomo.timestamp, pomo.date)}
                          title='Delete pomodoro'
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Monthly View */}
                {viewMode === 'monthly' && groupPomodorosByMonth().map((monthGroup) => (
                  <div key={monthGroup.monthKey} className='daily-session-group'>
                    <div className='daily-session-header'>
                      <span className='daily-session-date'>{monthGroup.label}</span>
                      <span className='daily-session-count'>{monthGroup.sessions.length} sessions • {monthGroup.sessions.reduce((sum, s) => sum + s.duration, 0)} min</span>
                    </div>
                    {monthGroup.sessions.map((pomo) => (
                      <div key={`${pomo.date}-${pomo.timestamp}`} className='activity-item'>
                        <div className='activity-item-content'>
                          <div className='activity-item-icon pomodoro-icon'>
                            <GiTomato size={18} style={{ color: '#ffffff' }} />
                          </div>
                          <div className='activity-item-details'>
                            <span className='activity-item-title'>
                              {pomo.description || `Completed pomodoro - ${pomo.duration} minutes`}
                              {pomo.description && <span className='activity-duration'> • {pomo.duration} min</span>}
                            </span>
                            <span className='activity-item-date'>
                              {new Date(pomo.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <button
                          className='activity-delete-btn'
                          onClick={() => deletePomodoro(pomo.timestamp, pomo.date)}
                          title='Delete pomodoro'
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Transactions Section */}
            {transactions.length > 0 && (
              <div className='activity-group'>
                <h3 className='activity-group-title'>
                  <IoWallet size={20} />
                  Transactions ({transactions.length})
                </h3>
                {transactions.map((transaction) => (
                  <div key={`${transaction.type}-${transaction.id}`} className='activity-item'>
                    <div className='activity-item-content'>
                      <div className={`activity-item-icon ${transaction.type}-icon`}>
                        <IoWallet size={18} />
                      </div>
                      <div className='activity-item-details'>
                        <span className='activity-item-title'>
                          {transaction.description}
                          {transaction.type === 'spending' && transaction.category && (
                            <span className='transaction-category-badge'>{transaction.category}</span>
                          )}
                        </span>
                        <span className='activity-item-date'>
                          {new Date(transaction.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <span className={`transaction-amount ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </span>
                    </div>
                    <button
                      className='activity-delete-btn'
                      onClick={() => deleteTransaction(transaction.id)}
                      title='Delete transaction'
                    >
                      <IoTrashOutline size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className='form-modal' onClick={() => setShowEditModal(false)}>
          <div className='form-modal-content projects-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header-settings'>
              <h3>Edit Project</h3>
              <button className='close-modal-btn' onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditProject} className='add-project-form'>
              <div className='form-group'>
                <label>Project Name *</label>
                <input
                  type='text'
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className='form-group'>
                <label>Hourly Rate ($)</label>
                <input
                  type='number'
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  step='0.01'
                  min='0'
                />
              </div>

              <div className='form-group'>
                <label>Project Color</label>
                <div className='color-picker'>
                  {colors.map((color) => (
                    <button
                      key={color}
                      type='button'
                      className={`color-option ${editColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className='form-actions'>
                <button type='button' className='btn-cancel' onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type='submit' className='btn-primary'>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Project Modal */}
      {showShareModal && (
        <ShareProjectModal
          project={project}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
