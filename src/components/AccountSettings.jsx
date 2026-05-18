import React, { useState, useEffect, useMemo, useRef } from 'react';
import { IoPerson, IoCamera, IoTrash, IoCloudUpload, IoCheckmark, IoChevronDown } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { imageCategories, getUserAvatar, fileToBase64 } from '../utils/profilePictures';
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

const TIMEZONES = [
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
  const timezoneDropdownRef = useRef(null);
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
  const [selectedCategory, setSelectedCategory] = useState('animals');

  // Searchable timezone dropdown state
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);

  const [userData, setUserData] = useState(() => mapUserToProfileData(user));

  useEffect(() => {
    setUserData(mapUserToProfileData(user));
  }, [user]);

  // Close timezone dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timezoneDropdownRef.current && !timezoneDropdownRef.current.contains(event.target)) {
        setShowTimezoneDropdown(false);
      }
    };

    if (showTimezoneDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTimezoneDropdown]);

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

  const timezoneLabel = useMemo(() => {
    if (!userData.timezone) return 'Select timezone';
    const selected = TIMEZONES.find(tz => tz.value === userData.timezone);
    return selected ? selected.label : userData.timezone;
  }, [userData.timezone]);

  const filteredTimezones = useMemo(() => {
    if (!timezoneSearch.trim()) return TIMEZONES;
    const searchLower = timezoneSearch.toLowerCase();
    return TIMEZONES.filter(tz =>
      tz.label.toLowerCase().includes(searchLower) ||
      tz.value.toLowerCase().includes(searchLower)
    );
  }, [timezoneSearch]);

  // Handle timezone selection
  const handleTimezoneSelect = (timezone) => {
    setUserData({ ...userData, timezone: timezone.value });
    setTimezoneSearch('');
    setShowTimezoneDropdown(false);
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
              className='account-upload-btn'
              onClick={() => setShowImagePicker(true)}
            >
              <IoCamera size={18} />
              Change Photo
            </button>
            <button
              className='account-upload-custom-btn'
              onClick={() => fileInputRef.current?.click()}
            >
              <IoCloudUpload size={18} />
              Upload Custom
            </button>
            <button
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
            {/* Left Column */}
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

            <div className='account-form-field' ref={timezoneDropdownRef}>
              <label>Timezone</label>
              <div className='searchable-select-container'>
                <div
                  className='searchable-select-trigger'
                  onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
                >
                  <span className={userData.timezone ? '' : 'placeholder'}>
                    {timezoneLabel}
                  </span>
                  <IoChevronDown size={16} style={{
                    transition: 'transform 0.2s',
                    transform: showTimezoneDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
                  }} />
                </div>

                {showTimezoneDropdown && (
                  <div className='searchable-select-dropdown'>
                    <div className='searchable-select-search'>
                      <input
                        type='text'
                        placeholder='Search by city or UTC offset...'
                        value={timezoneSearch}
                        onChange={(e) => setTimezoneSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className='searchable-select-options'>
                      {filteredTimezones.length > 0 ? (
                        filteredTimezones.map(tz => (
                          <div
                            key={tz.value}
                            className={`searchable-select-option ${userData.timezone === tz.value ? 'selected' : ''}`}
                            onClick={() => handleTimezoneSelect(tz)}
                          >
                            {tz.label}
                            {userData.timezone === tz.value && (
                              <IoCheckmark size={16} style={{ marginLeft: 'auto', color: '#3b82f6' }} />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className='searchable-select-no-results'>
                          No timezones found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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

        {/* Image Picker Modal */}
        {showImagePicker && (
          <>
            <div className='image-picker-overlay' onClick={() => setShowImagePicker(false)}></div>
            <div className='image-picker-modal'>
              <div className='image-picker-header'>
                <h3>Choose a Photo</h3>
                <button onClick={() => setShowImagePicker(false)}>×</button>
              </div>

              <div className='image-category-tabs'>
                {Object.entries(imageCategories).map(([key, category]) => (
                  <button
                    key={key}
                    className={`image-category-tab ${selectedCategory === key ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(key)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className='image-grid'>
                {imageCategories[selectedCategory].images.map((imageUrl, index) => (
                  <button
                    key={index}
                    className={`image-option ${userData.profilePicture === imageUrl ? 'selected' : ''}`}
                    onClick={() => {
                      setUserData({ ...userData, profilePicture: imageUrl });
                      setShowImagePicker(false);
                    }}
                  >
                    <img src={imageUrl} alt={`Option ${index + 1}`} />
                    {userData.profilePicture === imageUrl && (
                      <div className='image-selected-badge'>
                        <IoCheckmark size={20} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
