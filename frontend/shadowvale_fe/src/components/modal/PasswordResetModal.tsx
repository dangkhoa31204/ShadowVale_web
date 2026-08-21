import React, { useState } from 'react';
import { authService } from '../../services/auth/authService';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await authService.resetPassword({ email });
      setIsLoading(false);
      setIsSubmitted(true);
    } catch {
      setIsLoading(false);
    }
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
              className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="font-data-mono text-xs text-on-surface-variant leading-relaxed">
                Enter your registered <span className="text-on-surface font-semibold">Comms Uplink (Email)</span>. A cryptographically signed dispatch token will be issued to reset your access cipher.
              </p>

              <Input
                id="reset-email"
                label="Comms Uplink"
                icon="mail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@domain.com"
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                  className="flex-1"
                >
                  CANCEL
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="flex-1 bg-warning text-on-tertiary-fixed hover:brightness-110"
                >
                  TRANSMIT
                  <span className="material-symbols-outlined text-sm">send</span>
                </Button>
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
              <Button
                onClick={handleReset}
                className="mt-2 w-full"
              >
                RETURN TO AUTHENTICATION
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
