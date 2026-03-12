import React from 'react';
import { IoWarning, IoTime } from 'react-icons/io5';
import '../App.css';

/**
 * Session Timeout Warning Modal
 * Displays when user is about to be logged out due to inactivity
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {number} props.remainingTime - Time remaining in milliseconds
 * @param {Function} props.onStayLoggedIn - Callback to extend session
 * @param {Function} props.onLogout - Callback to logout now
 */
const SessionTimeoutWarning = ({
  isOpen,
  remainingTime,
  onStayLoggedIn,
  onLogout
}) => {
  if (!isOpen) return null;

  // Format remaining time as MM:SS
  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className='modal-overlay active' onClick={onStayLoggedIn} />
      <div className='session-timeout-modal'>
        <div className='session-timeout-content'>
          <div className='timeout-icon-warning'>
            <IoWarning size={48} />
          </div>

          <h2 className='timeout-title'>Session Expiring Soon</h2>

          <p className='timeout-message'>
            You've been inactive for a while. For your security, you'll be automatically logged out in:
          </p>

          <div className='timeout-countdown'>
            <IoTime size={24} />
            <span className='countdown-time'>{formatTime(remainingTime)}</span>
          </div>

          <p className='timeout-info'>
            Any unsaved work will be automatically saved before logout.
          </p>

          <div className='timeout-actions'>
            <button
              className='btn-secondary'
              onClick={onLogout}
              type='button'
            >
              Logout Now
            </button>
            <button
              className='btn-primary'
              onClick={onStayLoggedIn}
              type='button'
              autoFocus
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SessionTimeoutWarning;
