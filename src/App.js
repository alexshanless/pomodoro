import './App.css';
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Timer from './components/Timer';
import FinancialOverview from './components/FinancialOverview';
import StatsDrawer from './components/StatsDrawer';
import { FaUser } from 'react-icons/fa';

function App() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <Router>
      <div className='App'>
        <header className='App-header-new'>
          <div className='nav-left'>
            <button className='person-icon-btn'>
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
                <Timer isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen} />
              </div>
            } />
            <Route path="/financial" element={<FinancialOverview />} />
          </Routes>
        </main>

        <StatsDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      </div>
    </Router>
  );
}

export default App;
