import React, { useState, useEffect, useRef } from 'react';
import { IoPerson, IoClose, IoCamera, IoArrowForward, IoCheckmark, IoCloudUpload } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { imageCategories, getUserAvatar, fileToBase64 } from '../utils/profilePictures';
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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('animals');
  const fileInputRef = useRef(null);

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

            {/* Two Column Layout: 40% Picture / 60% Details */}
            <div className='account-two-column-layout'>
              {/* Left Column: Profile Picture (40%) */}
              <div className='account-left-column'>
                <div className='profile-picture-section-compact'>
                  <div className='profile-picture-container'>
                    {userData.profilePicture ? (
                      <img
                        src={userData.profilePicture}
                        alt='Profile'
                        className='profile-picture-emoji'
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    {!userData.profilePicture && (
                      <div className='profile-picture-placeholder'>
                        <IoPerson size={48} />
                      </div>
                    )}
                    <button className='change-picture-btn' onClick={() => setShowAvatarPicker(true)}>
                      <IoCamera size={18} />
                    </button>
                  </div>
                  <p className='profile-picture-hint'>Click to change</p>
                </div>
              </div>

              {/* Right Column: Account Details (60%) */}
              <div className='account-right-column'>
                <div className='settings-form-compact'>
                  <div className='form-group'>
                    <input
                      type='text'
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      placeholder='Full Name'
                    />
                  </div>

                  <div className='form-group'>
                    <input
                      type='email'
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      placeholder='Email'
                      disabled={!!user}
                      title={user ? 'Email cannot be changed. Contact support to change your email.' : ''}
                    />
                    {user && <p style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>Email cannot be changed</p>}
                  </div>

                  <div className='form-group'>
                    <select
                      value={userData.country}
                      onChange={(e) => setUserData({ ...userData, country: e.target.value })}
                    >
                      <option value=''>Select Country</option>
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

            {/* Image Picker Modal */}
            {showAvatarPicker && (
              <>
                <div className='avatar-picker-overlay' onClick={() => setShowAvatarPicker(false)}></div>
                <div className='avatar-picker-modal'>
                  <div className='avatar-picker-header'>
                    <h4>Choose Your Avatar</h4>
                    <button
                      className='avatar-close-btn'
                      onClick={() => setShowAvatarPicker(false)}
                    >
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
                        {category.name}
                      </button>
                    ))}
                    <button
                      className='avatar-category-tab'
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IoCloudUpload size={16} /> Upload
                    </button>
                  </div>

                  {/* Image Grid */}
                  <div className='image-grid'>
                    {imageCategories[selectedCategory].images.map((imageUrl, index) => (
                      <button
                        key={index}
                        className={`image-option ${userData.profilePicture === imageUrl ? 'selected' : ''}`}
                        onClick={() => {
                          setUserData({ ...userData, profilePicture: imageUrl });
                          setShowAvatarPicker(false);
                        }}
                      >
                        <img src={imageUrl} alt={`Option ${index + 1}`} />
                        {userData.profilePicture === imageUrl && (
                          <div className='image-selected-badge'>
                            <IoCheckmark size={16} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Hidden file input for upload */}
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await fileToBase64(file);
                          setUserData({ ...userData, profilePicture: base64 });
                          setShowAvatarPicker(false);
                        } catch (err) {
                          setError('Failed to upload image');
                          setTimeout(() => setError(''), 3000);
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserSettings;
