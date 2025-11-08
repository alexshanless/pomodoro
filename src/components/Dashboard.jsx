import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoTimer, IoWallet, IoTrendingUp, IoPlay, IoEye } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';

function Dashboard() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('today'); // 'today', '7d', '30d', '90d', '1y'
  const [todayStats, setTodayStats] = useState({
    pomodoros: 0,
    minutes: 0,
    income: 0,
    spending: 0,
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    const today = new Date().toISOString().split('T')[0];

    // Load Pomodoro data
    const pomodoroData = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
    const todayData = pomodoroData[today] || { completed: 0, totalMinutes: 0, sessions: [] };

    // Find most recent day with sessions (could be today or a past day)
    const allDates = Object.keys(pomodoroData).sort().reverse();
    const mostRecentDate = allDates[0] || today;
    const mostRecentData = pomodoroData[mostRecentDate] || { sessions: [] };

    // Load Financial data
    const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
    const spendings = JSON.parse(localStorage.getItem('spendings') || '[]');

    // Calculate today's financial totals
    const todayIncome = incomes
      .filter(item => item.date.startsWith(today))
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const todaySpending = spendings
      .filter(item => item.date.startsWith(today))
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Get recent transactions (last 7)
    const allTransactions = [
      ...incomes.map(item => ({ ...item, type: 'income' })),
      ...spendings.map(item => ({ ...item, type: 'spending' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    setTodayStats({
      pomodoros: todayData.completed,
      minutes: todayData.totalMinutes,
      income: todayIncome,
      spending: todaySpending,
    });

    setRecentSessions({
      date: mostRecentDate,
      data: mostRecentData
    });

    setRecentTransactions(allTransactions.slice(0, 7));
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleStartPomodoro = () => {
    navigate('/pomodoro');
    // The timer page will handle starting if needed
  };

  const handleViewFinancial = () => {
    navigate('/financial');
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
              <IoTrendingUp size={24} />
              <h3>Summary</h3>
            </div>
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
          </div>
          <div className="summary-stats-horizontal">
            <div className="summary-stat-item-horizontal">
              <div className="stat-icon stat-icon-gradient-red">
                <GiTomato size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Pomodoros</span>
                <span className="stat-value">{todayStats.pomodoros}</span>
              </div>
            </div>
            <div className="summary-stat-item-horizontal">
              <div className="stat-icon stat-icon-gradient-blue">
                <IoTimer size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Minutes</span>
                <span className="stat-value">{todayStats.minutes}</span>
              </div>
            </div>
            <div className="summary-stat-item-horizontal">
              <div className="stat-icon stat-icon-gradient-green">
                <IoWallet size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-label">Balance</span>
                <span className={`stat-value ${balance >= 0 ? 'positive' : 'negative'}`}>
                  ${balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Pomodoros Card */}
        <div className="bento-card recent-pomodoros-card-dashboard">
          <div className="card-header">
            <div className="card-header-left">
              <IoTimer size={24} />
              <h3>Recent Timer Sessions</h3>
            </div>
            <button className="card-action-btn start-btn-small" onClick={handleStartPomodoro}>
              <IoPlay size={14} />
              Start
            </button>
          </div>
          <div className="card-content">
            {recentSessions.data && recentSessions.data.sessions && recentSessions.data.sessions.length > 0 ? (
              <>
                <div className="recent-date-header">
                  <span className="recent-date-label">{formatDate(recentSessions.date)}</span>
                  <div className="pomodoro-icons-row">
                    {[...Array(Math.min(recentSessions.data.completed, 7))].map((_, i) => (
                      <GiTomato key={i} size={18} className="pomodoro-icon-small" />
                    ))}
                    {recentSessions.data.completed > 7 && (
                      <span className="pomodoro-count-extra">7+</span>
                    )}
                  </div>
                </div>
                <div className="recent-sessions-summary">
                  <span className="sessions-count">{recentSessions.data.completed} completed</span>
                  <span className="sessions-time">{recentSessions.data.totalMinutes} minutes</span>
                </div>
                <div className="sessions-list-dashboard">
                  {recentSessions.data.sessions.slice(0, 5).map((session, index) => (
                    <div key={index} className="session-item-dashboard">
                      <span className="session-time">{formatTime(session.timestamp)}</span>
                      <span className="session-duration">{session.duration} min</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>No timer sessions yet. Start your first Pomodoro!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Financial Activity Card */}
        <div className="bento-card recent-financial-card-dashboard">
          <div className="card-header">
            <div className="card-header-left">
              <IoWallet size={24} />
              <h3>Recent Financial Activity</h3>
            </div>
            <button className="card-action-btn view-btn-small" onClick={handleViewFinancial}>
              <IoEye size={14} />
              View
            </button>
          </div>
          <div className="card-content">
            {recentTransactions.length > 0 ? (
              <div className="transactions-list-dashboard">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item-dashboard">
                    <div className="transaction-info-dashboard">
                      <span className="transaction-desc">{transaction.description}</span>
                      <span className="transaction-date-small">{formatDate(transaction.date)}</span>
                    </div>
                    <span className={`transaction-amount-dashboard ${transaction.type}`}>
                      {transaction.type === 'income' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No financial activity yet. Add income or spending to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
