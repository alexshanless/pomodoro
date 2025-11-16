import React, { useState, useEffect, useRef } from 'react';
import { IoEllipsisVertical } from 'react-icons/io5';
import '../App.css';

/**
 * Reusable actions menu component with 3-dot icon
 * @param {Array} actions - Array of action objects with { label, icon, onClick, className, danger }
 * @param {String} menuPosition - Position of menu: 'left' or 'right' (default: 'right')
 */
const ActionsMenu = ({ actions, menuPosition = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
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

  const handleActionClick = (action, event) => {
    action.onClick(event);
    setIsOpen(false);
  };

  return (
    <div className="actions-menu-container" ref={menuRef}>
      <button
        className="actions-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="More actions"
        title="More actions"
      >
        <IoEllipsisVertical size={20} />
      </button>

      {isOpen && (
        <div className={`actions-menu-dropdown ${menuPosition}`}>
          {actions.map((action, index) => (
            <button
              key={index}
              className={`actions-menu-item ${action.danger ? 'danger' : ''} ${action.className || ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleActionClick(action, e);
              }}
            >
              {action.icon && <span className="actions-menu-icon">{action.icon}</span>}
              <span className="actions-menu-label">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionsMenu;
