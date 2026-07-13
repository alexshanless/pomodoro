import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const DialogContext = createContext(null);

let nextToastId = 1;

export const DialogProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolverRef = useRef(null);

  const showToast = useCallback((message, { type = 'info', durationMs = 4000 } = {}) => {
    const id = nextToastId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (durationMs > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((message, { title = 'Confirm', confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ message, title, confirmLabel, cancelLabel });
    });
  }, []);

  // Multi-option dialog. Resolves the chosen option's `value`, or null on
  // cancel/dismiss. options: [{ label, value, hint? }] rendered as stacked
  // buttons, first option emphasized.
  const choose = useCallback((message, { title = 'Choose', options = [], cancelLabel = 'Cancel' } = {}) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ message, title, options, cancelLabel });
    });
  }, []);

  const handleConfirmResponse = useCallback((value) => {
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmState(null);
    if (resolve) resolve(value);
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast, toasts, confirm, choose, confirmState, handleConfirmResponse }),
    [showToast, dismissToast, toasts, confirm, choose, confirmState, handleConfirmResponse]
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
};

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside a DialogProvider');
  return ctx;
};
