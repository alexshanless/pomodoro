import React, { useState, useEffect, useRef } from 'react';
import { IoPerson, IoCamera, IoTrash, IoCloudUpload } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { getUserAvatar, fileToBase64 } from '../utils/profilePictures';
import ImagePickerModal from './ImagePickerModal';
import TimezoneSelect from './TimezoneSelect';
import '../App.css';

const MESSAGE_TIMEOUT_MS = 3000;
const ERROR_TIMEOUT_MS = 5000;

// TODO(storage): persist avatars in Supabase Storage and store the URL in
// user_metadata. Until then, cap pre-base64 size so the encoded payload stays
// comfortably under the auth API JSON limit.
const MAX_AVATAR_BYTES = 256 * 1024;

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
  'Mexico', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark',
  'Finland', 'Belgium', 'Switzerland', 'Austria', 'Poland', 'Portugal'
];

const mapUserToProfileData = (u) => ({
  name: u.user_metadata?.name || '',
  email: u.email || '',
  username: u.user_metadata?.username || '',
  phone: u.user_metadata?.phone || '',
  address: u.user_metadata?.address || '',
  city: u.user_metadata?.city || '',
  country: u.user_metadata?.country || 'United States',
  timezone: u.user_metadata?.timezone || 'UTC',
  profilePicture: u.user_metadata?.profile_picture || getUserAvatar(u.id)
});

const AccountSettings = () => {
  const { user, updateProfile, signOut } = useAuth();
  const fileInputRef = useRef(null);
  const pendingTimeoutsRef = useRef([]);

  const scheduleDismiss = (setter, delay) => {
    const id = setTimeout(setter, delay);
    pendingTimeoutsRef.current.push(id);
  };

  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach(clearTimeout);
      pendingTimeoutsRef.current = [];
    };
  }, []);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [userData, setUserData] = useState(() => mapUserToProfileData(user));

  useEffect(() => {
    setUserData(mapUserToProfileData(user));
  }, [user]);

  const handleFileUpload = async (e) => {
    const input = e.target;
    try {
      const file = input.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        scheduleDismiss(() => setError(''), MESSAGE_TIMEOUT_MS);
        return;
      }

      if (file.size > MAX_AVATAR_BYTES) {
        setError('Image size must be less than 256 KB');
        scheduleDismiss(() => setError(''), MESSAGE_TIMEOUT_MS);
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        setUserData({ ...userData, profilePicture: base64 });
      } catch (err) {
        console.warn('AccountSettings: fileToBase64 failed', err);
        setError('Failed to upload image');
        scheduleDismiss(() => setError(''), MESSAGE_TIMEOUT_MS);
      }
    } finally {
      input.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setUserData({ ...userData, profilePicture: getUserAvatar(user.id) });
  };

  const handleSaveChanges = async (e) => {
    e?.preventDefault();
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
      scheduleDismiss(() => setMessage(''), MESSAGE_TIMEOUT_MS);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      scheduleDismiss(() => setError(''), ERROR_TIMEOUT_MS);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='account-settings-container'>
      <div className='account-settings-content'>
        {/* Header */}
        <div className='account-settings-header'>
          <div className='account-settings-title'>
            <IoPerson size={28} />
            <h1>Account</h1>
          </div>
        </div>

        {/* Messages */}
        {message && <div className='account-success-message'>{message}</div>}
        {error && <div className='account-error-message'>{error}</div>}

        {/* Profile Picture Section */}
        <div className='account-profile-section'>
          <div className='account-avatar-container'>
            {userData.profilePicture ? (
              <img
                src={userData.profilePicture}
                alt='Profile'
                className='account-avatar-image'
                onError={(e) => {
                  e.target.src = getUserAvatar(user.id);
                }}
              />
            ) : (
              <div className='account-avatar-placeholder'>
                <IoPerson size={48} />
              </div>
            )}
          </div>

          <div className='account-avatar-actions'>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              type='button'
              className='account-upload-btn'
              onClick={() => setShowImagePicker(true)}
            >
              <IoCamera size={18} />
              Change Photo
            </button>
            <button
              type='button'
              className='account-upload-custom-btn'
              onClick={() => fileInputRef.current?.click()}
            >
              <IoCloudUpload size={18} />
              Upload Custom
            </button>
            <button
              type='button'
              className='account-remove-btn'
              onClick={handleRemovePhoto}
            >
              <IoTrash size={18} />
              Remove
            </button>
          </div>
        </div>

        {/* Form Section - Two Column Grid */}
        <form className='account-form-container' onSubmit={handleSaveChanges}>
          <h2 className='account-section-title'>Personal Information</h2>

          <div className='account-form-grid'>
            <div className='account-form-field'>
              <label>Full Name *</label>
              <input
                type='text'
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                placeholder='Enter your full name'
                required
              />
            </div>

            <div className='account-form-field'>
              <label>Username</label>
              <input
                type='text'
                value={userData.username}
                onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                placeholder='Enter your username'
              />
            </div>

            <div className='account-form-field'>
              <label>Email *</label>
              <input
                type='email'
                value={userData.email}
                placeholder='Enter your email'
                disabled
                className='disabled-field'
                readOnly
              />
              <span className='field-hint'>Email cannot be changed</span>
            </div>

            <div className='account-form-field'>
              <label>Phone</label>
              <input
                type='tel'
                value={userData.phone}
                onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                placeholder='Enter your phone number'
              />
            </div>
          </div>

          <h2 className='account-section-title'>Address</h2>

          <div className='account-form-grid'>
            <div className='account-form-field'>
              <label>Street Address</label>
              <input
                type='text'
                value={userData.address}
                onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                placeholder='Enter your street address'
              />
            </div>

            <div className='account-form-field'>
              <label>City</label>
              <input
                type='text'
                value={userData.city}
                onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                placeholder='Enter your city'
              />
            </div>

            <div className='account-form-field'>
              <label>Country *</label>
              <select
                value={userData.country}
                onChange={(e) => setUserData({ ...userData, country: e.target.value })}
              >
                <option value=''>Select Country</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className='account-form-field'>
              <label htmlFor='timezone-trigger'>Timezone</label>
              <TimezoneSelect
                id='timezone-trigger'
                value={userData.timezone}
                onChange={(tz) => setUserData({ ...userData, timezone: tz })}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className='account-form-actions'>
            <button
              className='account-save-btn'
              type='submit'
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              className='account-logout-btn'
              type='button'
              onClick={async () => {
                if (window.confirm('Are you sure you want to log out?')) {
                  await signOut();
                }
              }}
            >
              Log Out
            </button>
          </div>
        </form>

        <ImagePickerModal
          isOpen={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          selectedImage={userData.profilePicture}
          onSelect={(imageUrl) => setUserData({ ...userData, profilePicture: imageUrl })}
        />
      </div>
    </div>
  );
};

export default AccountSettings;
