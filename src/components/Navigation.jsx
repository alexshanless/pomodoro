import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { IoMenu, IoClose } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';

const Navigation = ({ onUserIconClick, onAuthClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <header className='App-header-new'>
        <div className='nav-left'>
          <button
            className='person-icon-btn'
            onClick={() => user ? onUserIconClick() : onAuthClick()}
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
          >
            Dashboard
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
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Projects
          </NavLink>
          <NavLink
            to="/financial"
            className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Financial
          </NavLink>
        </nav>
      </div>
    </>
  );
};

export default Navigation;
