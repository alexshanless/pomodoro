import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG from './gradientSVG';
import CalendarView from './CalendarView';
import RecentSessions from './RecentSessions';
import { IoStatsChart, IoSettingsSharp } from 'react-icons/io5';
import '../App.css'; // Import your CSS file for styling

const Timer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statsTab, setStatsTab] = useState('recent'); // 'recent' or 'calendar'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Timer modes and durations
  const MODES = {
    FOCUS: 'focus',
    SHORT_BREAK: 'shortBreak',
    LONG_BREAK: 'longBreak'
  };

  // Load settings from localStorage
  const loadSettings = () => {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      longBreakInterval: 4
    };
  };

  const [settings, setSettings] = useState(loadSettings());

  const DURATIONS = {
    [MODES.FOCUS]: settings.focusDuration * 60,
    [MODES.SHORT_BREAK]: settings.shortBreakDuration * 60,
    [MODES.LONG_BREAK]: settings.longBreakDuration * 60
  };

  // Load initial state from localStorage
  const loadTimerState = () => {
    const saved = localStorage.getItem('pomodoroTimerState');
    if (saved) {
      const state = JSON.parse(saved);
      const today = new Date().toISOString().split('T')[0];
      // Only restore if it's from today
      if (state.date === today) {
        // If timer was running, calculate elapsed time
        if (state.timerOn && state.lastTick) {
          const now = Date.now();
          const elapsed = Math.floor((now - state.lastTick) / 1000);
          const newTimeRemaining = Math.max(0, state.timeRemaining - elapsed);
          return {
            ...state,
            timeRemaining: newTimeRemaining,
            timerOn: newTimeRemaining > 0 // Stop if time ran out
          };
        }
        return state;
      }
    }
    return {
      currentMode: MODES.FOCUS,
      timeRemaining: DURATIONS[MODES.FOCUS],
      timerOn: false,
      totalTimeWorked: 0,
      pomodorosCompleted: 0,
      showCompletionMessage: false,
      date: new Date().toISOString().split('T')[0],
      lastTick: null
    };
  };

  const initialState = loadTimerState();

  const [currentMode, setCurrentMode] = useState(initialState.currentMode);
  const [timeRemaining, setTimeRemaining] = useState(initialState.timeRemaining);
  const [timerOn, setTimerOn] = useState(initialState.timerOn);
  const [totalTimeWorked, setTotalTimeWorked] = useState(initialState.totalTimeWorked);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(initialState.pomodorosCompleted);
  const [showCompletionMessage, setShowCompletionMessage] = useState(initialState.showCompletionMessage);

  const idCSS = 'hello';
  const completionPercentage = (timeRemaining / DURATIONS[currentMode]) * 100;

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      currentMode,
      timeRemaining,
      timerOn, // Persist running state
      totalTimeWorked,
      pomodorosCompleted,
      showCompletionMessage,
      date: new Date().toISOString().split('T')[0],
      lastTick: timerOn ? Date.now() : null
    };
    localStorage.setItem('pomodoroTimerState', JSON.stringify(state));
  }, [currentMode, timeRemaining, totalTimeWorked, pomodorosCompleted, showCompletionMessage, timerOn]);

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
    if (timerOn && !isPaused) {
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

      // Auto-start break if enabled
      if (settings.autoStartBreaks) {
        const nextMode = getNextMode();
        setCurrentMode(nextMode);
        setTimeRemaining(DURATIONS[nextMode]);
        setTimerOn(true);
        setShowCompletionMessage(false);
        return;
      }
    } else {
      // Break completed, auto-start pomodoro if enabled
      if (settings.autoStartPomodoros) {
        setCurrentMode(MODES.FOCUS);
        setTimeRemaining(DURATIONS[MODES.FOCUS]);
        setTimerOn(true);
        setShowCompletionMessage(false);
        return;
      }
    }
    setShowCompletionMessage(true);
  };

  const handleStartTimer = () => {
    setShowCompletionMessage(false);
    setTimerOn(true);
    setIsPaused(false);
  };

  const handlePauseTimer = () => {
    setIsPaused(true);
  };

  const handleResumeTimer = () => {
    setIsPaused(false);
  };

  const handleStopTimer = () => {
    if (currentMode === MODES.FOCUS) {
      const timeWorked = DURATIONS[MODES.FOCUS] - timeRemaining;
      if (timeWorked > 0) {
        setTotalTimeWorked(prev => prev + timeWorked);
      }
    }
    setTimerOn(false);
    setIsPaused(false);
    setTimeRemaining(POMODORO_DURATION);
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
      // After configured interval of pomodoros, take a long break
      return pomodorosCompleted > 0 && pomodorosCompleted % settings.longBreakInterval === 0
        ? MODES.LONG_BREAK
        : MODES.SHORT_BREAK;
    }
    return MODES.FOCUS;
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
    // Update durations if timer is not running
    if (!timerOn) {
      const newDurations = {
        [MODES.FOCUS]: newSettings.focusDuration * 60,
        [MODES.SHORT_BREAK]: newSettings.shortBreakDuration * 60,
        [MODES.LONG_BREAK]: newSettings.longBreakDuration * 60
      };
      setTimeRemaining(newDurations[currentMode]);
    }
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
      {/* Timer Section - Always Visible */}
      <div className='timer-section'>
        <div className='timer-header'>
          <div className='timer-header-left'>
            <button className='settings-toggle-btn' onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              <IoSettingsSharp size={20} />
            </button>
          </div>
          <div className='timer-header-right'>
            <button className='stats-toggle-btn' onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
              <IoStatsChart size={20} />
            </button>
          </div>
        </div>

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
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className='form-modal' onClick={() => setIsSettingsOpen(false)}>
          <div className='settings-modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header-settings'>
              <h3>Timer Settings</h3>
              <button className='close-modal-btn' onClick={() => setIsSettingsOpen(false)}>
                ×
              </button>
            </div>
            <div className='settings-form'>
              <div className='settings-section'>
                <h4>Time (minutes)</h4>
                <div className='setting-item'>
                  <label>Focus Duration</label>
                  <input
                    type='number'
                    min='1'
                    max='60'
                    value={settings.focusDuration}
                    onChange={(e) => saveSettings({ ...settings, focusDuration: parseInt(e.target.value) || 25 })}
                  />
                </div>
                <div className='setting-item'>
                  <label>Short Break Duration</label>
                  <input
                    type='number'
                    min='1'
                    max='30'
                    value={settings.shortBreakDuration}
                    onChange={(e) => saveSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className='setting-item'>
                  <label>Long Break Duration</label>
                  <input
                    type='number'
                    min='1'
                    max='60'
                    value={settings.longBreakDuration}
                    onChange={(e) => saveSettings({ ...settings, longBreakDuration: parseInt(e.target.value) || 15 })}
                  />
                </div>
                <div className='setting-item'>
                  <label>Long Break Interval</label>
                  <input
                    type='number'
                    min='2'
                    max='10'
                    value={settings.longBreakInterval}
                    onChange={(e) => saveSettings({ ...settings, longBreakInterval: parseInt(e.target.value) || 4 })}
                  />
                  <span className='setting-hint'>Pomodoros before long break</span>
                </div>
              </div>

              <div className='settings-section'>
                <h4>Auto-Start</h4>
                <div className='setting-item-checkbox'>
                  <input
                    type='checkbox'
                    id='autoStartBreaks'
                    checked={settings.autoStartBreaks}
                    onChange={(e) => saveSettings({ ...settings, autoStartBreaks: e.target.checked })}
                  />
                  <label htmlFor='autoStartBreaks'>Auto-start breaks</label>
                </div>
                <div className='setting-item-checkbox'>
                  <input
                    type='checkbox'
                    id='autoStartPomodoros'
                    checked={settings.autoStartPomodoros}
                    onChange={(e) => saveSettings({ ...settings, autoStartPomodoros: e.target.checked })}
                  />
                  <label htmlFor='autoStartPomodoros'>Auto-start pomodoros</label>
                </div>
              </div>

              <div className='settings-actions'>
                <button className='btn-primary' onClick={() => setIsSettingsOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Drawer */}
      {isDrawerOpen && <div className='drawer-overlay' onClick={() => setIsDrawerOpen(false)}></div>}
      <div className={`stats-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className='drawer-header'>
          <h2>Statistics</h2>
          <button className='close-drawer-btn' onClick={() => setIsDrawerOpen(false)}>
            ×
          </button>
        </div>
        <div className='drawer-content'>
          <div className='stats-tabs-container'>
            <button
              className={`stats-tab-btn ${statsTab === 'recent' ? 'active' : ''}`}
              onClick={() => setStatsTab('recent')}
            >
              Recent
            </button>
            <button
              className={`stats-tab-btn ${statsTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setStatsTab('calendar')}
            >
              Calendar
            </button>
          </div>

          <div className='stats-content-area'>
            {statsTab === 'recent' ? (
              <RecentSessions />
            ) : (
              <CalendarView />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
