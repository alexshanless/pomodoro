import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG, { GRADIENT_ID } from './gradientSVG';
import CalendarView from './CalendarView';
import RecentSessions from './RecentSessions';
import TagInput from './TagInput';
import { IoStatsChart, IoSettingsSharp, IoPlay, IoPause, IoStop, IoRefresh, IoEye, IoEyeOff, IoMusicalNotes, IoCheckmark, IoTime, IoWallet, IoDownloadOutline } from 'react-icons/io5';
import { useTimer, getLocalDateString } from '../contexts/TimerContext';
import { useKeyboardShortcut, announce, useFocusTrap } from '../utils/accessibility';
import StatsDrawer from './StatsDrawer';
import {
  Stage, Toolbar, Tool, Popover, StatRow, PopoverLink,
  Task, TaskSetup, TaskInput, Suggestions, Suggestion, TaskSummary, TaskTitle, Chips, Chip,
  Modes, Mode, Ring, RingRotor, Readout, TimeText, ModeReadoutLabel,
  Meta, Field, Tags, Controls, Control, ControlLabel, PrimaryBtn, GhostBtn, AccentBtn, Dots, Dot,
  SessionLive, SessionStat, SessionState, DrawerSession,
  OverlayRoot, Scrim, DrawerPanel, DrawerHead, DrawerClose, DrawerBody,
  SetSection, SetTitle, SetRow, SetText, Stepper, Switch, SwitchTrack, SwitchThumb,
} from './Timer.styles';
import '../App.css';

const MUSIC_ENABLED_KEY = 'isMusicEnabled';
const AUTO_FOCUS_DELAY_MS = 5000;

