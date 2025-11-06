import React, { useState, useEffect } from 'react';

const PomodoroStats = () => {
  const [sessions, setSessions] = useState({});
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'weekly', 'monthly'

  useEffect(() => {
    const loadSessions = () => {
      const data = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
      setSessions(data);
    };

    loadSessions();
    const interval = setInterval(loadSessions, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    return sessions[today] || { completed: 0, totalMinutes: 0, sessions: [] };
  };

  const getWeekStats = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    let totalCompleted = 0;
    let totalMinutes = 0;

    Object.keys(sessions).forEach(date => {
      const sessionDate = new Date(date);
      if (sessionDate >= weekAgo && sessionDate <= today) {
        totalCompleted += sessions[date].completed;
        totalMinutes += sessions[date].totalMinutes;
      }
    });

    return { completed: totalCompleted, totalMinutes };
  };

  const getMonthStats = () => {
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    let totalCompleted = 0;
    let totalMinutes = 0;

    Object.keys(sessions).forEach(date => {
      const sessionDate = new Date(date);
      if (sessionDate >= monthAgo && sessionDate <= today) {
        totalCompleted += sessions[date].completed;
        totalMinutes += sessions[date].totalMinutes;
      }
    });

    return { completed: totalCompleted, totalMinutes };
  };

  const getLast7Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = sessions[dateStr] || { completed: 0, totalMinutes: 0 };
      days.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        ...dayData
      });
    }

    return days;
  };

  const todayStats = getTodayStats();
  const weekStats = getWeekStats();
  const monthStats = getMonthStats();
  const last7Days = getLast7Days();

  return (
    <div className='pomodoro-stats'>
      <h2>Pomodoro Statistics</h2>

      <div className='stats-tabs'>
        <button
          className={viewMode === 'daily' ? 'active' : ''}
          onClick={() => setViewMode('daily')}
        >
          Today
        </button>
        <button
          className={viewMode === 'weekly' ? 'active' : ''}
          onClick={() => setViewMode('weekly')}
        >
          Last 7 Days
        </button>
        <button
          className={viewMode === 'monthly' ? 'active' : ''}
          onClick={() => setViewMode('monthly')}
        >
          Last 30 Days
        </button>
      </div>

      <div className='stats-content'>
        {viewMode === 'daily' && (
          <div className='daily-stats'>
            <div className='stat-card'>
              <h3>Today's Pomodoros</h3>
              <p className='stat-number'>{todayStats.completed}</p>
            </div>
            <div className='stat-card'>
              <h3>Total Minutes</h3>
              <p className='stat-number'>{todayStats.totalMinutes}</p>
            </div>
            {todayStats.sessions && todayStats.sessions.length > 0 && (
              <div className='session-list'>
                <h4>Sessions Today:</h4>
                {todayStats.sessions.map((session, index) => (
                  <div key={index} className='session-item'>
                    <span>{new Date(session.timestamp).toLocaleTimeString()}</span>
                    <span>{session.duration} minutes</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'weekly' && (
          <div className='weekly-stats'>
            <div className='stat-summary'>
              <div className='stat-card'>
                <h3>Weekly Pomodoros</h3>
                <p className='stat-number'>{weekStats.completed}</p>
              </div>
              <div className='stat-card'>
                <h3>Total Minutes</h3>
                <p className='stat-number'>{weekStats.totalMinutes}</p>
              </div>
            </div>
            <div className='daily-breakdown'>
              <h4>Last 7 Days Breakdown:</h4>
              {last7Days.map((day, index) => (
                <div key={index} className='day-item'>
                  <span className='day-name'>{day.dayName}</span>
                  <span className='day-date'>{day.date}</span>
                  <span className='day-completed'>{day.completed} pomodoros</span>
                  <span className='day-minutes'>{day.totalMinutes} min</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'monthly' && (
          <div className='monthly-stats'>
            <div className='stat-card'>
              <h3>Monthly Pomodoros</h3>
              <p className='stat-number'>{monthStats.completed}</p>
            </div>
            <div className='stat-card'>
              <h3>Total Minutes</h3>
              <p className='stat-number'>{monthStats.totalMinutes}</p>
            </div>
            <div className='stat-card'>
              <h3>Average Per Day</h3>
              <p className='stat-number'>
                {Math.round((monthStats.completed / 30) * 10) / 10}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PomodoroStats;
