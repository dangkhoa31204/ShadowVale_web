import React from 'react';
import { Link } from 'react-router-dom';
import { useResetPassword } from '../hooks/useResetPassword';

export const ResetPasswordForm: React.FC = () => {
  const { email, setEmail, isLoading, isSuccess, error, handleSubmit } = useResetPassword();

  return (
    <main className="w-full max-w-md px-gutter relative z-10">
      {/* Brand Header */}
      <div className="text-center mb-stack-lg">
        <h1 className="font-display-lg text-display-lg font-bold text-primary tracking-tight uppercase">
          ShadowVale
        </h1>
      </div>

      {/* Recovery Card */}
      <div className="bg-surface border border-border-subtle rounded-DEFAULT p-stack-lg relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="mb-stack-lg text-center">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-sm uppercase">
                CIPHER RECOVERY
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Enter your registered comms uplink to receive a reset link.
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-error-container/40 border border-error/50 rounded p-3 text-error font-data-mono text-xs">
                {error}
              </div>
            )}

            {/* Default State: Recovery Form */}
            <form className="flex flex-col gap-stack-md" id="recoveryForm" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="commsUplink">
                  Comms Uplink (Email)
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline">
                    mail
                  </span>
                  <input
                    id="commsUplink"
                    type="email"
                    required
                    placeholder="agent@shadowvale.net"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-subtle text-on-surface rounded-DEFAULT py-3 pl-10 pr-4 font-data-mono text-data-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-outline transition-colors"
                  />
                </div>
              </div>

              <div className="mt-stack-sm">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-on-primary font-data-mono text-body-md font-medium py-3 rounded-DEFAULT hover:bg-primary-fixed transition-colors flex justify-center items-center gap-2 group cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-[18px] loading-spinner">sync</span>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                        send
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Success State */
          <div className="flex flex-col items-center justify-center text-center py-stack-sm animate-fade-in" id="successState">
            <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-stack-md border border-primary/30">
              <span className="material-symbols-outlined text-primary text-[32px]">
                mark_email_read
              </span>
            </div>
            <h3 className="font-title-sm text-title-sm text-on-surface mb-stack-sm uppercase">
              Transmission Sent
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">
              Check your email for password reset instructions. The link will self-destruct in 15 minutes.
            </p>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-stack-lg pt-stack-md border-t border-border-subtle text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors uppercase"
            id="returnLink"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Return to Login
          </Link>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="mt-stack-lg text-center opacity-60">
        <span className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-widest flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success"></span>
          System Operational
        </span>
      </div>
    </main>
  );
};
