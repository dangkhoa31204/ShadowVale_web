import React, { useState, useCallback, type ReactNode } from 'react';
import { ToastContext, type Toast, type ToastType } from './toastContextValue';

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { id, message, type, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => showToast(message, 'success', title || 'SUCCESS'), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, 'error', title || 'ERROR'), [showToast]);
  const warning = useCallback((message: string, title?: string) => showToast(message, 'warning', title || 'WARNING'), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, 'info', title || 'NOTICE'), [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};
