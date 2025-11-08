import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG from './gradientSVG';
import CalendarView from './CalendarView';
import RecentSessions from './RecentSessions';
import { IoStatsChart, IoSettingsSharp, IoPlayCircle, IoPauseCircle, IoStopCircle, IoRefresh, IoEye, IoEyeOff } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import '../App.css'; // Import your CSS file for styling

const Timer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statsTab, setStatsTab] = useState('recent'); // 'recent' or 'calendar'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fullFocusMode, setFullFocusMode] = useState(false);
  const [isCompletionMinimized, setIsCompletionMinimized] = useState(false);

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
            setIsPaused(false);
            handleTimerComplete();
            return DURATIONS[currentMode];
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerOn, isPaused, currentMode]);

  const handleTimerComplete = () => {
    // Send browser notification
    const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');

    if ('Notification' in window && Notification.permission === 'granted') {
      if (currentMode === MODES.FOCUS && notificationSettings.pomodoroComplete) {
        new Notification('Pomodoro Complete! 🎉', {
          body: 'Great work! Time for a break.',
          icon: '/favicon.ico',
          tag: 'pomodoro-complete'
        });
      } else if (currentMode !== MODES.FOCUS && notificationSettings.breakComplete) {
        new Notification('Break Complete! ✨', {
          body: 'Time to get back to work!',
          icon: '/favicon.ico',
          tag: 'break-complete'
        });
      }
    }

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
    setTimeRemaining(DURATIONS[currentMode]);
  };

  const handleClearTimer = () => {
    setTimeRemaining(DURATIONS[currentMode]);
    setShowCompletionMessage(false);
    setIsPaused(false);
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
    <div className={`timer-container ${fullFocusMode ? 'full-focus' : ''}`}>
      {/* Timer Section - Always Visible */}
      <div className='timer-section'>
        {/* Header with toggles */}
        <div className='timer-header-new'>
          <div className='timer-header-left-new'>
          </div>
          <div className='timer-header-right-new'>
            {!fullFocusMode && (
              <>
                <button className='settings-toggle-btn' onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
                  <IoSettingsSharp size={20} />
                </button>
                <button className='stats-toggle-btn' onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
                  <IoStatsChart size={20} />
                </button>
              </>
            )}
            <button
              className='full-focus-toggle'
              onClick={() => setFullFocusMode(!fullFocusMode)}
              data-tooltip={fullFocusMode ? 'Exit Full Focus' : 'Full Focus'}
            >
              {fullFocusMode ? (
                <>
                  <IoEyeOff size={20} />
                  <span>Exit Full Focus</span>
                </>
              ) : (
                <>
                  <IoEye size={20} />
                  <span>Full Focus</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress stats under header buttons on right */}
        {!fullFocusMode && (
          <div className='session-info-panel-new'>
            <div className='today-progress-panel'>
              <div className='today-progress-header'>
                <span className='today-label'>Today</span>
                {currentMode === MODES.FOCUS && pomodorosCompleted > 0 && (
                  <div className='today-pomodoro-icons'>
                    {[...Array(pomodorosCompleted)].map((_, i) => (
                      <GiTomato key={i} size={18} className='pomodoro-icon-completed' />
                    ))}
                  </div>
                )}
              </div>
              {totalTimeWorked > 0 && (
                <div className='today-time-focused'>
                  <span className='time-value-new'>{formatTotalTime()} in focus</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className='timer-view'>
          {/* Completion Message - Above Timer */}
          {showCompletionMessage && (
            <div className={`completion-message ${isCompletionMinimized ? 'minimized' : ''}`}>
              <button
                className='minimize-completion-btn'
                onClick={() => setIsCompletionMinimized(!isCompletionMinimized)}
                title={isCompletionMinimized ? 'Maximize' : 'Minimize'}
              >
                {isCompletionMinimized ? '□' : '−'}
              </button>
              {!isCompletionMinimized ? (
                <>
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
                </>
              ) : (
                <div className='completion-minimized-content'>
                  <span className='minimized-emoji'>
                    {currentMode === MODES.FOCUS ? '🎉' : '✨'}
                  </span>
                  <span className='minimized-text'>Session complete</span>
                </div>
              )}
            </div>
          )}

          {/* New Timer Layout: Mode buttons left, Timer center */}
          <div className='timer-main-layout-new'>
            {/* Left: Mode Selector Buttons */}
            {!fullFocusMode && (
              <div className='mode-tabs-vertical'>
                <button
                  className={`mode-tab-vertical ${currentMode === MODES.FOCUS ? 'active' : ''}`}
                  onClick={() => switchMode(MODES.FOCUS)}
                  disabled={timerOn}
                >
                  Focus
                </button>
                <button
                  className={`mode-tab-vertical ${currentMode === MODES.SHORT_BREAK ? 'active' : ''}`}
                  onClick={() => switchMode(MODES.SHORT_BREAK)}
                  disabled={timerOn}
                >
                  Short Break
                </button>
                <button
                  className={`mode-tab-vertical ${currentMode === MODES.LONG_BREAK ? 'active' : ''}`}
                  onClick={() => switchMode(MODES.LONG_BREAK)}
                  disabled={timerOn}
                >
                  Long Break
                </button>
              </div>
            )}

            {/* Center: Timer */}
            <div className='timer-center-new'>
              {!fullFocusMode && (
                <h2 style={{ color: getModeColor(currentMode) }}>
                  {getModeLabel(currentMode)}
                </h2>
              )}

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

              {/* Controls below timer */}
              <div className='timer-controls-below'>
                {!timerOn ? (
                  <button className='control-btn start-btn' onClick={handleStartTimer}>
                    <IoPlayCircle size={32} />
                    <span>{showCompletionMessage ? 'Continue' : 'Start'}</span>
                  </button>
                ) : isPaused ? (
                  <>
                    <button className='control-btn resume-btn' onClick={handleResumeTimer}>
                      <IoPlayCircle size={32} />
                      <span>Resume</span>
                    </button>
                    <button className='control-btn stop-btn' onClick={handleStopTimer}>
                      <IoStopCircle size={32} />
                      <span>Stop</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button className='control-btn pause-btn' onClick={handlePauseTimer}>
                      <IoPauseCircle size={32} />
                      <span>Pause</span>
                    </button>
                    <button className='control-btn stop-btn' onClick={handleStopTimer}>
                      <IoStopCircle size={32} />
                      <span>Stop</span>
                    </button>
                  </>
                )}
                <button className='control-btn reset-btn' onClick={handleClearTimer}>
                  <IoRefresh size={32} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
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
