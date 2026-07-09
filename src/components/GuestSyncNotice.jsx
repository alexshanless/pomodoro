import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/UpdateNotice.css';

const DISMISS_KEY = 'guestSyncNoticeDismissed';
const HIDDEN_PATHS = ['/signin', '/signup'];

const GuestSyncNotice = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  );

  const hidden =
    loading ||
    user ||
    dismissed ||
    HIDDEN_PATHS.includes(location.pathname) ||
    location.pathname.startsWith('/shared/');

  if (hidden) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className='pp-guest-notice' role='status'>
      <span>
        Your data is stored on this device only — <Link to='/signin'>sign in</Link> to
        sync across devices.
      </span>
      <button
        type='button'
        className='pp-update-dismiss'
        onClick={dismiss}
        aria-label='Dismiss sync notice'
      >
        ×
      </button>
    </div>
  );
};

export default GuestSyncNotice;
