import React from 'react';
import { useChangePassword } from '../hooks/useChangePassword';

export const ChangePasswordForm: React.FC = () => {
  const {
    currentCipher,
    setCurrentCipher,
    newCipher,
    setNewCipher,
    confirmCipher,
    setConfirmCipher,
    showCurrentCipher,
    setShowCurrentCipher,
    showNewCipher,
    setShowNewCipher,
    showConfirmCipher,
    setShowConfirmCipher,
    isLoading,
    errorMessage,
    showToast,
    setShowToast,
    hasMinLength,
    hasAlphanumeric,
    hasSpecial,
    strength,
    handleSubmit,
    handleCancel,
  } = useChangePassword();

  return (
    <div className="w-full flex justify-center items-center py-stack-lg relative">
      <div className="w-full max-w-md bg-surface border border-border-subtle rounded-lg flex flex-col relative overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-surface-bright border-b border-border-subtle px-stack-lg py-stack-md flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">key</span>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Update Access Cipher</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Modify your security credentials.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-stack-lg flex flex-col gap-stack-lg">
          {/* Alert Banner (Error State) */}
          {errorMessage && (
            <div className="bg-error-container/20 border border-error/30 rounded p-3 flex gap-3 items-start animate-fade-in">
              <span className="material-symbols-outlined text-error text-sm mt-0.5">warning</span>
              <div className="flex-1">
                <p className="font-label-caps text-label-caps text-error">Protocol Failure</p>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-stack-md">
            {/* Current Access Cipher */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                Current Access Cipher
              </label>
              <div className="relative">
                <input
                  type={showCurrentCipher ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={currentCipher}
                  onChange={(e) => setCurrentCipher(e.target.value)}
                  className="w-full bg-surface-container border border-border-subtle rounded px-3 py-2 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentCipher(!showCurrentCipher)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showCurrentCipher ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="h-px w-full bg-border-subtle my-2"></div>

            {/* New Access Cipher */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                New Access Cipher
              </label>
              <div className="relative">
                <input
                  type={showNewCipher ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={newCipher}
                  onChange={(e) => setNewCipher(e.target.value)}
                  className="w-full bg-surface-container border border-border-subtle rounded px-3 py-2 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50"
                />
                <button
                  type="button"
                  onClick={() => setShowNewCipher(!showNewCipher)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showNewCipher ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Strength Meter */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex gap-1 h-1.5 w-full">
                <div
                  className={`flex-1 rounded-full transition-colors duration-300 ${
                    strength.score >= 1 ? strength.barColor : 'bg-surface-container-highest'
                  }`}
                ></div>
                <div
                  className={`flex-1 rounded-full transition-colors duration-300 ${
                    strength.score >= 2 ? strength.barColor : 'bg-surface-container-highest'
                  }`}
                ></div>
                <div
                  className={`flex-1 rounded-full transition-colors duration-300 ${
                    strength.score >= 3 ? strength.barColor : 'bg-surface-container-highest'
                  }`}
                ></div>
                <div
                  className={`flex-1 rounded-full transition-colors duration-300 ${
                    strength.score >= 4 ? strength.barColor : 'bg-surface-container-highest'
                  }`}
                ></div>
              </div>
              <p className={`font-label-caps text-label-caps text-right ${strength.textClass}`}>
                {strength.label}
              </p>
            </div>

            {/* Requirements Box */}
            <div className="bg-surface-container-lowest border border-border-subtle rounded p-3 mt-1">
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">
                Protocol Requirements:
              </p>
              <ul className="flex flex-col gap-1.5">
                <li
                  className={`flex items-center gap-2 font-body-md text-body-md transition-colors ${
                    hasMinLength ? 'text-success' : 'text-on-surface-variant'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: hasMinLength ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  Minimum 12 characters
                </li>
                <li
                  className={`flex items-center gap-2 font-body-md text-body-md transition-colors ${
                    hasAlphanumeric ? 'text-success' : 'text-on-surface-variant'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: hasAlphanumeric ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {hasAlphanumeric ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  Alphanumeric combination
                </li>
                <li
                  className={`flex items-center gap-2 font-body-md text-body-md transition-colors ${
                    hasSpecial ? 'text-success' : 'text-on-surface-variant'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: hasSpecial ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {hasSpecial ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  One special symbol (!@#$%)
                </li>
              </ul>
            </div>

            {/* Confirm New Cipher */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                Confirm New Cipher
              </label>
              <div className="relative">
                <input
                  type={showConfirmCipher ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmCipher}
                  onChange={(e) => setConfirmCipher(e.target.value)}
                  className="w-full bg-surface-container border border-border-subtle rounded px-3 py-2 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmCipher(!showConfirmCipher)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showConfirmCipher ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-surface-bright border-t border-border-subtle px-stack-lg py-stack-md flex justify-end gap-stack-md mt-auto -mx-stack-lg -mb-stack-lg">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-border-subtle text-on-surface font-data-mono text-data-mono rounded hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-on-primary font-data-mono text-data-mono rounded hover:bg-primary-fixed-dim transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="material-symbols-outlined text-sm loading-spinner">sync</span>
              ) : (
                'Update Cipher'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Floating Toast Notification */}
      {showToast && (
        <div className="fixed bottom-margin-page right-margin-page bg-surface-bright border border-border-subtle rounded shadow-lg p-4 flex items-start gap-3 transition-all duration-300 z-50 animate-bounce">
          <span className="material-symbols-outlined text-success" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <div>
            <p className="font-label-caps text-label-caps text-success">Protocol Updated</p>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Access Cipher updated successfully.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-on-surface-variant hover:text-on-surface ml-4 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
};
