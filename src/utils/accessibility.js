/**
 * Accessibility Utilities
 * ARIA helpers, focus management, and keyboard navigation utilities
 */

import { useEffect, useRef } from 'react';

/**
 * Focus trap for modals and dialogs
 * Keeps focus within a container element
 *
 * @param {boolean} isActive - Whether the trap is active
 * @returns {Object} - { trapRef, firstFocusRef, lastFocusRef }
 */
export const useFocusTrap = (isActive = true) => {
  const trapRef = useRef(null);

  useEffect(() => {
    if (!isActive || !trapRef.current) return;

    const container = trapRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return { trapRef };
};

/**
 * Announce to screen readers
 * Uses ARIA live region for announcements
 *
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export const announce = (message, priority = 'polite') => {
  const liveRegion = document.getElementById('aria-live-region');

  if (liveRegion) {
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }
};

/**
 * Create ARIA live region (call once in App)
 */
export const createAriaLiveRegion = () => {
  if (document.getElementById('aria-live-region')) return;

  const liveRegion = document.createElement('div');
  liveRegion.id = 'aria-live-region';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('class', 'sr-only');
  liveRegion.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;

  document.body.appendChild(liveRegion);
};

/**
 * Keyboard shortcut hook
 * Handles keyboard shortcuts with modifier keys
 *
 * @param {string} key - Key to listen for (e.g., 's', 'Escape')
 * @param {Function} callback - Function to call when key is pressed
 * @param {Object} options - { ctrl, shift, alt, meta }
 */
export const useKeyboardShortcut = (key, callback, options = {}) => {
  const { ctrl = false, shift = false, alt = false, meta = false } = options;

  useEffect(() => {
    const handleKeyDown = (e) => {
      const matchesKey = e.key.toLowerCase() === key.toLowerCase();
      const matchesCtrl = ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
      const matchesShift = shift ? e.shiftKey : !e.shiftKey;
      const matchesAlt = alt ? e.altKey : !e.altKey;
      const matchesMeta = meta ? e.metaKey : !e.metaKey;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        e.preventDefault();
        callback(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, callback, ctrl, shift, alt, meta]);
};

/**
 * Focus visible hook
 * Only show focus outline when using keyboard
 */
export const useFocusVisible = () => {
  useEffect(() => {
    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-user');
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-user');
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

/**
 * Auto-focus hook
 * Focus element when component mounts
 *
 * @returns {Object} - { ref }
 */
export const useAutoFocus = () => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  return { ref };
};

/**
 * Skip link component
 * Allows keyboard users to skip to main content
 */
export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => {
  return (
    <a
      href={href}
      className='skip-link'
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.focus();
          target.scrollIntoView();
        }
      }}
    >
      {children}
    </a>
  );
};

/**
 * Get readable time format for screen readers
 *
 * @param {number} seconds - Time in seconds
 * @returns {string} - Human-readable time
 */
export const getReadableTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes === 0) {
    return `${secs} ${secs === 1 ? 'second' : 'seconds'}`;
  }

  if (secs === 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and ${secs} ${secs === 1 ? 'second' : 'seconds'}`;
};

/**
 * Visually hidden but screen reader accessible
 * Use for labels that are visually represented by icons
 */
export const VisuallyHidden = ({ children }) => {
  return (
    <span className='sr-only'>
      {children}
    </span>
  );
};

/**
 * Check if element has sufficient color contrast
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 *
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @returns {Object} - { ratio, passAA, passAAA }
 */
export const checkContrast = (foreground, background) => {
  const getLuminance = (hex) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map(val => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio: ratio.toFixed(2),
    passAA: ratio >= 4.5,
    passAAA: ratio >= 7
  };
};

// All exports are named exports above - no default export needed
