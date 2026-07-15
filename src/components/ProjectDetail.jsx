import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoArrowBack, IoEllipsisVertical, IoTime, IoWallet, IoTrashOutline, IoCreate, IoDownloadOutline, IoDocumentTextOutline, IoShareSocialOutline, IoCalendarOutline, IoSearchOutline, IoFunnelOutline } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useProjects } from '../hooks/useProjects';
import { usePomodoroSessions } from '../hooks/usePomodoroSessions';
import { useFinancialTransactions } from '../hooks/useFinancialTransactions';
import { useDialog } from '../contexts/DialogContext';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { exportProjectSummaryToCSV, generatePDFInvoice, SUPPORTED_CURRENCIES } from '../utils/exportUtils';
import { formatMinutes, formatCurrency } from '../utils/format';
import { formatRelativeDate } from '../utils/dateUtils';
import ModalCloseButton from './ModalCloseButton';
import ShareProjectModal from './ShareProjectModal';
import TimeEntryModal from './TimeEntryModal';
import { useTimeEntryActions } from '../hooks/useTimeEntryActions';
import { PompayLoader } from './PompayLogo';
import '../App.css';
import '../styles/ModalCommon.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, loading, updateProject, deleteProject: deleteProjectHook } = useProjects();
  const { sessions: allSessions } = usePomodoroSessions();
  const { transactions: allTransactions, deleteTransaction: deleteTransactionHook } = useFinancialTransactions();
  const { confirm, showToast } = useDialog();
  const [project, setProject] = useState(null);
  const [pomodoros, setPomodoros] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(null);
  const {
    showTimeModal, editingEntry, openAddTime, openEditTime, closeTimeModal,
    saveTimeEntry, deleteTimeEntry
  } = useTimeEntryActions();
  const actionsMenuRef = useRef(null);
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

  const closeEditModal = useCallback(() => setShowEditModal(false), []);
  const { trapRef: editModalTrapRef } = useModalBehavior(showEditModal, closeEditModal);

  const closeInvoiceModal = useCallback(() => setShowInvoiceModal(false), []);
  const { trapRef: invoiceModalTrapRef } = useModalBehavior(showInvoiceModal, closeInvoiceModal);

  // Close actions dropdown on outside click or Esc
  useEffect(() => {
    if (!showActionsMenu) return undefined;
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowActionsMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showActionsMenu]);

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
    const ok = await confirm(
      `Delete "${project.name}"? This will not delete associated pomodoros or transactions.`,
      { title: 'Delete Project', confirmLabel: 'Delete', cancelLabel: 'Cancel' }
    );
    if (ok) {
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

  const deletePomodoro = (pomo) => deleteTimeEntry(pomo);

  const deleteTransaction = async (transactionId) => {
    const ok = await confirm('Delete this transaction?', {
      title: 'Delete Transaction',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;
    await deleteTransactionHook(transactionId);
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

  const formatDate = (dateString) => formatRelativeDate(dateString, { includeYear: true });

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

  const SENDER_DETAILS_KEY = 'invoiceSenderDetails';

  const toDateInputValue = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const handleOpenInvoiceModal = () => {
    let sender = {};
    try {
      sender = JSON.parse(localStorage.getItem(SENDER_DETAILS_KEY) || '{}');
    } catch {
      sender = {};
    }

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const due = new Date(today);
    due.setDate(due.getDate() + 30);

    setInvoiceForm({
      invoiceNumber: `INV-${project.projectNumber || project.id}-${toDateInputValue(today).replace(/-/g, '')}`,
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      yourName: sender.yourName || '',
      yourEmail: sender.yourEmail || '',
      yourAddress: sender.yourAddress || '',
      yourTaxId: sender.yourTaxId || '',
      startDate: toDateInputValue(monthStart),
      endDate: toDateInputValue(today),
      dueDate: toDateInputValue(due),
      paymentTerms: sender.paymentTerms || 'Net 30',
      taxRatePercent: sender.taxRatePercent || '',
      currency: sender.currency || 'USD',
      groupByDay: sender.groupByDay || false,
      notes: 'Thank you for your business!'
    });
    setShowInvoiceModal(true);
    setShowActionsMenu(false);
  };

  const setInvoiceField = (field) => (e) =>
    setInvoiceForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleGenerateInvoice = (e) => {
    e.preventDefault();

    const startDate = new Date(`${invoiceForm.startDate}T00:00:00`);
    const endDate = new Date(`${invoiceForm.endDate}T23:59:59.999`);
    if (startDate > endDate) {
      showToast('The billing period start date is after the end date.', { type: 'error' });
      return;
    }

    const sessionsInRange = pomodoros.filter((p) => {
      const d = new Date(p.timestamp);
      return d >= startDate && d <= endDate;
    });
    if (sessionsInRange.length === 0) {
      showToast('No sessions in the selected billing period — nothing to invoice.', { type: 'error' });
      return;
    }

    localStorage.setItem(SENDER_DETAILS_KEY, JSON.stringify({
      yourName: invoiceForm.yourName,
      yourEmail: invoiceForm.yourEmail,
      yourAddress: invoiceForm.yourAddress,
      yourTaxId: invoiceForm.yourTaxId,
      paymentTerms: invoiceForm.paymentTerms,
      taxRatePercent: invoiceForm.taxRatePercent,
      currency: invoiceForm.currency,
      groupByDay: invoiceForm.groupByDay
    }));

    try {
      generatePDFInvoice(project, allSessions, {
        startDate,
        endDate,
        invoiceNumber: invoiceForm.invoiceNumber,
        clientName: invoiceForm.clientName,
        clientEmail: invoiceForm.clientEmail,
        clientAddress: invoiceForm.clientAddress,
        yourName: invoiceForm.yourName,
        yourEmail: invoiceForm.yourEmail,
        yourAddress: invoiceForm.yourAddress,
        yourTaxId: invoiceForm.yourTaxId,
        dueDate: invoiceForm.dueDate ? new Date(`${invoiceForm.dueDate}T00:00:00`) : undefined,
        paymentTerms: invoiceForm.paymentTerms,
        taxRate: (parseFloat(invoiceForm.taxRatePercent) || 0) / 100,
        currency: invoiceForm.currency,
        groupByDay: invoiceForm.groupByDay,
        notes: invoiceForm.notes
      });
      showToast(`Invoice generated — ${sessionsInRange.length} session${sessionsInRange.length !== 1 ? 's' : ''} billed.`, { type: 'success' });
      setShowInvoiceModal(false);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      showToast('Failed to generate the invoice PDF. Please try again.', { type: 'error' });
    }
  };

  if (!project) {
    return (
      <div className='project-detail-loading'>
        <PompayLoader size={64} />
      </div>
    );
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
          <div className='project-actions-menu' ref={actionsMenuRef}>
            <button
              className='three-dot-menu-btn'
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              aria-label='Project actions'
              aria-haspopup='menu'
              aria-expanded={showActionsMenu}
            >
              <IoEllipsisVertical size={24} />
            </button>

            {showActionsMenu && (
              <div className='actions-dropdown' role='menu'>
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
                <button onClick={handleOpenInvoiceModal}>
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
            <span className='stat-value'>{formatMinutes(getFilteredTotalTime())}</span>
            {dateFilter !== 'all' && getTotalTime() !== getFilteredTotalTime() && (
              <span className='stat-sublabel'>of {formatMinutes(getTotalTime())} total</span>
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
              <span className='stat-value earnings'>{formatCurrency(getFilteredTotalEarnings())}</span>
              {dateFilter !== 'all' && getTotalEarnings() !== getFilteredTotalEarnings() && (
                <span className='stat-sublabel'>of {formatCurrency(getTotalEarnings())} total</span>
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
            <span className='stat-value income-text'>{formatCurrency(getTotalIncome())}</span>
          </div>
        </div>

        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <IoWallet size={28} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>Spending</span>
            <span className='stat-value spending-text'>{formatCurrency(getTotalSpending())}</span>
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
        <div className='activity-section-head'>
          <h2>Activity Log</h2>
          <button className='add-time-btn' onClick={openAddTime}>
            <IoTime size={16} aria-hidden='true' />
            Add Time
          </button>
        </div>

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
                      <span className='daily-session-count'>{dayGroup.sessions.length} sessions • {formatMinutes(dayGroup.sessions.reduce((sum, s) => sum + s.duration, 0))}</span>
                    </div>
                    {dayGroup.sessions.map((pomo) => (
                      <div key={`${pomo.date}-${pomo.timestamp}`} className='activity-item'>
                        <div className='activity-item-content'>
                          <div className='activity-item-icon pomodoro-icon'>
                            <GiTomato size={18} style={{ color: '#ffffff' }} />
                          </div>
                          <div className='activity-item-details'>
                            <span className='activity-item-title'>
                              {pomo.description || `Completed pomodoro - ${formatMinutes(pomo.duration)}`}
                              {pomo.description && <span className='activity-duration'> • {formatMinutes(pomo.duration)}</span>}
                            </span>
                            <span className='activity-item-date'>
                              {new Date(pomo.timestamp).toLocaleString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className='activity-item-actions'>
                          <button
                            className='activity-edit-btn'
                            onClick={() => openEditTime(pomo)}
                            title='Edit time entry'
                          >
                            <IoCreate size={16} />
                          </button>
                          <button
                            className='activity-delete-btn'
                            onClick={() => deletePomodoro(pomo)}
                            title='Delete pomodoro'
                          >
                            <IoTrashOutline size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Weekly View */}
                {viewMode === 'weekly' && groupPomodorosByWeek().map((weekGroup) => (
                  <div key={weekGroup.weekStart} className='daily-session-group'>
                    <div className='daily-session-header'>
                      <span className='daily-session-date'>{weekGroup.label}</span>
                      <span className='daily-session-count'>{weekGroup.sessions.length} sessions • {formatMinutes(weekGroup.sessions.reduce((sum, s) => sum + s.duration, 0))}</span>
                    </div>
                    {weekGroup.sessions.map((pomo) => (
                      <div key={`${pomo.date}-${pomo.timestamp}`} className='activity-item'>
                        <div className='activity-item-content'>
                          <div className='activity-item-icon pomodoro-icon'>
                            <GiTomato size={18} style={{ color: '#ffffff' }} />
                          </div>
                          <div className='activity-item-details'>
                            <span className='activity-item-title'>
                              {pomo.description || `Completed pomodoro - ${formatMinutes(pomo.duration)}`}
                              {pomo.description && <span className='activity-duration'> • {formatMinutes(pomo.duration)}</span>}
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
                        <div className='activity-item-actions'>
                          <button
                            className='activity-edit-btn'
                            onClick={() => openEditTime(pomo)}
                            title='Edit time entry'
                          >
                            <IoCreate size={16} />
                          </button>
                          <button
                            className='activity-delete-btn'
                            onClick={() => deletePomodoro(pomo)}
                            title='Delete pomodoro'
                          >
                            <IoTrashOutline size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Monthly View */}
                {viewMode === 'monthly' && groupPomodorosByMonth().map((monthGroup) => (
                  <div key={monthGroup.monthKey} className='daily-session-group'>
                    <div className='daily-session-header'>
                      <span className='daily-session-date'>{monthGroup.label}</span>
                      <span className='daily-session-count'>{monthGroup.sessions.length} sessions • {formatMinutes(monthGroup.sessions.reduce((sum, s) => sum + s.duration, 0))}</span>
                    </div>
                    {monthGroup.sessions.map((pomo) => (
                      <div key={`${pomo.date}-${pomo.timestamp}`} className='activity-item'>
                        <div className='activity-item-content'>
                          <div className='activity-item-icon pomodoro-icon'>
                            <GiTomato size={18} style={{ color: '#ffffff' }} />
                          </div>
                          <div className='activity-item-details'>
                            <span className='activity-item-title'>
                              {pomo.description || `Completed pomodoro - ${formatMinutes(pomo.duration)}`}
                              {pomo.description && <span className='activity-duration'> • {formatMinutes(pomo.duration)}</span>}
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
                        <div className='activity-item-actions'>
                          <button
                            className='activity-edit-btn'
                            onClick={() => openEditTime(pomo)}
                            title='Edit time entry'
                          >
                            <IoCreate size={16} />
                          </button>
                          <button
                            className='activity-delete-btn'
                            onClick={() => deletePomodoro(pomo)}
                            title='Delete pomodoro'
                          >
                            <IoTrashOutline size={16} />
                          </button>
                        </div>
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
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
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
        <div className='pompay-modal' onClick={closeEditModal}>
          <div
            className='pompay-modal-card'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='pd-edit-modal-title'
            ref={editModalTrapRef}
          >
            <div className='pompay-modal-head'>
              <h3 id='pd-edit-modal-title'>Edit Project</h3>
              <ModalCloseButton onClick={closeEditModal} />
            </div>
            <form onSubmit={handleEditProject} className='pompay-modal-body'>
              <div className='pompay-field'>
                <label htmlFor='pd-edit-name'>Project Name *</label>
                <input
                  id='pd-edit-name'
                  type='text'
                  className='pompay-input'
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className='pompay-field'>
                <label htmlFor='pd-edit-rate'>Hourly Rate ($)</label>
                <input
                  id='pd-edit-rate'
                  type='number'
                  className='pompay-input'
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  step='0.01'
                  min='0'
                />
              </div>

              <div className='pompay-field'>
                <label>Project Color</label>
                <div className='color-picker'>
                  {colors.map((color) => (
                    <button
                      key={color}
                      type='button'
                      className={`color-option ${editColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditColor(color)}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className='pompay-modal-actions'>
                <button type='button' className='pompay-btn-cancel' onClick={closeEditModal}>
                  Cancel
                </button>
                <button type='submit' className='pompay-btn-confirm'>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceForm && (
        <div className='pompay-modal' onClick={closeInvoiceModal}>
          <div
            className='pompay-modal-card wide'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='invoice-modal-title'
            ref={invoiceModalTrapRef}
          >
            <div className='pompay-modal-head'>
              <h3 id='invoice-modal-title'>Generate Invoice</h3>
              <ModalCloseButton onClick={closeInvoiceModal} />
            </div>
            <form onSubmit={handleGenerateInvoice} className='pompay-modal-body'>
              <div className='pompay-field-row'>
                <div className='pompay-field'>
                  <label htmlFor='inv-number'>Invoice number</label>
                  <input id='inv-number' className='pompay-input' value={invoiceForm.invoiceNumber}
                    onChange={setInvoiceField('invoiceNumber')} required />
                </div>
                <div className='pompay-field'>
                  <label htmlFor='inv-terms'>Payment terms</label>
                  <select id='inv-terms' className='pompay-select' value={invoiceForm.paymentTerms}
                    onChange={setInvoiceField('paymentTerms')}>
                    <option>Due on receipt</option>
                    <option>Net 7</option>
                    <option>Net 14</option>
                    <option>Net 30</option>
                    <option>Net 60</option>
                  </select>
                </div>
              </div>

              <div className='pompay-field-row'>
                <div className='pompay-field'>
                  <label htmlFor='inv-start'>Billing period start</label>
                  <input id='inv-start' type='date' className='pompay-input' value={invoiceForm.startDate}
                    onChange={setInvoiceField('startDate')} required />
                </div>
                <div className='pompay-field'>
                  <label htmlFor='inv-end'>Billing period end</label>
                  <input id='inv-end' type='date' className='pompay-input' value={invoiceForm.endDate}
                    onChange={setInvoiceField('endDate')} required />
                </div>
              </div>

              <div className='pompay-field-row'>
                <div className='pompay-field'>
                  <label htmlFor='inv-due'>Due date</label>
                  <input id='inv-due' type='date' className='pompay-input' value={invoiceForm.dueDate}
                    onChange={setInvoiceField('dueDate')} />
                </div>
                <div className='pompay-field'>
                  <label htmlFor='inv-tax'>Tax rate (%)</label>
                  <input id='inv-tax' type='number' min='0' max='100' step='0.1' className='pompay-input'
                    placeholder='0' value={invoiceForm.taxRatePercent}
                    onChange={setInvoiceField('taxRatePercent')} />
                </div>
              </div>

              <div className='pompay-field-row'>
                <div className='pompay-field'>
                  <label htmlFor='inv-currency'>Currency</label>
                  <select id='inv-currency' className='pompay-select' value={invoiceForm.currency}
                    onChange={setInvoiceField('currency')}>
                    {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className='pompay-field'>
                  <label htmlFor='inv-group'>Line items</label>
                  <select id='inv-group' className='pompay-select'
                    value={invoiceForm.groupByDay ? 'day' : 'session'}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, groupByDay: e.target.value === 'day' }))}>
                    <option value='session'>One per session</option>
                    <option value='day'>Grouped by day</option>
                  </select>
                </div>
              </div>

              <div className='pompay-field-row'>
                <div className='pompay-field'>
                  <label htmlFor='inv-your-name'>Your name / business</label>
                  <input id='inv-your-name' className='pompay-input' value={invoiceForm.yourName}
                    onChange={setInvoiceField('yourName')} required />
                </div>
                <div className='pompay-field'>
                  <label htmlFor='inv-your-email'>Your email</label>
                  <input id='inv-your-email' type='email' className='pompay-input' value={invoiceForm.yourEmail}
                    onChange={setInvoiceField('yourEmail')} />
                </div>
              </div>

              <div className='pompay-field-row'>
                <div className='pompay-field'>
                  <label htmlFor='inv-your-address'>Your address</label>
                  <input id='inv-your-address' className='pompay-input' value={invoiceForm.yourAddress}
                    onChange={setInvoiceField('yourAddress')} />
                </div>
                <div className='pompay-field'>
                  <label htmlFor='inv-tax-id'>Tax ID (optional)</label>
                  <input id='inv-tax-id' className='pompay-input' value={invoiceForm.yourTaxId}
                    onChange={setInvoiceField('yourTaxId')} />
                </div>
              </div>

              <div className='pompay-field-row'>
                <div className='pompay-field'>
                  <label htmlFor='inv-client-name'>Client name</label>
                  <input id='inv-client-name' className='pompay-input' value={invoiceForm.clientName}
                    onChange={setInvoiceField('clientName')} required />
                </div>
                <div className='pompay-field'>
                  <label htmlFor='inv-client-email'>Client email</label>
                  <input id='inv-client-email' type='email' className='pompay-input' value={invoiceForm.clientEmail}
                    onChange={setInvoiceField('clientEmail')} />
                </div>
              </div>

              <div className='pompay-field'>
                <label htmlFor='inv-client-address'>Client address</label>
                <input id='inv-client-address' className='pompay-input' value={invoiceForm.clientAddress}
                  onChange={setInvoiceField('clientAddress')} />
              </div>

              <div className='pompay-field'>
                <label htmlFor='inv-notes'>Notes</label>
                <input id='inv-notes' className='pompay-input' value={invoiceForm.notes}
                  onChange={setInvoiceField('notes')} />
              </div>

              <div className='pompay-modal-actions'>
                <button type='button' className='pompay-btn-cancel' onClick={closeInvoiceModal}>
                  Cancel
                </button>
                <button type='submit' className='pompay-btn-confirm'>
                  Generate PDF
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

      <TimeEntryModal
        isOpen={showTimeModal}
        onClose={closeTimeModal}
        projects={projects}
        initial={editingEntry}
        defaultProjectId={project.id}
        onSave={saveTimeEntry}
      />
    </div>
  );
};

export default ProjectDetail;
