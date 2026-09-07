import React, { useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { Input } from '../../../../components/ui/Input';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [callsign, setCallsign] = useState(user?.callsign || 'GHOST_LEAD');
  const [email, setEmail] = useState(user?.email || 'ghost.lead@shadowvale.sys');
  const [fullName, setFullName] = useState('John "Ghost" Miller');
  const [bio, setBio] = useState('Special Reconnaissance & Cyber Tactical Unit Lead.');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-border-subtle rounded-lg w-full max-w-lg shadow-2xl overflow-hidden relative animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>

        <div className="bg-surface-bright border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">badge</span>
            <div>
              <h3 className="font-display-lg text-lg text-on-surface leading-tight">
                Edit Operative Dossier
              </h3>
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                Identity & Comms Uplink Registry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>
            <h4 className="font-display-lg text-xl text-on-surface">Profile Dossier Updated</h4>
            <p className="font-data-mono text-xs text-on-surface-variant">
              Telemetry and identity records successfully synchronized.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <Input
              id="edit-callsign"
              label="Callsign (Username)"
              icon="badge"
              required
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
            />

            <Input
              id="edit-fullname"
              label="Full Name / Designation"
              icon="person"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              id="edit-email"
              label="Comms Uplink (Email)"
              icon="mail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="edit-bio">
                Tactical Directive / Bio
              </label>
              <textarea
                id="edit-bio"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT p-3 text-on-surface font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              />
            </div>

            <div className="mt-2 pt-4 border-t border-border-subtle flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded border border-outline-variant text-on-surface font-label-caps text-label-caps hover:bg-surface-container transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded bg-primary text-on-primary font-label-caps text-label-caps hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-2 font-bold cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] loading-spinner">sync</span>
                    <span>SYNCHRONIZING...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>UPDATE DOSSIER</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
