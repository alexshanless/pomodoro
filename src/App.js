import './App.css';
import React, { useState } from 'react';
import Timer from './components/Timer';
import FinancialOverview from './components/FinancialOverview';
import StatsDrawer from './components/StatsDrawer';
import { FaUser } from 'react-icons/fa';

function App() {
  const [activeTab, setActiveTab] = useState('pomodoro');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className='App'>
      <header className='App-header-new'>
        <div className='nav-left'>
          <button className='person-icon-btn'>
            <FaUser size={20} />
          </button>
        </div>
        <div className='nav-right'>
          <button
            className={activeTab === 'pomodoro' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('pomodoro')}
          >
            Pomodoro
          </button>
          <button
            className={activeTab === 'financial' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('financial')}
          >
            Financial
          </button>
        </div>
      </header>

      <main className='main-content-new'>
        {activeTab === 'pomodoro' && (
          <div className='pomodoro-section-new'>
            <Timer isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen} />
          </div>
        )}
        {activeTab === 'financial' && (
          <FinancialOverview />
        )}
      </main>

      <StatsDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
}

export default App;
