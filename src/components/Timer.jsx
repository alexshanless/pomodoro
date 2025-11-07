import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG from './gradientSVG';
import CalendarView from './CalendarView';
import { IoStatsChart } from 'react-icons/io5';
import '../App.css'; // Import your CSS file for styling

const Timer = ({ isDrawerOpen, setIsDrawerOpen }) => {
  const [viewMode, setViewMode] = useState('recent'); // 'recent' or 'calendar'

  // Timer modes and durations
  const MODES = {
    FOCUS: 'focus',
    SHORT_BREAK: 'shortBreak',
    LONG_BREAK: 'longBreak'
  };

  const DURATIONS = {
    [MODES.FOCUS]: 25 * 60,
    [MODES.SHORT_BREAK]: 5 * 60,
    [MODES.LONG_BREAK]: 15 * 60
  };

  const [currentMode, setCurrentMode] = useState(MODES.FOCUS);
  const [timeRemaining, setTimeRemaining] = useState(DURATIONS[MODES.FOCUS]);
  const [timerOn, setTimerOn] = useState(false);
  const [totalTimeWorked, setTotalTimeWorked] = useState(0);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  const idCSS = 'hello';
  const completionPercentage = (timeRemaining / DURATIONS[currentMode]) * 100;

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
            handleTimerComplete();
            return DURATIONS[currentMode];
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerOn, currentMode]);

  const handleTimerComplete = () => {
    // Handle completion based on current mode
    if (currentMode === MODES.FOCUS) {
      savePomodoroSession();
      setTotalTimeWorked(prev => prev + DURATIONS[MODES.FOCUS]);
      setPomodorosCompleted(prev => prev + 1);
    }
    setShowCompletionMessage(true);
  };

  const handleStartTimer = () => {
    setShowCompletionMessage(false);
    setTimerOn(true);
  };

  const handleStopTimer = () => {
    if (currentMode === MODES.FOCUS) {
      const timeWorked = DURATIONS[MODES.FOCUS] - timeRemaining;
      if (timeWorked > 0) {
        setTotalTimeWorked(prev => prev + timeWorked);
      }
    }
    setTimerOn(false);
  };

  const handleClearTimer = () => {
    setTimeRemaining(DURATIONS[currentMode]);
    setShowCompletionMessage(false);
  };

  const switchMode = (newMode) => {
    setTimerOn(false);
    setCurrentMode(newMode);
    setTimeRemaining(DURATIONS[newMode]);
    setShowCompletionMessage(false);
  };

  const getNextMode = () => {
    if (currentMode === MODES.FOCUS) {
      // After 4 pomodoros, take a long break
      return pomodorosCompleted > 0 && pomodorosCompleted % 4 === 0
        ? MODES.LONG_BREAK
        : MODES.SHORT_BREAK;
    }
    return MODES.FOCUS;
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case MODES.FOCUS:
        return 'Focus';
      case MODES.SHORT_BREAK:
        return 'Short Break';
      case MODES.LONG_BREAK:
        return 'Long Break';
      default:
        return '';
    }
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case MODES.FOCUS:
        return '#e94560';
      case MODES.SHORT_BREAK:
        return '#4caf50';
      case MODES.LONG_BREAK:
        return '#2196f3';
      default:
        return '#e94560';
    }
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
      <div className='timer-header'>
        <div className='timer-header-left'></div>
        <div className='timer-header-right'>
          <div className='timer-toggle-dropdown'>
            <button className='timer-toggle-btn' onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
              <IoStatsChart size={20} />
            </button>
            <select
              className='view-select'
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
            >
              <option value='recent'>Recent</option>
              <option value='calendar'>Calendar</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'recent' ? (
        <div className='timer-view'>
          {/* Mode Selector Tabs */}
          <div className='mode-tabs'>
            <button
              className={`mode-tab ${currentMode === MODES.FOCUS ? 'active' : ''}`}
              onClick={() => switchMode(MODES.FOCUS)}
              disabled={timerOn}
            >
              Focus
            </button>
            <button
              className={`mode-tab ${currentMode === MODES.SHORT_BREAK ? 'active' : ''}`}
              onClick={() => switchMode(MODES.SHORT_BREAK)}
              disabled={timerOn}
            >
              Short Break
            </button>
            <button
              className={`mode-tab ${currentMode === MODES.LONG_BREAK ? 'active' : ''}`}
              onClick={() => switchMode(MODES.LONG_BREAK)}
              disabled={timerOn}
            >
              Long Break
            </button>
          </div>

          <h2 style={{ color: getModeColor(currentMode) }}>
            {getModeLabel(currentMode)}
          </h2>

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

          {/* Completion Message */}
          {showCompletionMessage && (
            <div className='completion-message'>
              <h3>
                {currentMode === MODES.FOCUS
                  ? '🎉 Focus session complete!'
                  : '✨ Break time is over!'}
              </h3>
              <p>
                {currentMode === MODES.FOCUS
                  ? `Time for a ${pomodorosCompleted % 4 === 0 ? 'long' : 'short'} break!`
                  : 'Ready to focus again?'}
              </p>
              <button
                className='next-mode-btn'
                onClick={() => switchMode(getNextMode())}
              >
                Start {getModeLabel(getNextMode())}
              </button>
            </div>
          )}

          <div className='timer-controls'>
            {!timerOn ? (
              <button className='start-btn' onClick={handleStartTimer}>
                {showCompletionMessage ? 'Continue Current Mode' : 'Start'}
              </button>
            ) : (
              <button onClick={handleStopTimer}>Stop</button>
            )}
            <button onClick={handleClearTimer}>Reset</button>
          </div>

          {/* Session Info */}
          <div className='session-info-panel'>
            {currentMode === MODES.FOCUS && pomodorosCompleted > 0 && (
              <div className='pomodoro-counter'>
                <span className='counter-label'>Pomodoros completed:</span>
                <span className='counter-value'>{pomodorosCompleted}</span>
              </div>
            )}
            {totalTimeWorked > 0 && (
              <div className='time-worked'>
                <span className='time-label'>Today's work time:</span>
                <span className='time-value'>{formatTotalTime()}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CalendarView />
      )}
    </div>
  );
};

export default Timer;
