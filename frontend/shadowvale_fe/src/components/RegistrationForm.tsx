import React, { useState } from 'react';

interface RegistrationFormProps {
  onSwitchToLogin: () => void;
  onRegisterSuccess: (callsign: string) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSwitchToLogin,
  onRegisterSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Callsign availability indicator status
  const isUsernameValid = username.trim().length > 3 && /^[a-zA-Z0-9_-]+$/.test(username);

  // Password strength logic
  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: 'WEAK', class: 'text-on-surface-variant' };
    const len = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (len >= 6) score++;
    if (len >= 10) score++;
    if (hasUpper && hasLower && hasNumber) score++;
    if (len >= 12 && hasSpecial) score++;

    if (score <= 1) return { level: 1, text: 'CRITICAL', class: 'text-error', barColor: 'bg-error' };
    if (score === 2) return { level: 2, text: 'MODERATE', class: 'text-warning', barColor: 'bg-warning' };
    if (score === 3) return { level: 3, text: 'ACCEPTABLE', class: 'text-info', barColor: 'bg-info' };
    return { level: 4, text: 'SECURE', class: 'text-success', barColor: 'bg-success' };
  };

  const strength = getPasswordStrength();

  // Password match logic
  const isMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameValid) return;
    if (password !== confirmPassword) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onRegisterSuccess(username.trim());
    }, 1500);
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
          Operative Initialization
        </p>
      </div>

      {/* Main Registration Card */}
      <div className="bg-surface border border-border-subtle rounded-lg shadow-2xl relative overflow-hidden">
        {/* Decorative top accent line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
            <span className="material-symbols-outlined text-primary text-4xl loading-spinner mb-3">
              memory
            </span>
            <p className="font-data-mono text-sm text-primary font-bold uppercase tracking-wider mb-1">
              CREATING OPERATIVE RECORD...
            </p>
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">
              GENERATING CRYPTOGRAPHIC KEYPAIR
            </p>
          </div>
        )}

        <div className="p-stack-lg">
          <form className="flex flex-col gap-stack-md" id="registration-form" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end mb-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="username">
                  Callsign (Username)
                </label>
                {isUsernameValid && (
                  <span className="font-label-caps text-[10px] text-success flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span> Available
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
                    badge
                  </span>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="Enter operative callsign"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 pl-10 pr-3 text-on-surface font-data-mono text-data-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/50"
                />
              </div>
              <p className="font-label-caps text-[10px] text-on-surface-variant mt-1">
                Alphanumeric characters only. No spaces.
              </p>
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-1 mt-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1" htmlFor="email">
                Comms Uplink (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
                    mail
                  </span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="operative@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 pl-10 pr-3 text-on-surface font-data-mono text-data-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/50"
                />
              </div>
            </div>

            {/* Password Field with Strength */}
            <div className="flex flex-col gap-1 mt-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1" htmlFor="password">
                Access Cipher (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
                    key
                  </span>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-dim border border-border-subtle rounded-DEFAULT py-2 pl-10 pr-10 text-on-surface font-data-mono text-data-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Strength Indicator */}
              <div className="mt-2">
                <div className="flex gap-1 h-1.5 w-full">
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${strength.level >= 1 ? strength.barColor : 'bg-surface-variant'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${strength.level >= 2 ? strength.barColor : 'bg-surface-variant'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${strength.level >= 3 ? strength.barColor : 'bg-surface-variant'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${strength.level >= 4 ? strength.barColor : 'bg-surface-variant'}`}></div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-label-caps text-[10px] text-on-surface-variant">
                    Min. 12 chars, mixed case, symbols
                  </span>
                  <span className={`font-label-caps text-[10px] uppercase ${strength.class}`}>
                    {strength.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-1 mt-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1" htmlFor="confirm_password">
                Verify Cipher
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
                    password
                  </span>
                </div>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-surface-dim border rounded-DEFAULT py-2 pl-10 pr-3 text-on-surface font-data-mono text-data-mono focus:outline-none transition-all placeholder:text-on-surface-variant/50 ${
                    isMatch
                      ? 'border-success focus:border-success focus:ring-1 focus:ring-success'
                      : isMismatch
                      ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                      : 'border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                />
                {isMatch && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-success" style={{ fontSize: '18px' }}>
                      check
                    </span>
                  </div>
                )}
              </div>
              {isMismatch && (
                <span className="font-label-caps text-[10px] text-error mt-1">
                  Ciphers do not match.
                </span>
              )}
            </div>

            {/* Standard Operative Notice (Constraint adherence) */}
            <div className="bg-surface-container border border-border-subtle rounded-DEFAULT p-3 mt-2 flex items-start gap-2">
              <span className="material-symbols-outlined text-info mt-0.5" style={{ fontSize: '16px' }}>
                info
              </span>
              <p className="font-data-mono text-[11px] text-on-surface-variant leading-tight">
                Registration locked to <span className="text-on-surface font-bold">Standard Operative</span> tier. Elevated access requests must be routed via Command Center post-initialization.
              </p>
            </div>

            {/* Actions */}
            <div className="mt-stack-md pt-stack-sm border-t border-border-subtle flex flex-col gap-stack-sm">
              <button
                type="submit"
                disabled={isLoading || isMismatch || !isUsernameValid}
                className="w-full bg-primary text-on-primary font-data-mono text-data-mono font-bold uppercase tracking-wider py-3 rounded-DEFAULT hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all flex justify-center items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Initialize Profile
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>

              <button
                type="button"
                onClick={onSwitchToLogin}
                className="w-full text-center py-2 text-on-surface-variant hover:text-primary font-data-mono text-[12px] transition-colors flex justify-center items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  arrow_back
                </span>
                Abort sequence (Return to Login)
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer decorative tech details */}
      <div className="flex justify-between items-center mt-4 px-2 opacity-50">
        <span className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
          SYS.ID: SV-REG-09X
        </span>
        <span className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
          SEC: CL-2
        </span>
      </div>
    </div>
  );
};
