import React from 'react';
import PomodoroStats from './PomodoroStats';
import { IoClose } from 'react-icons/io5';
import '../App.css';

const StatsDrawer = ({ isOpen, onClose }) => {
  return (
    <>
      {isOpen && <div className='drawer-overlay' onClick={onClose} />}
      <div className={`stats-drawer ${isOpen ? 'open' : ''}`}>
        <div className='drawer-header'>
          <h2>Statistics</h2>
          <button className='close-drawer-btn' onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>
        <div className='drawer-content'>
          <PomodoroStats />
        </div>
      </div>
    </>
  );
};

export default StatsDrawer;
