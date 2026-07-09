import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { IoMenu, IoClose } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { getUserAvatar } from '../utils/profilePictures';
import { useFocusTrap } from '../utils/accessibility';
import '../styles/NavRedesign.css';

const MOBILE_MENU_ID = 'nav-mobile-menu';

const Navigation = ({ onUserIconClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Focus capture + return: declared BEFORE useFocusTrap so it runs first and captures
  // the hamburger button before the trap moves focus into the menu.
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const openerEl = document.activeElement;
    return () => { openerEl?.focus?.(); };
  }, [isMobileMenuOpen]);

  const { trapRef: mobileMenuTrapRef } = useFocusTrap(isMobileMenuOpen);

  const userAvatar = useMemo(() => {
    return user ? (user.user_metadata?.profile_picture || getUserAvatar(user.id)) : null;
  }, [user]);

  const handleNavClick = useCallback((path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  }, [navigate]);

  const isActive = useCallback((path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Body scroll lock + Esc when mobile menu is open
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  return (
    <>
      <header className='App-header-new pp-nav'>
        <div className='nav-left'>
          <button
            className='person-icon-btn'
            onClick={() => user ? onUserIconClick() : navigate('/signin')}
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
          {!user && (
            <button
              onClick={() => navigate('/signin')}
              className='nav-btn-signup'
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className='hamburger-btn'
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls={MOBILE_MENU_ID}
          aria-haspopup='true'
        >
          {isMobileMenuOpen ? <IoClose size={24} /> : <IoMenu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className='mobile-menu-overlay'
          onClick={closeMobileMenu}
          aria-hidden='true'
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        id={MOBILE_MENU_ID}
        ref={mobileMenuTrapRef}
        className={`mobile-menu pp-nav-menu ${isMobileMenuOpen ? 'open' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-label='Navigation menu'
        aria-hidden={!isMobileMenuOpen}
      >
        <nav className='mobile-menu-nav'>
          <button
            onClick={() => handleNavClick('/')}
            className={isActive('/') ? 'mobile-nav-link active' : 'mobile-nav-link'}
          >
            Pomodoro
          </button>
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
          {!user && (
            <button
              onClick={() => {
                navigate('/signin');
                closeMobileMenu();
              }}
              className='mobile-nav-link-signup'
            >
              Sign In
            </button>
          )}
        </nav>
      </div>
    </>
  );
};

export default React.memo(Navigation);
