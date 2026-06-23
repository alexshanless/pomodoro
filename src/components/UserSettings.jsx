import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserAvatar, fileToBase64 } from '../utils/profilePictures';
import '../styles/ProfileDrawerRedesign.css';

const I = {
  user: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
      <circle cx='12' cy='7' r='4' />
    </svg>
  ),
  close: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M18 6 6 18M6 6l12 12' />
    </svg>
  ),
  upload: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
      <polyline points='7 10 12 5 17 10' />
      <line x1='12' y1='5' x2='12' y2='15' />
    </svg>
  ),
  trash: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
    </svg>
  ),
  gear: (
    <svg className='sl-ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='12' cy='12' r='3' />
      <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
    </svg>
  ),
  arrow: (
    <svg className='sl-arrow' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M5 12h14M13 6l6 6-6 6' />
    </svg>
  ),
  signout: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
      <polyline points='16 17 21 12 16 7' />
      <line x1='21' y1='12' x2='9' y2='12' />
    </svg>
  ),
};

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
  'Mexico', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark',
];

const UserSettings = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, signOut, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  const scrimRef = useRef(null);
  const nameRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const loadUserData = () => {
    if (user) {
      return {
        name: user.user_metadata?.name || '',
        email: user.email || '',
        country: user.user_metadata?.country || 'United States',
        profilePicture: user.user_metadata?.profile_picture || getUserAvatar(user.id),
      };
    }
    const saved = localStorage.getItem('userData');
    if (saved) return JSON.parse(saved);
    return { name: '', email: '', country: 'United States', profilePicture: getUserAvatar(null) };
  };

  const [userData, setUserData] = useState(loadUserData());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        country: user.user_metadata?.country || 'United States',
        profilePicture: user.user_metadata?.profile_picture || getUserAvatar(user.id),
      });
    } else {
      const saved = localStorage.getItem('userData');
      setUserData(saved ? JSON.parse(saved) : {
        name: '', email: '', country: 'United States', profilePicture: getUserAvatar(null),
      });
    }
  }, [user]);

  // Open: remember focus + move into the drawer. Close: restore focus to trigger.
  useEffect(() => {
    if (isOpen) {
      lastFocusedRef.current = document.activeElement;
      const id = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 60);
      return () => window.clearTimeout(id);
    }
    if (lastFocusedRef.current) {
      lastFocusedRef.current.focus?.();
      lastFocusedRef.current = null;
    }
  }, [isOpen]);

  // Escape to close while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleScrimClick = (e) => {
    if (e.target === scrimRef.current) onClose();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setUserData((prev) => ({ ...prev, profilePicture: base64 }));
    } catch (err) {
      setError('Failed to upload image');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemovePhoto = () => {
    setUserData((prev) => ({ ...prev, profilePicture: getUserAvatar(user?.id) }));
  };

  const handleSaveAccount = async () => {
    if (!user) {
      localStorage.setItem('userData', JSON.stringify(userData));
      setMessage('Changes saved locally');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { error } = await updateProfile({
        data: {
          name: userData.name,
          country: userData.country,
          profile_picture: userData.profilePicture,
        },
      });
      if (error) throw error;
      setMessage('Changes saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) onClose();
  };

  const handleViewAllSettings = () => {
    onClose();
    navigate('/settings');
  };

  return (
    <div
      ref={scrimRef}
      className={`pompay-drawer-scrim${isOpen ? ' open' : ''}`}
      aria-hidden={!isOpen}
      onClick={handleScrimClick}
    >
      <aside className='pompay-drawer' role='dialog' aria-modal='true' aria-label='Account'>
        <div className='pd-head'>
          <span className='pd-ic'>{I.user}</span>
          <h2>Account</h2>
          <button type='button' className='pd-icon-btn pd-close' onClick={onClose} aria-label='Close'>
            {I.close}
          </button>
        </div>

        <div className='pd-body'>
          {message && <div className='pd-msg ok'>{message}</div>}
          {error && <div className='pd-msg err'>{error}</div>}

          <div className='pd-id'>
            <img className='pd-pic' alt='Profile' src={userData.profilePicture || getUserAvatar(user?.id)} />
            <div className='pd-who'>
              <div className='pd-nm'>{userData.name || 'Your account'}</div>
              {userData.email && <div className='pd-em'>{userData.email}</div>}
              <div className='pd-pic-acts'>
                <button type='button' className='pd-chip' onClick={() => fileInputRef.current?.click()}>
                  {I.upload}Upload
                </button>
                <button type='button' className='pd-chip danger' onClick={handleRemovePhoto}>
                  {I.trash}Remove
                </button>
              </div>
            </div>
            <input ref={fileInputRef} type='file' accept='image/*' onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>

          <div className='pd-sep'></div>

          <div className='pd-field'>
            <label htmlFor='pd-name'>Full name</label>
            <input
              id='pd-name'
              ref={nameRef}
              type='text'
              placeholder='Enter your name'
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
            />
          </div>

          <div className='pd-field'>
            <label htmlFor='pd-email'>Email</label>
            <input
              id='pd-email'
              type='email'
              placeholder='Enter your email'
              value={userData.email}
              disabled={!!user}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            />
            {user && <span className='hint'>Email can’t be changed</span>}
          </div>

          <div className='pd-field'>
            <label htmlFor='pd-country'>Country</label>
            <select
              id='pd-country'
              value={userData.country}
              onChange={(e) => setUserData({ ...userData, country: e.target.value })}
            >
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button type='button' className='pd-settings-link' onClick={handleViewAllSettings}>
            {I.gear}
            <span className='sl-txt'>All settings</span>
            {I.arrow}
          </button>
        </div>

        <div className='pd-foot'>
          <button type='button' className='pd-btn-grad' onClick={handleSaveAccount} disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          {user && (
            <button type='button' className='pd-signout' onClick={handleSignOut}>
              {I.signout}Sign out
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

export default UserSettings;
