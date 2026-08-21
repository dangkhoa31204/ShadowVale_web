import React, { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, helperText, rightElement, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={id} className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
                {icon}
              </span>
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={`w-full bg-surface-dim border rounded-DEFAULT py-2 ${
              icon ? 'pl-10' : 'pl-3'
            } ${rightElement ? 'pr-10' : 'pr-3'} text-on-surface font-data-mono text-data-mono focus:outline-none transition-all placeholder:text-on-surface-variant/50 ${
              error
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary'
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{rightElement}</div>
          )}
        </div>
        {error ? (
          <span className="font-label-caps text-[10px] text-error mt-0.5">{error}</span>
        ) : helperText ? (
          <span className="font-label-caps text-[10px] text-on-surface-variant mt-0.5">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
