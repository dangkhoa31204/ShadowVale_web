import React from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';

interface LoginFormProps {
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword }) => {
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    identifierError,
    passwordError,
    authError,
    handleSubmit,
  } = useLogin();

  const idHasError = !!identifierError || !!authError;
  const passHasError = !!passwordError || !!authError;

  return (
    <div className="w-full max-w-[420px] bg-surface-container-low border border-border-subtle rounded-lg p-stack-lg relative z-10">
      <div className="text-center mb-stack-lg">
        <h1 className="font-display-lg text-primary tracking-tight mb-2">ShadowVale</h1>
        <h2 className="font-headline-md text-on-surface">Secure Authorization</h2>
      </div>

      <form className="space-y-stack-md" id="loginForm" noValidate onSubmit={handleSubmit}>
        {/* Identifier Field */}
        <div className="form-group">
          <label className="block font-label-caps text-on-surface-variant mb-2" htmlFor="identifier">
            Operator ID / Email
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
              badge
            </span>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="operator.name"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`w-full bg-surface-container-highest border text-on-surface rounded pl-10 pr-4 py-2.5 font-data-mono outline-none transition-colors ${
                idHasError
                  ? 'border-error text-error focus:border-error focus:ring-1 focus:ring-error'
                  : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
              }`}
            />
          </div>
          {identifierError && (
            <p className="text-error font-body-md text-xs mt-1 error-message">{identifierError}</p>
          )}
          {authError && !identifierError && (
            <p className="text-error font-body-md text-xs mt-1 error-message">{authError}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label className="block font-label-caps text-on-surface-variant mb-2" htmlFor="password">
            Passkey
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
              key
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-surface-container-highest border text-on-surface rounded pl-10 pr-10 py-2.5 font-data-mono outline-none transition-colors ${
                passHasError
                  ? 'border-error text-error focus:border-error focus:ring-1 focus:ring-error'
                  : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
              }`}
            />
            <button
              id="togglePassword"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          {passwordError && (
            <p className="text-error font-body-md text-xs mt-1 error-message">{passwordError}</p>
          )}
        </div>

        {/* Options Row */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="form-checkbox bg-surface-container-highest border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface rounded-sm w-4 h-4 transition-colors"
            />
            <span className="font-body-md text-on-surface-variant group-hover:text-on-surface transition-colors text-sm">
              Maintain link
            </span>
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="font-body-md text-sm text-primary hover:text-primary-fixed transition-colors cursor-pointer"
          >
            Recover Passkey?
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-stack-md">
          <button
            id="submitBtn"
            type="submit"
            disabled={isLoading}
            className={`w-full bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container border border-primary-container hover:border-primary font-label-caps py-3 rounded transition-all duration-200 flex justify-center items-center gap-2 relative overflow-hidden group cursor-pointer ${
              isLoading ? 'opacity-80 cursor-not-allowed' : ''
            }`}
          >
            {!isLoading && (
              <>
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                  login
                </span>
                <span className="btn-text">Authenticate</span>
              </>
            )}
            {isLoading && (
              <span className="material-symbols-outlined loading-spinner text-lg">
                sync
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Footer Link */}
      <div className="mt-stack-lg pt-stack-md border-t border-border-subtle text-center">
        <p className="font-body-md text-on-surface-variant text-sm">
          Unregistered operative?{' '}
          <Link to="/register" className="text-primary hover:text-primary-fixed transition-colors ml-1 font-medium">
            Request Clearance
          </Link>
        </p>
      </div>
    </div>
  );
};
