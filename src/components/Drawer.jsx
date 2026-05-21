import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IoClose } from 'react-icons/io5';
import './Drawer.css';

const Drawer = ({ isOpen, onClose, trapRef, title, children, side = 'right' }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className='dr-root'>
      <div className='dr-backdrop' onClick={onClose} aria-hidden='true' />
      <aside
        className={`dr-panel dr-panel--${side}`}
        role='dialog'
        aria-modal='true'
        aria-label={title}
        ref={trapRef}
      >
        <header className='dr-header'>
          <h2 className='dr-title'>{title}</h2>
          <button
            type='button'
            className='dr-close'
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <IoClose size={20} aria-hidden='true' />
          </button>
        </header>
        <div className='dr-content'>{children}</div>
      </aside>
    </div>,
    document.body
  );
};

export default Drawer;
