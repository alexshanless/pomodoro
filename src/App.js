import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Timer from './components/Timer';
import FinancialOverview from './components/FinancialOverview';
import Projects from './components/Projects';
import ProjectDetail from './components/ProjectDetail';
import FloatingTimer from './components/FloatingTimer';
import UserSettings from './components/UserSettings';
import FullSettings from './components/FullSettings';
import { FaUser } from 'react-icons/fa';

function App() {
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const audioRef = useRef(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  // Load music toggle state from localStorage
  useEffect(() => {
    const savedMusicEnabled = localStorage.getItem('isMusicEnabled');
    if (savedMusicEnabled !== null) {
      setIsMusicEnabled(JSON.parse(savedMusicEnabled));
    }
  }, []);

  // Music control based on timer state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

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
    <Router>
      <div className='App'>
        <header className='App-header-new'>
          <div className='nav-left'>
            <button className='person-icon-btn' onClick={() => setIsUserSettingsOpen(true)}>
              <FaUser size={20} />
            </button>
          </div>
          <div className='nav-right'>
            <NavLink
              to="/"
              end
              className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
            >
              Home
            </NavLink>
            <NavLink
              to="/pomodoro"
              className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
            >
              Pomodoro
            </NavLink>
            <NavLink
              to="/projects"
              className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
            >
              Projects
            </NavLink>
            <NavLink
              to="/financial"
              className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
            >
              Financial
            </NavLink>
          </div>
        </header>

        <main className='main-content-new'>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pomodoro" element={
              <div className='pomodoro-section-new'>
                <Timer />
              </div>
            } />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/financial" element={<FinancialOverview />} />
            <Route path="/settings" element={<FullSettings />} />
          </Routes>
        </main>

        {/* Floating Timer Widget */}
        <FloatingTimer />

        {/* User Settings Drawer */}
        <UserSettings isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} />

        {/* Global Lo-fi Radio Audio Element */}
        <audio
          ref={audioRef}
          src="https://radiorecord.hostingradio.ru/lofi96.aacp"
          loop
          preload="auto"
        />
      </div>
    </Router>
  );
}

export default App;
