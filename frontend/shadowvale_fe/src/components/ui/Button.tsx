import React, { type ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'font-data-mono uppercase tracking-wider font-bold rounded-DEFAULT transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'py-1.5 px-3 text-[11px]',
    md: 'py-2.5 px-4 text-xs',
    lg: 'py-3 px-6 text-sm',
  };

  const variantStyles = {
    primary: 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98]',
    secondary: 'bg-secondary-container text-on-secondary-container hover:bg-surface-bright',
    outline: 'border border-border-subtle bg-transparent text-on-surface hover:border-primary hover:text-primary',
    danger: 'bg-error-container/40 text-error border border-error/50 hover:bg-error-container',
    ghost: 'bg-transparent text-on-surface-variant hover:text-primary',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="material-symbols-outlined text-sm loading-spinner">sync</span>
      ) : (
        children
      )}
    </button>
  );
};
