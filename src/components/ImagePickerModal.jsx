import React, { useState } from 'react';
import { IoCheckmark } from 'react-icons/io5';
import ModalCloseButton from './ModalCloseButton';
import { imageCategories } from '../utils/profilePictures';
import { useModalBehavior } from '../hooks/useModalBehavior';
import '../styles/ModalCommon.css';
import '../styles/ImagePickerRedesign.css';

const ImagePickerModal = ({ isOpen, onClose, selectedImage, onSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState('animals');
  const { trapRef } = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className='pompay-modal' onClick={onClose} aria-hidden={!isOpen}>
      <div
        className='pompay-modal-card ipm-root'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='image-picker-title'
        ref={trapRef}
      >
        <div className='pompay-modal-head'>
          <h3 id='image-picker-title'>Choose a Photo</h3>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className='ipm-tabs'>
          {Object.entries(imageCategories).map(([key, category]) => (
            <button
              key={key}
              type='button'
              className={`ipm-tab ${selectedCategory === key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(key)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className='ipm-grid'>
          {imageCategories[selectedCategory].images.map((imageUrl, index) => (
            <button
              key={index}
              type='button'
              className={`ipm-option ${selectedImage === imageUrl ? 'selected' : ''}`}
              onClick={() => {
                onSelect(imageUrl);
                onClose();
              }}
              aria-label={`Select image option ${index + 1}`}
              aria-pressed={selectedImage === imageUrl}
            >
              <img src={imageUrl} alt={`Option ${index + 1}`} />
              {selectedImage === imageUrl && (
                <div className='ipm-selected-badge' aria-hidden='true'>
                  <IoCheckmark size={20} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImagePickerModal;
