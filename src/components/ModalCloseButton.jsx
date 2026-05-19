import React from 'react';
import { IoClose } from 'react-icons/io5';

const ModalCloseButton = ({ onClick, size = 24 }) => (
  <button type='button' aria-label='Close' className='close-modal-btn' onClick={onClick}>
    <IoClose size={size} />
  </button>
);

export default ModalCloseButton;
