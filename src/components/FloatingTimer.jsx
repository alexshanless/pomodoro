import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoClose, IoMusicalNotes, IoPlay, IoPause, IoExpand } from 'react-icons/io5';
import { useTimer } from '../contexts/TimerContext';
import '../App.css';

const MUSIC_ENABLED_KEY = 'isMusicEnabled';

const FloatingTimer = () => {
  const {
    timerOn, currentMode, displayTimeRemaining,
    isPaused, handlePauseTimer, handleResumeTimer
  } = useTimer();
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    const saved = localStorage.getItem(MUSIC_ENABLED_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Save music toggle state to localStorage and dispatch event when it changes
  useEffect(() => {
    localStorage.setItem(MUSIC_ENABLED_KEY, JSON.stringify(isMusicEnabled));
    window.dispatchEvent(new CustomEvent('musicToggle', { detail: { enabled: isMusicEnabled } }));
  }, [isMusicEnabled]);

  // Keep music toggle in sync with changes made elsewhere (e.g. the timer toolbar)
  useEffect(() => {
    const handleMusicToggle = (e) => setIsMusicEnabled(e.detail.enabled);
    window.addEventListener('musicToggle', handleMusicToggle);
    return () => window.removeEventListener('musicToggle', handleMusicToggle);
  }, []);

  const getModeLabel = useCallback((mode) => {
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
  }, []);

  // Don't show on the Pomodoro page, when the timer isn't running, or when closed
  if (!timerOn || location.pathname === '/' || !isVisible) {
    return null;
  }

  return (
    <div className={`floating-timer ${isMinimized ? 'minimized' : ''}`}>
      <div className='ft-head'>
        <span className={`ft-mode ${isPaused ? 'paused' : ''}`}>
          {getModeLabel(currentMode)}{isPaused ? ' · Paused' : ''}
        </span>
        <div className='ft-window'>
          <button
            className='ft-win-btn'
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? 'Maximize timer widget' : 'Minimize timer widget'}
          >
            {isMinimized ? '□' : '−'}
          </button>
          <button
            className='ft-win-btn'
            onClick={() => setIsVisible(false)}
            aria-label='Close timer widget'
          >
            <IoClose size={16} aria-hidden='true' />
          </button>
        </div>
      </div>

      <button
        className={`ft-time ${isPaused ? 'paused' : ''}`}
        onClick={() => navigate('/')}
        aria-label='Open timer page'
        title='Open timer'
      >
        {displayTimeRemaining()}
      </button>

      {!isMinimized && (
        <div className='ft-controls'>
          <button
            className='ft-primary'
            onClick={isPaused ? handleResumeTimer : handlePauseTimer}
            aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <IoPlay aria-hidden='true' /> : <IoPause aria-hidden='true' />}
          </button>
          <button
            className={`ft-ghost ${isMusicEnabled ? 'active' : ''}`}
            onClick={() => setIsMusicEnabled(!isMusicEnabled)}
            aria-label={isMusicEnabled ? 'Disable music' : 'Enable music'}
            title='Music'
          >
            <IoMusicalNotes aria-hidden='true' />
          </button>
          <button
            className='ft-ghost'
            onClick={() => navigate('/')}
            aria-label='Open full timer'
            title='Open timer'
          >
            <IoExpand aria-hidden='true' />
          </button>
        </div>
      )}
    </div>
  );
};

export default FloatingTimer;
