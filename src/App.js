import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import Timer from './components/Timer';
import FinancialOverview from './components/FinancialOverview';
import Projects from './components/Projects';
import ProjectDetail from './components/ProjectDetail';
import FloatingTimer from './components/FloatingTimer';
import UserSettings from './components/UserSettings';
import FullSettings from './components/FullSettings';
import TestSupabase from './components/TestSupabase';
import Auth from './components/Auth';
import SignUp from './components/SignUp';
import ProtectedRoute from './components/ProtectedRoute';
import { FaUser } from 'react-icons/fa';
import { IoMenu, IoClose } from 'react-icons/io5';

function AppContent() {
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const audioRef = useRef(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const { user, loading } = useAuth();

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
      <header className='App-header-new'>
        <div className='nav-left'>
          <button
            className='person-icon-btn'
            onClick={() => user ? setIsUserSettingsOpen(true) : setIsAuthOpen(true)}
            title={user ? 'User Settings' : 'Sign In / Sign Up'}
          >
            <FaUser size={20} />
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className='nav-right nav-desktop'>
          <NavLink
            to="/"
            end
            className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
          >
            Pomodoro
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
            style={{ display: !loading && !user ? 'none' : 'inline-block' }}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
            style={{ display: !loading && !user ? 'none' : 'inline-block' }}
          >
            Projects
          </NavLink>
          <NavLink
            to="/financial"
            className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
            style={{ display: !loading && !user ? 'none' : 'inline-block' }}
          >
            Financial
          </NavLink>
        </div>

        {/* Mobile Hamburger Button */}
        <button className='hamburger-btn' onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <IoClose size={24} /> : <IoMenu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && <div className='mobile-menu-overlay' onClick={() => setIsMobileMenuOpen(false)} />}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <nav className='mobile-menu-nav'>
          <NavLink
            to="/"
            end
            className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Pomodoro
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ display: !loading && !user ? 'none' : 'block' }}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ display: !loading && !user ? 'none' : 'block' }}
          >
            Projects
          </NavLink>
          <NavLink
            to="/financial"
            className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ display: !loading && !user ? 'none' : 'block' }}
          >
            Financial
          </NavLink>
        </nav>
      </div>

      <main className='main-content-new'>
        <Routes>
          <Route path="/" element={
            <div className='pomodoro-section-new'>
              <Timer />
            </div>
          } />
          <Route path="/signup" element={<SignUp />} />
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
          <Route path="/settings" element={
            <ProtectedRoute>
              <FullSettings />
            </ProtectedRoute>
          } />
          <Route path="/test-supabase" element={<TestSupabase />} />
        </Routes>
      </main>

      {/* Floating Timer Widget */}
      <FloatingTimer />

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

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
