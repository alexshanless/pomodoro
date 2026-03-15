import React from 'react';
import { IoWarning, IoTime } from 'react-icons/io5';
import { useFocusTrap, getReadableTime } from '../utils/accessibility';
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
  // Focus trap for accessibility
  const { trapRef } = useFocusTrap(isOpen);

  if (!isOpen) return null;

  // Format remaining time as MM:SS
  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Screen reader friendly time
  const readableTime = getReadableTime(Math.ceil(remainingTime / 1000));

  return (
    <>
      <div
        className='modal-overlay active'
        onClick={onStayLoggedIn}
        aria-hidden='true'
      />
      <div
        ref={trapRef}
        className='session-timeout-modal'
        role='alertdialog'
        aria-modal='true'
        aria-labelledby='timeout-title'
        aria-describedby='timeout-message'
      >
        <div className='session-timeout-content'>
          <div className='timeout-icon-warning' aria-hidden='true'>
            <IoWarning size={48} />
          </div>

          <h2 id='timeout-title' className='timeout-title'>Session Expiring Soon</h2>

          <p id='timeout-message' className='timeout-message'>
            You've been inactive for a while. For your security, you'll be automatically logged out in:
          </p>

          <div className='timeout-countdown'>
            <IoTime size={24} aria-hidden='true' />
            <span className='countdown-time' aria-label={`Time remaining: ${readableTime}`}>
              {formatTime(remainingTime)}
            </span>
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
