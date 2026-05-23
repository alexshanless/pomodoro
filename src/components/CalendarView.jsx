import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { GiTomato } from 'react-icons/gi';
import 'react-calendar/dist/Calendar.css';
import '../App.css';

const MAX_TOMATOES_IN_TILE = 3;

const CalendarView = ({ sessions: sessionsProp = {} }) => {
  const [sessions, setSessions] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDateSessions, setSelectedDateSessions] = useState(null);

  useEffect(() => {
    // Use sessions from props instead of localStorage
    setSessions(sessionsProp);
  }, [sessionsProp]);

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = getLocalDateString(date);
      const dayData = sessions[dateStr];

      if (dayData && dayData.completed > 0) {
        const shown = Math.min(dayData.completed, MAX_TOMATOES_IN_TILE);
        const extra = dayData.completed - shown;
        return (
          <div className='cal-tile-content' aria-label={`${dayData.completed} pomodoros`}>
            {Array.from({ length: shown }).map((_, i) => (
              <GiTomato key={i} className='cal-tomato' aria-hidden='true' />
            ))}
            {extra > 0 && <span className='cal-tomato-overflow'>+{extra}</span>}
          </div>
        );
      }
    }
    return null;
  };

  const getTileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = getLocalDateString(date);
      const dayData = sessions[dateStr];

      if (dayData && dayData.completed > 0) {
        return 'has-sessions';
      }
    }
    return null;
  };

  const handleDateClick = (value) => {
    setSelectedDate(value);
    const dateStr = getLocalDateString(value);
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
        showNeighboringMonth={true}
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
