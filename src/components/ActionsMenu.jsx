import React, { useState, useEffect, useRef } from 'react';
import { IoEllipsisVertical } from 'react-icons/io5';
import '../App.css';

/**
 * Reusable actions menu component with 3-dot icon.
 * @param {Array} actions - Array of action objects: { label, icon, onClick, className, danger }
 * @param {String} menuPosition - Position of menu: 'left' or 'right' (default: 'right')
 */
const ActionsMenu = ({ actions, menuPosition = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleActionClick = (action, event) => {
    action.onClick(event);
    setIsOpen(false);
  };

  const menuId = `actions-menu-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className='actions-menu-container' ref={menuRef}>
      <button
        ref={triggerRef}
        className='actions-menu-trigger'
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label='More actions'
        aria-haspopup='menu'
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        title='More actions'
      >
        <IoEllipsisVertical size={20} />
      </button>

      {isOpen && (
        <div
          id={menuId}
          className={`actions-menu-dropdown ${menuPosition}`}
          role='menu'
        >
          {actions.map((action, index) => (
            <button
              key={index}
              className={`actions-menu-item ${action.danger ? 'danger' : ''} ${action.className || ''}`}
              role='menuitem'
              onClick={(e) => {
                e.stopPropagation();
                handleActionClick(action, e);
              }}
            >
              {action.icon && <span className='actions-menu-icon'>{action.icon}</span>}
              <span className='actions-menu-label'>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionsMenu;
