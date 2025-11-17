import React, { useState, useEffect, useRef } from 'react';
import { IoPerson, IoClose, IoCamera, IoArrowForward, IoCheckmark, IoCloudUpload, IoTrash } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { imageCategories, getUserAvatar, fileToBase64 } from '../utils/profilePictures';
import '../App.css';

const UserSettings = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, signOut, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  // Load user data from Supabase or localStorage
  const loadUserData = () => {
    if (user) {
      return {
        name: user.user_metadata?.name || '',
        email: user.email || '',
        country: user.user_metadata?.country || 'United States',
        profilePicture: user.user_metadata?.profile_picture || getUserAvatar(user.id)
      };
    }

    const saved = localStorage.getItem('userData');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      name: '',
      email: '',
      country: 'United States',
      profilePicture: getUserAvatar(null)
    };
  };

  const [userData, setUserData] = useState(loadUserData());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('animals');

  useEffect(() => {
    if (user) {
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

  const handleSaveAccount = async () => {
    if (!user) {
      localStorage.setItem('userData', JSON.stringify(userData));
      setMessage('Changes saved locally!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

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
    navigate('/account');
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
    'Mexico', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark'
  ];

  return (
    <>
      {isOpen && <div className='user-settings-overlay' onClick={onClose}></div>}

      <div className={`user-settings-drawer ${isOpen ? 'open' : ''}`}>
        <div className='drawer-header-modern'>
          <div className='drawer-header-title'>
            <IoPerson size={24} />
            <h2>Account</h2>
          </div>
          <button className='close-drawer-btn-modern' onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        {/* View All Button */}
        <div className='settings-view-all-modern'>
          <button className='view-all-settings-btn-modern' onClick={handleViewAllSettings}>
            <span>View Full Account Settings</span>
            <IoArrowForward size={18} />
          </button>
        </div>

        {/* Messages */}
        {message && <div className='drawer-success-message'>{message}</div>}
        {error && <div className='drawer-error-message'>{error}</div>}

        {/* Profile Picture Section */}
        <div className='drawer-profile-section'>
          <div className='drawer-avatar-container'>
            {userData.profilePicture ? (
              <img
                src={userData.profilePicture}
                alt='Profile'
                className='drawer-avatar-image'
                onError={(e) => {
                  e.target.src = getUserAvatar(user?.id);
                }}
              />
            ) : (
              <div className='drawer-avatar-placeholder'>
                <IoPerson size={40} />
              </div>
            )}
          </div>

          <div className='drawer-avatar-actions'>
            <button
              className='drawer-avatar-btn'
              onClick={() => setShowAvatarPicker(true)}
            >
              <IoCamera size={16} />
              Change
            </button>
            <button
              className='drawer-avatar-btn-secondary'
              onClick={() => fileInputRef.current?.click()}
            >
              <IoCloudUpload size={16} />
              Upload
            </button>
            <button
              className='drawer-avatar-btn-danger'
              onClick={handleRemovePhoto}
            >
              <IoTrash size={16} />
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className='drawer-form-section'>
          <div className='drawer-form-field'>
            <label>Full Name</label>
            <input
              type='text'
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              placeholder='Enter your name'
            />
          </div>

          <div className='drawer-form-field'>
            <label>Email</label>
            <input
              type='email'
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              placeholder='Enter your email'
              disabled={!!user}
              className={user ? 'disabled-input' : ''}
            />
            {user && <span className='field-hint-drawer'>Email cannot be changed</span>}
          </div>

          <div className='drawer-form-field'>
            <label>Country</label>
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
            className='drawer-save-btn'
            onClick={handleSaveAccount}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>

          {user && (
            <button
              className='drawer-signout-btn'
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

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
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default UserSettings;
