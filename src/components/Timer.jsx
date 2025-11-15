import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG from './gradientSVG';
import CalendarView from './CalendarView';
import RecentSessions from './RecentSessions';
import { IoStatsChart, IoSettingsSharp, IoPlayCircle, IoPauseCircle, IoRefresh, IoEye, IoEyeOff, IoMusicalNotes, IoClose } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useAuth } from '../contexts/AuthContext';
import { usePomodoroSessions } from '../hooks/usePomodoroSessions';
import { useProjects } from '../hooks/useProjects';
import '../App.css'; // Import your CSS file for styling

const Timer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statsTab, setStatsTab] = useState('recent'); // 'recent' or 'calendar'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fullFocusMode, setFullFocusMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sessionDescription, setSessionDescription] = useState('');
  const [suggestionsList, setSuggestionsList] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Use hooks for data management
  const { saveSession } = usePomodoroSessions();
  const { projects, updateProject } = useProjects();

  // Initialize music state from localStorage immediately (not in useEffect)
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    const savedMusicEnabled = localStorage.getItem('isMusicEnabled');
    return savedMusicEnabled !== null ? JSON.parse(savedMusicEnabled) : true;
  });

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
      longBreakInterval: 4,
      completionSound: true
    };
  };

  // Play completion beep sound
  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant two-tone beep: C5 -> E5
      oscillator.frequency.value = 523.25; // C5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);

      // Second tone
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.frequency.value = 659.25; // E5
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.15);
      }, 150);
    } catch (err) {
      console.log('Audio playback failed:', err);
    }
  };

  const [settings, setSettings] = useState(loadSettings());

  // Load selected project and activity suggestions on mount
  useEffect(() => {
    // Load selected project from localStorage
    const savedSelectedProject = localStorage.getItem('selectedProject');
    if (savedSelectedProject) {
      setSelectedProject(JSON.parse(savedSelectedProject));
    }

    // Load unique activity descriptions from past sessions
    try {
      const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '[]');
      if (Array.isArray(sessions)) {
        const descriptions = sessions
          .map(s => s.description)
          .filter(d => d && d.trim() !== '')
          .filter((value, index, self) => self.indexOf(value) === index) // unique only
          .slice(-20); // Keep last 20 unique descriptions
        setSuggestionsList(descriptions);
      }
    } catch (err) {
      console.log('Error loading activity suggestions:', err);
      setSuggestionsList([]);
    }
  }, []);

  // Save music toggle state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('isMusicEnabled', JSON.stringify(isMusicEnabled));
    // Dispatch custom event for App.js to listen to
    window.dispatchEvent(new CustomEvent('musicToggle', { detail: { enabled: isMusicEnabled } }));
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
        // If timer was running (not paused), calculate elapsed time
        if (state.timerOn && !state.isPaused && state.lastTick) {
          const now = Date.now();
          const elapsed = Math.floor((now - state.lastTick) / 1000);
          const newTimeRemaining = Math.max(0, state.timeRemaining - elapsed);
          return {
            ...state,
            timeRemaining: newTimeRemaining,
            timerOn: newTimeRemaining > 0, // Stop if time ran out
            isPaused: false,
            timerCompletedWhileAway: state.timeRemaining > 0 && newTimeRemaining === 0 // Flag if completed while away
          };
        }
        return state;
      }
    }
    return {
      currentMode: MODES.FOCUS,
      timeRemaining: DURATIONS[MODES.FOCUS],
      timerOn: false,
      isPaused: false,
      totalTimeWorked: 0,
      pomodorosCompleted: 0,
      showCompletionMessage: false,
      date: getLocalDateString(),
      lastTick: null,
      timerCompletedWhileAway: false
    };
  };

  const initialState = loadTimerState();

  const [currentMode, setCurrentMode] = useState(initialState.currentMode);
  const [timeRemaining, setTimeRemaining] = useState(initialState.timeRemaining);
  const [timerOn, setTimerOn] = useState(initialState.timerOn);
  const [isPaused, setIsPaused] = useState(initialState.isPaused);
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
      isPaused, // Persist paused state
      totalTimeWorked,
      pomodorosCompleted,
      showCompletionMessage,
      date: getLocalDateString(),
      lastTick: (timerOn && !isPaused) ? Date.now() : null
    };
    localStorage.setItem('pomodoroTimerState', JSON.stringify(state));
  }, [currentMode, timeRemaining, totalTimeWorked, pomodorosCompleted, showCompletionMessage, timerOn, isPaused]);

  const displayTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
      2,
      '0'
    )}`;
  };

  const savePomodoroSession = async () => {
    const endTime = new Date();
    const startTime = sessionStartTime || new Date(endTime.getTime() - settings.focusDuration * 60 * 1000);

    const sessionData = {
      mode: 'focus',
      duration: settings.focusDuration,
      projectId: selectedProject?.id || null,
      projectName: selectedProject?.name || null,
      description: sessionDescription || '',
      wasSuccessful: true,
      startedAt: startTime.toISOString(),
      endedAt: endTime.toISOString()
    };

    try {
      // Save session to database
      await saveSession(sessionData);

      // Clear description after saving
      setSessionDescription('');

      // Update project stats if a project is selected
      if (selectedProject && updateProject) {
        try {
          await updateProject(selectedProject.id, {
            total_time_minutes: (selectedProject.total_time_minutes || selectedProject.timeTracked || 0) + settings.focusDuration
          });
        } catch (projectError) {
          console.error('Failed to update project stats:', projectError);
          // Session still saved, just project stats failed - non-critical
        }
      }

      // Reset session start time
      setSessionStartTime(null);
    } catch (error) {
      console.error('Failed to save pomodoro session:', error);
      // Session failed to save - but user completed their work, so still show completion
      // Data is still saved to localStorage as fallback
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

  const handleTimerComplete = () => {
    // Play completion sound if enabled
    if (settings.completionSound) {
      playCompletionSound();
    }

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

      // Determine next mode (short or long break based on interval)
      const nextMode = newPomodorosCount > 0 && newPomodorosCount % settings.longBreakInterval === 0
        ? MODES.LONG_BREAK
        : MODES.SHORT_BREAK;

      setCurrentMode(nextMode);
      setTimeRemaining(DURATIONS[nextMode]);

      // Auto-start break only if setting is enabled
      if (settings.autoStartBreaks) {
        setTimerOn(true);
        setShowCompletionMessage(false);
        // No need to track start time for breaks
      } else {
        setShowCompletionMessage(true);
      }
      return;
    } else {
      // Break completed - initiate next pomodoro (switch to Focus mode)
      setCurrentMode(MODES.FOCUS);
      setTimeRemaining(DURATIONS[MODES.FOCUS]);

      // Auto-start only if setting is enabled
      if (settings.autoStartPomodoros) {
        setTimerOn(true);
        setShowCompletionMessage(false);
        // Track session start time for auto-started focus sessions
        setSessionStartTime(new Date());
      } else {
        setShowCompletionMessage(true);
      }
      return;
    }
  };

  // Check if timer completed while tab was inactive
  useEffect(() => {
    if (initialState.timerCompletedWhileAway) {
      // Timer completed while user was away - trigger completion logic
      handleTimerComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Handle description input change with autocomplete
  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    setSessionDescription(value);

    if (value.trim() === '') {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    } else {
      const filtered = suggestionsList.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    }
  };

  // Handle selecting a suggestion
  const handleSuggestionClick = (suggestion) => {
    setSessionDescription(suggestion);
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  // Handle closing suggestions on blur (with delay for click)
  const handleDescriptionBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleStartTimer = () => {
    setShowCompletionMessage(false);
    setTimerOn(true);
    setIsPaused(false);

    // Track session start time for focus mode
    if (currentMode === MODES.FOCUS) {
      setSessionStartTime(new Date());
    }
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

            {/* Description Input - Below mode buttons (authenticated users only) */}
            {user && (
              <div className='session-description-container-separated'>
                <input
                  type='text'
                  className='session-description-input'
                  placeholder='What are you working on?'
                  value={sessionDescription}
                  onChange={handleDescriptionChange}
                  onBlur={handleDescriptionBlur}
                  onFocus={() => {
                    if (sessionDescription.trim() !== '') {
                      const filtered = suggestionsList.filter(suggestion =>
                        suggestion.toLowerCase().includes(sessionDescription.toLowerCase())
                      );
                      if (filtered.length > 0) {
                        setFilteredSuggestions(filtered);
                        setShowSuggestions(true);
                      }
                    }
                  }}
                  maxLength={100}
                  aria-label="Session description"
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className='description-suggestions-dropdown'>
                    {filteredSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className='description-suggestion-item'
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Utility Controls - Top Right */}
        <div className='utility-controls'>
          {!fullFocusMode && (
            <>
              <button
                className={`music-toggle-btn ${isMusicEnabled ? 'active' : ''}`}
                onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                aria-label={isMusicEnabled ? 'Disable background music' : 'Enable background music'}
              >
                <IoMusicalNotes size={20} aria-hidden="true" />
              </button>
              <button className='settings-toggle-btn' onClick={() => setIsSettingsOpen(!isSettingsOpen)} aria-label="Open timer settings">
                <IoSettingsSharp size={20} aria-hidden="true" />
              </button>
              <button className='stats-toggle-btn' onClick={() => setIsDrawerOpen(!isDrawerOpen)} aria-label="Open statistics">
                <IoStatsChart size={20} aria-hidden="true" />
              </button>
            </>
          )}
          <button
            className='full-focus-toggle'
            onClick={() => setFullFocusMode(!fullFocusMode)}
            aria-label={fullFocusMode ? 'Exit full focus mode' : 'Enter full focus mode'}
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

        {/* Project Selector - Right corner under utility controls (authenticated users only) */}
        {!fullFocusMode && user && (
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
              aria-label="Select project"
            >
              <option value=''>No Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sign up CTA for non-authenticated users */}
        {!fullFocusMode && !user && (
          <div className='project-selector-cta'>
            <button
              className='signup-cta-btn'
              onClick={() => navigate('/signup')}
              aria-label="Sign up to track projects"
            >
              Sign up to track projects
            </button>
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
          <button className='control-btn start-btn' onClick={handleStartTimer} aria-label={showCompletionMessage ? 'Continue timer' : 'Start timer'}>
            <IoPlayCircle size={32} aria-hidden="true" />
            <span>{showCompletionMessage ? 'Continue' : 'Start'}</span>
          </button>
        ) : isPaused ? (
          <button className='control-btn resume-btn' onClick={handleResumeTimer} aria-label="Resume timer">
            <IoPlayCircle size={32} aria-hidden="true" />
            <span>Resume</span>
          </button>
        ) : (
          <button className='control-btn pause-btn' onClick={handlePauseTimer} aria-label="Pause timer">
            <IoPauseCircle size={32} aria-hidden="true" />
            <span>Pause</span>
          </button>
        )}
        <button className='control-btn reset-btn' onClick={handleResetTimer} aria-label={(timerOn || isPaused) ? 'Stop timer' : 'Reset timer'}>
          <IoRefresh size={32} aria-hidden="true" />
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

              <div className='settings-section'>
                <h4>Sound</h4>
                <div className='setting-item-checkbox'>
                  <input
                    type='checkbox'
                    id='completionSound'
                    checked={settings.completionSound}
                    onChange={(e) => saveSettings({ ...settings, completionSound: e.target.checked })}
                  />
                  <label htmlFor='completionSound'>Completion beep sound</label>
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
    </div>
  );
};

export default Timer;
