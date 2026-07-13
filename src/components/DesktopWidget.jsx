import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  IoPlay, IoPause, IoStop, IoRefresh, IoCheckmark, IoMusicalNotes,
  IoClose, IoRemove, IoPin, IoTime, IoWallet
} from 'react-icons/io5';
import GradientSVG, { GRADIENT_ID } from './gradientSVG';
import { useTimer } from '../contexts/TimerContext';
import { useAuth } from '../contexts/AuthContext';

const MUSIC_ENABLED_KEY = 'isMusicEnabled';

const t = {
  bg: '#131a2a',
  bgSoft: '#1b2336',
  ink: '#eef1f8',
  soft: '#aab2c8',
  muted: '#6b7591',
  track: '#232c42',
  line: 'rgba(255, 255, 255, 0.07)',
  c1: '#38c6ff',
};

// Compact desktop gadget: timer + project switcher. Rendered bare (no nav)
// at /widget; the Electron shell in desktop/ loads this route in a frameless
// window and exposes window.pompayDesktop for the window buttons.
const DesktopWidget = () => {
  const {
    MODES, currentMode, timerOn, isPaused, completionPercentage,
    isInActiveSession, sessionStartTime, selectedProject, projects, settings,
    displayTimeRemaining, formatSessionDuration, calculateCurrentEarnings,
    handleStartTimer, handlePauseTimer, handleResumeTimer, handleResetTimer,
    handleFinishEarly, switchMode, handleProjectChange,
    saveSettings, adjustSetting,
  } = useTimer();
  const { user, signIn, signOut } = useAuth();

  const [tab, setTab] = useState('timer');
  const [pinned, setPinned] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    const saved = localStorage.getItem(MUSIC_ENABLED_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const desktop = window.pompayDesktop;
  const isRunning = timerOn || isPaused;

  useEffect(() => {
    localStorage.setItem(MUSIC_ENABLED_KEY, JSON.stringify(isMusicEnabled));
    window.dispatchEvent(new CustomEvent('musicToggle', { detail: { enabled: isMusicEnabled } }));
  }, [isMusicEnabled]);

  useEffect(() => {
    const handleMusicToggle = (e) => setIsMusicEnabled(e.detail.enabled);
    window.addEventListener('musicToggle', handleMusicToggle);
    return () => window.removeEventListener('musicToggle', handleMusicToggle);
  }, []);

  // The gadget has no UpdateNotice pill, so apply service-worker updates
  // silently: activate the waiting worker and reload. Covers both a worker
  // that finishes installing while running (swUpdate) and one already
  // waiting from a previous session.
  useEffect(() => {
    const activate = (waiting) => {
      if (!waiting) return;
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => window.location.reload(),
        { once: true }
      );
      waiting.postMessage({ type: 'SKIP_WAITING' });
    };

    const onSwUpdate = (e) => activate(e.detail?.waiting);
    window.addEventListener('swUpdate', onSwUpdate);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => activate(reg?.waiting));
    }

    return () => window.removeEventListener('swUpdate', onSwUpdate);
  }, []);

  const togglePin = async () => {
    if (!desktop?.togglePin) return;
    setPinned(await desktop.togglePin());
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    const { error } = await signIn(email.trim(), password);
    setAuthBusy(false);
    if (error) {
      setAuthError(error.message || 'Sign-in failed.');
      return;
    }
    setEmail('');
    setPassword('');
  };

  const modeLabel = currentMode === MODES.FOCUS
    ? 'Focus'
    : currentMode === MODES.SHORT_BREAK ? 'Short Break' : 'Long Break';

  return (
    <Shell>
      <Head>
        <Brand>
          <BrandDot />
          PomPay
        </Brand>
        <WinButtons>
          {desktop && (
            <>
              <WinBtn onClick={togglePin} $active={pinned} aria-label={pinned ? 'Unpin from top' : 'Pin on top'} title='Always on top'>
                <IoPin aria-hidden='true' />
              </WinBtn>
              <WinBtn onClick={() => desktop.minimize()} aria-label='Minimize' title='Minimize'>
                <IoRemove aria-hidden='true' />
              </WinBtn>
              <WinBtn onClick={() => desktop.close()} aria-label='Close' title='Close'>
                <IoClose aria-hidden='true' />
              </WinBtn>
            </>
          )}
        </WinButtons>
      </Head>

      <TabBar role='tablist'>
        <TabBtn role='tab' aria-selected={tab === 'timer'} $active={tab === 'timer'} onClick={() => setTab('timer')}>
          Timer
        </TabBtn>
        <TabBtn role='tab' aria-selected={tab === 'projects'} $active={tab === 'projects'} onClick={() => setTab('projects')}>
          Projects
        </TabBtn>
        <TabBtn role='tab' aria-selected={tab === 'settings'} $active={tab === 'settings'} onClick={() => setTab('settings')}>
          Settings
        </TabBtn>
      </TabBar>

      {tab === 'timer' ? (
        <Body>
          {!isRunning && (
            <ModeRow role='tablist' aria-label='Timer mode'>
              <ModeBtn $active={currentMode === MODES.FOCUS} onClick={() => switchMode(MODES.FOCUS)}>Focus</ModeBtn>
              <ModeBtn $active={currentMode === MODES.SHORT_BREAK} onClick={() => switchMode(MODES.SHORT_BREAK)}>Short</ModeBtn>
              <ModeBtn $active={currentMode === MODES.LONG_BREAK} onClick={() => switchMode(MODES.LONG_BREAK)}>Long</ModeBtn>
            </ModeRow>
          )}

          <Ring>
            <GradientSVG />
            <CircularProgressbar
              value={completionPercentage}
              circleRatio={0.8}
              strokeWidth={7}
              styles={buildStyles({
                rotation: 0.6,
                pathColor: `url(#${GRADIENT_ID})`,
                trailColor: t.track,
                strokeLinecap: 'round',
              })}
            />
            <Readout>
              <TimeText $paused={isPaused}>{displayTimeRemaining()}</TimeText>
              <ModeText>{modeLabel}{isPaused ? ' · Paused' : ''}</ModeText>
            </Readout>
          </Ring>

          {selectedProject && (
            <ProjectChip onClick={() => setTab('projects')} title='Switch project'>
              <Dot style={{ background: selectedProject.color }} />
              {selectedProject.name}
            </ProjectChip>
          )}

          <Controls>
            {!isRunning ? (
              <>
                <Primary onClick={handleStartTimer} aria-label='Start timer' title='Start'>
                  <IoPlay aria-hidden='true' />
                </Primary>
                <Ghost onClick={handleResetTimer} aria-label='Reset timer' title='Reset'>
                  <IoRefresh aria-hidden='true' />
                </Ghost>
              </>
            ) : (
              <>
                <Primary
                  onClick={isPaused ? handleResumeTimer : handlePauseTimer}
                  aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <IoPlay aria-hidden='true' /> : <IoPause aria-hidden='true' />}
                </Primary>
                {settings.continuousTracking && isInActiveSession && (
                  <Accent onClick={handleFinishEarly} aria-label='Finish and save session' title='Finish & save'>
                    <IoCheckmark aria-hidden='true' />
                  </Accent>
                )}
                <Ghost onClick={handleResetTimer} aria-label='Stop and discard' title='Stop & discard'>
                  <IoStop aria-hidden='true' />
                </Ghost>
              </>
            )}
            <Ghost
              onClick={() => setIsMusicEnabled(!isMusicEnabled)}
              $active={isMusicEnabled}
              aria-label={isMusicEnabled ? 'Disable music' : 'Enable music'}
              title='Music'
            >
              <IoMusicalNotes aria-hidden='true' />
            </Ghost>
          </Controls>

          {isRunning && settings.continuousTracking && isInActiveSession && sessionStartTime && (
            <Pills>
              <Pill><IoTime aria-hidden='true' /><b>{formatSessionDuration()}</b></Pill>
              {selectedProject?.rate > 0 && (
                <Pill><IoWallet aria-hidden='true' /><b>${calculateCurrentEarnings()}</b></Pill>
              )}
            </Pills>
          )}
        </Body>
      ) : tab === 'projects' ? (
        <Body>
          <ProjectList>
            <ProjectRow
              $active={!selectedProject}
              onClick={() => handleProjectChange({ target: { value: '' } })}
            >
              <Dot style={{ background: t.muted }} />
              No Project
            </ProjectRow>
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                $active={selectedProject?.id === project.id}
                onClick={() => handleProjectChange({ target: { value: project.id } })}
              >
                <Dot style={{ background: project.color }} />
                <span>{project.name}</span>
                {project.rate > 0 && <Rate>${project.rate}/h</Rate>}
              </ProjectRow>
            ))}
            {projects.length === 0 && (
              <Empty>No projects yet — create them on the web app.</Empty>
            )}
          </ProjectList>

          <Account>
            {user ? (
              <>
                <AccountMail title={user.email}>{user.email}</AccountMail>
                <AccountBtn onClick={() => signOut()}>Sign out</AccountBtn>
              </>
            ) : (
              <form onSubmit={handleSignIn}>
                <AccountHint>Sign in to sync with your account</AccountHint>
                <AuthInput
                  type='email'
                  placeholder='Email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <AuthInput
                  type='password'
                  placeholder='Password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {authError && <AuthError role='alert'>{authError}</AuthError>}
                <AccountBtn type='submit' disabled={authBusy} $primary>
                  {authBusy ? 'Signing in…' : 'Sign in'}
                </AccountBtn>
              </form>
            )}
          </Account>
        </Body>
      ) : (
        <Body>
          <SetList>
            <SetHeading>Durations (minutes)</SetHeading>
            <SetItem>
              <span>Focus</span>
              <Step>
                <button onClick={() => adjustSetting('focusDuration', -1, 1, 90)} aria-label='Decrease focus duration'>&minus;</button>
                <b>{settings.focusDuration}</b>
                <button onClick={() => adjustSetting('focusDuration', 1, 1, 90)} aria-label='Increase focus duration'>+</button>
              </Step>
            </SetItem>
            <SetItem>
              <span>Short break</span>
              <Step>
                <button onClick={() => adjustSetting('shortBreakDuration', -1, 1, 30)} aria-label='Decrease short break'>&minus;</button>
                <b>{settings.shortBreakDuration}</b>
                <button onClick={() => adjustSetting('shortBreakDuration', 1, 1, 30)} aria-label='Increase short break'>+</button>
              </Step>
            </SetItem>
            <SetItem>
              <span>Long break</span>
              <Step>
                <button onClick={() => adjustSetting('longBreakDuration', -1, 1, 60)} aria-label='Decrease long break'>&minus;</button>
                <b>{settings.longBreakDuration}</b>
                <button onClick={() => adjustSetting('longBreakDuration', 1, 1, 60)} aria-label='Increase long break'>+</button>
              </Step>
            </SetItem>
            <SetItem>
              <span>Long break every</span>
              <Step>
                <button onClick={() => adjustSetting('longBreakInterval', -1, 2, 10)} aria-label='Decrease interval'>&minus;</button>
                <b>{settings.longBreakInterval}</b>
                <button onClick={() => adjustSetting('longBreakInterval', 1, 2, 10)} aria-label='Increase interval'>+</button>
              </Step>
            </SetItem>

            <SetHeading>Behavior</SetHeading>
            <SetItem>
              <span>Auto-start breaks</span>
              <Toggle
                $on={settings.autoStartBreaks}
                aria-pressed={settings.autoStartBreaks}
                aria-label='Auto-start breaks'
                onClick={() => saveSettings({ ...settings, autoStartBreaks: !settings.autoStartBreaks })}
              />
            </SetItem>
            <SetItem>
              <span>Auto-start pomodoros</span>
              <Toggle
                $on={settings.autoStartPomodoros}
                aria-pressed={settings.autoStartPomodoros}
                aria-label='Auto-start pomodoros'
                onClick={() => saveSettings({ ...settings, autoStartPomodoros: !settings.autoStartPomodoros })}
              />
            </SetItem>
            <SetItem>
              <span>Continuous tracking</span>
              <Toggle
                $on={settings.continuousTracking}
                aria-pressed={settings.continuousTracking}
                aria-label='Continuous tracking'
                onClick={() => saveSettings({ ...settings, continuousTracking: !settings.continuousTracking })}
              />
            </SetItem>
            {settings.continuousTracking && (
              <SetItem>
                <span>Include break time</span>
                <Toggle
                  $on={settings.includeBreaksInTracking}
                  aria-pressed={settings.includeBreaksInTracking}
                  aria-label='Include break time'
                  onClick={() => saveSettings({ ...settings, includeBreaksInTracking: !settings.includeBreaksInTracking })}
                />
              </SetItem>
            )}
          </SetList>
        </Body>
      )}
    </Shell>
  );
};

