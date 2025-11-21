import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoTimer, IoWallet, IoTrendingUp, IoPlay, IoEye, IoBriefcase } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useFinancialTransactions } from '../hooks/useFinancialTransactions';
import { useProjects } from '../hooks/useProjects';
import { usePomodoroSessions } from '../hooks/usePomodoroSessions';

function Dashboard() {
  const navigate = useNavigate();
  const { incomes, spendings } = useFinancialTransactions();
  const { projects: projectsData } = useProjects();
  const { sessions: pomodoroData } = usePomodoroSessions();
  const [timeFilter, setTimeFilter] = useState('today'); // 'today', '7d', '30d', '90d', '1y'
  const [todayStats, setTodayStats] = useState({
    pomodoros: 0,
    minutes: 0,
    income: 0,
    spending: 0,
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, incomes, spendings, projectsData, pomodoroData]);

  // Helper to parse YYYY-MM-DD as local date instead of UTC
  const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getDateRangeForFilter = (filter) => {
    const today = new Date();
    const startDate = new Date();

    switch (filter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(today.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate: today };
  };

  const isDateInRange = (dateString, startDate, endDate) => {
    // Parse as local date to avoid timezone issues
    const date = parseLocalDate(dateString);
    return date >= startDate && date <= endDate;
  };

  const loadDashboardData = () => {
    const { startDate, endDate } = getDateRangeForFilter(timeFilter);

    // Filter pomodoro data by date range
    let totalPomodoros = 0;
    let totalMinutes = 0;
    const filteredDates = Object.keys(pomodoroData).filter(date =>
      isDateInRange(date, startDate, endDate)
    );

    filteredDates.forEach(date => {
      const dayData = pomodoroData[date];
      totalPomodoros += dayData.completed || 0;
      totalMinutes += dayData.totalMinutes || 0;
    });

    // Get all dates with sessions for recent display
    const allDates = Object.keys(pomodoroData).sort().reverse();

    // Filter financial data by date range
    const filteredIncomes = incomes.filter(item =>
      isDateInRange(item.date, startDate, endDate)
    );
    const filteredSpendings = spendings.filter(item =>
      isDateInRange(item.date, startDate, endDate)
    );

    // Calculate totals for filtered range
    const totalIncome = filteredIncomes.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalSpending = filteredSpendings.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Get recent transactions (last 7)
    const allTransactions = [
      ...incomes.map(item => ({ ...item, type: 'income' })),
      ...spendings.map(item => ({ ...item, type: 'spending' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    setTodayStats({
      pomodoros: totalPomodoros,
      minutes: totalMinutes,
      income: totalIncome,
      spending: totalSpending,
    });

    // Set recent sessions from multiple days (limit to 5)
    setRecentSessions(allDates.slice(0, 5).map(date => ({
      date,
      data: pomodoroData[date]
    })));

    // Limit to 5 transactions
    setRecentTransactions(allTransactions.slice(0, 5));

    // Update projects state
    setProjects(projectsData);
  };

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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleStartPomodoro = () => {
    navigate('/');
  };

  const handleViewFinancial = () => {
    navigate('/financial');
  };

  const formatProjectDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeTracked = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const balance = todayStats.income - todayStats.spending;

  return (
    <div className="dashboard-container">
      {/* Bento Grid Layout */}
      <div className="bento-grid-dashboard">
        {/* Summary Card - Horizontal */}
        <div className="bento-card summary-card-horizontal">
          <div className="card-header">
            <div className="card-header-left">
              <IoTrendingUp size={24} style={{ color: '#000000' }} />
              <h3>Summary</h3>
            </div>

            {/* Desktop: Buttons */}
            <div className="time-filter-buttons">
              <button
                className={`time-filter-btn ${timeFilter === 'today' ? 'active' : ''}`}
                onClick={() => setTimeFilter('today')}
              >
                Today
              </button>
              <button
                className={`time-filter-btn ${timeFilter === '7d' ? 'active' : ''}`}
                onClick={() => setTimeFilter('7d')}
              >
                7d
              </button>
              <button
                className={`time-filter-btn ${timeFilter === '30d' ? 'active' : ''}`}
                onClick={() => setTimeFilter('30d')}
              >
                30d
              </button>
              <button
                className={`time-filter-btn ${timeFilter === '90d' ? 'active' : ''}`}
                onClick={() => setTimeFilter('90d')}
              >
                90d
              </button>
              <button
                className={`time-filter-btn ${timeFilter === '1y' ? 'active' : ''}`}
                onClick={() => setTimeFilter('1y')}
              >
                1y
              </button>
            </div>

            {/* Mobile: Dropdown */}
            <div className="time-filter-dropdown-mobile">
              <select
                className="time-filter-select-mobile"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value='today'>Today</option>
                <option value='7d'>Last 7 Days</option>
                <option value='30d'>Last 30 Days</option>
                <option value='90d'>Last 90 Days</option>
                <option value='1y'>Last Year</option>
              </select>
            </div>
          </div>
          <div className="summary-stats-horizontal">
            <div className="summary-stat-item-horizontal">
              <div className="stat-icon">
                <GiTomato size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Pomodoros</span>
                <span className="stat-value">{todayStats.pomodoros}</span>
              </div>
            </div>
            <div className="summary-stat-item-horizontal">
              <div className="stat-icon">
                <IoTimer size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Minutes</span>
                <span className="stat-value">{todayStats.minutes}</span>
              </div>
            </div>
            <div className="summary-stat-item-horizontal">
              <div className="stat-icon">
                <IoWallet size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Balance</span>
                <span className="stat-value">${balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Pomodoros Card */}
        <div className="bento-card recent-pomodoros-card-dashboard">
          <div className="card-header">
            <div className="card-header-left">
              <IoTimer size={24} style={{ color: '#000000' }} />
              <h3>Recent Pomodoros</h3>
            </div>
            <button className="card-action-btn start-btn-bw" onClick={handleStartPomodoro}>
              <IoPlay size={14} />
              Start
            </button>
          </div>
          <div className="card-content">
            {recentSessions.length > 0 ? (
              <div className="daily-pomodoros-list">
                {recentSessions.map((sessionDay, dayIndex) => (
                  <div key={dayIndex} className="daily-pomodoro-item">
                    <div className="daily-pomodoro-header">
                      <span className="daily-date-label">{formatDate(sessionDay.date)}</span>
                      <span className="daily-minutes">{sessionDay.data.totalMinutes} min</span>
                    </div>
                    <div className="pomodoro-icons-row">
                      {[...Array(Math.min(sessionDay.data.completed, 10))].map((_, i) => (
                        <GiTomato key={i} size={18} className="pomodoro-icon-bw" />
                      ))}
                      {sessionDay.data.completed > 10 && (
                        <span className="pomodoro-count-extra">+{sessionDay.data.completed - 10}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No pomodoros yet. Start your first one!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Financial Activity Card */}
        <div className="bento-card recent-financial-card-dashboard">
          <div className="card-header">
            <div className="card-header-left">
              <IoWallet size={24} style={{ color: '#000000' }} />
              <h3>Recent Financial Activity</h3>
            </div>
            <button className="card-action-btn view-btn-bw" onClick={handleViewFinancial}>
              <IoEye size={14} />
              View
            </button>
          </div>
          <div className="card-content">
            {recentTransactions.length > 0 ? (
              <div className="transactions-list-dashboard">
                {recentTransactions.map((transaction) => {
                  const project = projectsData.find(p => p.id === transaction.project_id);
                  return (
                    <div key={transaction.id} className="transaction-item-dashboard">
                      <div className="transaction-info-dashboard">
                        <span className="transaction-desc">
                          {transaction.description}
                          {project && <span className="transaction-project-name"> • {project.name}</span>}
                        </span>
                        <span className="transaction-date-small">{formatDate(transaction.date)}</span>
                      </div>
                      <span className={`transaction-amount-dashboard ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No financial activity yet. Add income or spending to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Projects Table */}
        <div className="projects-section bento-card">
          <div className="card-header">
            <div className="card-header-left">
              <IoBriefcase size={24} style={{ color: '#000000' }} />
              <h3>Projects</h3>
            </div>
          </div>

          <div className="projects-table-container table-scroll-wrapper">
          {projects.length > 0 ? (
            <table className="projects-table">
              <thead>
                <tr>
                  <th className="col-id">ID</th>
                  <th className="col-name">PROJECT NAME</th>
                  <th className="col-date">CREATED DATE</th>
                  <th className="col-time">TIME TRACKED</th>
                  <th className="col-balance">BALANCE</th>
                  <th className="col-action"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const balance = project.balance || 0;
                  const projectNumber = project.projectNumber || project.id;
                  return (
                    <tr key={project.id} className="table-row">
                      <td className="col-id">{projectNumber}</td>
                      <td className="col-name">{project.name}</td>
                      <td className="col-date">{formatProjectDate(project.createdDate || project.createdAt)}</td>
                      <td className="col-time">
                        <span className={`time-pill ${project.timeTracked > project.timeEstimate ? 'time-over' : project.timeTracked > project.timeEstimate * 0.8 ? 'time-warning' : 'time-good'}`}>
                          {formatTimeTracked(project.timeTracked)}
                        </span>
                      </td>
                      <td className={`col-balance ${balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                        {balance >= 0 ? `$${balance.toFixed(2)}` : `($${Math.abs(balance).toFixed(2)})`}
                      </td>
                      <td className="col-action">
                        <button className="view-btn-table" onClick={() => handleViewProject(project.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state-table">
              <p>No projects yet. Create your first project to start tracking time and finances!</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
