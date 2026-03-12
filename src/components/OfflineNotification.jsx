import React, { useState, useEffect } from 'react';
import { IoCloudOffline, IoCloudDone } from 'react-icons/io5';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import '../App.css';

/**
 * Offline Notification Banner
 * Shows when user goes offline/online with automatic dismiss
 *
 * @param {Object} props
 * @param {number} props.autoHideDuration - Duration in ms to auto-hide online notification (default: 3000)
 */
const OfflineNotification = ({ autoHideDuration = 3000 }) => {
  const { isOnline, isOffline } = useOnlineStatus();
  const [showOnlineNotification, setShowOnlineNotification] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Track when we go offline/online
  useEffect(() => {
    if (isOffline) {
      // User just went offline
      setWasOffline(true);
      setShowOnlineNotification(false);
    } else if (isOnline && wasOffline) {
      // User just came back online
      setShowOnlineNotification(true);

      // Auto-hide online notification after delay
      const timer = setTimeout(() => {
        setShowOnlineNotification(false);
        setWasOffline(false);
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [isOnline, isOffline, wasOffline, autoHideDuration]);

  // Don't show anything if we're online and haven't been offline recently
  if (isOnline && !showOnlineNotification) {
    return null;
  }

  return (
    <div className={`offline-notification ${isOffline ? 'offline' : 'online'}`}>
      <div className='offline-notification-content'>
        {isOffline ? (
          <>
            <IoCloudOffline size={20} />
            <div className='offline-text'>
              <span className='offline-title'>No Internet Connection</span>
              <span className='offline-subtitle'>
                Changes will be saved locally and synced when you're back online
              </span>
            </div>
          </>
        ) : (
          <>
            <IoCloudDone size={20} />
            <div className='offline-text'>
              <span className='offline-title'>Back Online</span>
              <span className='offline-subtitle'>
                Syncing your changes...
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineNotification;
