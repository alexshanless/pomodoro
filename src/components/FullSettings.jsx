import React, { useState, useEffect } from 'react';
import { IoPerson, IoShieldCheckmark, IoNotifications, IoCamera } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { animalAvatars, getUserAvatar } from '../utils/profilePictures';
import '../App.css';

const FullSettings = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('settingsActiveTab') || 'account';
  });
  const { user, signOut, updateProfile, updatePassword } = useAuth();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Load user data from Supabase or localStorage
  const loadUserData = () => {
    if (user) {
      // Get data from Supabase user object
      return {
        name: user.user_metadata?.name || '',
        email: user.email || '',
        country: user.user_metadata?.country || 'United States',
        profilePicture: user.user_metadata?.profile_picture || null
      };
    }

    // Fallback to localStorage for non-authenticated users
    const saved = localStorage.getItem('userData');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      name: '',
      email: '',
      country: 'United States',
      profilePicture: null
    };
  };

  const [userData, setUserData] = useState(loadUserData());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load notification settings from localStorage
  const loadNotificationSettings = () => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      pomodoroComplete: false,
      breakComplete: false,
      dailySummary: false,
      permissionGranted: false
    };
  };

  const [notificationSettings, setNotificationSettings] = useState(loadNotificationSettings());

  // Update userData when user changes
  useEffect(() => {
    if (user) {
      // If user doesn't have a profile picture, assign a default animal avatar
      const avatar = user.user_metadata?.profile_picture || getUserAvatar(user.id);
      setUserData({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        country: user.user_metadata?.country || 'United States',
        profilePicture: avatar
      });
    } else {
      const saved = localStorage.getItem('userData');
      if (saved) {
        setUserData(JSON.parse(saved));
      } else {
        setUserData({
          name: '',
          email: '',
          country: 'United States',
          profilePicture: getUserAvatar(null)
        });
      }
    }
  }, [user]);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('settingsActiveTab', activeTab);
  }, [activeTab]);

  // Save notification settings to localStorage
  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationSettings(prev => ({ ...prev, permissionGranted: true }));
      }
    }
  }, []);

  const handleSaveAccount = async () => {
    if (!user) {
      // Save to localStorage if not authenticated
      localStorage.setItem('userData', JSON.stringify(userData));
      setMessage('Changes saved locally!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Save to Supabase if authenticated
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await updateProfile({
        data: {
          name: userData.name,
          country: userData.country,
          profile_picture: userData.profilePicture
        }
      });

      if (error) throw error;

      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to change your password');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!passwordData.currentPassword) {
      setError('Please enter your current password');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match!');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long!');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await updatePassword(passwordData.currentPassword, passwordData.newPassword);

      if (error) throw error;

      setMessage('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      window.location.href = '/';
    }
  };

  const handleNotificationToggle = async (key) => {
    // If trying to enable notifications and permission not granted
    if (!notificationSettings.permissionGranted && !notificationSettings[key]) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationSettings(prev => ({
            ...prev,
            [key]: true,
            permissionGranted: true
          }));
          // Send test notification
          new Notification('Notifications Enabled!', {
            body: 'You will now receive pomodoro notifications.',
            icon: '/favicon.ico'
          });
        } else {
          alert('Please grant notification permission to enable this feature.');
        }
      } else {
        alert('Your browser does not support notifications.');
      }
    } else {
      setNotificationSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
    'Mexico', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark'
  ];

  return (
    <div className='full-settings-container'>
      {/* Tab Navigation */}
      <div className='full-settings-tabs'>
        <button
          className={`full-settings-tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <IoPerson size={20} />
          <span>Account</span>
        </button>
        <button
          className={`full-settings-tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <IoShieldCheckmark size={20} />
          <span>Security</span>
        </button>
        <button
          className={`full-settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <IoNotifications size={20} />
          <span>Notifications</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className='full-settings-content'>
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className='settings-account-tab'>
            <h2>Account Information</h2>

            {message && <div className='auth-success' style={{marginBottom: '1rem'}}>{message}</div>}
            {error && <div className='auth-error' style={{marginBottom: '1rem'}}>{error}</div>}

            {/* Profile Picture */}
            <div className='profile-picture-section'>
              <div className='profile-picture-container'>
                {userData.profilePicture ? (
                  <div className='profile-picture-emoji'>
                    {userData.profilePicture}
                  </div>
                ) : (
                  <div className='profile-picture-placeholder'>
                    <IoPerson size={48} />
                  </div>
                )}
                <button className='change-picture-btn' onClick={() => setShowAvatarPicker(true)}>
                  <IoCamera size={18} />
                </button>
              </div>
              <p className='profile-picture-hint'>Click to change profile picture</p>
            </div>

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
              <>
                <div className='avatar-picker-overlay' onClick={() => setShowAvatarPicker(false)}></div>
                <div className='avatar-picker-modal'>
                  <h4>Choose Your Avatar</h4>
                  <div className='avatar-grid'>
                    {animalAvatars.map((avatar, index) => (
                      <button
                        key={index}
                        className={`avatar-option ${userData.profilePicture === avatar ? 'selected' : ''}`}
                        onClick={() => {
                          setUserData({ ...userData, profilePicture: avatar });
                          setShowAvatarPicker(false);
                        }}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Account Form */}
            <div className='settings-form'>
              <div className='form-group'>
                <label>Full Name</label>
                <input
                  type='text'
                  value={userData.name}
                  onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  placeholder='Enter your name'
                />
              </div>

              <div className='form-group'>
                <label>Email</label>
                <input
                  type='email'
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  placeholder='Enter your email'
                  disabled={!!user}
                  title={user ? 'Email cannot be changed. Contact support to change your email.' : ''}
                />
                {user && <p style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>Email cannot be changed</p>}
              </div>

              <div className='form-group'>
                <label>Country</label>
                <select
                  value={userData.country}
                  onChange={(e) => setUserData({ ...userData, country: e.target.value })}
                >
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <button
                className='btn-primary-settings'
                onClick={handleSaveAccount}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>

              {user && (
                <button
                  className='btn-secondary-settings'
                  onClick={handleSignOut}
                  style={{marginTop: '1rem'}}
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className='settings-security-tab'>
            <h2>Change Password</h2>
            <p className='security-description'>
              {user
                ? 'Update your password to keep your account secure.'
                : 'You must be logged in to change your password.'}
            </p>

            {message && <div className='auth-success' style={{marginBottom: '1rem'}}>{message}</div>}
            {error && <div className='auth-error' style={{marginBottom: '1rem'}}>{error}</div>}

            {user ? (
              <form onSubmit={handlePasswordChange} className='settings-form'>
                <div className='form-group'>
                  <label>Current Password</label>
                  <input
                    type='password'
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder='Enter current password'
                    required
                  />
                </div>

                <div className='form-group'>
                  <label>New Password</label>
                  <input
                    type='password'
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder='Enter new password (min 8 characters)'
                    required
                    minLength={8}
                  />
                </div>

                <div className='form-group'>
                  <label>Confirm New Password</label>
                  <input
                    type='password'
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder='Confirm new password'
                    required
                  />
                </div>

                <button type='submit' className='btn-primary-settings' disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            ) : (
              <div className='auth-prompt'>
                <p style={{color: '#9ca3af', marginBottom: '1rem'}}>Please sign in to manage your password.</p>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className='settings-notifications-tab'>
            <h2>Notification Preferences</h2>
            <p className='notifications-description'>
              Choose which in-browser notifications you'd like to receive.
              {!notificationSettings.permissionGranted && (
                <span className='notification-warning'> You need to grant permission to receive notifications.</span>
              )}
            </p>

            <div className='notifications-list'>
              <div className='notification-item'>
                <div className='notification-info'>
                  <h4>Pomodoro Complete</h4>
                  <p>Get notified when a focus session ends</p>
                </div>
                <label className='toggle-switch'>
                  <input
                    type='checkbox'
                    checked={notificationSettings.pomodoroComplete}
                    onChange={() => handleNotificationToggle('pomodoroComplete')}
                  />
                  <span className='toggle-slider'></span>
                </label>
              </div>

              <div className='notification-item'>
                <div className='notification-info'>
                  <h4>Break Complete</h4>
                  <p>Get notified when a break ends</p>
                </div>
                <label className='toggle-switch'>
                  <input
                    type='checkbox'
                    checked={notificationSettings.breakComplete}
                    onChange={() => handleNotificationToggle('breakComplete')}
                  />
                  <span className='toggle-slider'></span>
                </label>
              </div>

              <div className='notification-item'>
                <div className='notification-info'>
                  <h4>Daily Summary</h4>
                  <p>Receive a summary of your daily productivity</p>
                </div>
                <label className='toggle-switch'>
                  <input
                    type='checkbox'
                    checked={notificationSettings.dailySummary}
                    onChange={() => handleNotificationToggle('dailySummary')}
                  />
                  <span className='toggle-slider'></span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullSettings;