/* ---------- styles ---------- */

const Shell = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${t.bg};
  color: ${t.ink};
  font-family: 'Fredoka', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
  user-select: none;

  button:focus-visible,
  input:focus-visible {
    outline: 2px solid ${t.c1};
    outline-offset: 1px;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px 6px 14px;
  -webkit-app-region: drag;
`;

const Brand = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: ${t.soft};
`;

const BrandDot = styled.i`
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: linear-gradient(135deg, #38c6ff, #7b6bff);
`;

const WinButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
`;

const WinBtn = styled.button`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 7px;
  color: ${(p) => (p.$active ? t.c1 : t.muted)};
  cursor: pointer;

  &:hover {
    color: ${t.ink};
    background: rgba(255, 255, 255, 0.07);
  }

  svg { width: 15px; height: 15px; }
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin: 0 14px 4px;
  padding: 4px;
  background: ${t.bgSoft};
  border-radius: 999px;
`;

const TabBtn = styled.button`
  flex: 1;
  padding: 7px 0;
  background: ${(p) => (p.$active ? t.ink : 'transparent')};
  color: ${(p) => (p.$active ? '#0e1220' : t.muted)};
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 12px 16px 16px;
  min-height: 0;
`;

const ModeRow = styled.div`
  display: flex;
  gap: 6px;
`;

const ModeBtn = styled.button`
  padding: 6px 14px;
  background: ${(p) => (p.$active ? t.bgSoft : 'transparent')};
  color: ${(p) => (p.$active ? t.ink : t.muted)};
  border: 1px solid ${(p) => (p.$active ? 'rgba(255,255,255,0.12)' : 'transparent')};
  border-radius: 999px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
`;

const Ring = styled.div`
  position: relative;
  width: min(66vw, 210px);
  aspect-ratio: 1;
`;

const Readout = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
`;

const TimeText = styled.span`
  font-size: 40px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${(p) => (p.$paused ? t.muted : t.ink)};
`;

const ModeText = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${t.muted};
`;

const ProjectChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 6px 14px;
  background: ${t.bgSoft};
  border: 1px solid ${t.line};
  border-radius: 999px;
  color: ${t.ink};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Dot = styled.i`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const circleBtn = css`
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
`;

const Primary = styled.button`
  ${circleBtn};
  width: 58px;
  height: 58px;
  background: ${t.ink};
  color: #0e1220;

  &:hover { background: #fff; }
  svg { width: 22px; height: 22px; }
`;

const Accent = styled.button`
  ${circleBtn};
  width: 46px;
  height: 46px;
  background: ${t.c1};
  color: #06222e;

  &:hover { filter: brightness(1.1); }
  svg { width: 19px; height: 19px; }
`;

const Ghost = styled.button`
  ${circleBtn};
  width: 44px;
  height: 44px;
  background: transparent;
  border: 1px solid ${(p) => (p.$active ? 'rgba(56,198,255,0.35)' : 'rgba(255,255,255,0.1)')};
  color: ${(p) => (p.$active ? t.c1 : t.muted)};

  &:hover {
    color: ${t.ink};
    border-color: rgba(255, 255, 255, 0.22);
  }
  svg { width: 17px; height: 17px; }
`;

const Pills = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 13px;
  background: ${t.bgSoft};
  border: 1px solid ${t.line};
  border-radius: 999px;
  font-size: 12.5px;
  color: ${t.soft};

  svg { color: ${t.c1}; width: 13px; height: 13px; }
  b { color: ${t.ink}; font-weight: 600; font-variant-numeric: tabular-nums; }
`;

const ProjectList = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ProjectRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  background: ${(p) => (p.$active ? t.bgSoft : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? 'rgba(56,198,255,0.3)' : t.line)};
  border-radius: 12px;
  color: ${t.ink};
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;

  span {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover { background: ${t.bgSoft}; }
`;

const Rate = styled.em`
  font-style: normal;
  font-size: 12px;
  color: ${t.muted};
  flex-shrink: 0;
`;

const Empty = styled.p`
  margin: 12px 0 0;
  font-size: 12.5px;
  color: ${t.muted};
  text-align: center;
`;

const SetList = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SetHeading = styled.h3`
  margin: 8px 2px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${t.muted};

  &:first-child {
    margin-top: 0;
  }
`;

const SetItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  background: ${t.bgSoft};
  border: 1px solid ${t.line};
  border-radius: 12px;

  > span {
    font-size: 13px;
    font-weight: 500;
    color: ${t.ink};
  }
`;

const Step = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;

  button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    background: transparent;
    border: 1px solid ${t.line};
    border-radius: 8px;
    color: ${t.soft};
    font-size: 15px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      color: ${t.ink};
      border-color: rgba(255, 255, 255, 0.2);
    }
  }

  b {
    min-width: 30px;
    text-align: center;
    font-size: 13.5px;
    font-weight: 600;
    color: ${t.ink};
    font-variant-numeric: tabular-nums;
  }
`;

const Toggle = styled.button`
  appearance: none;
  position: relative;
  /* beat App.css's global 44px tap-target floor — this is a mouse-first widget */
  width: 40px;
  min-width: 40px;
  height: 22px;
  min-height: 22px;
  padding: 0;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  background: ${(p) => (p.$on ? t.c1 : t.track)};
  cursor: pointer;
  transition: background 0.18s ease;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${(p) => (p.$on ? '21px' : '3px')};
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #fff;
    transition: left 0.18s ease;
  }
`;

const Account = styled.div`
  width: 100%;
  padding-top: 12px;
  border-top: 1px solid ${t.line};

  form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`;

const AccountHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${t.muted};
`;

const AccountMail = styled.p`
  margin: 0 0 8px;
  font-size: 12.5px;
  color: ${t.soft};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AuthInput = styled.input`
  width: 100%;
  padding: 9px 12px;
  background: ${t.bgSoft};
  border: 1px solid ${t.line};
  border-radius: 10px;
  color: ${t.ink};
  font-family: inherit;
  font-size: 13px;
  box-sizing: border-box;

  &::placeholder { color: ${t.muted}; }
`;

const AuthError = styled.p`
  margin: 0;
  font-size: 12px;
  color: #ff7a7a;
`;

const AccountBtn = styled.button`
  width: 100%;
  padding: 9px 12px;
  background: ${(p) => (p.$primary ? t.ink : 'transparent')};
  color: ${(p) => (p.$primary ? '#0e1220' : t.soft)};
  border: 1px solid ${(p) => (p.$primary ? 'transparent' : t.line)};
  border-radius: 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover { ${(p) => (p.$primary ? 'background:#fff;' : `color:${t.ink};`)} }
  &:disabled { opacity: 0.6; cursor: default; }
`;

export default DesktopWidget;
