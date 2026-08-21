import React, { useState } from 'react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1200);
  };

  const handleReset = () => {
    setEmail('');
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="bg-surface border border-border-subtle rounded-lg shadow-2xl w-full max-w-[400px] overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-warning"></div>

        <div className="p-5">
          <div className="flex justify-between items-center pb-3 border-b border-border-subtle mb-4">
            <div className="flex items-center gap-2 text-warning font-label-caps text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-base">published_with_changes</span>
              Security Recovery Protocol
            </div>
            <button
              onClick={handleReset}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="font-data-mono text-xs text-on-surface-variant leading-relaxed">
                Enter your registered <span className="text-on-surface font-semibold">Comms Uplink (Email)</span>. A cryptographically signed dispatch token will be issued to reset your access cipher.
              </p>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="reset-email">
                  Comms Uplink
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
                      mail
                    </span>
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operative@domain.com"
                    className="w-full bg-surface-dim border border-border-subtle rounded py-2 pl-10 pr-3 text-on-surface font-data-mono text-xs focus:outline-none focus:border-warning focus:ring-1 focus:ring-warning transition-all placeholder:text-on-surface-variant/50"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 bg-surface-container hover:bg-surface-bright text-on-surface-variant font-data-mono text-xs py-2 rounded transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-warning text-on-tertiary-fixed font-data-mono text-xs font-bold uppercase py-2 rounded hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-sm loading-spinner">sync</span>
                  ) : (
                    <>
                      TRANSMIT RECOVERY
                      <span className="material-symbols-outlined text-sm">send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success">
                <span className="material-symbols-outlined text-2xl">mark_email_read</span>
              </div>
              <h3 className="font-display-lg text-lg text-on-surface">DISPATCH SENT</h3>
              <p className="font-data-mono text-xs text-on-surface-variant">
                An encrypted recovery key has been dispatched to <span className="text-primary font-semibold">{email}</span>. Check your inbox and follow protocol instructions.
              </p>
              <button
                onClick={handleReset}
                className="mt-2 w-full bg-primary text-on-primary font-data-mono text-xs font-bold py-2 rounded uppercase tracking-wider hover:bg-primary-container transition-colors"
              >
                RETURN TO AUTHENTICATION
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
