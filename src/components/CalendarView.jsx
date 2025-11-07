import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../App.css';

const CalendarView = () => {
  const [sessions, setSessions] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDateSessions, setSelectedDateSessions] = useState(null);

  useEffect(() => {
    const loadSessions = () => {
      const data = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
      setSessions(data);
    };

    loadSessions();
    const interval = setInterval(loadSessions, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      const dayData = sessions[dateStr];

      if (dayData && dayData.completed > 0) {
        return (
          <div className='calendar-tile-content'>
            <span className='pomodoro-count'>{dayData.completed}</span>
          </div>
        );
      }
    }
    return null;
  };

  const getTileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      const dayData = sessions[dateStr];

      if (dayData && dayData.completed > 0) {
        return 'has-sessions';
      }
    }
    return null;
  };

  const handleDateClick = (value) => {
    setSelectedDate(value);
    const dateStr = value.toISOString().split('T')[0];
    const dayData = sessions[dateStr];
    setSelectedDateSessions(dayData);
  };

  return (
    <div className='calendar-view'>
      <h3>Pomodoro Calendar</h3>
      <Calendar
        onChange={handleDateClick}
        value={selectedDate}
        tileContent={getTileContent}
        tileClassName={getTileClassName}
      />

      {selectedDateSessions && (
        <div className='selected-date-details'>
          <h4>{selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</h4>
          <div className='day-stats'>
            <p><strong>Completed Pomodoros:</strong> {selectedDateSessions.completed}</p>
            <p><strong>Total Minutes:</strong> {selectedDateSessions.totalMinutes}</p>
          </div>
          {selectedDateSessions.sessions && selectedDateSessions.sessions.length > 0 && (
            <div className='session-list-calendar'>
              <h5>Sessions:</h5>
              {selectedDateSessions.sessions.map((session, index) => (
                <div key={index} className='session-item-calendar'>
                  <span>{new Date(session.timestamp).toLocaleTimeString()}</span>
                  <span>{session.duration} minutes</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
