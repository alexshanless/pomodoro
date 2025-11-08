import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../App.css';

const FloatingTimer = () => {
  const [timerState, setTimerState] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkTimer = () => {
      const saved = localStorage.getItem('pomodoroTimerState');
      if (saved) {
        const state = JSON.parse(saved);
        const today = new Date().toISOString().split('T')[0];

        // Only show if timer is running and it's from today
        if (state.timerOn && state.date === today) {
          // Calculate current time remaining
          if (state.lastTick) {
            const now = Date.now();
            const elapsed = Math.floor((now - state.lastTick) / 1000);
            const newTimeRemaining = Math.max(0, state.timeRemaining - elapsed);

            setTimerState({
              ...state,
              timeRemaining: newTimeRemaining
            });
          } else {
            setTimerState(state);
          }
        } else {
          setTimerState(null);
        }
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayTimeRemaining = () => {
    if (!timerState) return '00:00';
    const minutes = Math.floor(timerState.timeRemaining / 60);
    const seconds = timerState.timeRemaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'focus':
        return 'Focus';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
      default:
        return '';
    }
  };

  // Don't show on Pomodoro page or if timer is not running or if closed
  if (!timerState || !timerState.timerOn || location.pathname === '/pomodoro' || !isVisible) {
    return null;
  }

  return (
    <div className={`floating-timer ${isMinimized ? 'minimized' : ''}`}>
      <button
        className='minimize-floating-timer'
        onClick={() => setIsMinimized(!isMinimized)}
        title={isMinimized ? 'Maximize' : 'Minimize'}
      >
        {isMinimized ? '□' : '−'}
      </button>
      <button className='close-floating-timer' onClick={() => setIsVisible(false)}>
        ×
      </button>
      {!isMinimized ? (
        <div className='floating-timer-content' onClick={() => navigate('/pomodoro')}>
          <div className='floating-timer-mode'>{getModeLabel(timerState.currentMode)}</div>
          <div className='floating-timer-time'>{displayTimeRemaining()}</div>
          <div className='floating-timer-hint'>Click to view</div>
        </div>
      ) : (
        <div className='floating-timer-content-minimized' onClick={() => navigate('/pomodoro')}>
          <div className='floating-timer-time-minimized'>{displayTimeRemaining()}</div>
        </div>
      )}
    </div>
  );
};

export default FloatingTimer;
