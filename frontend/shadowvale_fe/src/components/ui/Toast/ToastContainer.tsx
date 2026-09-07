import React from 'react';
import { useToast } from './useToast';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const borderColor = isSuccess
          ? 'border-success/60'
          : isError
          ? 'border-error/60'
          : isWarning
          ? 'border-warning/60'
          : 'border-primary/60';

        const accentColor = isSuccess
          ? 'bg-success'
          : isError
          ? 'bg-error'
          : isWarning
          ? 'bg-warning'
          : 'bg-primary';

        const textColor = isSuccess
          ? 'text-success'
          : isError
          ? 'text-error'
          : isWarning
          ? 'text-warning'
          : 'text-primary';

        const iconName = isSuccess
          ? 'check_circle'
          : isError
          ? 'error'
          : isWarning
          ? 'warning'
          : 'info';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-surface/95 backdrop-blur-md border ${borderColor} rounded shadow-2xl p-3 flex items-start gap-3 transition-all duration-300 transform translate-y-0 opacity-100 relative overflow-hidden`}
          >
            {/* Left Accent indicator line */}
            <div className={`absolute top-0 left-0 bottom-0 w-1 ${accentColor}`} />

            <div className="pl-1 pt-0.5">
              <span className={`material-symbols-outlined text-lg ${textColor}`}>
                {iconName}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className={`font-data-mono text-[11px] font-bold uppercase tracking-wider ${textColor}`}>
                  {toast.title}
                </h4>
              )}
              <p className="font-body-md text-xs text-on-surface mt-0.5 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
              aria-label="Close notification"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
