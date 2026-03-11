import React from 'react';
import { IoAdd } from 'react-icons/io5';
import '../App.css';

/**
 * EmptyState Component
 * Displays a friendly empty state with icon, message, and optional CTA
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component to display
 * @param {string} props.title - Main heading text
 * @param {string} props.description - Descriptive text
 * @param {string} props.actionLabel - Button text (optional)
 * @param {Function} props.onAction - Click handler for button (optional)
 * @param {string} props.className - Additional CSS classes
 */
const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className='empty-state-content'>
        {icon && (
          <div className='empty-state-icon'>
            {icon}
          </div>
        )}
        <h2 className='empty-state-title'>{title}</h2>
        <p className='empty-state-description'>{description}</p>
        {actionLabel && onAction && (
          <button className='empty-state-action' onClick={onAction}>
            <IoAdd size={20} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
