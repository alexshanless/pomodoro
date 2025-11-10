import './App.css';
import React, { useState } from 'react';
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
      </div>
    </Router>
  );
}

export default App;
