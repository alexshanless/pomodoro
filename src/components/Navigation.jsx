import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { IoMenu, IoClose } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { getUserAvatar } from '../utils/profilePictures';

const Navigation = ({ onUserIconClick, onAuthClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get user profile picture
  const userAvatar = user ? (user.user_metadata?.profile_picture || getUserAvatar(user.id)) : null;

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
            {user && userAvatar ? (
              <img
                src={userAvatar}
                alt='Profile'
                className='nav-avatar-image'
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<svg width="20" height="20" fill="currentColor"><circle cx="10" cy="10" r="8"/></svg>';
                }}
              />
            ) : (
              <FaUser size={20} />
            )}
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
          {user ? (
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
          ) : (
            <button
              onClick={() => handleNavClick('/signup')}
              className='nav-btn-signup'
            >
              Sign Up
            </button>
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
          {user ? (
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
          ) : (
            <button
              onClick={() => handleNavClick('/signup')}
              className='mobile-nav-link-signup'
            >
              Sign Up
            </button>
          )}
        </nav>
      </div>
    </>
  );
};

export default Navigation;
