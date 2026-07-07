import React from 'react';
import { IoClose } from 'react-icons/io5';
import { useDialog } from '../contexts/DialogContext';
import { useModalBehavior } from '../hooks/useModalBehavior';
import '../styles/ModalCommon.css';

const DialogHost = () => {
  const { toasts, dismissToast, confirmState, handleConfirmResponse } = useDialog();
  const { trapRef } = useModalBehavior(Boolean(confirmState), () => handleConfirmResponse(false));

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
        <div
          className='pompay-modal'
          onClick={() => handleConfirmResponse(false)}
          aria-hidden={!confirmState}
        >
          <div
            className='pompay-modal-card'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='confirm-modal-title'
            ref={trapRef}
          >
            <div className='pompay-modal-head'>
              <h3 id='confirm-modal-title'>{confirmState.title}</h3>
            </div>
            <p className='pompay-modal-text'>{confirmState.message}</p>
            <div className='pompay-modal-actions'>
              <button
                type='button'
                className='pompay-btn-cancel'
                onClick={() => handleConfirmResponse(false)}
              >
                {confirmState.cancelLabel}
              </button>
              <button
                className='pompay-btn-confirm'
                onClick={() => handleConfirmResponse(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DialogHost;
