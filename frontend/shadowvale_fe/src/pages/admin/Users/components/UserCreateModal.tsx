import React, { useState } from 'react';
import { Input } from '../../../../components/ui/Input';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: (user: any) => void;
}

export const UserCreateModal: React.FC<UserCreateModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operative');
  const [clearanceLevel, setClearanceLevel] = useState('CL-2');
  const [status, setStatus] = useState('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setCallsign('');
    setEmail('');
    setPassword('');
    setRole('operative');
    setClearanceLevel('CL-2');
    setStatus('ACTIVE');
    setErrorMessage('');
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!callsign.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required operational directives.');
      return;
    }

    setIsLoading(true);

    // Simulate creation
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      if (onUserCreated) {
        onUserCreated({
          id: `usr_${Date.now().toString().slice(-4)}`,
          name: callsign.trim(),
          email: email.trim(),
          role,
          clearanceLevel,
          status,
          provisionedDate: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
        });
      }

      setTimeout(() => {
        handleReset();
      }, 1200);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-border-subtle rounded-lg w-full max-w-lg shadow-2xl overflow-hidden relative animate-fade-in">
        {/* Header accent strip */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>

        {/* Modal Header */}
        <div className="bg-surface-bright border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">person_add</span>
            <div>
              <h3 className="font-display-lg text-lg text-on-surface leading-tight">
                Provision New Operative
              </h3>
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                Direct System Provisioning Directive
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>
            <h4 className="font-display-lg text-xl text-on-surface">Operative Commissioned</h4>
            <p className="font-data-mono text-xs text-on-surface-variant max-w-sm">
              Operative <span className="text-primary font-bold">{callsign}</span> has been provisioned into the active roster. Clearance badge assigned: {clearanceLevel}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {errorMessage && (
              <div className="bg-error-container/20 border border-error/40 rounded p-3 text-error font-data-mono text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="provision-callsign"
                label="Callsign (Username)"
                icon="badge"
                required
                placeholder="e.g. Apex_09"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
              />

              <Input
                id="provision-email"
                label="Comms Uplink (Email)"
                icon="mail"
                type="email"
                required
                placeholder="operative@shadowvale.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Input
              id="provision-password"
              label="Initial Access Cipher"
              icon="key"
              type="password"
              required
              placeholder="Temporary access passkey"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Operative will be prompted to reset upon initial handshake."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="provision-role">
                  Tactical Role
                </label>
                <select
                  id="provision-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 px-3 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="operative">Operative</option>
                  <option value="designer">L2 Designer</option>
                  <option value="analyst">L3 Analyst</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="provision-clearance">
                  Clearance
                </label>
                <select
                  id="provision-clearance"
                  value={clearanceLevel}
                  onChange={(e) => setClearanceLevel(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 px-3 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="CL-1">CL-1 Recruit</option>
                  <option value="CL-2">CL-2 Operative</option>
                  <option value="CL-3">CL-3 Analyst</option>
                  <option value="CL-4">CL-4 Commander</option>
                  <option value="CL-5">CL-5 Omega</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-0.5" htmlFor="provision-status">
                  Initial Status
                </label>
                <select
                  id="provision-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 px-3 text-on-surface font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-4 pt-4 border-t border-border-subtle flex justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded border border-outline-variant text-on-surface font-label-caps text-label-caps hover:bg-surface-container transition-colors cursor-pointer"
              >
                ABORT
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded bg-primary text-on-primary font-label-caps text-label-caps hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-2 font-bold cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] loading-spinner">sync</span>
                    <span>PROVISIONING...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    <span>COMMISSION OPERATIVE</span>
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