const Timer = () => {
  const {
    MODES,
    currentMode,
    timerOn,
    isPaused,
    pomodorosCompleted,
    showCompletionMessage,
    completionPercentage,
    sessionStartTime,
    isInActiveSession,
    selectedProject,
    sessionDescription,
    setSessionDescription,
    sessionTags,
    setSessionTags,
    projects,
    pomodoroSessions,
    settings,
    saveSettings,
    adjustSetting,
    displayTimeRemaining,
    formatSessionDuration,
    calculateCurrentEarnings,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleResetTimer,
    handleFinishEarly,
    switchMode,
    handleProjectChange,
  } = useTimer();

  // UI-only local state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStatsPopoverOpen, setIsStatsPopoverOpen] = useState(false);
  const [statsTab, setStatsTab] = useState('recent');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fullFocusMode, setFullFocusMode] = useState(false);
  const { trapRef: settingsTrapRef } = useFocusTrap(isSettingsOpen);
  const { trapRef: drawerTrapRef } = useFocusTrap(isDrawerOpen);

  // Autocomplete suggestions (setup screen only)
  const [suggestionsList, setSuggestionsList] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);

  // Focus-return targets for the settings drawer and stats drawer
  const settingsReturnFocusRef = useRef(null);
  const drawerReturnFocusRef = useRef(null);

  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    const saved = localStorage.getItem(MUSIC_ENABLED_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem(MUSIC_ENABLED_KEY, JSON.stringify(isMusicEnabled));
    window.dispatchEvent(new CustomEvent('musicToggle', { detail: { enabled: isMusicEnabled } }));
  }, [isMusicEnabled]);

  // Load activity + tag suggestions from past sessions; clean up legacy localStorage keys
  useEffect(() => {
    localStorage.removeItem('selectedProject');
    localStorage.removeItem('projects');
    localStorage.removeItem('nextProjectNumber');

    try {
      const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '[]');
      if (Array.isArray(sessions)) {
        const descriptions = sessions
          .map(s => s.description)
          .filter(d => d && d.trim() !== '')
          .filter((value, index, self) => self.indexOf(value) === index)
          .slice(-20);
        setSuggestionsList(descriptions);
      }
    } catch (err) {
      console.error('Error loading activity suggestions:', err);
      setSuggestionsList([]);
    }

    try {
      const sessionData = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
      const allTags = new Set();
      Object.values(sessionData).forEach(dayData => {
        if (dayData.sessions && Array.isArray(dayData.sessions)) {
          dayData.sessions.forEach(session => {
            if (session.tags && Array.isArray(session.tags)) {
              session.tags.forEach(tag => {
                if (tag && tag.trim()) allTags.add(tag.trim().toLowerCase());
              });
            }
          });
        }
      });
      setTagSuggestions(Array.from(allTags).slice(0, 20));
    } catch (err) {
      console.error('Error loading tag suggestions:', err);
      setTagSuggestions([]);
    }
  }, []);

  // Auto-engage full focus mode 5s after timer starts; exit immediately on pause/stop
  useEffect(() => {
    if (timerOn && !isPaused) {
      const timeoutId = setTimeout(() => setFullFocusMode(true), AUTO_FOCUS_DELAY_MS);
      return () => clearTimeout(timeoutId);
    }
    setFullFocusMode(false);
  }, [timerOn, isPaused]);

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

  const handleSuggestionClick = (suggestion) => {
    setSessionDescription(suggestion);
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  const handleDescriptionBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Keyboard shortcuts
  useKeyboardShortcut(' ', () => {
    if (!timerOn && !isPaused) {
      handleStartTimer();
      announce('Timer started');
    } else if (isPaused) {
      handleResumeTimer();
      announce('Timer resumed');
    } else {
      handlePauseTimer();
      announce('Timer paused');
    }
  });

  useKeyboardShortcut('r', () => {
    handleResetTimer();
    announce('Timer reset');
  });

  useKeyboardShortcut('s', () => {
    if (settings.continuousTracking && (timerOn || isPaused) && isInActiveSession) {
      handleFinishEarly();
    }
  });

  // ---- Overlay coordination: only one of settings drawer / stats popover open ----
  const toggleSettings = () => {
    setIsSettingsOpen((prev) => {
      const next = !prev;
      if (next) {
        settingsReturnFocusRef.current = document.activeElement;
        setIsStatsPopoverOpen(false);
      }
      return next;
    });
  };
  const closeSettings = () => setIsSettingsOpen(false);
  const toggleStatsPopover = () => {
    setIsStatsPopoverOpen((prev) => {
      const next = !prev;
      if (next) setIsSettingsOpen(false);
      return next;
    });
  };
  const openDetailedStats = () => {
    drawerReturnFocusRef.current = document.activeElement;
    setIsStatsPopoverOpen(false);
    setIsDrawerOpen(true);
  };
  const closeDrawer = () => setIsDrawerOpen(false);

  // Restore focus to the trigger when the settings drawer closes
  useEffect(() => {
    if (isSettingsOpen) return;
    const target = settingsReturnFocusRef.current;
    if (target && typeof target.focus === 'function') {
      target.focus();
      settingsReturnFocusRef.current = null;
    }
  }, [isSettingsOpen]);

  // Restore focus to the trigger when the stats drawer closes
  useEffect(() => {
    if (isDrawerOpen) return;
    const target = drawerReturnFocusRef.current;
    if (target && typeof target.focus === 'function') {
      target.focus();
      drawerReturnFocusRef.current = null;
    }
  }, [isDrawerOpen]);

  // Today's totals for the stats popover
  const todayStats = pomodoroSessions[getLocalDateString()] || {};
  const todayCount = todayStats.completed || 0;
  const todayFocusMinutes = todayStats.totalMinutes || 0;
  const formatFocusTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Esc dismisses whichever overlay is open
  useEffect(() => {
    if (!isSettingsOpen && !isStatsPopoverOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (isSettingsOpen) setIsSettingsOpen(false);
      else setIsStatsPopoverOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSettingsOpen, isStatsPopoverOpen]);

  // Outside-click dismisses the stats popover
  useEffect(() => {
    if (!isStatsPopoverOpen) return undefined;
    const onPointerDown = (e) => {
      if (!e.target.closest('[data-stats-popover]') && !e.target.closest('[data-tool="stats"]')) {
        setIsStatsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isStatsPopoverOpen]);

  // Lock body scroll while the settings drawer is open
  useEffect(() => {
    if (!isSettingsOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isSettingsOpen]);

  const sessionState = (timerOn || isPaused) ? 'active' : 'idle';
  const modeLabel = currentMode === MODES.SHORT_BREAK
    ? 'Short Break'
    : currentMode === MODES.LONG_BREAK
      ? 'Long Break'
      : 'Focus';
  const taskTitle = (sessionDescription && sessionDescription.trim())
    || (currentMode === MODES.FOCUS ? 'Focus session' : modeLabel);
  const hasSessionSummary = Boolean(
    (sessionDescription && sessionDescription.trim()) || selectedProject || sessionTags.length > 0
  );
  const dotsTotal = settings.longBreakInterval || 4;
  const dotsDone = pomodorosCompleted % dotsTotal;

  return (
    <Stage data-zen={fullFocusMode ? 'true' : 'false'}>
      {/* Vertical toolbar — settings, stats, zen, music */}
      <Toolbar>
        <Tool
          onClick={toggleSettings}
          aria-pressed={isSettingsOpen}
          aria-label='Settings'
          title='Settings'
        >
          <IoSettingsSharp aria-hidden='true' />
        </Tool>
        <Tool
          data-tool='stats'
          onClick={toggleStatsPopover}
          aria-pressed={isStatsPopoverOpen}
          aria-label='Stats'
          title='Stats'
        >
          <IoStatsChart aria-hidden='true' />
        </Tool>
        <Tool
          data-zen-tool='true'
          onClick={() => setFullFocusMode(!fullFocusMode)}
          aria-pressed={fullFocusMode}
          aria-label={fullFocusMode ? 'Exit zen mode' : 'Zen mode'}
          title='Zen mode'
        >
          {fullFocusMode ? <IoEyeOff aria-hidden='true' /> : <IoEye aria-hidden='true' />}
        </Tool>
        <Tool
          onClick={() => setIsMusicEnabled(!isMusicEnabled)}
          aria-pressed={isMusicEnabled}
          aria-label={isMusicEnabled ? 'Disable ambient sound' : 'Enable ambient sound'}
          title='Ambient sound'
        >
          <IoMusicalNotes aria-hidden='true' />
        </Tool>
        <Tool
          as='a'
          href='https://github.com/alexshanless/pomodoro/releases/latest/download/PomPay.exe'
          $desktopOnly
          aria-label='Download the Windows desktop app'
          title='Download desktop app'
        >
          <IoDownloadOutline aria-hidden='true' />
        </Tool>
      </Toolbar>

      {/* Stats popover — drops from the toolbar icon, no scrim */}
      {isStatsPopoverOpen && (
        <Popover data-stats-popover='true' role='region' aria-label="Today's stats">
          <h3>Today</h3>
          <StatRow><span>Pomodoros</span><b>{todayCount}</b></StatRow>
          <StatRow><span>Focus time</span><b>{formatFocusTime(todayFocusMinutes)}</b></StatRow>
          <PopoverLink onClick={openDetailedStats}>View recent &amp; calendar</PopoverLink>
        </Popover>
      )}

      {/* Task header — hero input (setup) / read-only summary (running). */}
      {sessionState === 'idle' ? (
        <Task>
          <TaskSetup>
            <TaskInput
              type='text'
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
              autoComplete='off'
              aria-label='Session description'
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <Suggestions>
                {filteredSuggestions.map((suggestion, index) => (
                  <Suggestion
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Suggestion>
                ))}
              </Suggestions>
            )}
          </TaskSetup>
        </Task>
      ) : (
        hasSessionSummary && (
          <Task>
            <TaskSummary>
              <TaskTitle>{taskTitle}</TaskTitle>
            </TaskSummary>
          </Task>
        )
      )}

      {/* Mode tabs — setup only */}
      {sessionState === 'idle' && (
        <Modes role='tablist' aria-label='Timer mode'>
          <Mode
            role='tab'
            aria-selected={currentMode === MODES.FOCUS}
            onClick={() => switchMode(MODES.FOCUS)}
          >
            Focus
          </Mode>
          <Mode
            role='tab'
            aria-selected={currentMode === MODES.SHORT_BREAK}
            onClick={() => switchMode(MODES.SHORT_BREAK)}
          >
            Short Break
          </Mode>
          <Mode
            role='tab'
            aria-selected={currentMode === MODES.LONG_BREAK}
            onClick={() => switchMode(MODES.LONG_BREAK)}
          >
            Long Break
          </Mode>
        </Modes>
      )}

      {/* Timer ring */}
      <Ring>
        <GradientSVG />
        <RingRotor>
          <CircularProgressbar
            value={completionPercentage}
            circleRatio={0.8}
            styles={buildStyles({
              pathColor: `url(#${GRADIENT_ID})`,
              trailColor: '#232c42',
            })}
          />
        </RingRotor>
        <Readout>
          <TimeText>{displayTimeRemaining()}</TimeText>
          <ModeReadoutLabel>{modeLabel}</ModeReadoutLabel>
        </Readout>
      </Ring>

      {/* Meta row — project + tags fields in setup; the same info as read-only
          chips in the same spot while running (no layout jump). */}
      {sessionState === 'idle' ? (
        <Meta>
          <Field
            value={selectedProject?.id || ''}
            onChange={handleProjectChange}
            aria-label='Select project'
          >
            <option value=''>No Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Field>
          <Tags>
            <TagInput
              tags={sessionTags}
              onChange={setSessionTags}
              suggestions={tagSuggestions}
              placeholder='Add tags…'
              maxTags={5}
            />
          </Tags>
        </Meta>
      ) : (
        <Meta>
          <Field
            value={selectedProject?.id || ''}
            onChange={handleProjectChange}
            aria-label='Select project'
          >
            <option value=''>No Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Field>
          {sessionTags.length > 0 && (
            <Chips>
              {sessionTags.map((tag) => (
                <Chip key={tag} $tag>{tag}</Chip>
              ))}
            </Chips>
          )}
        </Meta>
      )}

      {/* Controls */}
      <Controls>
        {sessionState === 'idle' ? (
          <>
            <Control>
              <PrimaryBtn
                onClick={handleStartTimer}
                aria-label={showCompletionMessage ? 'Continue' : 'Start timer'}
              >
                <IoPlay aria-hidden='true' />
              </PrimaryBtn>
              <ControlLabel aria-hidden='true'>{showCompletionMessage ? 'Continue' : 'Start'}</ControlLabel>
            </Control>
            <Control>
              <GhostBtn onClick={handleResetTimer} aria-label='Reset timer'>
                <IoRefresh aria-hidden='true' />
              </GhostBtn>
              <ControlLabel aria-hidden='true'>Reset</ControlLabel>
            </Control>
          </>
        ) : (
          <>
            <Control>
              <PrimaryBtn
                onClick={isPaused ? handleResumeTimer : handlePauseTimer}
                aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
              >
                {isPaused ? <IoPlay aria-hidden='true' /> : <IoPause aria-hidden='true' />}
              </PrimaryBtn>
              <ControlLabel aria-hidden='true'>{isPaused ? 'Resume' : 'Pause'}</ControlLabel>
            </Control>
            {settings.continuousTracking && isInActiveSession && (
              <Control>
                <AccentBtn onClick={handleFinishEarly} aria-label='Finish and save session'>
                  <IoCheckmark aria-hidden='true' />
                </AccentBtn>
                <ControlLabel aria-hidden='true'>Save</ControlLabel>
              </Control>
            )}
            <Control>
              <GhostBtn onClick={handleResetTimer} aria-label='Stop and discard'>
                <IoStop aria-hidden='true' />
              </GhostBtn>
              <ControlLabel aria-hidden='true'>Discard</ControlLabel>
            </Control>
          </>
        )}
      </Controls>

      {/* Session dots */}
      <Dots aria-label={`${dotsDone} of ${dotsTotal} pomodoros in this set`}>
        {[...Array(dotsTotal)].map((_, i) => (
          <Dot key={i} $done={i < dotsDone} />
        ))}
      </Dots>

      {/* Live session tracker — time + earnings while a session runs */}
      {sessionState !== 'idle' && settings.continuousTracking && isInActiveSession && sessionStartTime && (
        <SessionLive>
          <SessionStat>
            <IoTime size={16} aria-hidden='true' />
            <span>Session</span>
            <b>{formatSessionDuration()}</b>
          </SessionStat>
          {selectedProject?.rate > 0 && (
            <SessionStat>
              <IoWallet size={16} aria-hidden='true' />
              <span>Earned</span>
              <b>${calculateCurrentEarnings()}</b>
            </SessionStat>
          )}
          <SessionState $paused={isPaused}>{isPaused ? 'Paused' : 'Active'}</SessionState>
        </SessionLive>
      )}

      {/* Settings drawer (portaled to body, over a blurred scrim) */}
      {isSettingsOpen && createPortal(
        <OverlayRoot>
          <Scrim onClick={closeSettings} aria-hidden='true' />
          <DrawerPanel role='dialog' aria-modal='true' aria-label='Settings' ref={settingsTrapRef}>
            <DrawerHead>
              <h2>Settings</h2>
              <DrawerClose onClick={closeSettings} aria-label='Close settings'>&times;</DrawerClose>
            </DrawerHead>
            <DrawerBody>
              <SetSection>
                <SetTitle>Durations</SetTitle>
                <SetRow>
                  <SetText><span>Focus</span></SetText>
                  <Stepper>
                    <button onClick={() => adjustSetting('focusDuration', -1, 1, 90)} aria-label='Decrease focus duration'>&minus;</button>
                    <b>{settings.focusDuration}</b>
                    <button onClick={() => adjustSetting('focusDuration', 1, 1, 90)} aria-label='Increase focus duration'>+</button>
                  </Stepper>
                </SetRow>
                <SetRow>
                  <SetText><span>Short break</span></SetText>
                  <Stepper>
                    <button onClick={() => adjustSetting('shortBreakDuration', -1, 1, 30)} aria-label='Decrease short break'>&minus;</button>
                    <b>{settings.shortBreakDuration}</b>
                    <button onClick={() => adjustSetting('shortBreakDuration', 1, 1, 30)} aria-label='Increase short break'>+</button>
                  </Stepper>
                </SetRow>
                <SetRow>
                  <SetText><span>Long break</span></SetText>
                  <Stepper>
                    <button onClick={() => adjustSetting('longBreakDuration', -1, 1, 60)} aria-label='Decrease long break'>&minus;</button>
                    <b>{settings.longBreakDuration}</b>
                    <button onClick={() => adjustSetting('longBreakDuration', 1, 1, 60)} aria-label='Increase long break'>+</button>
                  </Stepper>
                </SetRow>
                <SetRow>
                  <SetText><span>Long break interval</span><small>Pomodoros before a long break</small></SetText>
                  <Stepper>
                    <button onClick={() => adjustSetting('longBreakInterval', -1, 2, 10)} aria-label='Decrease interval'>&minus;</button>
                    <b>{settings.longBreakInterval}</b>
                    <button onClick={() => adjustSetting('longBreakInterval', 1, 2, 10)} aria-label='Increase interval'>+</button>
                  </Stepper>
                </SetRow>
              </SetSection>

              <SetSection>
                <SetTitle>Auto-start</SetTitle>
                <SetRow>
                  <SetText><span>Auto-start breaks</span></SetText>
                  <Switch>
                    <input
                      type='checkbox'
                      checked={settings.autoStartBreaks}
                      onChange={(e) => saveSettings({ ...settings, autoStartBreaks: e.target.checked })}
                      aria-label='Auto-start breaks'
                    />
                    <SwitchTrack /><SwitchThumb />
                  </Switch>
                </SetRow>
                <SetRow>
                  <SetText><span>Auto-start pomodoros</span></SetText>
                  <Switch>
                    <input
                      type='checkbox'
                      checked={settings.autoStartPomodoros}
                      onChange={(e) => saveSettings({ ...settings, autoStartPomodoros: e.target.checked })}
                      aria-label='Auto-start pomodoros'
                    />
                    <SwitchTrack /><SwitchThumb />
                  </Switch>
                </SetRow>
              </SetSection>

              <SetSection>
                <SetTitle>Tracking</SetTitle>
                <SetRow>
                  <SetText><span>Continuous tracking</span><small>Track across pomodoros and breaks</small></SetText>
                  <Switch>
                    <input
                      type='checkbox'
                      checked={settings.continuousTracking}
                      onChange={(e) => saveSettings({ ...settings, continuousTracking: e.target.checked })}
                      aria-label='Continuous tracking'
                    />
                    <SwitchTrack /><SwitchThumb />
                  </Switch>
                </SetRow>
                {settings.continuousTracking && (
                  <SetRow>
                    <SetText><span>Include break time</span><small>Count break time in session duration</small></SetText>
                    <Switch>
                      <input
                        type='checkbox'
                        checked={settings.includeBreaksInTracking}
                        onChange={(e) => saveSettings({ ...settings, includeBreaksInTracking: e.target.checked })}
                        aria-label='Include break time'
                      />
                      <SwitchTrack /><SwitchThumb />
                    </Switch>
                  </SetRow>
                )}
              </SetSection>

              <SetSection>
                <SetTitle>Sound</SetTitle>
                <SetRow>
                  <SetText><span>Completion sound</span><small>Chime when a timer ends</small></SetText>
                  <Switch>
                    <input
                      type='checkbox'
                      checked={settings.completionSound}
                      onChange={(e) => saveSettings({ ...settings, completionSound: e.target.checked })}
                      aria-label='Completion sound'
                    />
                    <SwitchTrack /><SwitchThumb />
                  </Switch>
                </SetRow>
              </SetSection>
            </DrawerBody>
          </DrawerPanel>
        </OverlayRoot>,
        document.body
      )}

      <StatsDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        trapRef={drawerTrapRef}
      >
        {settings.continuousTracking && isInActiveSession && sessionStartTime && (
          <DrawerSession>
            <SessionStat>
              <IoTime size={16} aria-hidden='true' />
              <span>Session</span>
              <b>{formatSessionDuration()}</b>
            </SessionStat>
            {selectedProject?.rate > 0 && (
              <SessionStat>
                <IoWallet size={16} aria-hidden='true' />
                <span>Earned</span>
                <b>${calculateCurrentEarnings()}</b>
              </SessionStat>
            )}
            <SessionState $paused={isPaused}>{isPaused ? 'Paused' : 'Active'}</SessionState>
          </DrawerSession>
        )}
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
            <RecentSessions sessions={pomodoroSessions} />
          ) : (
            <CalendarView sessions={pomodoroSessions} />
          )}
        </div>
      </StatsDrawer>
    </Stage>
  );
};

export default Timer;
