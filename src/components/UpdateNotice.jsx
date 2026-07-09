import React, { useState, useEffect } from 'react';
import '../styles/UpdateNotice.css';

// Shown when the service worker has installed a new version that is waiting.
// Without this, users silently stay on the old build until every tab closes.
const UpdateNotice = () => {
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    const onUpdate = (e) => setRegistration(e.detail);
    window.addEventListener('swUpdate', onUpdate);
    return () => window.removeEventListener('swUpdate', onUpdate);
  }, []);

  if (!registration?.waiting) return null;

  const refresh = () => {
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => window.location.reload(),
      { once: true }
    );
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <div className='pp-update-notice' role='status'>
      <span>A new version of PomPay is available.</span>
      <button type='button' className='pp-update-refresh' onClick={refresh}>
        Refresh
      </button>
      <button
        type='button'
        className='pp-update-dismiss'
        onClick={() => setRegistration(null)}
        aria-label='Dismiss update notice'
      >
        ×
      </button>
    </div>
  );
};

export default UpdateNotice;
