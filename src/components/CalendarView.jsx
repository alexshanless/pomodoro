import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../App.css';

const CalendarView = ({ sessions: sessionsProp = {} }) => {
  const [sessions, setSessions] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDateSessions, setSelectedDateSessions] = useState(null);

  useEffect(() => {
    // Use sessions from props instead of localStorage
    setSessions(sessionsProp);
  }, [sessionsProp]);

  const getTileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      const dayData = sessions[dateStr];

      if (dayData && dayData.completed > 0) {
        const focusMinutes = dayData.totalMinutes || 0;
        const hours = Math.floor(focusMinutes / 60);
        const mins = focusMinutes % 60;
        const timeDisplay = hours > 0
          ? `${hours}h ${mins}m`
          : `${mins}m`;

        return (
          <div className='calendar-tile-content'>
            <div className='calendar-focus-time'>
              <span className='focus-time-text'>{timeDisplay}</span>
              <span className='pomodoro-count-small'>{dayData.completed}🍅</span>
            </div>
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
        calendarType="gregory"
        showNeighboringMonth={false}
        showFixedNumberOfWeeks={false}
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
              {selectedDateSessions.sessions
                .filter(session => session.mode === 'focus' && session.duration > 0)
                .map((session, index) => (
                  <div key={index} className='session-item-calendar'>
                    <span>{new Date(session.timestamp).toLocaleTimeString()}</span>
                    <span>{session.duration} minutes</span>
                    {session.description && <span className='session-description'> • {session.description}</span>}
                    {session.tags && session.tags.length > 0 && (
                      <div className='session-tags'>
                        {session.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className='tag-pill-small'>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
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
