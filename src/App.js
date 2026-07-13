import './App.css';
import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import Navigation from './components/Navigation';
import FloatingTimer from './components/FloatingTimer';
import UpdateNotice from './components/UpdateNotice';
import GuestSyncNotice from './components/GuestSyncNotice';
import GuestDataImport from './components/GuestDataImport';
import UserSettings from './components/UserSettings';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineNotification from './components/OfflineNotification';
import { createAriaLiveRegion, SkipLink } from './utils/accessibility';
import { DialogProvider } from './contexts/DialogContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { PomodoroSessionsProvider } from './contexts/PomodoroSessionsContext';
import { FinancialTransactionsProvider } from './contexts/FinancialTransactionsContext';
import { GoalsStreaksProvider } from './contexts/GoalsStreaksContext';
import { TimerProvider } from './contexts/TimerContext';
import DialogHost from './components/DialogHost';

const LOFI_STREAM_URL = 'https://radiorecord.hostingradio.ru/lofi96.aacp';

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const Timer = lazy(() => import('./components/Timer'));
const FinancialOverview = lazy(() => import('./components/FinancialOverview'));
const Projects = lazy(() => import('./components/Projects'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const SharedProjectView = lazy(() => import('./components/SharedProjectView'));
const FullSettings = lazy(() => import('./components/FullSettings'));
const AccountSettings = lazy(() => import('./components/AccountSettings'));
const SignUp = lazy(() => import('./components/SignUp'));
const DesktopWidget = lazy(() => import('./components/DesktopWidget'));

function App() {
  return (
    <Router>
      <OfflineProvider>
        <AuthProvider>
          <DialogProvider>
            <ProjectsProvider>
              <PomodoroSessionsProvider>
                <FinancialTransactionsProvider>
                  <GoalsStreaksProvider>
                    <TimerProvider>
                      <AppContent />
                    </TimerProvider>
                  </GoalsStreaksProvider>
                </FinancialTransactionsProvider>
              </PomodoroSessionsProvider>
            </ProjectsProvider>
            <DialogHost />
          </DialogProvider>
        </AuthProvider>
      </OfflineProvider>
    </Router>
  );
}

function AppContent() {
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const audioRef = useRef(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const location = useLocation();

  // Memoize callbacks to prevent Navigation re-renders
  const handleUserIconClick = useCallback(() => setIsUserSettingsOpen(true), []);

  // Accessibility: Create ARIA live region (focus-visible is handled natively in CSS)
  useEffect(() => {
    createAriaLiveRegion();
  }, []);

  // Load music toggle state from localStorage
  useEffect(() => {
    const savedMusicEnabled = localStorage.getItem('isMusicEnabled');
    if (savedMusicEnabled !== null) {
      setIsMusicEnabled(JSON.parse(savedMusicEnabled));
    }
  }, []);

  // Music control based on timer state (Desktop only - disabled on mobile)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Check if mobile device
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      audio.pause();
      return;
    }

    const checkTimerState = () => {
      const timerState = JSON.parse(localStorage.getItem('pomodoroTimerState') || '{}');
      const { timerOn, currentMode, isPaused } = timerState;

      // Play audio when timer is running in focus mode, not paused, and music is enabled
      if (timerOn && !isPaused && currentMode === 'focus' && isMusicEnabled) {
        if (!audio.src) {
          audio.src = LOFI_STREAM_URL;
        }
        audio.volume = 0.6;
        audio.play().catch(err => console.warn('Audio play failed:', err));
      } else {
        audio.pause();
      }
    };

    // Check immediately
    checkTimerState();

    // Set up interval to check timer state
    const interval = setInterval(checkTimerState, 1000);

    return () => {
      clearInterval(interval);
      if (audio) {
        audio.pause();
      }
    };
  }, [isMusicEnabled]);

  // Listen for changes in isMusicEnabled from other components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'isMusicEnabled') {
        setIsMusicEnabled(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event for same-window updates
    const handleMusicToggle = (e) => {
      setIsMusicEnabled(e.detail.enabled);
    };

    window.addEventListener('musicToggle', handleMusicToggle);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('musicToggle', handleMusicToggle);
    };
  }, []);

  // Desktop gadget (Electron) renders the widget with no app chrome; the
  // audio element below stays so lo-fi works there too.
  const isWidget = location.pathname === '/widget';

  return (
    <div className='App'>
      {!isWidget && (
        <>
          <SkipLink href='#main-content' />
          <OfflineNotification />
          <Navigation onUserIconClick={handleUserIconClick} />
          <GuestSyncNotice />
        </>
      )}
      <GuestDataImport />

      <ErrorBoundary>
        <main id='main-content' className={isWidget ? 'main-content-widget' : 'main-content-new'} tabIndex='-1'>
          <Suspense fallback={
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '60vh',
              color: '#32C5FF',
              fontSize: '1.2rem'
            }}>
              Loading...
            </div>
          }>
            <Routes>
              {/* Guest mode: all pages work signed-out via the hooks' localStorage
                  fallback; signing in adds cross-device sync. */}
              <Route path="/" element={
                <div className='pomodoro-section-new'>
                  <Timer />
                </div>
              } />
              <Route path="/widget" element={<DesktopWidget />} />
              <Route path="/signin" element={<Auth />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/shared/:shareToken" element={<SharedProjectView />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/financial" element={<FinancialOverview />} />
              <Route path="/settings" element={<FullSettings />} />
              <Route path="/account" element={<AccountSettings />} />
            </Routes>
          </Suspense>
        </main>
      </ErrorBoundary>

      {/* Floating Timer Widget - Hide on home page and in the desktop gadget */}
      {location.pathname !== '/' && !isWidget && <FloatingTimer />}

      {!isWidget && (
        <>
          <UserSettings isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} />
          <UpdateNotice />
        </>
      )}

      {/* Global Lo-fi Radio Audio Element */}
      <audio
        ref={audioRef}
        loop
        preload="none"
      />
    </div>
  );
}

export default App;
