import React, { useState, useEffect } from 'react';
import '../App.css';

function RecentSessions({ sessions = {} }) {
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    // Use sessions prop instead of localStorage
    const pomodoroData = sessions;

    // Get all dates sorted in reverse order (most recent first)
    const allDates = Object.keys(pomodoroData).sort().reverse();

    // Take the last 7 days that have sessions
    const recentDays = allDates.slice(0, 7).map(date => ({
      date,
      ...pomodoroData[date]
    }));

    setRecentSessions(recentDays);
  }, [sessions]);

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
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // SVG pomodoro icon
  const PomodoroIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="55" r="35" fill="#e94560"/>
      <rect x="45" y="15" width="10" height="8" rx="2" fill="#4caf50"/>
      <ellipse cx="50" cy="20" rx="8" ry="3" fill="#45a049"/>
    </svg>
  );

  if (recentSessions.length === 0) {
    return (
      <div className="recent-sessions-container">
        <div className="empty-state">
          <p>No recent sessions yet. Start your first Pomodoro!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-sessions-container">
      {recentSessions.map((day) => (
        <div key={day.date} className="recent-day-row">
          <div className="recent-day-info">
            <span className="recent-day-date">{formatDate(day.date)}</span>
            <span className="recent-day-stats">
              {day.completed} sessions • {day.totalMinutes} min
            </span>
          </div>
          <div className="recent-day-icons">
            {Array.from({ length: day.completed }).map((_, index) => (
              <span key={index} className="pomodoro-icon-wrapper">
                <PomodoroIcon />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default RecentSessions;
