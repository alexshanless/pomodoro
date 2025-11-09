import React, { useState, useEffect, useRef } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG from './gradientSVG';
import CalendarView from './CalendarView';
import RecentSessions from './RecentSessions';
import { IoStatsChart, IoSettingsSharp, IoPlayCircle, IoPauseCircle, IoRefresh, IoEye, IoEyeOff, IoMusicalNotes, IoClose } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import '../App.css'; // Import your CSS file for styling

const Timer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statsTab, setStatsTab] = useState('recent'); // 'recent' or 'calendar'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fullFocusMode, setFullFocusMode] = useState(false);
  const audioRef = useRef(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);

  // Helper function to get local date in YYYY-MM-DD format
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  // Load projects and music settings on mount
  useEffect(() => {
    const loadedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    setProjects(loadedProjects);

    // Load selected project from localStorage
    const savedSelectedProject = localStorage.getItem('selectedProject');
    if (savedSelectedProject) {
      setSelectedProject(JSON.parse(savedSelectedProject));
    }

    // Load music toggle state from localStorage
    const savedMusicEnabled = localStorage.getItem('isMusicEnabled');
    if (savedMusicEnabled !== null) {
      setIsMusicEnabled(JSON.parse(savedMusicEnabled));
    }
  }, []);

  // Save music toggle state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('isMusicEnabled', JSON.stringify(isMusicEnabled));
  }, [isMusicEnabled]);

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
      const today = getLocalDateString();
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
      date: getLocalDateString(),
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
      date: getLocalDateString(),
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
    const today = getLocalDateString();
    const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');

    if (!sessions[today]) {
      sessions[today] = {
        completed: 0,
        totalMinutes: 0,
        sessions: []
      };
    }

    const sessionData = {
      timestamp: new Date().toISOString(),
      duration: settings.focusDuration,
      projectId: selectedProject?.id || null
    };

    sessions[today].completed += 1;
    sessions[today].totalMinutes += settings.focusDuration;
    sessions[today].sessions.push(sessionData);

    localStorage.setItem('pomodoroSessions', JSON.stringify(sessions));

    // Update project stats if a project is selected
    if (selectedProject) {
      const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      const projectIndex = allProjects.findIndex(p => p.id === selectedProject.id);

      if (projectIndex !== -1) {
        allProjects[projectIndex].timeTracked += settings.focusDuration;
        allProjects[projectIndex].pomodoros += 1;
        localStorage.setItem('projects', JSON.stringify(allProjects));

        // Update local state
        setProjects(allProjects);
        setSelectedProject(allProjects[projectIndex]);
      }
    }
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

  // Lo-fi radio control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Play audio when timer is running in focus mode and music is enabled
    if (timerOn && !isPaused && currentMode === MODES.FOCUS && isMusicEnabled) {
      audio.volume = timeRemaining <= 60 ? 0.3 : 0.6; // Lower volume in last minute
      audio.play().catch(err => console.log('Audio play failed:', err));
    } else {
      audio.pause();
    }

    return () => {
      if (audio) {
        audio.pause();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerOn, isPaused, currentMode, timeRemaining, isMusicEnabled]);

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
      const newPomodorosCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newPomodorosCount);

      // ALWAYS auto-start break after focus session
      // Determine if it should be short or long break based on interval
      const nextMode = newPomodorosCount > 0 && newPomodorosCount % settings.longBreakInterval === 0
        ? MODES.LONG_BREAK
        : MODES.SHORT_BREAK;

      setCurrentMode(nextMode);
      setTimeRemaining(DURATIONS[nextMode]);
      setTimerOn(true);
      setShowCompletionMessage(false);
      return;
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

  const handleResetTimer = () => {
    // If timer is running, stop it and save work time
    if (timerOn || isPaused) {
      if (currentMode === MODES.FOCUS) {
        const timeWorked = DURATIONS[MODES.FOCUS] - timeRemaining;
        if (timeWorked > 0) {
          setTotalTimeWorked(prev => prev + timeWorked);
        }
      }
      setTimerOn(false);
      setIsPaused(false);
    }
    setTimeRemaining(DURATIONS[currentMode]);
    setShowCompletionMessage(false);
  };

  const switchMode = (newMode) => {
    setTimerOn(false);
    setCurrentMode(newMode);
    setTimeRemaining(DURATIONS[newMode]);
    setShowCompletionMessage(false);
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

  return (
    <div className={`pomodoro-container ${fullFocusMode ? 'full-focus' : ''}`}>
      {/* Top Controls Zone */}
      <div className='top-controls-zone'>
        {!fullFocusMode && (
          <>
            {/* Today Progress - Top Left */}
            <div className='today-progress-panel-left'>
              <span className='today-label'>Today</span>
              <div className='today-pomodoro-icons'>
                {pomodorosCompleted > 0 ? (
                  <>
                    {[...Array(Math.min(pomodorosCompleted, 10))].map((_, i) => (
                      <GiTomato key={i} size={18} className='pomodoro-icon-completed' />
                    ))}
                    {pomodorosCompleted > 10 && (
                      <span className='pomodoro-count-extra'>+{pomodorosCompleted - 10}</span>
                    )}
                  </>
                ) : (
                  <span className='no-pomodoros-yet'>No pomodoros yet</span>
                )}
              </div>
            </div>

            {/* Mode Selector Buttons - Center */}
            <div className='mode-tabs-horizontal-header'>
              <button
                className={`mode-tab-horizontal ${currentMode === MODES.FOCUS ? 'active' : ''}`}
                onClick={() => switchMode(MODES.FOCUS)}
                disabled={timerOn}
              >
                Focus
              </button>
              <button
                className={`mode-tab-horizontal ${currentMode === MODES.SHORT_BREAK ? 'active' : ''}`}
                onClick={() => switchMode(MODES.SHORT_BREAK)}
                disabled={timerOn}
              >
                Short Break
              </button>
              <button
                className={`mode-tab-horizontal ${currentMode === MODES.LONG_BREAK ? 'active' : ''}`}
                onClick={() => switchMode(MODES.LONG_BREAK)}
                disabled={timerOn}
              >
                Long Break
              </button>
            </div>
          </>
        )}

        {/* Utility Controls - Top Right */}
        <div className='utility-controls'>
          {!fullFocusMode && (
            <>
              <button
                className={`music-toggle-btn ${isMusicEnabled ? 'active' : ''}`}
                onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                title={isMusicEnabled ? 'Disable Music' : 'Enable Music'}
              >
                <IoMusicalNotes size={20} />
              </button>
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

        {/* Project Selector */}
        {!fullFocusMode && (
          <div className='project-selector-container'>
            <select
              className='project-selector'
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const projectId = parseInt(e.target.value);
                const project = projects.find(p => p.id === projectId) || null;
                setSelectedProject(project);
                if (project) {
                  localStorage.setItem('selectedProject', JSON.stringify(project));
                } else {
                  localStorage.removeItem('selectedProject');
                }
              }}
            >
              <option value=''>No Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProject && (
              <div className='selected-project-info'>
                <span className='project-color-dot' style={{ backgroundColor: selectedProject.color }}></span>
                <span className='project-rate'>${selectedProject.rate}/hr</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timer Zone */}
      <div className='timer-zone'>
        <div className='timer-circle'>
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
        </div>
      </div>

      {/* Bottom Controls Zone */}
      <div className='bottom-controls-zone'>
        {!timerOn ? (
          <button className='control-btn start-btn' onClick={handleStartTimer}>
            <IoPlayCircle size={32} />
            <span>{showCompletionMessage ? 'Continue' : 'Start'}</span>
          </button>
        ) : isPaused ? (
          <button className='control-btn resume-btn' onClick={handleResumeTimer}>
            <IoPlayCircle size={32} />
            <span>Resume</span>
          </button>
        ) : (
          <button className='control-btn pause-btn' onClick={handlePauseTimer}>
            <IoPauseCircle size={32} />
            <span>Pause</span>
          </button>
        )}
        <button className='control-btn reset-btn' onClick={handleResetTimer}>
          <IoRefresh size={32} />
          <span>{(timerOn || isPaused) ? 'Stop' : 'Reset'}</span>
        </button>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className='form-modal' onClick={() => setIsSettingsOpen(false)}>
          <div className='settings-modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header-settings'>
              <h3>Timer Settings</h3>
              <button className='close-modal-btn' onClick={() => setIsSettingsOpen(false)}>
                <IoClose size={24} />
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
            <IoClose size={24} />
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

      {/* Lo-fi Radio Audio Element */}
      <audio
        ref={audioRef}
        src="https://radiorecord.hostingradio.ru/lofi96.aacp"
        loop
        preload="auto"
      />
    </div>
  );
};

export default Timer;
