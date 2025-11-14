import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { IoMenu, IoClose } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';

const Navigation = ({ onUserIconClick, onAuthClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

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
          <button
            onClick={() => handleNavClick('/')}
            className={isActive('/') ? 'nav-btn active' : 'nav-btn'}
          >
            Pomodoro
          </button>
          {user && (
            <>
              <button
                onClick={() => handleNavClick('/dashboard')}
                className={isActive('/dashboard') ? 'nav-btn active' : 'nav-btn'}
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavClick('/projects')}
                className={isActive('/projects') ? 'nav-btn active' : 'nav-btn'}
              >
                Projects
              </button>
              <button
                onClick={() => handleNavClick('/financial')}
                className={isActive('/financial') ? 'nav-btn active' : 'nav-btn'}
              >
                Financial
              </button>
            </>
          )}
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
          <button
            onClick={() => handleNavClick('/')}
            className={isActive('/') ? 'mobile-nav-link active' : 'mobile-nav-link'}
          >
            Pomodoro
          </button>
          {user && (
            <>
              <button
                onClick={() => handleNavClick('/dashboard')}
                className={isActive('/dashboard') ? 'mobile-nav-link active' : 'mobile-nav-link'}
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavClick('/projects')}
                className={isActive('/projects') ? 'mobile-nav-link active' : 'mobile-nav-link'}
              >
                Projects
              </button>
              <button
                onClick={() => handleNavClick('/financial')}
                className={isActive('/financial') ? 'mobile-nav-link active' : 'mobile-nav-link'}
              >
                Financial
              </button>
            </>
          )}
        </nav>
      </div>
    </>
  );
};

export default Navigation;
