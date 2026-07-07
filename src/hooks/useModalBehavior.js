import { useEffect } from 'react';
import { useFocusTrap } from '../utils/accessibility';

/**
 * Shared modal behavior hook.
 *
 * Provides:
 * - Esc key → onClose
 * - Focus trap within the modal container (via useFocusTrap)
 * - Focus return to the previously focused element on close OR unmount
 * - Body scroll lock while open
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback invoked when the modal should close
 * @returns {{ trapRef }} - Attach to the modal card/container element
 */
export const useModalBehavior = (isOpen, onClose) => {
  // Focus capture + return: declared BEFORE useFocusTrap so this effect runs first
  // in React's effect queue, capturing the opener element before the trap moves
  // focus into the modal.
  useEffect(() => {
    if (!isOpen) return undefined;
    const openerEl = document.activeElement;
    return () => {
      openerEl?.focus?.();
    };
  }, [isOpen]);

  // Focus trap (registered after the capture effect so it runs second)
  const { trapRef } = useFocusTrap(isOpen);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return { trapRef };
};
