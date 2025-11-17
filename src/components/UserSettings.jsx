import React, { useState, useEffect } from 'react';
import { IoPerson, IoClose, IoCamera, IoArrowForward, IoCheckmark } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { emojiCategories, getUserAvatar, isValidEmoji } from '../utils/profilePictures';
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
  const [customEmoji, setCustomEmoji] = useState('');
  const [customEmojiError, setCustomEmojiError] = useState('');

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

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
              <>
                <div className='avatar-picker-overlay' onClick={() => {
                  setShowAvatarPicker(false);
                  setCustomEmoji('');
                  setCustomEmojiError('');
                }}></div>
                <div className='avatar-picker-modal'>
                  <div className='avatar-picker-header'>
                    <h4>Choose Your Avatar</h4>
                    <button
                      className='avatar-close-btn'
                      onClick={() => {
                        setShowAvatarPicker(false);
                        setCustomEmoji('');
                        setCustomEmojiError('');
                      }}
                    >
                      <IoClose size={24} />
                    </button>
                  </div>

                  {/* Category Tabs */}
                  <div className='avatar-category-tabs'>
                    {Object.entries(emojiCategories).map(([key, category]) => (
                      <button
                        key={key}
                        className={`avatar-category-tab ${selectedCategory === key ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(key)}
                      >
                        {category.name}
                      </button>
                    ))}
                    <button
                      className={`avatar-category-tab ${selectedCategory === 'custom' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('custom')}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Emoji Grid or Custom Input */}
                  {selectedCategory !== 'custom' ? (
                    <div className='avatar-grid'>
                      {emojiCategories[selectedCategory].emojis.map((avatar, index) => (
                        <button
                          key={index}
                          className={`avatar-option ${userData.profilePicture === avatar ? 'selected' : ''}`}
                          onClick={() => {
                            setUserData({ ...userData, profilePicture: avatar });
                            setShowAvatarPicker(false);
                            setCustomEmoji('');
                            setCustomEmojiError('');
                          }}
                        >
                          {avatar}
                          {userData.profilePicture === avatar && (
                            <div className='avatar-selected-indicator'>
                              <IoCheckmark size={16} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className='custom-emoji-input-section'>
                      <p className='custom-emoji-hint'>Enter or paste any emoji below:</p>
                      <div className='custom-emoji-input-container'>
                        <input
                          type='text'
                          className='custom-emoji-input'
                          placeholder='Paste emoji here (e.g., 🎉)'
                          value={customEmoji}
                          onChange={(e) => {
                            setCustomEmoji(e.target.value);
                            setCustomEmojiError('');
                          }}
                          maxLength={10}
                        />
                        <button
                          className='custom-emoji-apply-btn'
                          onClick={() => {
                            const emoji = customEmoji.trim();
                            if (!emoji) {
                              setCustomEmojiError('Please enter an emoji');
                              return;
                            }
                            if (!isValidEmoji(emoji)) {
                              setCustomEmojiError('Please enter a valid emoji');
                              return;
                            }
                            setUserData({ ...userData, profilePicture: emoji });
                            setShowAvatarPicker(false);
                            setCustomEmoji('');
                            setCustomEmojiError('');
                          }}
                        >
                          Apply
                        </button>
                      </div>
                      {customEmojiError && (
                        <p className='custom-emoji-error'>{customEmojiError}</p>
                      )}
                      <div className='custom-emoji-examples'>
                        <p>Quick picks:</p>
                        <div className='custom-emoji-quick-picks'>
                          {['🎉', '💎', '🔥', '✨', '💪', '🌟', '🎯', '👑'].map((emoji, idx) => (
                            <button
                              key={idx}
                              className='quick-pick-emoji'
                              onClick={() => {
                                setUserData({ ...userData, profilePicture: emoji });
                                setShowAvatarPicker(false);
                                setCustomEmoji('');
                                setCustomEmojiError('');
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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
