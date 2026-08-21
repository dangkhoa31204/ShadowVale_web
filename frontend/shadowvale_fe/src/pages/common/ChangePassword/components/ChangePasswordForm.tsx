import React from 'react';
import { Link } from 'react-router-dom';
import { useChangePassword } from '../hooks/useChangePassword';

export const ChangePasswordForm: React.FC = () => {
  const {
    newCipher,
    setNewCipher,
    confirmCipher,
    setConfirmCipher,
    showNewCipher,
    setShowNewCipher,
    showConfirmCipher,
    setShowConfirmCipher,
    isLoading,
    errorMessage,
    successMessage,
    strength,
    handleSubmit,
  } = useChangePassword();

  return (
    <main className="w-full max-w-[440px] bg-surface border border-border-subtle z-10 flex flex-col relative rounded-sm">
      {/* Header Section */}
      <header className="bg-surface-bright border-b border-border-subtle p-stack-md flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            terminal
          </span>
          <span className="font-title-sm text-title-sm text-primary tracking-widest uppercase">
            ShadowVale Systems
          </span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight uppercase">
            Access Cipher Reset
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Define a new access cipher for your operative profile. Synchronization required.
          </p>
        </div>
      </header>

      {/* Form Section */}
      <form className="p-stack-md flex flex-col gap-stack-lg" id="cipher-form" noValidate onSubmit={handleSubmit}>
        {/* Dynamic Status Messages */}
        {(errorMessage || successMessage) && (
          <div id="status-container">
            {errorMessage && (
              <div className="bg-error-container/10 border border-error/50 p-stack-sm rounded-sm flex items-start gap-3">
                <span
                  className="material-symbols-outlined text-error text-[20px] mt-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-error mb-1">Protocol Failure</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">{errorMessage}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-success/10 border border-success/50 p-stack-sm rounded-sm flex items-start gap-3">
                <span
                  className="material-symbols-outlined text-success text-[20px] mt-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-success mb-1">Authorization Updated</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">{successMessage}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-stack-md">
          {/* New Cipher Input */}
          <div className="flex flex-col">
            <label className="font-label-caps text-label-caps text-on-surface block mb-stack-sm uppercase" htmlFor="new-cipher">
              New Access Cipher (Password)
            </label>
            <div className="relative">
              <input
                id="new-cipher"
                type={showNewCipher ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={newCipher}
                onChange={(e) => setNewCipher(e.target.value)}
                disabled={isLoading || !!successMessage}
                className="w-full bg-surface-dim border border-border-subtle p-3 pr-12 font-data-mono text-data-mono text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors rounded-sm placeholder-on-surface-variant/40"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowNewCipher(!showNewCipher)}
                className={`toggle-vis absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none h-full flex items-center px-1 cursor-pointer ${
                  showNewCipher ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showNewCipher ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Tactical Strength Indicator */}
            <div className="mt-stack-sm flex flex-col gap-1">
              <div className="flex gap-1 h-1.5 w-full">
                <div
                  className={`strength-segment flex-1 border rounded-sm transition-colors duration-300 ${
                    strength.score >= 1 ? strength.barColor : 'bg-surface-variant border-border-subtle'
                  }`}
                ></div>
                <div
                  className={`strength-segment flex-1 border rounded-sm transition-colors duration-300 ${
                    strength.score >= 2 ? strength.barColor : 'bg-surface-variant border-border-subtle'
                  }`}
                ></div>
                <div
                  className={`strength-segment flex-1 border rounded-sm transition-colors duration-300 ${
                    strength.score >= 3 ? strength.barColor : 'bg-surface-variant border-border-subtle'
                  }`}
                ></div>
                <div
                  className={`strength-segment flex-1 border rounded-sm transition-colors duration-300 ${
                    strength.score >= 4 ? strength.barColor : 'bg-surface-variant border-border-subtle'
                  }`}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={`font-label-caps text-[10px] uppercase tracking-widest ${strength.colorClass}`}>
                  {strength.label}
                </span>
                <span className="font-label-caps text-[10px] text-on-surface-variant tracking-widest">
                  Alphanumeric + Symbol
                </span>
              </div>
            </div>
          </div>

          {/* Confirm Cipher Input */}
          <div className="flex flex-col">
            <label className="font-label-caps text-label-caps text-on-surface block mb-stack-sm uppercase" htmlFor="confirm-cipher">
              Confirm New Cipher
            </label>
            <div className="relative">
              <input
                id="confirm-cipher"
                type={showConfirmCipher ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={confirmCipher}
                onChange={(e) => setConfirmCipher(e.target.value)}
                disabled={isLoading || !!successMessage}
                className="w-full bg-surface-dim border border-border-subtle p-3 pr-12 font-data-mono text-data-mono text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors rounded-sm placeholder-on-surface-variant/40"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowConfirmCipher(!showConfirmCipher)}
                className={`toggle-vis absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none h-full flex items-center px-1 cursor-pointer ${
                  showConfirmCipher ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirmCipher ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !!successMessage}
            className="w-full bg-primary text-on-primary font-data-mono text-body-md py-3 px-4 rounded-sm hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-[18px] loading-spinner">sync</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                RESET PASSWORD
              </>
            )}
          </button>
        </div>

        <div className="text-center mt-2">
          <Link
            to="/login"
            className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest inline-flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Abort Sequence
          </Link>
        </div>
      </form>
    </main>
  );
};
