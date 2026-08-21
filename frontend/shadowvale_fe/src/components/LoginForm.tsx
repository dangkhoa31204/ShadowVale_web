import React, { useState } from 'react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  onLoginSuccess: (callsign: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onForgotPassword,
  onLoginSuccess,
}) => {
  const [callsign, setCallsign] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleQuickFill = (demoCallsign: string, demoPass: string) => {
    setCallsign(demoCallsign);
    setPassword(demoPass);
    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim() || !password) {
      setErrorMessage('Identity & Access Cipher are required.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    setLoadingStep('INITIALIZING SATELLITE LINK...');

    setTimeout(() => {
      setLoadingStep('AUTHENTICATING OPERATIVE CIPHER...');
    }, 800);

    setTimeout(() => {
      setLoadingStep('VERIFYING SECURITY CLEARANCE...');
    }, 1600);

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(callsign.trim());
    }, 2400);
  };

  return (
    <div className="w-full max-w-[420px] relative z-10">
      {/* Header outside card for structural depth */}
      <div className="text-center mb-stack-lg">
        <h1 className="font-display-lg text-display-lg text-primary tracking-tight brand-glow flex items-center justify-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '36px', fontVariationSettings: "'FILL' 1" }}>
            terminal
          </span>
          ShadowVale
        </h1>
        <p className="font-label-caps text-label-caps text-on-surface-variant mt-2 tracking-widest uppercase opacity-70">
          Operative Authentication
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-surface border border-border-subtle rounded-lg shadow-2xl relative overflow-hidden">
        {/* Decorative top accent line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>

        {/* Loading overlay when authenticating */}
        {isLoading && (
          <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-4">
              <span className="material-symbols-outlined text-primary text-4xl loading-spinner">
                sync
              </span>
              <div className="absolute inset-0 rounded-full border border-primary/40 animate-ping"></div>
            </div>
            <p className="font-data-mono text-sm text-primary font-bold uppercase tracking-wider mb-1">
              {loadingStep}
            </p>
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">
              ENCRYPTED CHANNEL SV-990-SEC
            </p>
          </div>
        )}

        <div className="p-stack-lg">
          {errorMessage && (
            <div className="mb-4 bg-error-container/40 border border-error/50 rounded p-3 flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-base">warning</span>
              <span className="font-data-mono text-xs">{errorMessage}</span>
            </div>
          )}

          <form className="flex flex-col gap-stack-md" onSubmit={handleSubmit}>
            {/* Username / Callsign Field */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end mb-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="login-callsign">
                  Callsign or Comms Uplink
                </label>
                <span className="font-label-caps text-[10px] text-primary/70">SYS.AUTH</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
                    badge
                  </span>
                </div>
                <input
                  id="login-callsign"
                  name="callsign"
                  type="text"
                  required
                  spellCheck={false}
                  autoComplete="username"
                  placeholder="Enter operative callsign"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 pl-10 pr-3 text-on-surface font-data-mono text-data-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/50"
                />
              </div>
            </div>

            {/* Password / Access Cipher Field */}
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex justify-between items-center mb-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="login-password">
                  Access Cipher
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="font-label-caps text-[10px] text-primary hover:underline transition-all uppercase"
                >
                  Forgot Cipher?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
                    key
                  </span>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 pl-10 pr-10 text-on-surface font-data-mono text-data-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-sm bg-surface-dim border-border-subtle text-primary focus:ring-primary focus:ring-offset-background"
                />
                <span className="font-label-caps text-[11px] text-on-surface-variant group-hover:text-on-surface transition-colors">
                  PERSIST TERMINAL SESSION
                </span>
              </label>
              <span className="font-data-mono text-[10px] text-success/80 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                UPLINK ONLINE
              </span>
            </div>

            {/* Actions */}
            <div className="mt-stack-md pt-stack-sm border-t border-border-subtle flex flex-col gap-stack-sm">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-on-primary font-data-mono text-data-mono font-bold uppercase tracking-wider py-3 rounded-DEFAULT hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all flex justify-center items-center gap-2 group cursor-pointer"
              >
                Authenticate Operative
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  login
                </span>
              </button>

              {/* Demo Fill Quick Buttons */}
              <div className="bg-surface-container-low border border-border-subtle/60 rounded p-2.5 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-label-caps text-on-surface-variant/70 uppercase">
                  <span>Quick Tactical Presets</span>
                  <span>Demo Mode</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('OPERATIVE-SPECTRE', 'Cipher#2026Shadow')}
                    className="bg-surface-dim hover:bg-surface-bright text-on-surface text-[11px] font-data-mono py-1.5 px-2 rounded border border-border-subtle/80 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px] text-primary">security</span>
                    Spectre 07
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('COMMANDER-VALKYRIE', 'Cipher#2026Admin')}
                    className="bg-surface-dim hover:bg-surface-bright text-on-surface text-[11px] font-data-mono py-1.5 px-2 rounded border border-border-subtle/80 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px] text-tertiary">shield</span>
                    Commander
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onSwitchToRegister}
                className="w-full text-center py-2 text-on-surface-variant hover:text-primary font-data-mono text-[12px] transition-colors flex justify-center items-center gap-1 cursor-pointer"
              >
                No Clearance Code? (Initialize Profile)
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  arrow_forward
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer decorative tech details */}
      <div className="flex justify-between items-center mt-4 px-2 opacity-50">
        <span className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
          SYS.ID: SV-LOG-01X
        </span>
        <span className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
          SEC: CL-2 AUTH
        </span>
      </div>
    </div>
  );
};
