import React, { useEffect, useRef } from 'react';
import { IoClose } from 'react-icons/io5';
import { useDialog } from '../contexts/DialogContext';
import { useFocusTrap } from '../utils/accessibility';

const DialogHost = () => {
  const { toasts, dismissToast, confirmState, handleConfirmResponse } = useDialog();
  const { trapRef } = useFocusTrap(Boolean(confirmState));
  const escListenerRef = useRef(null);

  useEffect(() => {
    if (!confirmState) return;
    escListenerRef.current = (e) => {
      if (e.key === 'Escape') handleConfirmResponse(false);
    };
    window.addEventListener('keydown', escListenerRef.current);
    return () => window.removeEventListener('keydown', escListenerRef.current);
  }, [confirmState, handleConfirmResponse]);

  return (
    <>
      {toasts.length > 0 && (
        <div className='toast-container' role='status' aria-live='polite'>
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span className='toast-message'>{toast.message}</span>
              <button
                className='toast-dismiss'
                onClick={() => dismissToast(toast.id)}
                aria-label='Dismiss notification'
              >
                <IoClose size={16} aria-hidden='true' />
              </button>
            </div>
          ))}
        </div>
      )}
      {confirmState && (
        <div className='form-modal' onClick={() => handleConfirmResponse(false)}>
          <div
            className='confirm-modal-content'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='confirm-modal-title'
            ref={trapRef}
          >
            <h3 id='confirm-modal-title'>{confirmState.title}</h3>
            <p className='confirm-modal-message'>{confirmState.message}</p>
            <div className='form-actions'>
              <button className='btn-primary' onClick={() => handleConfirmResponse(true)}>
                {confirmState.confirmLabel}
              </button>
              <button type='button' onClick={() => handleConfirmResponse(false)}>
                {confirmState.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DialogHost;
