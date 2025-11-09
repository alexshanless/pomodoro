import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoClose, IoMusicalNotes } from 'react-icons/io5';
import '../App.css';

const FloatingTimer = () => {
  const [timerState, setTimerState] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    // Load music toggle state from localStorage on initialization
    const savedMusicEnabled = localStorage.getItem('isMusicEnabled');
    return savedMusicEnabled !== null ? JSON.parse(savedMusicEnabled) : true;
  });
  const audioRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Save music toggle state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('isMusicEnabled', JSON.stringify(isMusicEnabled));
  }, [isMusicEnabled]);

  useEffect(() => {
    const checkTimer = () => {
      const saved = localStorage.getItem('pomodoroTimerState');
      if (saved) {
        const state = JSON.parse(saved);
        // Use local timezone to match Timer component
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        // Only show if timer is running and it's from today
        if (state.timerOn && state.date === today) {
          // Calculate current time remaining
          if (state.lastTick) {
            const nowMs = Date.now();
            const elapsed = Math.floor((nowMs - state.lastTick) / 1000);
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

  // Lo-fi radio control for floating timer
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Play audio when timer is running in focus mode and music is enabled
    if (timerState && timerState.timerOn && timerState.currentMode === 'focus' && isMusicEnabled) {
      audio.volume = timerState.timeRemaining <= 60 ? 0.3 : 0.6;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } else {
      audio.pause();
    }

    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, [timerState, isMusicEnabled]);

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
    <>
      <div className={`floating-timer ${isMinimized ? 'minimized' : ''}`}>
        <button
          className='minimize-floating-timer'
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? 'Maximize' : 'Minimize'}
        >
          {isMinimized ? '□' : '−'}
        </button>
        <button
          className={`music-toggle-floating ${isMusicEnabled ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsMusicEnabled(!isMusicEnabled);
          }}
          title={isMusicEnabled ? 'Disable Music' : 'Enable Music'}
        >
          <IoMusicalNotes size={16} />
        </button>
        <button className='close-floating-timer' onClick={() => setIsVisible(false)}>
          <IoClose size={20} />
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

      {/* Lo-fi Radio Audio Element */}
      <audio
        ref={audioRef}
        src="https://radiorecord.hostingradio.ru/lofi96.aacp"
        loop
        preload="auto"
      />
    </>
  );
};

export default FloatingTimer;
