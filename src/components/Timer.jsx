import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG from './gradientSVG';
import CalendarView from './CalendarView';
import { FaCalendar, FaClock } from 'react-icons/fa';
import '../App.css'; // Import your CSS file for styling

const Timer = () => {
  const [showCalendar, setShowCalendar] = useState(false);
  const POMODORO_DURATION = 25 * 60;
  const [timeRemaining, setTimeRemaining] = useState(POMODORO_DURATION);
  const [timerOn, setTimerOn] = useState(false);
  const [totalTimeWorked, setTotalTimeWorked] = useState(0);
  const idCSS = 'hello';
  const completionPercentage = (timeRemaining / POMODORO_DURATION) * 100;

  const displayTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
      2,
      '0'
    )}`;
  };

  const savePomodoroSession = () => {
    const today = new Date().toISOString().split('T')[0];
    const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');

    if (!sessions[today]) {
      sessions[today] = {
        completed: 0,
        totalMinutes: 0,
        sessions: []
      };
    }

    sessions[today].completed += 1;
    sessions[today].totalMinutes += 25;
    sessions[today].sessions.push({
      timestamp: new Date().toISOString(),
      duration: 25
    });

    localStorage.setItem('pomodoroSessions', JSON.stringify(sessions));
  };

  useEffect(() => {
    if (timerOn) {
      const interval = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            setTimerOn(false);
            savePomodoroSession();
            setTotalTimeWorked(prev => prev + POMODORO_DURATION);
            alert('Pomodoro completed! Great work!');
            return POMODORO_DURATION;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerOn, POMODORO_DURATION]);

  const handleStartTimer = () => {
    setTimerOn(true);
  };

  const handleStopTimer = () => {
    const timeWorked = POMODORO_DURATION - timeRemaining;
    if (timeWorked > 0) {
      setTotalTimeWorked(prev => prev + timeWorked);
    }
    setTimerOn(false);
  };

  const handleClearTimer = () => {
    setTimeRemaining(POMODORO_DURATION);
  };

  const formatTotalTime = () => {
    const minutes = Math.floor(totalTimeWorked / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${remainingMinutes}m`;
  };

  return (
    <div className='timer-container'>
      <div className='view-toggle-container'>
        <button
          className={`view-toggle-btn ${!showCalendar ? 'active' : ''}`}
          onClick={() => setShowCalendar(false)}
        >
          <FaClock /> Timer
        </button>
        <button
          className={`view-toggle-btn ${showCalendar ? 'active' : ''}`}
          onClick={() => setShowCalendar(true)}
        >
          <FaCalendar /> Calendar
        </button>
      </div>

      {!showCalendar ? (
        <div className='timer-view'>
          <h2>Pomodoro Timer</h2>
          <GradientSVG />
          <div className='rotated-progress-bar'>
            <CircularProgressbar
              value={completionPercentage}
              text={displayTimeRemaining()}
              circleRatio={0.8}
              styles={buildStyles({
                pathColor: `url(#${idCSS})`,
                textColor: '#fff',
              })}
            />
          </div>

          <div className='timer-controls'>
            {!timerOn ? (
              <button onClick={handleStartTimer}>Start</button>
            ) : (
              <button onClick={handleStopTimer}>Stop</button>
            )}
            <button onClick={handleClearTimer}>Reset</button>
          </div>

          {totalTimeWorked > 0 && (
            <div className='session-info'>
              <p>Today's work time: {formatTotalTime()}</p>
            </div>
          )}
        </div>
      ) : (
        <CalendarView />
      )}
    </div>
  );
};

export default Timer;
