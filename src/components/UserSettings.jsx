import React, { useState, useEffect } from 'react';
import { IoPerson, IoShieldCheckmark, IoNotifications, IoClose, IoCamera } from 'react-icons/io5';
import '../App.css';

const UserSettings = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('account');

  // Load user data from localStorage
  const loadUserData = () => {
    const saved = localStorage.getItem('userData');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      name: 'User Name',
      email: 'user@example.com',
      country: 'United States',
      profilePicture: null
    };
  };

  const [userData, setUserData] = useState(loadUserData());
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    pomodoroComplete: true,
    breakComplete: true,
    dailySummary: false
  });

  // Save user data to localStorage
  useEffect(() => {
    localStorage.setItem('userData', JSON.stringify(userData));
  }, [userData]);

  const handleSaveAccount = () => {
    alert('Account information saved!');
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }
    alert('Password changed successfully!');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleNotificationToggle = (key) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
    'Mexico', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark'
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className='user-settings-overlay' onClick={onClose}></div>}

      {/* Left Drawer */}
      <div className={`user-settings-drawer ${isOpen ? 'open' : ''}`}>
        <div className='drawer-header'>
          <h2>Settings</h2>
          <button className='close-drawer-btn' onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className='settings-tabs-nav'>
          <button
            className={`settings-tab-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <IoPerson size={20} />
            <span>Account</span>
          </button>
          <button
            className={`settings-tab-nav-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <IoShieldCheckmark size={20} />
            <span>Security</span>
          </button>
          <button
            className={`settings-tab-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <IoNotifications size={20} />
            <span>Notifications</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className='settings-tab-content'>
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className='settings-account-tab'>
              <h3>Account Information</h3>

              {/* Profile Picture */}
              <div className='profile-picture-section'>
                <div className='profile-picture-container'>
                  {userData.profilePicture ? (
                    <img src={userData.profilePicture} alt='Profile' className='profile-picture' />
                  ) : (
                    <div className='profile-picture-placeholder'>
                      <IoPerson size={48} />
                    </div>
                  )}
                  <button className='change-picture-btn'>
                    <IoCamera size={18} />
                  </button>
                </div>
                <p className='profile-picture-hint'>Click to change profile picture</p>
              </div>

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
                  />
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

                <button className='btn-primary-settings' onClick={handleSaveAccount}>
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className='settings-security-tab'>
              <h3>Change Password</h3>
              <p className='security-description'>
                Update your password to keep your account secure.
              </p>

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

                <button type='submit' className='btn-primary-settings'>
                  Change Password
                </button>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className='settings-notifications-tab'>
              <h3>Notification Preferences</h3>
              <p className='notifications-description'>
                Choose which notifications you'd like to receive.
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
    </>
  );
};

export default UserSettings;
