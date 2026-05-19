import React, { useState, useEffect } from 'react';
import { IoCheckmark } from 'react-icons/io5';
import { imageCategories } from '../utils/profilePictures';

const ImagePickerModal = ({ isOpen, onClose, selectedImage, onSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState('animals');

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener && typeof opener.focus === 'function') {
        opener.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className='image-picker-overlay' onClick={onClose}></div>
      <div
        className='image-picker-modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='image-picker-title'
      >
        <div className='image-picker-header'>
          <h3 id='image-picker-title'>Choose a Photo</h3>
          <button type='button' aria-label='Close' onClick={onClose}>×</button>
        </div>

        <div className='image-category-tabs'>
          {Object.entries(imageCategories).map(([key, category]) => (
            <button
              key={key}
              type='button'
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
              type='button'
              className={`image-option ${selectedImage === imageUrl ? 'selected' : ''}`}
              onClick={() => {
                onSelect(imageUrl);
                onClose();
              }}
            >
              <img src={imageUrl} alt={`Option ${index + 1}`} />
              {selectedImage === imageUrl && (
                <div className='image-selected-badge'>
                  <IoCheckmark size={20} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ImagePickerModal;
