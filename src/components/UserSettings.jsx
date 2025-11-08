import React, { useState, useEffect } from 'react';
import { IoPerson, IoClose, IoCamera, IoArrowForward } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const UserSettings = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

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

  // Save user data to localStorage
  useEffect(() => {
    localStorage.setItem('userData', JSON.stringify(userData));
  }, [userData]);

  const handleSaveAccount = () => {
    alert('Account information saved!');
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
        </div>
      </div>
    </>
  );
};

export default UserSettings;
