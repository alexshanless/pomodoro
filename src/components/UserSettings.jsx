import React, { useState, useEffect } from 'react';
import { IoPerson, IoClose, IoCamera, IoArrowForward } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const UserSettings = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, signOut, updateProfile } = useAuth();

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

  // Update userData when user changes
  useEffect(() => {
    setUserData(loadUserData());
  }, [user]);

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

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      onClose();
    }
  };

  const handleViewAllSettings = () => {
    onClose();
    navigate('/settings');
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
          <h2>Account</h2>
          <button className='close-drawer-btn' onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        {/* View All Button */}
        <div className='settings-view-all-container'>
          <button className='view-all-settings-btn' onClick={handleViewAllSettings}>
            <span>View All Settings</span>
            <IoArrowForward size={18} />
          </button>
        </div>

        {/* Account Content */}
        <div className='settings-tab-content'>
          <div className='settings-account-tab'>
            <h3>Account Information</h3>

            {message && <div className='auth-success' style={{marginBottom: '1rem'}}>{message}</div>}
            {error && <div className='auth-error' style={{marginBottom: '1rem'}}>{error}</div>}

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
        </div>
      </div>
    </>
  );
};

export default UserSettings;
