import React, { useState, useEffect, useRef } from 'react';
import { IoPerson, IoShieldCheckmark, IoNotifications, IoCamera, IoClose, IoCheckmark, IoCloudUpload, IoTrophy } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useGoalsStreaks } from '../hooks/useGoalsStreaks';
import { imageCategories, getUserAvatar, fileToBase64 } from '../utils/profilePictures';
import '../App.css';

const FullSettings = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('settingsActiveTab') || 'account';
  });
  const { user, signOut, updateProfile, updatePassword } = useAuth();
  const { goals, updateGoals } = useGoalsStreaks();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('animals');
  const fileInputRef = useRef(null);
  const [goalSettings, setGoalSettings] = useState({
    dailyPomodoroGoal: goals.dailyPomodoroGoal || 8,
    weeklyPomodoroGoal: goals.weeklyPomodoroGoal || 40
  });

  // Load user data from Supabase or localStorage
  const loadUserData = () => {
    if (user) {
      // Get data from Supabase user object
      return {
        name: user.user_metadata?.name || '',
        username: user.user_metadata?.username || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        address: user.user_metadata?.address || '',
        city: user.user_metadata?.city || '',
        country: user.user_metadata?.country || 'United States',
        timezone: user.user_metadata?.timezone || '',
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
      username: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'United States',
      timezone: '',
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
        username: user.user_metadata?.username || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        address: user.user_metadata?.address || '',
        city: user.user_metadata?.city || '',
        country: user.user_metadata?.country || 'United States',
        timezone: user.user_metadata?.timezone || '',
        profilePicture: avatar
      });
    } else {
      const saved = localStorage.getItem('userData');
      if (saved) {
        setUserData(JSON.parse(saved));
      } else {
        setUserData({
          name: '',
          username: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          country: 'United States',
          timezone: '',
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

  // Update goalSettings when goals change
  useEffect(() => {
    setGoalSettings({
      dailyPomodoroGoal: goals.dailyPomodoroGoal || 8,
      weeklyPomodoroGoal: goals.weeklyPomodoroGoal || 40
    });
  }, [goals]);

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
          username: userData.username,
          phone: userData.phone,
          address: userData.address,
          city: userData.city,
          country: userData.country,
          timezone: userData.timezone,
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
      setUserData({ ...userData, profilePicture: base64 });
    } catch (err) {
      setError('Failed to upload image');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemovePhoto = () => {
    setUserData({ ...userData, profilePicture: getUserAvatar(user?.id) });
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

  const handleSaveGoals = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { success, error: updateError } = await updateGoals({
        dailyPomodoroGoal: goalSettings.dailyPomodoroGoal,
        weeklyPomodoroGoal: goalSettings.weeklyPomodoroGoal
      });

      if (!success && updateError) throw updateError;

      setMessage('Goals updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update goals');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
    'Mexico', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark'
  ];

  const timezones = [
    { value: 'Pacific/Honolulu', label: 'Honolulu (UTC-10:00)' },
    { value: 'America/Anchorage', label: 'Alaska (UTC-09:00)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles, San Francisco (UTC-08:00)' },
    { value: 'America/Phoenix', label: 'Phoenix (UTC-07:00)' },
    { value: 'America/Denver', label: 'Denver, Salt Lake City (UTC-07:00)' },
    { value: 'America/Chicago', label: 'Chicago, Dallas, Houston (UTC-06:00)' },
    { value: 'America/Mexico_City', label: 'Mexico City (UTC-06:00)' },
    { value: 'America/New_York', label: 'New York, Miami, Toronto (UTC-05:00)' },
    { value: 'America/Caracas', label: 'Caracas (UTC-04:00)' },
    { value: 'America/Santiago', label: 'Santiago (UTC-04:00)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo, Buenos Aires (UTC-03:00)' },
    { value: 'Atlantic/South_Georgia', label: 'South Georgia (UTC-02:00)' },
    { value: 'Atlantic/Azores', label: 'Azores (UTC-01:00)' },
    { value: 'UTC', label: 'UTC (UTC+00:00)' },
    { value: 'Europe/London', label: 'London, Dublin, Lisbon (UTC+00:00)' },
    { value: 'Europe/Paris', label: 'Paris, Berlin, Rome (UTC+01:00)' },
    { value: 'Europe/Athens', label: 'Athens, Helsinki, Istanbul (UTC+02:00)' },
    { value: 'Africa/Cairo', label: 'Cairo (UTC+02:00)' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg (UTC+02:00)' },
    { value: 'Europe/Moscow', label: 'Moscow (UTC+03:00)' },
    { value: 'Asia/Dubai', label: 'Dubai (UTC+04:00)' },
    { value: 'Asia/Karachi', label: 'Karachi (UTC+05:00)' },
    { value: 'Asia/Kolkata', label: 'Mumbai, Delhi, Kolkata (UTC+05:30)' },
    { value: 'Asia/Dhaka', label: 'Dhaka (UTC+06:00)' },
    { value: 'Asia/Bangkok', label: 'Bangkok, Jakarta (UTC+07:00)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong, Singapore (UTC+08:00)' },
    { value: 'Asia/Shanghai', label: 'Beijing, Shanghai (UTC+08:00)' },
    { value: 'Asia/Tokyo', label: 'Tokyo, Seoul (UTC+09:00)' },
    { value: 'Australia/Sydney', label: 'Sydney, Melbourne (UTC+10:00)' },
    { value: 'Pacific/Auckland', label: 'Auckland (UTC+12:00)' }
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
        <button
          className={`full-settings-tab ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          <IoTrophy size={20} />
          <span>Goals</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className='full-settings-content'>
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className='settings-account-tab'>
            {/* Header Section */}
            <div className='account-header'>
              <div className='account-header-left'>
                <IoPerson size={24} style={{ color: '#9ca3af' }} />
                <h2>Account</h2>
              </div>
            </div>

            {message && <div className='auth-success' style={{marginBottom: '1.5rem'}}>{message}</div>}
            {error && <div className='auth-error' style={{marginBottom: '1.5rem'}}>{error}</div>}

            {/* Avatar Section */}
            <div className='account-avatar-section'>
              <div className='account-avatar-container'>
                {userData.profilePicture ? (
                  <img
                    src={userData.profilePicture}
                    alt='Profile'
                    className='account-avatar-image'
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {!userData.profilePicture && (
                  <div className='account-avatar-placeholder'>
                    <IoPerson size={32} />
                  </div>
                )}
              </div>
              <div className='account-avatar-actions'>
                <button className='btn-avatar-change' onClick={() => setShowAvatarPicker(true)}>
                  <IoCamera size={16} /> Change Photo
                </button>
                <button className='btn-avatar-upload' onClick={() => fileInputRef.current?.click()}>
                  <IoCloudUpload size={16} /> Upload
                </button>
                {userData.profilePicture && (
                  <button className='btn-avatar-remove' onClick={handleRemovePhoto}>
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
              <>
                <div className='avatar-picker-overlay' onClick={() => setShowAvatarPicker(false)}></div>
                <div className='avatar-picker-modal'>
                  <div className='avatar-picker-header'>
                    <h4>Choose Your Avatar</h4>
                    <button className='avatar-close-btn' onClick={() => setShowAvatarPicker(false)}>
                      <IoClose size={24} />
                    </button>
                  </div>

                  {/* Category Tabs */}
                  <div className='avatar-category-tabs'>
                    {Object.entries(imageCategories).map(([key, category]) => (
                      <button
                        key={key}
                        className={`avatar-category-tab ${selectedCategory === key ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(key)}
                      >
                        {category.icon} {category.name}
                      </button>
                    ))}
                  </div>

                  {/* Image Grid */}
                  <div className='image-grid'>
                    {imageCategories[selectedCategory].images.map((image, index) => (
                      <button
                        key={index}
                        className={`image-option ${userData.profilePicture === image ? 'selected' : ''}`}
                        onClick={() => {
                          setUserData({ ...userData, profilePicture: image });
                          setShowAvatarPicker(false);
                        }}
                      >
                        <img src={image} alt={`Avatar ${index + 1}`} />
                        {userData.profilePicture === image && (
                          <div className='image-selected-badge'>
                            <IoCheckmark size={16} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Account Form - Two Column Layout */}
            <div className='account-form-grid'>
              <div className='form-group'>
                <label>Full Name *</label>
                <input
                  type='text'
                  value={userData.name}
                  onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  placeholder='Enter your full name'
                  required
                />
              </div>

              <div className='form-group'>
                <label>Username</label>
                <input
                  type='text'
                  value={userData.username}
                  onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                  placeholder='Enter your username'
                />
              </div>

              <div className='form-group'>
                <label>Email *</label>
                <input
                  type='email'
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  placeholder='Enter your email'
                  disabled={!!user}
                  title={user ? 'Email cannot be changed. Contact support to change your email.' : ''}
                  required
                />
                {user && <p className='field-hint'>Email cannot be changed</p>}
              </div>

              <div className='form-group'>
                <label>Phone</label>
                <input
                  type='tel'
                  value={userData.phone}
                  onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  placeholder='Enter your phone number'
                />
              </div>

              <div className='form-group'>
                <label>Address</label>
                <input
                  type='text'
                  value={userData.address}
                  onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                  placeholder='Enter your street address'
                />
              </div>

              <div className='form-group'>
                <label>City</label>
                <input
                  type='text'
                  value={userData.city}
                  onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                  placeholder='Enter your city'
                />
              </div>

              <div className='form-group'>
                <label>Country</label>
                <select
                  value={userData.country}
                  onChange={(e) => setUserData({ ...userData, country: e.target.value })}
                >
                  <option value=''>Select a country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className='form-group'>
                <label>Timezone</label>
                <select
                  value={userData.timezone}
                  onChange={(e) => setUserData({ ...userData, timezone: e.target.value })}
                >
                  <option value=''>Select timezone</option>
                  {timezones.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='account-actions'>
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
            {/* Header Section */}
            <div className='account-header'>
              <div className='account-header-left'>
                <IoShieldCheckmark size={24} style={{ color: '#9ca3af' }} />
                <h2>Security</h2>
              </div>
            </div>

            <p className='section-description'>
              {user
                ? 'Update your password to keep your account secure.'
                : 'You must be logged in to change your password.'}
            </p>

            {message && <div className='auth-success' style={{marginBottom: '1.5rem'}}>{message}</div>}
            {error && <div className='auth-error' style={{marginBottom: '1.5rem'}}>{error}</div>}

            {user ? (
              <div className='security-card'>
                <h3 className='card-title'>Change Password</h3>
                <form onSubmit={handlePasswordChange} className='security-form'>
                  <div className='form-group'>
                    <label>Current Password *</label>
                    <input
                      type='password'
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder='Enter current password'
                      required
                    />
                  </div>

                  <div className='form-group'>
                    <label>New Password *</label>
                    <input
                      type='password'
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder='Enter new password (min 8 characters)'
                      required
                      minLength={8}
                    />
                    <p className='field-hint'>Must be at least 8 characters long</p>
                  </div>

                  <div className='form-group'>
                    <label>Confirm New Password *</label>
                    <input
                      type='password'
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder='Confirm new password'
                      required
                    />
                  </div>

                  <button type='submit' className='btn-primary-settings' disabled={loading}>
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </form>
              </div>
            ) : (
              <div className='empty-state-card'>
                <IoShieldCheckmark size={48} style={{ color: '#6b7280', marginBottom: '1rem' }} />
                <p className='empty-state-text'>Please sign in to manage your password</p>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className='settings-notifications-tab'>
            {/* Header Section */}
            <div className='account-header'>
              <div className='account-header-left'>
                <IoNotifications size={24} style={{ color: '#9ca3af' }} />
                <h2>Notifications</h2>
              </div>
            </div>

            <p className='section-description'>
              Choose which in-browser notifications you'd like to receive.
              {!notificationSettings.permissionGranted && (
                <span className='notification-warning'> You need to grant permission to receive notifications.</span>
              )}
            </p>

            <div className='notifications-grid'>
              <div className='notification-card'>
                <div className='notification-card-content'>
                  <div className='notification-info'>
                    <h4 className='notification-title'>Pomodoro Complete</h4>
                    <p className='notification-description'>Get notified when a focus session ends</p>
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
              </div>

              <div className='notification-card'>
                <div className='notification-card-content'>
                  <div className='notification-info'>
                    <h4 className='notification-title'>Break Complete</h4>
                    <p className='notification-description'>Get notified when a break ends</p>
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
              </div>

              <div className='notification-card'>
                <div className='notification-card-content'>
                  <div className='notification-info'>
                    <h4 className='notification-title'>Daily Summary</h4>
                    <p className='notification-description'>Receive a summary of your daily productivity</p>
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
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className='settings-goals-tab'>
            {/* Header Section */}
            <div className='account-header'>
              <div className='account-header-left'>
                <IoTrophy size={24} style={{ color: '#9ca3af' }} />
                <h2>Goals & Streaks</h2>
              </div>
            </div>

            <p className='section-description'>
              Set your daily and weekly pomodoro goals to stay motivated and track your progress.
            </p>

            {message && <div className='auth-success' style={{marginBottom: '1.5rem'}}>{message}</div>}
            {error && <div className='auth-error' style={{marginBottom: '1.5rem'}}>{error}</div>}

            <div className='goals-card'>
              <h3 className='card-title'>Pomodoro Goals</h3>

              <div className='goals-form'>
                <div className='form-group'>
                  <label>Daily Pomodoro Goal</label>
                  <input
                    type='number'
                    min='1'
                    max='50'
                    value={goalSettings.dailyPomodoroGoal}
                    onChange={(e) => setGoalSettings({
                      ...goalSettings,
                      dailyPomodoroGoal: parseInt(e.target.value) || 1
                    })}
                    placeholder='e.g., 8'
                  />
                  <p className='field-hint'>Number of pomodoros you aim to complete each day</p>
                </div>

                <div className='form-group'>
                  <label>Weekly Pomodoro Goal</label>
                  <input
                    type='number'
                    min='1'
                    max='350'
                    value={goalSettings.weeklyPomodoroGoal}
                    onChange={(e) => setGoalSettings({
                      ...goalSettings,
                      weeklyPomodoroGoal: parseInt(e.target.value) || 1
                    })}
                    placeholder='e.g., 40'
                  />
                  <p className='field-hint'>Number of pomodoros you aim to complete each week</p>
                </div>

                <button
                  className='btn-primary-settings'
                  onClick={handleSaveGoals}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Goals'}
                </button>
              </div>
            </div>

            <div className='goals-info-card'>
              <h3 className='card-title'>About Streaks</h3>
              <p className='info-text'>
                Your streak counts consecutive days with at least one completed pomodoro.
                Keep your streak alive by completing at least one focus session every day!
              </p>
              <p className='info-text'>
                Check the Dashboard to see your current streak and track your progress toward your goals.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullSettings;
