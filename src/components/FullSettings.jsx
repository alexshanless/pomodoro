import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoClose, IoCheckmark } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useGoalsStreaks } from '../hooks/useGoalsStreaks';
import { imageCategories, getUserAvatar, fileToBase64 } from '../utils/profilePictures';
import '../styles/SettingsRedesign.css';

const Icon = {
  account: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
      <circle cx='12' cy='7' r='4' />
    </svg>
  ),
  security: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
    </svg>
  ),
  notifications: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
      <path d='M13.7 21a2 2 0 0 1-3.4 0' />
    </svg>
  ),
  goals: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='12' cy='12' r='9' />
      <circle cx='12' cy='12' r='5' />
      <circle cx='12' cy='12' r='1.4' fill='currentColor' />
    </svg>
  ),
  lock: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <rect x='3' y='11' width='18' height='11' rx='2' />
      <path d='M7 11V7a5 5 0 0 1 10 0v4' />
    </svg>
  ),
  upload: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
      <polyline points='7 10 12 5 17 10' />
      <line x1='12' y1='5' x2='12' y2='15' />
    </svg>
  ),
  check: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='20 6 9 17 4 12' />
    </svg>
  ),
  warn: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='12' cy='12' r='9' />
      <path d='M12 8v4M12 16h.01' />
    </svg>
  ),
  chevron: (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M9 6l6 6-6 6' />
    </svg>
  ),
};

const TABS = [
  { key: 'account', label: 'Account', icon: Icon.account },
  { key: 'security', label: 'Security', icon: Icon.security },
  { key: 'notifications', label: 'Notifications', icon: Icon.notifications },
  { key: 'goals', label: 'Goals', icon: Icon.goals },
];

const FullSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('settingsActiveTab') || 'account');
  const { user, signOut, updateProfile, updatePassword } = useAuth();
  const { goals, updateGoals } = useGoalsStreaks();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('animals');
  const fileInputRef = useRef(null);

  const [goalSettings, setGoalSettings] = useState({
    dailyPomodoroGoal: goals.dailyPomodoroGoal || 8,
    weeklyPomodoroGoal: goals.weeklyPomodoroGoal || 40,
  });

  const [sessionTimeoutSettings, setSessionTimeoutSettings] = useState(() => {
    const saved = localStorage.getItem('sessionTimeoutSettings');
    return saved ? JSON.parse(saved) : { enabled: true, timeoutMinutes: 120 };
  });

  const loadUserData = () => {
    if (user) {
      return {
        name: user.user_metadata?.name || '',
        username: user.user_metadata?.username || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        address: user.user_metadata?.address || '',
        city: user.user_metadata?.city || '',
        country: user.user_metadata?.country || 'United States',
        timezone: user.user_metadata?.timezone || '',
        profilePicture: user.user_metadata?.profile_picture || null,
      };
    }
    const saved = localStorage.getItem('userData');
    if (saved) return JSON.parse(saved);
    return {
      name: '', username: '', email: '', phone: '', address: '',
      city: '', country: 'United States', timezone: '', profilePicture: null,
    };
  };

  const [userData, setUserData] = useState(loadUserData());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const loadNotificationSettings = () => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) return JSON.parse(saved);
    return { pomodoroComplete: false, breakComplete: false, dailySummary: false, permissionGranted: false };
  };

  const [notificationSettings, setNotificationSettings] = useState(loadNotificationSettings());

  useEffect(() => {
    if (user) {
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
        profilePicture: avatar,
      });
    } else {
      const saved = localStorage.getItem('userData');
      setUserData(saved ? JSON.parse(saved) : {
        name: '', username: '', email: '', phone: '', address: '',
        city: '', country: 'United States', timezone: '', profilePicture: getUserAvatar(null),
      });
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('settingsActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('sessionTimeoutSettings', JSON.stringify(sessionTimeoutSettings));
  }, [sessionTimeoutSettings]);

  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationSettings((prev) => ({ ...prev, permissionGranted: true }));
    }
  }, []);

  useEffect(() => {
    setGoalSettings({
      dailyPomodoroGoal: goals.dailyPomodoroGoal || 8,
      weeklyPomodoroGoal: goals.weeklyPomodoroGoal || 40,
    });
  }, [goals]);

  const flash = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };
  const flashError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  const handleSaveAccount = async () => {
    if (!user) {
      localStorage.setItem('userData', JSON.stringify(userData));
      flash('Changes saved locally!');
      return;
    }
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
          profile_picture: userData.profilePicture,
        },
      });
      if (error) throw error;
      flash('Changes saved');
    } catch (err) {
      flashError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      flashError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      flashError('Image size must be less than 5MB');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setUserData((prev) => ({ ...prev, profilePicture: base64 }));
    } catch (err) {
      flashError('Failed to upload image');
    }
  };

  const handleRemovePhoto = () => {
    setUserData((prev) => ({ ...prev, profilePicture: getUserAvatar(user?.id) }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!user) {
      flashError('You must be logged in to change your password');
      return;
    }
    if (!passwordData.currentPassword) {
      flashError('Please enter your current password');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      flashError('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      flashError('Password must be at least 8 characters long!');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { error } = await updatePassword(passwordData.currentPassword, passwordData.newPassword);
      if (error) throw error;
      flash('Password updated');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      flashError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) window.location.href = '/';
  };

  const handleNotificationToggle = async (key) => {
    if (!notificationSettings.permissionGranted && !notificationSettings[key]) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationSettings((prev) => ({ ...prev, [key]: true, permissionGranted: true }));
          new Notification('Notifications enabled', {
            body: 'You will now receive pompay notifications.',
            icon: '/favicon.ico',
          });
        } else {
          flashError('Please grant notification permission to enable this.');
        }
      } else {
        flashError('Your browser does not support notifications.');
      }
    } else {
      setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleSaveNotifications = () => flash('Preferences saved');

  const handleSaveGoals = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { success, error: updateError } = await updateGoals({
        dailyPomodoroGoal: goalSettings.dailyPomodoroGoal,
        weeklyPomodoroGoal: goalSettings.weeklyPomodoroGoal,
      });
      if (!success && updateError) throw updateError;
      flash('Goals saved');
    } catch (err) {
      flashError(err.message || 'Failed to update goals');
    } finally {
      setLoading(false);
    }
  };

  const adjustGoal = (key, delta, min, max) => {
    setGoalSettings((prev) => {
      const next = Math.max(min, Math.min(max, (prev[key] || min) + delta));
      return { ...prev, [key]: next };
    });
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
    'Mexico', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark',
  ];

  const timezones = [
    { value: 'Pacific/Honolulu', label: 'Honolulu (UTC−10:00)' },
    { value: 'America/Anchorage', label: 'Alaska (UTC−09:00)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles, San Francisco (UTC−08:00)' },
    { value: 'America/Phoenix', label: 'Phoenix (UTC−07:00)' },
    { value: 'America/Denver', label: 'Denver, Salt Lake City (UTC−07:00)' },
    { value: 'America/Chicago', label: 'Chicago, Dallas, Houston (UTC−06:00)' },
    { value: 'America/Mexico_City', label: 'Mexico City (UTC−06:00)' },
    { value: 'America/New_York', label: 'New York, Miami, Toronto (UTC−05:00)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo, Buenos Aires (UTC−03:00)' },
    { value: 'UTC', label: 'UTC (UTC+00:00)' },
    { value: 'Europe/London', label: 'London, Dublin, Lisbon (UTC+00:00)' },
    { value: 'Europe/Paris', label: 'Paris, Berlin, Rome (UTC+01:00)' },
    { value: 'Europe/Athens', label: 'Athens, Helsinki, Istanbul (UTC+02:00)' },
    { value: 'Europe/Moscow', label: 'Moscow (UTC+03:00)' },
    { value: 'Asia/Dubai', label: 'Dubai (UTC+04:00)' },
    { value: 'Asia/Kolkata', label: 'Mumbai, Delhi, Kolkata (UTC+05:30)' },
    { value: 'Asia/Bangkok', label: 'Bangkok, Jakarta (UTC+07:00)' },
    { value: 'Asia/Shanghai', label: 'Beijing, Shanghai, Singapore (UTC+08:00)' },
    { value: 'Asia/Tokyo', label: 'Tokyo, Seoul (UTC+09:00)' },
    { value: 'Australia/Sydney', label: 'Sydney, Melbourne (UTC+10:00)' },
    { value: 'Pacific/Auckland', label: 'Auckland (UTC+12:00)' },
  ];

  const renderActions = (saveLabel, onSave, savedText, showSignOut = false) => (
    <div className='pps-actions'>
      <span className={`pps-saved-flag${message ? ' show' : ''}`}>{Icon.check}{savedText}</span>
      {error && <span className='pps-error'>{Icon.warn}{error}</span>}
      <div className='spacer'></div>
      {showSignOut && user && (
        <button type='button' className='pps-btn pps-btn-soft' onClick={handleSignOut}>Sign out</button>
      )}
      <button type='button' className='pps-btn pps-btn-grad' onClick={onSave} disabled={loading}>
        {loading ? 'Saving…' : saveLabel}
      </button>
    </div>
  );

  return (
    <div className='pompay-settings'>
      <div className='pps-wrap'>
        <div className='pps-head'>
          <div className='pps-crumb'>
            <button type='button' onClick={() => navigate('/dashboard')}>Home</button>
            {Icon.chevron}
            <span>Settings</span>
          </div>
          <h1>Settings</h1>
          <div className='pps-hsub'>Manage your account, security, and focus preferences.</div>
        </div>

        <div className='pps-seg' role='tablist'>
          {TABS.map((t) => (
            <button
              key={t.key}
              role='tab'
              className={activeTab === t.key ? 'on' : ''}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ============ ACCOUNT ============ */}
        {activeTab === 'account' && (
          <section className='pps-pane'>
            <div className='pps-panel'>
              <div className='pps-ph-wrap'>
                <div className='pps-ph'>
                  <span className='pps-ic'>{Icon.account}</span>
                  <div>
                    <h2>Profile</h2>
                    <div className='pps-psub'>This information is visible to your collaborators.</div>
                  </div>
                </div>
              </div>

              <div className='pps-photo-row'>
                <img className='pps-pic' alt='Profile' src={userData.profilePicture || getUserAvatar(user?.id)} />
                <div className='pps-photo-meta'>
                  <span className='pps-pm-t'>Profile photo</span>
                  <span className='pps-pm-s'>PNG or JPG, at least 200×200px. Max 5MB.</span>
                  <div className='pps-photo-acts'>
                    <button type='button' className='pps-btn pps-btn-soft' onClick={() => setShowAvatarPicker(true)}>
                      Choose avatar
                    </button>
                    <button type='button' className='pps-btn pps-btn-soft' onClick={() => fileInputRef.current?.click()}>
                      {Icon.upload}Upload photo
                    </button>
                    <button type='button' className='pps-link-danger' onClick={handleRemovePhoto}>Remove</button>
                  </div>
                </div>
                <input ref={fileInputRef} type='file' accept='image/*' onChange={handleFileUpload} style={{ display: 'none' }} />
              </div>

              <div className='pps-grid'>
                <div className='pps-field'>
                  <label>Full name <span className='req'>*</span></label>
                  <input type='text' placeholder='Enter your full name' value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })} />
                </div>
                <div className='pps-field'>
                  <label>Username</label>
                  <input type='text' placeholder='Enter your username' value={userData.username}
                    onChange={(e) => setUserData({ ...userData, username: e.target.value })} />
                </div>
                <div className='pps-field'>
                  <label>Email <span className='req'>*</span></label>
                  <input type='email' value={userData.email} disabled={!!user}
                    placeholder='Enter your email'
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })} />
                  {user && <span className='hint'>{Icon.lock}Email can’t be changed</span>}
                </div>
                <div className='pps-field'>
                  <label>Phone</label>
                  <input type='tel' placeholder='Enter your phone number' value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })} />
                </div>
                <div className='pps-field full'>
                  <label>Address</label>
                  <input type='text' placeholder='Enter your street address' value={userData.address}
                    onChange={(e) => setUserData({ ...userData, address: e.target.value })} />
                </div>
                <div className='pps-field'>
                  <label>City</label>
                  <input type='text' placeholder='Enter your city' value={userData.city}
                    onChange={(e) => setUserData({ ...userData, city: e.target.value })} />
                </div>
                <div className='pps-field'>
                  <label>Country</label>
                  <select value={userData.country} onChange={(e) => setUserData({ ...userData, country: e.target.value })}>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className='pps-field full'>
                  <label>Timezone</label>
                  <select value={userData.timezone} onChange={(e) => setUserData({ ...userData, timezone: e.target.value })}>
                    <option value=''>Select timezone</option>
                    {timezones.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
              </div>

              {renderActions('Save changes', handleSaveAccount, 'Changes saved', true)}
            </div>
          </section>
        )}

        {/* ============ SECURITY ============ */}
        {activeTab === 'security' && (
          <section className='pps-pane'>
            {user ? (
              <>
                <div className='pps-panel'>
                  <div className='pps-ph-wrap'>
                    <div className='pps-ph'>
                      <span className='pps-ic'>{Icon.security}</span>
                      <div>
                        <h2>Password</h2>
                        <div className='pps-psub'>Use 8+ characters with a mix of letters and numbers.</div>
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handlePasswordChange}>
                    <div className='pps-grid'>
                      <div className='pps-field full'>
                        <label>Current password</label>
                        <input type='password' placeholder='Enter current password' value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
                      </div>
                      <div className='pps-field'>
                        <label>New password</label>
                        <input type='password' placeholder='Enter new password' value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
                      </div>
                      <div className='pps-field'>
                        <label>Confirm new password</label>
                        <input type='password' placeholder='Re-enter new password' value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
                      </div>
                    </div>
                    <div className='pps-actions'>
                      <span className={`pps-saved-flag${message ? ' show' : ''}`}>{Icon.check}Password updated</span>
                      {error && <span className='pps-error'>{Icon.warn}{error}</span>}
                      <div className='spacer'></div>
                      <button type='submit' className='pps-btn pps-btn-grad' disabled={loading}>
                        {loading ? 'Updating…' : 'Update password'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className='pps-panel'>
                  <div className='pps-ph-wrap'>
                    <div className='pps-ph'>
                      <span className='pps-ic'>{Icon.lock}</span>
                      <div>
                        <h2>Auto-logout</h2>
                        <div className='pps-psub'>Sign out automatically after a period of inactivity.</div>
                      </div>
                    </div>
                  </div>
                  <div className='pps-togrow'>
                    <div className='tg-txt'>
                      <div className='tg-t'>Enable auto-logout</div>
                      <div className='tg-s'>You’ll get a warning 2 minutes before sign-out.</div>
                    </div>
                    <label className='pps-switch tg-ctrl'>
                      <input type='checkbox' checked={sessionTimeoutSettings.enabled}
                        onChange={(e) => setSessionTimeoutSettings({ ...sessionTimeoutSettings, enabled: e.target.checked })} />
                      <span className='slider'></span>
                    </label>
                  </div>
                  {sessionTimeoutSettings.enabled && (
                    <div className='pps-togrow'>
                      <div className='tg-txt'>
                        <div className='tg-t'>Log out after</div>
                        <div className='tg-s'>Inactivity window before automatic sign-out.</div>
                      </div>
                      <div className='tg-ctrl pps-field' style={{ minWidth: 180 }}>
                        <select value={sessionTimeoutSettings.timeoutMinutes}
                          onChange={(e) => setSessionTimeoutSettings({ ...sessionTimeoutSettings, timeoutMinutes: parseInt(e.target.value, 10) })}>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={120}>2 hours</option>
                          <option value={240}>4 hours</option>
                          <option value={360}>6 hours</option>
                          <option value={480}>8 hours</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className='pps-panel'>
                <div className='pps-empty'>
                  {Icon.security}
                  <p>Please sign in to manage your password and security.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ============ NOTIFICATIONS ============ */}
        {activeTab === 'notifications' && (
          <section className='pps-pane'>
            <div className='pps-panel'>
              <div className='pps-ph-wrap'>
                <div className='pps-ph'>
                  <span className='pps-ic'>{Icon.notifications}</span>
                  <div>
                    <h2>Notifications</h2>
                    <div className='pps-psub'>Choose what pompay can interrupt you for.</div>
                  </div>
                </div>
              </div>

              {[
                { key: 'pomodoroComplete', t: 'Session complete', s: 'Chime and notify when a focus block ends.' },
                { key: 'breakComplete', t: 'Break reminders', s: 'Nudge me to start my break and to come back.' },
                { key: 'dailySummary', t: 'Daily summary', s: 'A recap of focus time and earnings each evening.' },
              ].map((n) => (
                <div className='pps-togrow' key={n.key}>
                  <div className='tg-txt'>
                    <div className='tg-t'>{n.t}</div>
                    <div className='tg-s'>{n.s}</div>
                  </div>
                  <label className='pps-switch tg-ctrl'>
                    <input type='checkbox' checked={!!notificationSettings[n.key]}
                      onChange={() => handleNotificationToggle(n.key)} />
                    <span className='slider'></span>
                  </label>
                </div>
              ))}

              {renderActions('Save preferences', handleSaveNotifications, 'Preferences saved')}
            </div>
          </section>
        )}

        {/* ============ GOALS ============ */}
        {activeTab === 'goals' && (
          <section className='pps-pane'>
            <div className='pps-panel'>
              <div className='pps-ph-wrap'>
                <div className='pps-ph'>
                  <span className='pps-ic'>{Icon.goals}</span>
                  <div>
                    <h2>Focus goals</h2>
                    <div className='pps-psub'>Set the targets pompay measures your day against.</div>
                  </div>
                </div>
              </div>

              <div className='pps-togrow'>
                <div className='tg-txt'>
                  <div className='tg-t'>Daily focus sessions</div>
                  <div className='tg-s'>Pomodoros you aim to complete each day.</div>
                </div>
                <div className='pps-stepper tg-ctrl'>
                  <button type='button' aria-label='Decrease' onClick={() => adjustGoal('dailyPomodoroGoal', -1, 1, 50)}>−</button>
                  <span className='val'>{goalSettings.dailyPomodoroGoal}</span>
                  <button type='button' aria-label='Increase' onClick={() => adjustGoal('dailyPomodoroGoal', 1, 1, 50)}>+</button>
                </div>
              </div>

              <div className='pps-togrow'>
                <div className='tg-txt'>
                  <div className='tg-t'>Weekly focus target</div>
                  <div className='tg-s'>Pomodoros you aim to complete each week.</div>
                </div>
                <div className='pps-stepper tg-ctrl'>
                  <button type='button' aria-label='Decrease' onClick={() => adjustGoal('weeklyPomodoroGoal', -5, 5, 350)}>−</button>
                  <span className='val'>{goalSettings.weeklyPomodoroGoal}</span>
                  <button type='button' aria-label='Increase' onClick={() => adjustGoal('weeklyPomodoroGoal', 5, 5, 350)}>+</button>
                </div>
              </div>

              {renderActions('Save goals', handleSaveGoals, 'Goals saved')}
            </div>
          </section>
        )}
      </div>

      {/* Avatar picker modal (reuses existing styles) */}
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
                    <div className='image-selected-badge'><IoCheckmark size={16} /></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FullSettings;
