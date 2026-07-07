import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoClose, IoMusicalNotes } from 'react-icons/io5';
import { useTimer } from '../contexts/TimerContext';
import '../App.css';

const MUSIC_ENABLED_KEY = 'isMusicEnabled';

const FloatingTimer = () => {
  const { timerOn, currentMode, displayTimeRemaining } = useTimer();
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
      <button
        className='minimize-floating-timer'
        onClick={() => setIsMinimized(!isMinimized)}
        aria-label={isMinimized ? 'Maximize timer widget' : 'Minimize timer widget'}
      >
        {isMinimized ? '□' : '−'}
      </button>
      <button
        className={`music-toggle-floating ${isMusicEnabled ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsMusicEnabled(!isMusicEnabled);
        }}
        aria-label={isMusicEnabled ? 'Disable music' : 'Enable music'}
      >
        <IoMusicalNotes size={16} aria-hidden='true' />
      </button>
      <button
        className='close-floating-timer'
        onClick={() => setIsVisible(false)}
        aria-label='Close timer widget'
      >
        <IoClose size={20} aria-hidden='true' />
      </button>
      {!isMinimized ? (
        <div className='floating-timer-content' onClick={() => navigate('/')}>
          <div className='floating-timer-mode'>{getModeLabel(currentMode)}</div>
          <div className='floating-timer-time'>{displayTimeRemaining()}</div>
          <div className='floating-timer-hint'>Click to view</div>
        </div>
      ) : (
        <div className='floating-timer-content-minimized' onClick={() => navigate('/')}>
          <div className='floating-timer-time-minimized'>{displayTimeRemaining()}</div>
        </div>
      )}
    </div>
  );
};

export default FloatingTimer;
