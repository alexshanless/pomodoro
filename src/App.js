import './App.css';
import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import Timer from './components/Timer';
import FinancialOverview from './components/FinancialOverview';
import Projects from './components/Projects';
import ProjectDetail from './components/ProjectDetail';
// import FloatingTimer from './components/FloatingTimer';
import UserSettings from './components/UserSettings';
import FullSettings from './components/FullSettings';
import TestSupabase from './components/TestSupabase';
import Auth from './components/Auth';
import SignUp from './components/SignUp';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';

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
  // const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  // Load music toggle state from localStorage
  /*
  useEffect(() => {
    const savedMusicEnabled = localStorage.getItem('isMusicEnabled');
    if (savedMusicEnabled !== null) {
      setIsMusicEnabled(JSON.parse(savedMusicEnabled));
    }
  }, []);
  */

  // Music control based on timer state (Desktop only - disabled on mobile)
  // TEMPORARILY DISABLED TO TEST NAVIGATION
  /*
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
      const { timerOn, currentMode } = timerState;

      // Play audio when timer is running in focus mode and music is enabled
      if (timerOn && currentMode === 'focus' && isMusicEnabled) {
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
  */

  // Listen for changes in isMusicEnabled from other components
  /*
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
  */

  return (
    <div className='App'>
      <Navigation
        onUserIconClick={() => setIsUserSettingsOpen(true)}
        onAuthClick={() => setIsAuthOpen(true)}
      />

      <main className='main-content-new'>
        <Routes>
          <Route path="/" element={
            <div style={{ color: 'white', padding: '2rem' }}>
              <h1>HOME PAGE</h1>
              <p>This is the home/timer page</p>
            </div>
          } />
          <Route path="/signup" element={
            <div style={{ color: 'white', padding: '2rem' }}>
              <h1>SIGNUP PAGE</h1>
            </div>
          } />
          <Route path="/dashboard" element={
            <div style={{ color: 'white', padding: '2rem' }}>
              <h1>DASHBOARD PAGE</h1>
              <p>You are on the dashboard</p>
            </div>
          } />
          <Route path="/projects" element={
            <div style={{ color: 'white', padding: '2rem' }}>
              <h1>PROJECTS PAGE</h1>
              <p>You are on projects</p>
            </div>
          } />
          <Route path="/financial" element={
            <div style={{ color: 'white', padding: '2rem' }}>
              <h1>FINANCIAL PAGE</h1>
              <p>You are on financial</p>
            </div>
          } />
        </Routes>
      </main>

      {/* Floating Timer Widget */}
      {/* TEMPORARILY DISABLED TO TEST NAVIGATION */}
      {/* <FloatingTimer /> */}

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
