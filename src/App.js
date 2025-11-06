import './App.css';
import React, { useState } from 'react';
import Timer from './components/Timer';
import PomodoroStats from './components/PomodoroStats';
import FinancialOverview from './components/FinancialOverview';

function App() {
  const [activeTab, setActiveTab] = useState('pomodoro');

  return (
    <div className='App'>
      <header className='App-header'>
        <h1>Personal Cabinet</h1>
        <nav className='nav-tabs'>
          <button
            className={activeTab === 'pomodoro' ? 'active' : ''}
            onClick={() => setActiveTab('pomodoro')}
          >
            Pomodoro Tracker
          </button>
          <button
            className={activeTab === 'financial' ? 'active' : ''}
            onClick={() => setActiveTab('financial')}
          >
            Financial Overview
          </button>
        </nav>
      </header>

      <main className='main-content'>
        {activeTab === 'pomodoro' && (
          <div className='pomodoro-section'>
            <Timer />
            <PomodoroStats />
          </div>
        )}
        {activeTab === 'financial' && (
          <FinancialOverview />
        )}
      </main>
    </div>
  );
}

export default App;
