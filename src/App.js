import './App.css';
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingTimer from './components/FloatingTimer';
import UserSettings from './components/UserSettings';
import Auth from './components/Auth';

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const Timer = lazy(() => import('./components/Timer'));
const FinancialOverview = lazy(() => import('./components/FinancialOverview'));
const InvoiceAnalytics = lazy(() => import('./components/InvoiceAnalytics'));
const Projects = lazy(() => import('./components/Projects'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const SharedProjectView = lazy(() => import('./components/SharedProjectView'));
const FullSettings = lazy(() => import('./components/FullSettings'));
const AccountSettings = lazy(() => import('./components/AccountSettings'));
const SignUp = lazy(() => import('./components/SignUp'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

function AppContent() {
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const audioRef = useRef(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const location = useLocation();

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
        audio.volume = 0.6;
        audio.play().catch(err => console.log('Audio play failed:', err));
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

  return (
    <div className='App'>
      <Navigation
        onUserIconClick={() => setIsUserSettingsOpen(true)}
        onAuthClick={() => setIsAuthOpen(true)}
      />

      <main className='main-content-new'>
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
            <Route path="/" element={
              <div className='pomodoro-section-new'>
                <Timer />
              </div>
            } />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/shared/:shareToken" element={<SharedProjectView />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            } />
            <Route path="/financial" element={
              <ProtectedRoute>
                <FinancialOverview />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <InvoiceAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <FullSettings />
              </ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </main>

      {/* Floating Timer Widget - Hide on home page */}
      {location.pathname !== '/' && <FloatingTimer />}

      {/* User Settings Drawer */}
      <UserSettings isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} />

      {/* Auth Modal */}
      <Auth isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Global Lo-fi Radio Audio Element */}
      <audio
        ref={audioRef}
        src="https://radiorecord.hostingradio.ru/lofi96.aacp"
        loop
        preload="auto"
      />
    </div>
  );
}

export default App;
